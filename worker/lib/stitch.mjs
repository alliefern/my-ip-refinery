/**
 * Transcript stitching. Adjacent chunks share a few seconds of audio,
 * so their texts usually share a word run at the boundary. We find the
 * longest matching run (normalized comparison) between the end of one
 * chunk and the start of the next, and drop the duplicate words from
 * the next chunk.
 */

const MAX_OVERLAP_WORDS = 40;
const MIN_OVERLAP_WORDS = 3;

function normalizeWord(word) {
  return word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
}

/**
 * Remove the duplicated prefix of `nextText` that repeats the suffix
 * of `prevText`. Returns nextText unchanged when no confident overlap
 * is found.
 */
export function dedupeOverlap(prevText, nextText) {
  const prevWords = prevText.trim().split(/\s+/).filter(Boolean);
  const nextWords = nextText.trim().split(/\s+/).filter(Boolean);
  const limit = Math.min(MAX_OVERLAP_WORDS, prevWords.length, nextWords.length);

  for (let k = limit; k >= MIN_OVERLAP_WORDS; k--) {
    const prevTail = prevWords.slice(-k).map(normalizeWord).join(" ");
    const nextHead = nextWords.slice(0, k).map(normalizeWord).join(" ");
    if (prevTail === nextHead) {
      return nextWords.slice(k).join(" ");
    }
  }
  return nextWords.join(" ");
}

/** Stitch ordered chunk texts into one readable transcript. */
export function stitchChunks(texts) {
  if (texts.length === 0) return "";
  const parts = [texts[0].trim()];
  for (let i = 1; i < texts.length; i++) {
    const deduped = dedupeOverlap(parts[parts.length - 1], texts[i]);
    if (deduped) parts.push(deduped);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Light cleanup that never rewrites meaning: collapse whitespace and
 * normalize spacing around punctuation.
 */
export function normalizeTranscript(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}
