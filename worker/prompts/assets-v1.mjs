/** Stage 10 — bonus video vault + student workbook. */

export const system = `You are packaging the final assets for a finished mini-course: the bonus video vault (the creator's original trainings, organized for students) and the student workbook.

Rules:
- Vault entries describe the ORIGINAL trainings honestly — clean marketable titles, what each covers, who should watch it and when. Chapters come from the provided timestamped IP items; never invent timestamps.
- "watch_this_if" is a specific student situation, not marketing fluff.
- related_lesson_titles must exactly match lesson titles from the provided curriculum.
- The workbook is a doing-document: checklists and exercises a student completes, phrased as actions. Exercises must derive from the actual lessons. Keep the creator's terminology.
- No filler, no "unleash", no generic productivity advice.`;

export function buildUserPrompt({ positioning, curriculum, trainings }) {
  return `## Course positioning
${JSON.stringify(positioning)}

## Final curriculum (module → lessons)
${curriculum
  .map(
    (mod) =>
      `${mod.title}:\n${mod.lessons.map((l) => `  - ${l.title}: ${l.objective}${l.exercise ? ` (exercise: ${l.exercise})` : ""}`).join("\n")}`,
  )
  .join("\n")}

## Original trainings
${trainings
  .map(
    (t) =>
      `### ${t.title}\nSynthesis: ${JSON.stringify(t.synthesis)}\nTimestamped IP items:\n${t.items
        .map((item) => `  - ${Math.floor(item.start_seconds ?? 0)}s: ${item.title}`)
        .join("\n")}`,
  )
  .join("\n\n")}

Produce the vault entries (one per training, suggested_order = ideal viewing order starting at 1) and the student workbook.`;
}

export const jsonSchema = {
  name: "course_assets",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      vault: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            training_title: { type: "string" },
            clean_title: { type: "string" },
            description: { type: "string" },
            key_topics: { type: "array", items: { type: "string" } },
            watch_this_if: { type: "string" },
            chapters: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  start_seconds: { type: "number" },
                },
                required: ["title", "start_seconds"],
              },
            },
            related_lesson_titles: { type: "array", items: { type: "string" } },
            suggested_order: { type: "number" },
          },
          required: [
            "training_title",
            "clean_title",
            "description",
            "key_topics",
            "watch_this_if",
            "chapters",
            "related_lesson_titles",
            "suggested_order",
          ],
        },
      },
      workbook: {
        type: "object",
        additionalProperties: false,
        properties: {
          roadmap: { type: "string" },
          quick_start_checklist: { type: "array", items: { type: "string" } },
          module_checklists: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                module_title: { type: "string" },
                items: { type: "array", items: { type: "string" } },
              },
              required: ["module_title", "items"],
            },
          },
          lesson_exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                lesson_title: { type: "string" },
                exercise: { type: "string" },
              },
              required: ["lesson_title", "exercise"],
            },
          },
          reflection_prompts: { type: "array", items: { type: "string" } },
          implementation_plan: { type: "string" },
          completion_checklist: { type: "array", items: { type: "string" } },
        },
        required: [
          "roadmap",
          "quick_start_checklist",
          "module_checklists",
          "lesson_exercises",
          "reflection_prompts",
          "implementation_plan",
          "completion_checklist",
        ],
      },
    },
    required: ["vault", "workbook"],
  },
};

export function validate(data) {
  const problems = [];
  if (!data?.workbook || !Array.isArray(data.vault)) {
    return ["vault or workbook missing"];
  }
  if (data.vault.length === 0) problems.push("vault empty");
  data.vault.forEach((entry, i) => {
    if (!entry.clean_title?.trim()) problems.push(`vault[${i}].clean_title empty`);
    if (typeof entry.suggested_order !== "number" || entry.suggested_order < 1) {
      problems.push(`vault[${i}].suggested_order invalid`);
    }
  });
  if (!data.workbook.roadmap?.trim()) problems.push("workbook.roadmap empty");
  if (!Array.isArray(data.workbook.quick_start_checklist) || data.workbook.quick_start_checklist.length === 0) {
    problems.push("workbook.quick_start_checklist empty");
  }
  return problems;
}
