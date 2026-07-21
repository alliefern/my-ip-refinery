import { limits } from "./config";

/** MIME types accepted for media uploads, per the build brief. */
export const SUPPORTED_MEDIA_MIME_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-m4v",
  "video/webm",
  "audio/mpeg", // .mp3
  "audio/mp4", // .m4a
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
] as const;

export const SUPPORTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/plain",
  "text/markdown",
] as const;

export type FileValidationError =
  | { code: "UNSUPPORTED_TYPE"; message: string }
  | { code: "FILE_TOO_LARGE"; message: string }
  | { code: "PROJECT_FILE_LIMIT"; message: string };

export function validateMediaFile(
  file: { mimeType: string; sizeBytes: number },
  existingMediaCount: number,
): FileValidationError | null {
  const supported = (SUPPORTED_MEDIA_MIME_TYPES as readonly string[]).includes(
    file.mimeType,
  );
  if (!supported) {
    return {
      code: "UNSUPPORTED_TYPE",
      message:
        "This file type isn't supported. Upload MP4, MOV, M4V, WebM, MP3, M4A or WAV.",
    };
  }
  if (file.sizeBytes > limits.maxFileBytes) {
    const gb = (limits.maxFileBytes / 1024 ** 3).toFixed(0);
    return {
      code: "FILE_TOO_LARGE",
      message: `This file is larger than the ${gb} GB per-file limit.`,
    };
  }
  if (existingMediaCount >= limits.maxFilesPerProject) {
    return {
      code: "PROJECT_FILE_LIMIT",
      message: `A project can contain up to ${limits.maxFilesPerProject} trainings.`,
    };
  }
  return null;
}

export function validateDocumentFile(file: {
  mimeType: string;
  sizeBytes: number;
}): FileValidationError | null {
  const supported = (
    SUPPORTED_DOCUMENT_MIME_TYPES as readonly string[]
  ).includes(file.mimeType);
  if (!supported) {
    return {
      code: "UNSUPPORTED_TYPE",
      message:
        "This file type isn't supported. Upload PDF, DOCX, PPTX, TXT or Markdown.",
    };
  }
  if (file.sizeBytes > 100 * 1024 * 1024) {
    return {
      code: "FILE_TOO_LARGE",
      message: "Supporting documents are limited to 100 MB.",
    };
  }
  return null;
}

/** Sanitize a filename for storage paths and export archives. */
export function safeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120) || "file";
}

/**
 * Compute chunk boundaries for audio splitting. Chunks are
 * `chunkSeconds` long with `overlapSeconds` of overlap so words at
 * boundaries are not lost; offsets are relative to the original media.
 */
export function computeChunkBoundaries(
  totalSeconds: number,
  chunkSeconds = 600,
  overlapSeconds = 5,
): { startSeconds: number; endSeconds: number }[] {
  if (totalSeconds <= 0) return [];
  if (chunkSeconds <= overlapSeconds) {
    throw new Error("chunkSeconds must exceed overlapSeconds");
  }
  const chunks: { startSeconds: number; endSeconds: number }[] = [];
  let start = 0;
  while (start < totalSeconds) {
    const end = Math.min(start + chunkSeconds, totalSeconds);
    chunks.push({ startSeconds: start, endSeconds: end });
    if (end >= totalSeconds) break;
    start = end - overlapSeconds;
  }
  return chunks;
}

export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}
