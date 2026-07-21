import type {
  CourseBlueprint,
  CourseOpportunity,
  GapQuestion,
  IpItem,
  Lesson,
  LessonSource,
  Module,
  ProcessingJob,
  Project,
  SourceAsset,
  TranscriptChunk,
  UsageEvent,
  VaultEntry,
  Workbook,
} from "../types";

/**
 * All methods are scoped to a user id; implementations must enforce
 * ownership (demo: trivially; supabase: via RLS plus explicit checks).
 */
export interface DataSource {
  listProjects(userId: string): Promise<Project[]>;
  getProject(userId: string, projectId: string): Promise<Project | null>;

  listAssets(userId: string, projectId: string): Promise<SourceAsset[]>;
  listChunks(userId: string, assetId: string): Promise<TranscriptChunk[]>;
  listIpItems(userId: string, projectId: string): Promise<IpItem[]>;
  listOpportunities(
    userId: string,
    projectId: string,
  ): Promise<CourseOpportunity[]>;
  listGapQuestions(userId: string, projectId: string): Promise<GapQuestion[]>;
  answerGapQuestion(
    userId: string,
    questionId: string,
    answer: string,
  ): Promise<void>;

  getBlueprint(
    userId: string,
    projectId: string,
  ): Promise<CourseBlueprint | null>;
  listModules(userId: string, blueprintId: string): Promise<Module[]>;
  listLessons(userId: string, moduleId: string): Promise<Lesson[]>;
  getLesson(userId: string, lessonId: string): Promise<Lesson | null>;
  listLessonSources(userId: string, lessonId: string): Promise<LessonSource[]>;
  updateLessonContent(
    userId: string,
    lessonId: string,
    contentMarkdown: string,
    expectedVersion: number,
  ): Promise<{ ok: true } | { ok: false; reason: "version_conflict" }>;

  listVault(userId: string, projectId: string): Promise<VaultEntry[]>;
  getWorkbook(userId: string, projectId: string): Promise<Workbook | null>;
  listJobs(userId: string, projectId: string): Promise<ProcessingJob[]>;
  listUsage(userId: string, projectId: string): Promise<UsageEvent[]>;
}
