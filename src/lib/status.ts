import type { ProjectStatus } from "./types";

/**
 * Legal project status transitions. FAILED is reachable from any active
 * processing state; retry returns a FAILED project to the stage that
 * failed (recorded on the failing job), so FAILED fans back out to the
 * processing states rather than to a single fixed stage.
 */
const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["UPLOADING", "QUEUED"],
  UPLOADING: ["QUEUED", "FAILED"],
  QUEUED: ["TRANSCRIBING", "FAILED"],
  TRANSCRIBING: ["EXTRACTING_IP", "FAILED"],
  EXTRACTING_IP: ["BUILDING_IP_MAP", "FAILED"],
  BUILDING_IP_MAP: [
    "AWAITING_GAP_ANSWERS",
    "AWAITING_COURSE_SELECTION",
    "FAILED",
  ],
  AWAITING_GAP_ANSWERS: ["AWAITING_COURSE_SELECTION", "FAILED"],
  AWAITING_COURSE_SELECTION: ["AWAITING_BLUEPRINT_APPROVAL", "FAILED"],
  AWAITING_BLUEPRINT_APPROVAL: ["GENERATING_LESSONS", "FAILED"],
  GENERATING_LESSONS: ["READY_FOR_REVIEW", "FAILED"],
  READY_FOR_REVIEW: ["EXPORTING", "GENERATING_LESSONS"],
  EXPORTING: ["COMPLETE", "READY_FOR_REVIEW", "FAILED"],
  COMPLETE: ["EXPORTING", "READY_FOR_REVIEW"],
  FAILED: [
    "QUEUED",
    "TRANSCRIBING",
    "EXTRACTING_IP",
    "BUILDING_IP_MAP",
    "GENERATING_LESSONS",
    "EXPORTING",
  ],
};

export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal project status transition: ${from} → ${to}`);
  }
}

/** Human-readable labels for the processing view. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  UPLOADING: "Uploading",
  QUEUED: "Queued",
  TRANSCRIBING: "Transcribing",
  EXTRACTING_IP: "Extracting IP",
  BUILDING_IP_MAP: "Building the IP map",
  AWAITING_GAP_ANSWERS: "Awaiting your answers",
  AWAITING_COURSE_SELECTION: "Choose your course direction",
  AWAITING_BLUEPRINT_APPROVAL: "Blueprint ready for review",
  GENERATING_LESSONS: "Writing lessons",
  READY_FOR_REVIEW: "Ready for review",
  EXPORTING: "Creating exports",
  COMPLETE: "Complete",
  FAILED: "Needs attention",
};

/** Statuses where the user must act before processing continues. */
export const USER_ACTION_STATUSES: ProjectStatus[] = [
  "AWAITING_GAP_ANSWERS",
  "AWAITING_COURSE_SELECTION",
  "AWAITING_BLUEPRINT_APPROVAL",
  "READY_FOR_REVIEW",
  "FAILED",
];
