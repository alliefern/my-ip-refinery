/** Stage 8 — course positioning + curriculum blueprint. */

export const system = `You are a curriculum architect designing a mini-course from an expert's mined training library. You receive the creator's intent, the chosen course direction, the cross-training IP map, per-training syntheses, the extracted IP index and the creator's gap answers.

Design principles you never violate:
- Transformation before information: build the smallest coherent pathway to the promised student result. Do not turn every extracted item into a lesson.
- Organize around the student's learning journey, not the order the trainings were recorded. Justify each module's position.
- Place an achievable quick win early.
- Default to 3–6 modules and 8–20 lessons total unless the evidence clearly supports otherwise.
- Every lesson must be plannable from source material that actually exists (cite the source trainings per lesson). Where the creator's gap answers fill a hole, use them. If neither covers a lesson you believe is structurally necessary, still include it but give it a low source_strength score — never pretend support exists.
- Preserve the creator's exact framework names and terminology in titles and objectives.
- Material the IP map marked as bonus or off-path stays OUT of the core curriculum.
- Course titles and promises must be concrete and outcome-based. No hype words, no "unlock your potential" filler.
- Scores are honest assessments from 0 to 1: source_strength (how well the material covers this lesson), transformation_value (how much this lesson advances the promised result), creator_uniqueness (how distinctive this content is versus generic advice).`;

export function buildUserPrompt({
  intake,
  voice,
  opportunity,
  ipMap,
  syntheses,
  ipIndex,
  gapAnswers,
}) {
  const gapBlock =
    gapAnswers.length > 0
      ? gapAnswers
          .map((g) => `Q: ${g.question}\nA (creator-supplied): ${g.answer}`)
          .join("\n\n")
      : "None.";

  return `## Creator intent
${JSON.stringify(intake)}

Voice settings: ${JSON.stringify(voice)}

## Chosen course direction
${JSON.stringify(opportunity)}

## Cross-training IP map
${JSON.stringify(ipMap)}

## Training syntheses
${syntheses.map((s) => `### ${s.assetTitle}\n${JSON.stringify(s.synthesis)}`).join("\n\n")}

## Extracted IP index
${ipIndex
  .map(
    (item) =>
      `- [${item.type}] "${item.title}" (${item.assetTitle}): ${item.content}`,
  )
  .join("\n")}

## Creator gap answers
${gapBlock}

Design the course positioning and complete curriculum blueprint.`;
}

export const jsonSchema = {
  name: "course_blueprint",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      positioning: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          promise: { type: "string" },
          transformation: { type: "string" },
          audience: { type: "string" },
          ideal_student: { type: "string" },
          not_for: { type: "string" },
          prerequisites: { type: "string" },
          format_and_scope: { type: "string" },
          outcome_statement: { type: "string" },
          strategic_rationale: { type: "string" },
        },
        required: [
          "title",
          "subtitle",
          "promise",
          "transformation",
          "audience",
          "ideal_student",
          "not_for",
          "prerequisites",
          "format_and_scope",
          "outcome_statement",
          "strategic_rationale",
        ],
      },
      modules: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            purpose: { type: "string" },
            outcome: { type: "string" },
            rationale: { type: "string" },
            lessons: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  objective: { type: "string" },
                  source_trainings: { type: "array", items: { type: "string" } },
                  planned_elements: { type: "array", items: { type: "string" } },
                  source_strength: { type: "number" },
                  transformation_value: { type: "number" },
                  creator_uniqueness: { type: "number" },
                },
                required: [
                  "title",
                  "objective",
                  "source_trainings",
                  "planned_elements",
                  "source_strength",
                  "transformation_value",
                  "creator_uniqueness",
                ],
              },
            },
          },
          required: ["title", "purpose", "outcome", "rationale", "lessons"],
        },
      },
    },
    required: ["positioning", "modules"],
  },
};

export function validate(data) {
  const problems = [];
  if (!data?.positioning || !Array.isArray(data.modules)) {
    return ["positioning or modules missing"];
  }
  const p = data.positioning;
  for (const field of ["title", "promise", "transformation", "outcome_statement", "strategic_rationale"]) {
    if (!p[field]?.trim()) problems.push(`positioning.${field} empty`);
  }
  if (data.modules.length < 2 || data.modules.length > 7) {
    problems.push(`module count ${data.modules.length} outside 2–7`);
  }
  let lessonCount = 0;
  data.modules.forEach((mod, mi) => {
    if (!mod.title?.trim()) problems.push(`modules[${mi}].title empty`);
    if (!Array.isArray(mod.lessons) || mod.lessons.length === 0) {
      problems.push(`modules[${mi}] has no lessons`);
      return;
    }
    lessonCount += mod.lessons.length;
    mod.lessons.forEach((lesson, li) => {
      if (!lesson.title?.trim()) problems.push(`modules[${mi}].lessons[${li}].title empty`);
      if (!lesson.objective?.trim()) {
        problems.push(`modules[${mi}].lessons[${li}].objective empty`);
      }
      for (const field of ["source_strength", "transformation_value", "creator_uniqueness"]) {
        const v = lesson[field];
        if (typeof v !== "number" || v < 0 || v > 1) {
          problems.push(`modules[${mi}].lessons[${li}].${field} out of range`);
        }
      }
    });
  });
  if (lessonCount < 4 || lessonCount > 24) {
    problems.push(`total lesson count ${lessonCount} outside 4–24`);
  }
  return problems;
}
