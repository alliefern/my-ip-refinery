/**
 * Stage 9: lesson generation + source-support verification.
 * One project-level job walks the approved curriculum sequentially so
 * each lesson knows its neighbours (including the previous lesson's
 * actual takeaways). Idempotent: lessons that already have content are
 * skipped, so a retry resumes where it stopped.
 */

import * as lessonPrompt from "../prompts/lesson-v1.mjs";
import * as verifyPrompt from "../prompts/verify-v1.mjs";
import { estimateTextCostCents, runStructured } from "./llm.mjs";
import { buildSourceBlock, rankChunks } from "./retrieval.mjs";

const MAX_CHUNKS_PER_LESSON = 6;
const MAX_IP_ITEMS_PER_LESSON = 10;

export function assembleLessonMarkdown(sections) {
  const parts = [sections.opening_hook.trim()];
  parts.push(`## Why this matters\n\n${sections.why_it_matters.trim()}`);
  parts.push(sections.teaching_content_markdown.trim());
  if (sections.steps?.length) {
    parts.push(
      `## The steps\n\n${sections.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    );
  }
  if (sections.example_or_story?.trim()) {
    parts.push(`## From the trainings\n\n${sections.example_or_story.trim()}`);
  }
  if (sections.common_mistakes?.length) {
    parts.push(
      `## Common mistakes\n\n${sections.common_mistakes.map((m) => `- ${m}`).join("\n")}`,
    );
  }
  parts.push(`## Action step\n\n${sections.action_step.trim()}`);
  if (sections.exercise?.trim()) {
    parts.push(`## Exercise\n\n${sections.exercise.trim()}`);
  }
  parts.push(
    `## Key takeaways\n\n${sections.key_takeaways.map((t) => `- ${t}`).join("\n")}`,
  );
  if (sections.transition_to_next?.trim()) {
    parts.push(`*${sections.transition_to_next.trim()}*`);
  }
  return parts.join("\n\n");
}

async function generateOneLesson(db, config, context) {
  const {
    project,
    positioning,
    moduleRow,
    lessonRow,
    previousLesson,
    nextLesson,
    allChunks,
    ipItems,
    creatorAnswers,
    assetIdByTitle,
  } = context;

  const structure = lessonRow.lesson_structure_json ?? {};
  const namedAssetIds = new Set(
    (structure.source_trainings ?? [])
      .map((title) => assetIdByTitle.get(title))
      .filter(Boolean),
  );

  const lessonSpec = {
    title: lessonRow.title,
    objective: lessonRow.objective,
    planned_elements: structure.planned_elements ?? [],
  };
  const ranked = rankChunks(lessonSpec, moduleRow.title, allChunks, namedAssetIds).slice(
    0,
    MAX_CHUNKS_PER_LESSON,
  );
  const relevantIp = ipItems
    .filter(
      (item) =>
        namedAssetIds.size === 0 || namedAssetIds.has(item.source_asset_id),
    )
    .sort((a, b) => (b.distinctiveness_score ?? 0) - (a.distinctiveness_score ?? 0))
    .slice(0, MAX_IP_ITEMS_PER_LESSON);

  const { text: sourceBlock, usedChunks } = buildSourceBlock({
    rankedChunks: ranked,
    ipItems: relevantIp,
    creatorAnswers,
  });

  const usage = { inputTokens: 0, outputTokens: 0 };

  const { data: sections, usage: genUsage } = await runStructured(
    lessonPrompt,
    lessonPrompt.buildUserPrompt({
      positioning,
      moduleContext: {
        title: moduleRow.title,
        purpose: moduleRow.purpose,
        outcome: moduleRow.outcome,
      },
      lesson: lessonSpec,
      previousLesson,
      nextLesson,
      voice: project.voice_settings_json ?? {},
      sources: sourceBlock || "No source material retrieved — say so honestly and keep the lesson to what the objective strictly requires.",
    }),
    config,
  );
  usage.inputTokens += genUsage.inputTokens;
  usage.outputTokens += genUsage.outputTokens;

  const markdown = assembleLessonMarkdown(sections);

  // Separate source-support audit.
  const { data: audit, usage: auditUsage } = await runStructured(
    verifyPrompt,
    verifyPrompt.buildUserPrompt({ lessonMarkdown: markdown, sources: sourceBlock }),
    config,
  );
  usage.inputTokens += auditUsage.inputTokens;
  usage.outputTokens += auditUsage.outputTokens;

  const warnings = [
    ...sections.inferred_or_new_material.map(
      (m) => `Model-added material (not in sources): ${m}`,
    ),
    ...audit.unsupported.map(
      (f) => `${f.severity === "major" ? "Unsupported claim" : "Weakly supported"}: "${f.lesson_text}" — ${f.problem}`,
    ),
  ];

  await db.saveLessonGeneration(lessonRow.id, {
    content_markdown: markdown,
    lesson_structure_json: {
      ...structure,
      sections,
      warnings,
      audit_summary: audit.grounded_summary,
      prompt_version: "lesson-v1",
    },
    status: "DRAFT",
    updated_at: new Date().toISOString(),
  });

  await db.replaceLessonSources(
    lessonRow.id,
    usedChunks.map((chunk) => ({
      source_asset_id: chunk.source_asset_id,
      transcript_chunk_id: chunk.id,
      start_seconds: chunk.start_seconds,
      end_seconds: chunk.end_seconds,
      support_note: "Retrieved source material for this lesson",
      support_type: "source",
    })),
  );

  return { usage, takeaways: sections.key_takeaways };
}

async function loadProjectContext(db, projectId) {
  const project = await db.getProjectDetail(projectId);
  if (!project || project.deleted_at) {
    throw fatal("Project deleted", "PROJECT_DELETED");
  }
  const blueprint = await db.getApprovedBlueprint(projectId);
  if (!blueprint) {
    throw fatal(
      "No approved blueprint",
      "INSUFFICIENT_SOURCE",
      "Approve the blueprint before generating lessons.",
    );
  }
  const assets = await db.listContentAssets(projectId);
  const assetIdByTitle = new Map(assets.map((a) => [a.display_title, a.id]));
  const allChunks = await db.listAllProjectChunks(projectId);
  const assetTitle = new Map(assets.map((a) => [a.id, a.display_title]));
  const ipItems = (await db.listProjectIpItems(projectId)).map((item) => ({
    ...item,
    assetTitle: assetTitle.get(item.source_asset_id) ?? "unknown",
  }));
  const creatorAnswers = await db.listAnsweredGapQuestions(projectId);
  return {
    project,
    blueprint,
    positioning: blueprint.positioning_json ?? {},
    assetIdByTitle,
    allChunks,
    ipItems,
    creatorAnswers,
  };
}

/** generate_lessons job: walk the whole approved curriculum. */
export async function runGenerateLessons(db, job) {
  const base = await loadProjectContext(db, job.project_id);
  const config = {
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
  };
  await db.updateProjectStatusIf(
    job.project_id,
    ["AWAITING_BLUEPRINT_APPROVAL", "READY_FOR_REVIEW"],
    "GENERATING_LESSONS",
  );

  const modules = await db.listBlueprintModules(base.blueprint.id);
  const flat = [];
  for (const moduleRow of modules) {
    const lessons = await db.listModuleLessons(moduleRow.id);
    for (const lessonRow of lessons) flat.push({ moduleRow, lessonRow });
  }
  if (flat.length === 0) {
    throw fatal("Blueprint has no lessons", "INSUFFICIENT_SOURCE");
  }

  const totals = { inputTokens: 0, outputTokens: 0 };
  let previousLesson = null;

  for (let i = 0; i < flat.length; i++) {
    const { moduleRow, lessonRow } = flat[i];
    const next = flat[i + 1];

    if (lessonRow.content_markdown && lessonRow.content_markdown.length > 0) {
      // Already generated (retry resume); carry its takeaways forward.
      previousLesson = {
        title: lessonRow.title,
        objective: lessonRow.objective,
        takeaways:
          (lessonRow.lesson_structure_json?.sections?.key_takeaways ?? [])
            .map((t) => `- ${t}`)
            .join("\n") || "(not recorded)",
      };
      continue;
    }

    const { usage, takeaways } = await generateOneLesson(db, config, {
      ...base,
      moduleRow,
      lessonRow,
      previousLesson,
      nextLesson: next
        ? { title: next.lessonRow.title, objective: next.lessonRow.objective }
        : null,
    });
    totals.inputTokens += usage.inputTokens;
    totals.outputTokens += usage.outputTokens;
    previousLesson = {
      title: lessonRow.title,
      objective: lessonRow.objective,
      takeaways: takeaways.map((t) => `- ${t}`).join("\n"),
    };
    await db.setProgress(job.id, Math.round(((i + 1) / flat.length) * 100));
  }

  if (totals.inputTokens > 0) {
    await db.recordUsage(job.project_id, base.project.user_id, {
      operation: "lesson_generation",
      model: config.model,
      input_tokens: totals.inputTokens,
      output_tokens: totals.outputTokens,
      estimated_cost_minor_units: estimateTextCostCents(
        config.model,
        totals.inputTokens,
        totals.outputTokens,
      ),
    });
  }
  await db.updateProjectStatusIf(
    job.project_id,
    ["GENERATING_LESSONS"],
    "READY_FOR_REVIEW",
  );
}

/** regenerate_lesson job: one lesson, preserving the previous draft. */
export async function runRegenerateLesson(db, job) {
  const lessonId = job.idempotency_key.split(":")[1];
  const lessonRow = await db.getLessonRow(lessonId);
  if (!lessonRow) throw fatal("Lesson missing", "PROJECT_DELETED");

  const base = await loadProjectContext(db, job.project_id);
  const config = {
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
  };

  // Locate module + neighbours from the approved curriculum.
  const modules = await db.listBlueprintModules(base.blueprint.id);
  let moduleRow = null;
  let previousLesson = null;
  let nextLesson = null;
  outer: for (const mod of modules) {
    const lessons = await db.listModuleLessons(mod.id);
    for (let i = 0; i < lessons.length; i++) {
      if (lessons[i].id === lessonId) {
        moduleRow = mod;
        const prev = lessons[i - 1];
        if (prev) {
          previousLesson = {
            title: prev.title,
            objective: prev.objective,
            takeaways:
              (prev.lesson_structure_json?.sections?.key_takeaways ?? [])
                .map((t) => `- ${t}`)
                .join("\n") || "(not recorded)",
          };
        }
        const next = lessons[i + 1];
        if (next) nextLesson = { title: next.title, objective: next.objective };
        break outer;
      }
    }
  }
  if (!moduleRow) throw fatal("Lesson not in approved blueprint", "PROJECT_DELETED");

  // Preserve the outgoing draft so regeneration is reversible.
  const structure = lessonRow.lesson_structure_json ?? {};
  const preserved = {
    ...structure,
    previous_draft: lessonRow.content_markdown,
    regeneration_count: (structure.regeneration_count ?? 0) + 1,
  };
  await db.saveLessonGeneration(lessonId, {
    lesson_structure_json: preserved,
    content_markdown: "",
    version: (lessonRow.version ?? 1) + 1,
  });

  const refreshed = await db.getLessonRow(lessonId);
  const { usage } = await generateOneLesson(db, config, {
    ...base,
    moduleRow,
    lessonRow: refreshed,
    previousLesson,
    nextLesson,
  });

  await db.recordUsage(job.project_id, base.project.user_id, {
    operation: "lesson_regeneration",
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
