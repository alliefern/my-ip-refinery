/**
 * Domain types and status enums. These mirror the database schema in
 * supabase/migrations and drive the UI. Keep the string values in sync
 * with the Postgres enums.
 */

export const PROJECT_STATUSES = [
  "DRAFT",
  "UPLOADING",
  "QUEUED",
  "TRANSCRIBING",
  "EXTRACTING_IP",
  "BUILDING_IP_MAP",
  "AWAITING_GAP_ANSWERS",
  "AWAITING_COURSE_SELECTION",
  "AWAITING_BLUEPRINT_APPROVAL",
  "GENERATING_LESSONS",
  "READY_FOR_REVIEW",
  "EXPORTING",
  "COMPLETE",
  "FAILED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ASSET_KINDS = [
  "video",
  "audio",
  "slide_deck",
  "workbook",
  "note",
  "creator_answer",
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_STATUSES = [
  "UPLOADING",
  "UPLOADED",
  "PREPARING_AUDIO",
  "TRANSCRIBING",
  "TRANSCRIBED",
  "EXTRACTING",
  "READY",
  "FAILED",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const IP_ITEM_TYPES = [
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
] as const;
export type IpItemType = (typeof IP_ITEM_TYPES)[number];

export const SUPPORT_TYPES = [
  "source",
  "creator_answer",
  "inferred",
  "suggested",
] as const;
export type SupportType = (typeof SUPPORT_TYPES)[number];

export const LESSON_STATUSES = ["DRAFT", "REVIEW", "APPROVED"] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export const JOB_STATUSES = [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const GAP_QUESTION_STATUSES = [
  "OPEN",
  "ANSWERED",
  "SKIPPED",
] as const;
export type GapQuestionStatus = (typeof GAP_QUESTION_STATUSES)[number];

// ── Entities ─────────────────────────────────────────────────────────

export interface Project {
  id: string;
  userId: string;
  name: string;
  status: ProjectStatus;
  selectedCourseOpportunityId: string | null;
  intake: ProjectIntake;
  voiceSettings: VoiceSettings;
  ipMap: IpMapSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** Cross-training analysis stored on the project (stage 6 output). */
export interface IpMapSummary {
  dominant_themes?: string[];
  signature_frameworks?: string[];
  repeated_teachings?: string[];
  unique_insights?: string[];
  contradictions?: { topic: string; positions: string[]; trainings: string[] }[];
  possibly_outdated?: string[];
  missing_steps?: string[];
  bonus_material?: string[];
  other_product_material?: string[];
}

export interface ProjectIntake {
  coursePurpose:
    | "paid_mini_course"
    | "lead_magnet"
    | "client_onboarding"
    | "bonus_programme"
    | "internal_training"
    | "other";
  topic: string;
  studentResult: string;
  resultTimeframe?: string;
  audience?: string;
  audienceKnowledge?: string;
  audienceProblem?: string;
  audienceTried?: string;
  audienceEndAbility?: string;
  depth: "quick_win" | "mini_course" | "comprehensive";
  preferredModuleCount?: number;
  preferredLessonLength?: string;
  excludedTopics?: string;
  requiredFrameworks?: string;
  isPaid?: boolean;
  targetPrice?: string;
  nextStep?: string;
}

export interface VoiceSettings {
  languageVariant: "uk" | "us" | "au" | "custom";
  tone:
    | "conversational"
    | "polished"
    | "provocative"
    | "academic"
    | "warm"
    | "custom";
  customTone?: string;
  profanity: "none" | "light" | "natural" | "preserve_source";
  preserveSignaturePhrases: boolean;
}

export interface SourceAsset {
  id: string;
  projectId: string;
  kind: AssetKind;
  originalFilename: string;
  displayTitle: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  status: AssetStatus;
  errorMessage: string | null;
  originalDeletedAt: string | null;
  createdAt: string;
}

export interface TranscriptChunk {
  id: string;
  sourceAssetId: string;
  sequenceNumber: number;
  startSeconds: number;
  endSeconds: number;
  cleanText: string;
}

export interface IpItem {
  id: string;
  projectId: string;
  sourceAssetId: string;
  transcriptChunkId: string | null;
  type: IpItemType;
  title: string;
  content: string;
  startSeconds: number | null;
  endSeconds: number | null;
  confidenceScore: number;
  distinctivenessScore: number;
  supportType: SupportType;
}

export interface CourseOpportunity {
  id: string;
  projectId: string;
  title: string;
  audience: string;
  transformation: string;
  rationale: string;
  missingMaterial: string[];
  strengthScore: number;
  isRecommended: boolean;
}

export interface GapQuestion {
  id: string;
  projectId: string;
  question: string;
  reason: string;
  answer: string | null;
  status: GapQuestionStatus;
}

export interface CourseBlueprint {
  id: string;
  projectId: string;
  version: number;
  title: string;
  subtitle: string;
  promise: string;
  transformation: string;
  audience: string;
  positioning: BlueprintPositioning;
  status: "DRAFT" | "APPROVED";
  approvedAt: string | null;
}

export interface BlueprintPositioning {
  idealStudent: string;
  notFor: string;
  prerequisites: string;
  formatAndScope: string;
  outcomeStatement: string;
  strategicRationale: string;
}

export interface Module {
  id: string;
  courseBlueprintId: string;
  position: number;
  title: string;
  purpose: string;
  outcome: string;
  rationale: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  position: number;
  title: string;
  objective: string;
  contentMarkdown: string;
  sourceStrengthScore: number;
  transformationValueScore: number;
  creatorUniquenessScore: number;
  status: LessonStatus;
  version: number;
  updatedAt: string;
  warnings: string[];
}

export interface LessonSource {
  id: string;
  lessonId: string;
  sourceAssetId: string;
  transcriptChunkId: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
  supportNote: string;
  supportType: SupportType;
}

export interface ProcessingJob {
  id: string;
  projectId: string;
  sourceAssetId: string | null;
  jobType: string;
  status: JobStatus;
  progressPercent: number;
  attemptCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface VaultEntry {
  id: string;
  projectId: string;
  sourceAssetId: string;
  cleanTitle: string;
  description: string;
  keyTopics: string[];
  watchThisIf: string;
  chapters: { title: string; startSeconds: number }[];
  relatedLessonIds: string[];
  suggestedOrder: number;
}

export interface UsageEvent {
  id: string;
  projectId: string;
  operation: string;
  model: string | null;
  audioSeconds: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostMinorUnits: number;
  createdAt: string;
}
