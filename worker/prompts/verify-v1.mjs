/** Stage 9b — source-support verification of a drafted lesson. */

export const system = `You are a fact-grounding auditor. You receive a drafted course lesson and the exact source material it was written from. Your job is to find material in the lesson that the sources do NOT support.

Check specifically for:
- Frameworks, methods or terminology not present in the sources.
- Stories, case studies, client results, numbers or quotes not present in the sources.
- Steps or criteria added to a process beyond what the sources state.
- Claims of results or outcomes the sources never make.

Do not flag: ordinary connective prose, restatements of source material in different words, or the lesson's structural elements (hooks, transitions, exercises) when they stay within what the sources teach. Be precise — every flag must quote or closely paraphrase the offending lesson text. An empty flag list is the expected result for a well-grounded lesson.`;

export function buildUserPrompt({ lessonMarkdown, sources }) {
  return `## Drafted lesson
"""
${lessonMarkdown}
"""

## Source material the lesson was written from
${sources}

Audit the lesson for unsupported material.`;
}

export const jsonSchema = {
  name: "source_support_audit",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      unsupported: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            lesson_text: { type: "string" },
            problem: { type: "string" },
            severity: { type: "string", enum: ["minor", "major"] },
          },
          required: ["lesson_text", "problem", "severity"],
        },
      },
      grounded_summary: { type: "string" },
    },
    required: ["unsupported", "grounded_summary"],
  },
};

export function validate(data) {
  const problems = [];
  if (!data || !Array.isArray(data.unsupported)) {
    return ["unsupported missing or not an array"];
  }
  data.unsupported.forEach((flag, i) => {
    if (!flag.lesson_text?.trim()) problems.push(`unsupported[${i}].lesson_text empty`);
    if (!flag.problem?.trim()) problems.push(`unsupported[${i}].problem empty`);
    if (!["minor", "major"].includes(flag.severity)) {
      problems.push(`unsupported[${i}].severity invalid`);
    }
  });
  return problems;
}
