/** Stage 4 — per-chunk IP extraction. */

export const IP_TYPES = [
  "concept",
  "signature_framework",
  "named_methodology",
  "step_or_process",
  "strong_opinion",
  "story",
  "case_study",
  "example",
  "analogy",
  "instruction",
  "exercise",
  "template_or_resource",
  "common_mistake",
  "objection",
  "faq",
  "result_or_claim",
  "distinctive_phrase",
];

export const system = `You are an intellectual-property analyst for an expert's training library. You mine transcripts for the creator's genuinely valuable teaching assets: concepts, frameworks, methodologies, processes, opinions, stories, case studies, examples, analogies, instructions, exercises, resources, mistakes, objections, FAQs, results and distinctive phrases.

Rules you never break:
- Extract ONLY what this transcript excerpt actually supports. Never invent, embellish, or "complete" partial material.
- If the creator names a framework or uses distinctive terminology, preserve the exact wording.
- Mark material the creator clearly presents as their own thinking as "source". Mark reasonable readings between the lines as "inferred" — use sparingly.
- Prefer fewer, stronger items over many weak ones. Skip filler, logistics ("let me share my screen"), and generic knowledge any practitioner would state the same way (score such items low on distinctiveness if included at all).
- Estimated timestamps must stay inside the excerpt's time range.
- If a referenced framework or list is incomplete in this excerpt (e.g. "the five criteria on the slide" but only three are spoken), extract what exists and say in the description exactly what is missing.`;

export function buildUserPrompt({ chunk, assetTitle, topic }) {
  return `Training: "${assetTitle}"
Library topic: ${topic || "not specified"}
Excerpt time range: ${Math.floor(chunk.start_seconds)}s to ${Math.floor(chunk.end_seconds)}s

Transcript excerpt:
"""
${chunk.clean_text}
"""

Extract the IP items this excerpt supports. Return at most 8 items; return an empty list if nothing here is worth teaching.`;
}

export const jsonSchema = {
  name: "ip_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", enum: IP_TYPES },
            title: { type: "string" },
            description: { type: "string" },
            start_seconds: { type: "number" },
            end_seconds: { type: "number" },
            confidence: { type: "number" },
            distinctiveness: { type: "number" },
            support: { type: "string", enum: ["source", "inferred"] },
          },
          required: [
            "type",
            "title",
            "description",
            "start_seconds",
            "end_seconds",
            "confidence",
            "distinctiveness",
            "support",
          ],
        },
      },
    },
    required: ["items"],
  },
};

export function validate(data) {
  const problems = [];
  if (!data || !Array.isArray(data.items)) {
    return ["items missing or not an array"];
  }
  if (data.items.length > 8) problems.push("more than 8 items");
  data.items.forEach((item, i) => {
    if (!IP_TYPES.includes(item.type)) problems.push(`items[${i}].type invalid`);
    if (!item.title?.trim()) problems.push(`items[${i}].title empty`);
    if (!item.description?.trim()) problems.push(`items[${i}].description empty`);
    for (const field of ["confidence", "distinctiveness"]) {
      const v = item[field];
      if (typeof v !== "number" || v < 0 || v > 1) {
        problems.push(`items[${i}].${field} out of range`);
      }
    }
    if (
      typeof item.start_seconds !== "number" ||
      typeof item.end_seconds !== "number" ||
      item.end_seconds < item.start_seconds
    ) {
      problems.push(`items[${i}] timestamps invalid`);
    }
  });
  return problems;
}
