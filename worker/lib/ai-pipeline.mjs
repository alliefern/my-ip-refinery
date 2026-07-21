/**
 * AI stages (Milestone 3): per-asset IP extraction + synthesis, then
 * the cross-training IP map. Hierarchical by design — chunks are
 * analyzed one at a time, trainings one at a time, and only compact
 * syntheses + an item index reach the map stage. Never one giant prompt.
 */

import * as extraction from "../prompts/extraction-v1.mjs";
import * as synthesis from "../prompts/synthesis-v1.mjs";
import * as ipmap from "../prompts/ipmap-v1.mjs";
import { estimateTextCostCents, runStructured } from "./llm.mjs";
import { stitchChunks } from "./stitch.mjs";

function modelConfig() {
  return {
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
  };
}

/**
 * extract_ip job (per media asset): mine each transcript chunk, then
 * synthesize the whole training. Chunk-level idempotency: chunks that
 * already have IP items are skipped on retry.
 */
export async function runExtractIp(db, job) {
  const asset = await db.getAsset(job.source_asset_id);
  if (!asset) throw fatal("Asset row missing", "PROJECT_DELETED");
  const project = await db.getProjectOwner(asset.project_id);
  if (!project || project.deleted_at) {
    throw fatal("Project deleted", "PROJECT_DELETED");
  }
  const intake = project.intake_json ?? {};
  const config = modelConfig();

  await db.updateAsset(asset.id, { status: "EXTRACTING" });
  await db.updateProjectStatusIf(
    asset.project_id,
    ["QUEUED", "TRANSCRIBING"],
    "EXTRACTING_IP",
  );

  const chunks = await db.listChunksForAsset(asset.id);
  if (chunks.length === 0) {
    throw fatal(
      "No transcript chunks to extract from",
      "INSUFFICIENT_SOURCE",
      "This training has no transcript yet — transcribe it first.",
    );
  }

  let usageTotal = { inputTokens: 0, outputTokens: 0 };

  // Stage 4: per-chunk extraction.
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (await db.chunkHasIpItems(chunk.id)) continue;

    const { data, usage } = await runStructured(
      extraction,
      extraction.buildUserPrompt({
        chunk,
        assetTitle: asset.display_title,
        topic: intake.topic,
      }),
      config,
    );
    usageTotal.inputTokens += usage.inputTokens;
    usageTotal.outputTokens += usage.outputTokens;

    await db.insertIpItems(
      data.items.map((item) => ({
        project_id: asset.project_id,
        source_asset_id: asset.id,
        transcript_chunk_id: chunk.id,
        type: item.type,
        title: item.title,
        content: item.description,
        start_seconds: clamp(item.start_seconds, chunk.start_seconds, chunk.end_seconds),
        end_seconds: clamp(item.end_seconds, chunk.start_seconds, chunk.end_seconds),
        confidence_score: item.confidence,
        distinctiveness_score: item.distinctiveness,
        support_type: item.support,
        metadata_json: { prompt_version: "extraction-v1" },
      })),
    );
    await db.setProgress(job.id, Math.round(((i + 1) / (chunks.length + 1)) * 100));
  }

  // Stage 5: per-training synthesis.
  const transcript = stitchChunks(chunks.map((c) => c.clean_text ?? ""));
  const { data: synthesisResult, usage: synthesisUsage } = await runStructured(
    synthesis,
    synthesis.buildUserPrompt({
      assetTitle: asset.display_title,
      transcript,
      topic: intake.topic,
    }),
    config,
  );
  usageTotal.inputTokens += synthesisUsage.inputTokens;
  usageTotal.outputTokens += synthesisUsage.outputTokens;
  await db.saveAssetSynthesis(asset.id, {
    ...synthesisResult,
    prompt_version: "synthesis-v1",
  });

  await db.recordUsage(asset.project_id, project.user_id, {
    operation: "ip_extraction",
    model: config.model,
    input_tokens: usageTotal.inputTokens,
    output_tokens: usageTotal.outputTokens,
    estimated_cost_minor_units: estimateTextCostCents(
      config.model,
      usageTotal.inputTokens,
      usageTotal.outputTokens,
    ),
  });
  await db.updateAsset(asset.id, { status: "READY", error_message: null });

  // Chain: when every media asset is READY, build the IP map once.
  const assets = await db.listMediaAssets(asset.project_id);
  const allReady = assets.every((a) => a.status === "READY" || a.id === asset.id);
  if (allReady) {
    await db.enqueueJob(
      asset.project_id,
      null,
      "build_ip_map",
      `ipmap:${asset.project_id}`,
    );
  }
}

