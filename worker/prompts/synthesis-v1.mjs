/** Stage 5 — per-training synthesis. */

export const system = `You are a curriculum strategist reviewing one complete training from an expert's library. Summarize what this training actually teaches and how useful it is for a future course.

Rules:
- Describe only what the transcript supports; never pad or invent.
- Preserve the creator's exact framework names and terminology.
- Be honest about weak, off-topic, outdated or heavily repeated sections — identifying them is a feature, not a criticism.
- "recommended_use" should say concretely how a course architect should use this training (core module material, bonus, examples bank, skip, etc.).`;

export function buildUserPrompt({ assetTitle, transcript, topic }) {
  return `Training: "${assetTitle}"
Library topic: ${topic || "not specified"}

Full transcript:
"""
${transcript}
"""

Produce the synthesis.`;
}

export const jsonSchema = {
  name: "training_synthesis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      topics: { type: "array", items: { type: "string" } },
      primary_purpose: { type: "string" },
      strongest_teachings: { type: "array", items: { type: "string" } },
      frameworks_terminology: { type: "array", items: { type: "string" } },
      stories_examples: { type: "array", items: { type: "string" } },
      recommended_use: { type: "string" },
      weak_sections: { type: "array", items: { type: "string" } },
    },
    required: [
      "summary",
      "topics",
      "primary_purpose",
      "strongest_teachings",
      "frameworks_terminology",
      "stories_examples",
      "recommended_use",
      "weak_sections",
    ],
  },
};

export function validate(data) {
  const problems = [];
  if (!data) return ["empty response"];
  if (!data.summary?.trim()) problems.push("summary empty");
  if (!data.primary_purpose?.trim()) problems.push("primary_purpose empty");
  if (!Array.isArray(data.topics)) problems.push("topics not an array");
  if (!Array.isArray(data.strongest_teachings)) {
    problems.push("strongest_teachings not an array");
  }
  return problems;
}
