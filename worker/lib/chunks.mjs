/**
 * Chunk boundary computation — mirrors src/lib/validation.ts
 * (computeChunkBoundaries) in the web app; both are unit tested.
 * 600s of 32 kbps mono MP3 ≈ 2.4 MB, far below the transcription
 * API's 25 MB limit.
 */
export function computeChunkBoundaries(
  totalSeconds,
  chunkSeconds = 600,
  overlapSeconds = 5,
) {
  if (totalSeconds <= 0) return [];
  if (chunkSeconds <= overlapSeconds) {
    throw new Error("chunkSeconds must exceed overlapSeconds");
  }
  const chunks = [];
  let start = 0;
  while (start < totalSeconds) {
    const end = Math.min(start + chunkSeconds, totalSeconds);
    chunks.push({ startSeconds: start, endSeconds: end });
    if (end >= totalSeconds) break;
    start = end - overlapSeconds;
  }
  return chunks;
}