/** build_ip_map job (per project): stages 6–7. */
export async function runBuildIpMap(db, job) {
  const project = await db.getProjectOwner(job.project_id);
  if (!project || project.deleted_at) {
    throw fatal("Project deleted", "PROJECT_DELETED");
  }
  const config = modelConfig();
  await db.updateProjectStatusIf(
    job.project_id,
    ["QUEUED", "TRANSCRIBING", "EXTRACTING_IP"],
    "BUILDING_IP_MAP",
  );

  const assets = await db.listMediaAssets(job.project_id);
  const ready = assets.filter(
    (a) => a.status === "READY" && a.synthesis_json && Object.keys(a.synthesis_json).length > 0,
  );
  if (ready.length === 0) {
    throw fatal(
      "No synthesized trainings",
      "INSUFFICIENT_SOURCE",
      "No trainings finished IP extraction — retry extraction first.",
    );
  }

  const assetTitle = new Map(assets.map((a) => [a.id, a.display_title]));
  const ipItems = await db.listProjectIpItems(job.project_id);

  const { data, usage } = await runStructured(
    ipmap,
    ipmap.buildUserPrompt({
      intake: project.intake_json ?? {},
      syntheses: ready.map((a) => ({
        assetTitle: a.display_title,
        synthesis: a.synthesis_json,
      })),
      ipIndex: ipItems.map((item) => ({
        type: item.type,
        title: item.title,
        content: (item.content ?? "").slice(0, 300),
        distinctiveness: item.distinctiveness_score,
        assetTitle: assetTitle.get(item.source_asset_id) ?? "unknown",
      })),
    }),
    config,
  );

  await db.clearIpMapOutputs(job.project_id);
  await db.saveProjectIpMap(job.project_id, {
    dominant_themes: data.dominant_themes,
    signature_frameworks: data.signature_frameworks,
    repeated_teachings: data.repeated_teachings,
    unique_insights: data.unique_insights,
    contradictions: data.contradictions,
    possibly_outdated: data.possibly_outdated,
    missing_steps: data.missing_steps,
    bonus_material: data.bonus_material,
    other_product_material: data.other_product_material,
    prompt_version: "ipmap-v1",
  });
  await db.insertOpportunities(
    job.project_id,
    data.opportunities.map((o) => ({
      title: o.title,
      audience: o.audience,
      transformation: o.transformation,
      rationale: o.rationale,
      missing_material_json: o.missing_material,
      strength_score: clamp(o.strength_score, 0, 1),
      is_recommended: o.is_recommended,
    })),
  );
  await db.insertGapQuestions(
    job.project_id,
    data.gap_questions.map((q) => ({ question: q.question, reason: q.reason })),
  );

  await db.recordUsage(job.project_id, project.user_id, {
    operation: "ip_map",
    model: config.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    estimated_cost_minor_units: estimateTextCostCents(
      config.model,
      usage.inputTokens,
      usage.outputTokens,
    ),
  });

  await db.updateProjectStatusIf(
    job.project_id,
    ["BUILDING_IP_MAP"],
    data.gap_questions.length > 0
      ? "AWAITING_GAP_ANSWERS"
      : "AWAITING_COURSE_SELECTION",
  );
}

function fatal(message, errorCode, userMessage) {
  const err = new Error(message);
  err.errorCode = errorCode;
  err.retryable = false;
  err.userMessage = userMessage ?? message;
  return err;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
