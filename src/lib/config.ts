/**
 * Central app configuration. Branding is replaceable configuration,
 * not hard-coded identity — change NEXT_PUBLIC_BRAND_NAME and the
 * whole UI follows.
 */

export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "My IP Refinery",
  tagline: "Turn the expertise buried in your training archive into a course",
  domain: process.env.NEXT_PUBLIC_APP_URL ?? "https://myiprefinery.com",
} as const;

export const isDemoMode = () => process.env.DEMO_MODE !== "false";

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const limits = {
  maxFilesPerProject: intFromEnv("MAX_FILES_PER_PROJECT", 10),
  maxFileBytes: intFromEnv("MAX_FILE_BYTES", 4 * 1024 * 1024 * 1024),
  maxTotalDurationMinutes: intFromEnv("MAX_TOTAL_DURATION_MINUTES", 720),
  maxActiveProjectsPerUser: intFromEnv("MAX_ACTIVE_PROJECTS_PER_USER", 3),
  maxRegenerationsPerLesson: intFromEnv("MAX_REGENERATIONS_PER_LESSON", 5),
} as const;

export const models = {
  text: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1",
  transcription: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-transcribe",
} as const;
