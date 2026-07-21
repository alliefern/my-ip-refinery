/**
 * Stage 10: generate_course_assets job — bonus vault + workbook.
 * Runs after lessons are complete; replaces prior outputs on retry.
 */

import * as assetsPrompt from "../prompts/assets-v1.mjs";
import { estimateTextCostCents, runStructured } from "./llm.mjs";

export async function runGenerateCourseAssets(db, job) {
  const project = await db.getProjectDetail(job.project_id);
  if (!project || project.deleted_at) {
    throw fatal("Project deleted", "PROJECT_DELETED");
  }
  const blueprint = await db.getApprovedBlueprint(job.project_id);
  if (!blueprint) {
    throw fatal(
      "No approved blueprint",
      "INSUFFICIENT_SOURCE",
      "Approve the blueprint and generate lessons first.",
    );
  }
  const config = {
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
  };

  const modules = await db.listBlueprintModules(blueprint.id);
  const curriculum = [];
  const lessonIdByTitle = new Map();
  for (const mod of modules) {
    const lessons = await db.listModuleLessons(mod.id);
    curriculum.push({
      title: mod.title,
      lessons: lessons.map((l) => ({
        title: l.title,
        objective: l.objective,
        exercise: l.lesson_structure_json?.sections?.exercise ?? null,
      })),
    });
    lessons.forEach((l) => lessonIdByTitle.set(l.title, l.id));
  }

  const assets = await db.listMediaAssets(job.project_id);
  const mediaAssets = assets.filter((a) => a.status === "READY");
  if (mediaAssets.length === 0) {
    throw fatal("No processed trainings", "INSUFFICIENT_SOURCE");
  }
  const assetIdByTitle = new Map(mediaAssets.map((a) => [a.display_title, a.id]));
  const itemsByAsset = new Map();
  for (const item of await db.listProjectIpItemsDetailed(job.project_id)) {
    const list = itemsByAsset.get(item.source_asset_id) ?? [];
    list.push(item);
    itemsByAsset.set(item.source_asset_id, list);
  }

  const { data, usage } = await runStructured(
    assetsPrompt,
    assetsPrompt.buildUserPrompt({
      positioning: blueprint.positioning_json ?? {},
      curriculum,
      trainings: mediaAssets.map((a) => ({
        title: a.display_title,
        synthesis: a.synthesis_json ?? {},
        items: (itemsByAsset.get(a.id) ?? [])
          .filter((item) => item.start_seconds !== null)
          .sort((x, y) => x.start_seconds - y.start_seconds)
          .slice(0, 12),
      })),
    }),
    config,
  );

  await db.replaceVaultEntries(
    job.project_id,
    data.vault
      .filter((entry) => assetIdByTitle.has(entry.training_title))
      .map((entry) => ({
        source_asset_id: assetIdByTitle.get(entry.training_title),
        clean_title: entry.clean_title,
        description: entry.description,
        key_topics: entry.key_topics,
        watch_this_if: entry.watch_this_if,
        chapters_json: entry.chapters,
        related_lesson_ids: entry.related_lesson_titles
          .map((title) => lessonIdByTitle.get(title))
          .filter(Boolean),
        suggested_order: Math.round(entry.suggested_order),
      })),
  );
  await db.saveProjectWorkbook(job.project_id, {
    ...data.workbook,
    prompt_version: "assets-v1",
  });

  await db.recordUsage(job.project_id, project.user_id, {
    operation: "course_assets",
    model: config.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    estimated_cost_minor_units: estimateTextCostCents(
      config.model,
      usage.inputTokens,
      usage.outputTokens,
    ),
  });
}

function fatal(message, errorCode, userMessage) {
  const err = new Error(message);
  err.errorCode = errorCode;
  err.retryable = false;
  err.userMessage = userMessage ?? message;
  return err;
}
