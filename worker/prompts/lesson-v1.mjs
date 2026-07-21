/** Stage 9 — complete lesson generation. */

export const system = `You are ghost-writing one complete course lesson in the creator's voice, from their own training material. You receive the approved course positioning, this lesson's place in the curriculum, retrieved source material (transcript excerpts, extracted IP, creator-supplied gap answers), the neighbouring lessons, and voice settings.

Hard rules:
- Teach ONLY from the provided source material. Frameworks, stories, case studies, client results, statistics and quotes must come from the sources. If you add connective explanation the sources don't state, keep it minimal and list it in inferred_or_new_material — never hide it.
- Preserve the creator's exact framework names, terminology and distinctive phrases. Where a distinctive phrase from the sources fits naturally, use it.
- Write a COMPLETE lesson a student can learn from — flowing teaching prose, not bullet-point notes pretending to be a lesson.
- Prefer the creator's concrete examples and instructions over abstract explanation.
- Match the requested tone and language variant. No generic AI phrasing, no motivational filler, no "in today's fast-paced world", no "unlock", no "dive in".
- Respect the neighbours: do not re-teach what the previous lesson covered (reference it briefly instead), and end with a transition that sets up the next lesson.
- The opening hook is 1-3 sentences that make the student want this lesson — specific, not hype.`;

export function buildUserPrompt({
  positioning,
  moduleContext,
  lesson,
  previousLesson,
  nextLesson,
  voice,
  sources,
}) {
  return `## Course positioning
${JSON.stringify(positioning)}

## Module
${JSON.stringify(moduleContext)}

## This lesson
Title: ${lesson.title}
Objective: ${lesson.objective}
Planned elements: ${(lesson.planned_elements ?? []).join("; ") || "none specified"}

## Previous lesson
${previousLesson ? `"${previousLesson.title}" — ${previousLesson.objective}\nIts key takeaways:\n${previousLesson.takeaways}` : "None — this is the first lesson."}

## Next lesson
${nextLesson ? `"${nextLesson.title}" — ${nextLesson.objective}` : "None — this is the final lesson."}

## Voice settings
${JSON.stringify(voice)}

## Source material
${sources}

Write the complete lesson.`;
}

export const jsonSchema = {
  name: "lesson_content",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      opening_hook: { type: "string" },
      why_it_matters: { type: "string" },
      teaching_content_markdown: { type: "string" },
      steps: { type: "array", items: { type: "string" } },
      example_or_story: { type: "string" },
      common_mistakes: { type: "array", items: { type: "string" } },
      action_step: { type: "string" },
      exercise: { type: "string" },
      key_takeaways: { type: "array", items: { type: "string" } },
      transition_to_next: { type: "string" },
      source_usage: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            training_title: { type: "string" },
            used_for: { type: "string" },
          },
          required: ["training_title", "used_for"],
        },
      },
      inferred_or_new_material: { type: "array", items: { type: "string" } },
    },
    required: [
      "opening_hook",
      "why_it_matters",
      "teaching_content_markdown",
      "steps",
      "example_or_story",
      "common_mistakes",
      "action_step",
      "exercise",
      "key_takeaways",
      "transition_to_next",
      "source_usage",
      "inferred_or_new_material",
    ],
  },
};

export function validate(data) {
  const problems = [];
  if (!data) return ["empty response"];
  if (!data.opening_hook?.trim()) problems.push("opening_hook empty");
  if (!data.why_it_matters?.trim()) problems.push("why_it_matters empty");
  if ((data.teaching_content_markdown ?? "").trim().length < 400) {
    problems.push("teaching_content_markdown too short to be a complete lesson");
  }
  if (!data.action_step?.trim()) problems.push("action_step empty");
  if (!Array.isArray(data.key_takeaways) || data.key_takeaways.length < 2) {
    problems.push("need at least 2 key takeaways");
  }
  if (!Array.isArray(data.source_usage)) problems.push("source_usage missing");
  return problems;
}
