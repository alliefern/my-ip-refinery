/** Stages 6–7 — cross-training IP map, course opportunities, gap questions. */

export const system = `You are a curriculum architect analyzing an expert's complete training library to find the strongest course hidden inside it. You receive per-training syntheses and an index of extracted IP items.

Your job:
1. Map the library: dominant themes, signature frameworks, teachings repeated across trainings, unique insights, contradictions between trainings, potentially outdated statements, and missing steps in otherwise complete processes.
2. Separate core-course material from bonus material and material that belongs in a different product entirely.
3. Propose one to three viable course opportunities — fewer is fine when the library clearly supports one direction. Score each by: source strength, clarity of transformation, audience relevance, creator uniqueness, feasibility as a mini-course, and how much material already exists. Exactly one opportunity must be recommended.
4. Write gap questions ONLY where missing material would force a course to invent content: incomplete frameworks, contradictory positions needing the creator's current stance, missing steps between taught stages. Each question must say why the answer is needed. Zero gap questions is a valid result.

Rules:
- Ground every claim in the provided material; cite training titles in rationales.
- Preserve exact framework names.
- A transformation is something a student can DO afterwards, stated concretely — not a vague feeling.
- Do not reward volume: repetition across trainings is a signal of importance, not extra course content.`;

export function buildUserPrompt({ intake, syntheses, ipIndex }) {
  const intakeBlock = `Creator's stated intent:
- Purpose: ${intake.coursePurpose ?? "unspecified"}
- Topic: ${intake.topic ?? "unspecified"}
- Desired student result: ${intake.studentResult ?? "unspecified"}
- Audience: ${intake.audience ?? "unspecified"}
- Depth preference: ${intake.depth ?? "unspecified"}`;

  const synthesesBlock = syntheses
    .map(
      (s) => `### ${s.assetTitle}
${JSON.stringify(s.synthesis)}`,
    )
    .join("\n\n");

  const ipBlock = ipIndex
    .map(
      (item) =>
        `- [${item.type}] "${item.title}" (${item.assetTitle}, distinctiveness ${item.distinctiveness}): ${item.content}`,
    )
    .join("\n");

  return `${intakeBlock}

## Training syntheses
${synthesesBlock}

## Extracted IP index
${ipBlock}

Produce the cross-training IP map, course opportunities and gap questions.`;
}

export const jsonSchema = {
  name: "ip_map",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      dominant_themes: { type: "array", items: { type: "string" } },
      signature_frameworks: { type: "array", items: { type: "string" } },
      repeated_teachings: { type: "array", items: { type: "string" } },
      unique_insights: { type: "array", items: { type: "string" } },
      contradictions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            topic: { type: "string" },
            positions: { type: "array", items: { type: "string" } },
            trainings: { type: "array", items: { type: "string" } },
          },
          required: ["topic", "positions", "trainings"],
        },
      },
      possibly_outdated: { type: "array", items: { type: "string" } },
      missing_steps: { type: "array", items: { type: "string" } },
      bonus_material: { type: "array", items: { type: "string" } },
      other_product_material: { type: "array", items: { type: "string" } },
      opportunities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            audience: { type: "string" },
            transformation: { type: "string" },
            rationale: { type: "string" },
            missing_material: { type: "array", items: { type: "string" } },
            strength_score: { type: "number" },
            is_recommended: { type: "boolean" },
          },
          required: [
            "title",
            "audience",
            "transformation",
            "rationale",
            "missing_material",
            "strength_score",
            "is_recommended",
          ],
        },
      },
      gap_questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            question: { type: "string" },
            reason: { type: "string" },
          },
          required: ["question", "reason"],
        },
      },
    },
    required: [
      "dominant_themes",
      "signature_frameworks",
      "repeated_teachings",
      "unique_insights",
      "contradictions",
      "possibly_outdated",
      "missing_steps",
      "bonus_material",
      "other_product_material",
      "opportunities",
      "gap_questions",
    ],
  },
};

export function validate(data) {
  const problems = [];
  if (!data) return ["empty response"];
  if (!Array.isArray(data.opportunities) || data.opportunities.length === 0) {
    problems.push("no opportunities returned");
  } else {
    if (data.opportunities.length > 3) problems.push("more than 3 opportunities");
    const recommended = data.opportunities.filter((o) => o.is_recommended);
    if (recommended.length !== 1) {
      problems.push("exactly one opportunity must be recommended");
    }
    data.opportunities.forEach((o, i) => {
      if (typeof o.strength_score !== "number" || o.strength_score < 0 || o.strength_score > 1) {
        problems.push(`opportunities[${i}].strength_score out of range`);
      }
      if (!o.title?.trim() || !o.transformation?.trim()) {
        problems.push(`opportunities[${i}] missing title/transformation`);
      }
    });
  }
  if (!Array.isArray(data.gap_questions)) {
    problems.push("gap_questions not an array");
  } else if (data.gap_questions.length > 8) {
    problems.push("too many gap questions");
  }
  return problems;
}
