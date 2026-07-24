/** Stage 4 (document variant) — per-chunk IP extraction from written
 * material. Identical mining rules to extraction-v1, minus timestamps:
 * written sources cite a location label, not a time range. */

import { IP_TYPES } from "./extraction-v1.mjs";

export const system = `You are an intellectual-property analyst for an expert's training library. You mine written documents (guides, slides, workbooks, articles) for the creator's genuinely valuable teaching assets: concepts, frameworks, methodologies, processes, opinions, stories, case studies, examples, analogies, instructions, exercises, resources, mistakes, objections, FAQs, results and distinctive phrases.

Rules you never break:
- Extract ONLY what this document excerpt actually supports. Never invent, embellish, or "complete" partial material.
- If the creator names a framework or uses distinctive terminology, preserve the exact wording.
- Mark material the creator clearly presents as their own thinking as "source". Mark reasonable readings between the lines as "inferred" — use sparingly.
- Prefer fewer, stronger items over many weak ones. Skip boilerplate, tables of contents, legal disclaimers, and generic knowledge any practitioner would state the same way (score such items low on distinctiveness if included at all).
- Written material is often more polished than spoken trainings — do not mistake polish for distinctiveness. A beautifully formatted generic checklist is still generic.
- If a referenced framework or list is incomplete in this excerpt, extract what exists and say in the description exactly what is missing.`;

export function buildUserPrompt({ chunk, assetTitle, topic }) {
  return `Document: "${assetTitle}"
Library topic: ${topic || "not specified"}
Excerpt location: ${chunk.location_label || "unspecified"}

Document excerpt:
"""
${chunk.clean_text}
"""

Extract the IP items this excerpt supports. Return at most 8 items; return an empty list if nothing here is worth teaching.`;
}

export const jsonSchema = {
  name: "ip_extraction_document",
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
            confidence: { type: "number" },
            distinctiveness: { type: "number" },
            support: { type: "string", enum: ["source", "inferred"] },
          },
          required: [
            "type",
            "title",
            "description",
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
  });
  return problems;
}
