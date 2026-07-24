/**
 * Per-lesson source retrieval (MVP: lexical scoring, no embeddings).
 * The blueprint names each lesson's source trainings; retrieval pulls
 * those trainings' chunks and ranks them against the lesson's title,
 * objective and planned elements. Creator answers are always included.
 */

const STOPWORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "your", "you",
  "are", "was", "have", "has", "not", "but", "they", "them", "their",
  "what", "when", "how", "why", "will", "can", "into", "about", "one",
  "lesson", "module", "course", "student", "students",
]);

export function queryTerms(lesson, moduleTitle) {
  const text = [
    lesson.title,
    lesson.objective,
    moduleTitle,
    ...(lesson.planned_elements ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9']+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    ),
  ];
}

export function scoreChunk(terms, chunkText) {
  if (!chunkText) return 0;
  const haystack = chunkText.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += 1;
  }
  return score / Math.max(terms.length, 1);
}

/**
 * Rank chunks for a lesson. Chunks from the lesson's named source
 * trainings get a strong prior so blueprint intent wins ties.
 */
export function rankChunks(lesson, moduleTitle, chunks, namedAssetIds) {
  const terms = queryTerms(lesson, moduleTitle);
  return chunks
    .map((chunk) => ({
      chunk,
      score:
        scoreChunk(terms, chunk.clean_text) +
        (namedAssetIds.has(chunk.source_asset_id) ? 0.5 : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Assemble the retrieved material into the prompt's source block,
 * respecting a character budget. */
export function buildSourceBlock({ rankedChunks, ipItems, creatorAnswers, charBudget = 24000 }) {
  const parts = [];
  let used = 0;
  const usedChunks = [];

  for (const answer of creatorAnswers) {
    const block = `### Creator-supplied answer (gap question)\nQ: ${answer.question}\nA: ${answer.answer}`;
    parts.push(block);
    used += block.length;
  }

  for (const item of ipItems) {
    const block = `### Extracted IP [${item.type}] from "${item.assetTitle}"\n${item.title}: ${item.content}`;
    if (used + block.length > charBudget) break;
    parts.push(block);
    used += block.length;
  }

  for (const { chunk } of rankedChunks) {
    const location =
      chunk.start_seconds !== null && chunk.start_seconds !== undefined
        ? `≈${Math.floor(chunk.start_seconds)}s–${Math.floor(chunk.end_seconds)}s`
        : chunk.location_label || "written document";
    const block = `### Source excerpt from "${chunk.assetTitle}" (${location})\n${chunk.clean_text}`;
    if (used + block.length > charBudget) break;
    parts.push(block);
    used += block.length;
    usedChunks.push(chunk);
  }

  return { text: parts.join("\n\n"), usedChunks };
}
