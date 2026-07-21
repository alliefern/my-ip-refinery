/**
 * In-memory demo implementation. Mutations persist for the lifetime of
 * the server process — enough to make the demo feel real without any
 * external services. All reads deep-copy so callers can't mutate seed
 * state accidentally.
 */

import type { DataSource } from "./types";
import {
  DEMO_USER,
  demoAssets,
  demoBlueprint,
  demoChunks,
  demoGapQuestions,
  demoIpItems,
  demoJobs,
  demoLessonSources,
  demoLessons,
  demoModules,
  demoOpportunities,
  demoProject,
  demoUsage,
  demoVault,
  demoWorkbook,
} from "../demo/seed";
import type { GapQuestion, Lesson } from "../types";

const clone = <T>(value: T): T => structuredClone(value);

// Mutable copies for demo-session mutations.
const gapQuestions: GapQuestion[] = clone(demoGapQuestions);
const lessons: Lesson[] = clone(demoLessons);

export const demoDataSource: DataSource = {
  async listProjects(userId) {
    return userId === DEMO_USER.id ? [clone(demoProject)] : [];
  },

  async getProject(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return null;
    return clone(demoProject);
  },

  async listAssets(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return [];
    return clone(demoAssets);
  },

  async listChunks(userId, assetId) {
    if (userId !== DEMO_USER.id) return [];
    return clone(demoChunks.filter((c) => c.sourceAssetId === assetId));
  },

  async listIpItems(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return [];
    return clone(demoIpItems);
  },

  async listOpportunities(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return [];
    return clone(demoOpportunities);
  },

  async listGapQuestions(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return [];
    return clone(gapQuestions);
  },

  async answerGapQuestion(userId, questionId, answer) {
    if (userId !== DEMO_USER.id) return;
    const q = gapQuestions.find((g) => g.id === questionId);
    if (q) {
      q.answer = answer;
      q.status = "ANSWERED";
    }
  },

  async getBlueprint(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return null;
    return clone(demoBlueprint);
  },

  async listModules(userId, blueprintId) {
    if (userId !== DEMO_USER.id) return [];
    return clone(
      demoModules
        .filter((m) => m.courseBlueprintId === blueprintId)
        .sort((a, b) => a.position - b.position),
    );
  },

  async listLessons(userId, moduleId) {
    if (userId !== DEMO_USER.id) return [];
    return clone(
      lessons
        .filter((l) => l.moduleId === moduleId)
        .sort((a, b) => a.position - b.position),
    );
  },

  async getLesson(userId, lessonId) {
    if (userId !== DEMO_USER.id) return null;
    const lesson = lessons.find((l) => l.id === lessonId);
    return lesson ? clone(lesson) : null;
  },

  async listLessonSources(userId, lessonId) {
    if (userId !== DEMO_USER.id) return [];
    return clone(demoLessonSources.filter((s) => s.lessonId === lessonId));
  },

  async updateLessonContent(userId, lessonId, contentMarkdown, expectedVersion) {
    if (userId !== DEMO_USER.id) return { ok: false, reason: "version_conflict" };
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson || lesson.version !== expectedVersion) {
      return { ok: false, reason: "version_conflict" };
    }
    lesson.contentMarkdown = contentMarkdown;
    lesson.version += 1;
    lesson.updatedAt = new Date().toISOString();
    return { ok: true };
  },

  async listVault(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return [];
    return clone(demoVault.sort((a, b) => a.suggestedOrder - b.suggestedOrder));
  },

  async getWorkbook(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return null;
    return clone(demoWorkbook);
  },

  async listJobs(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return [];
    return clone(demoJobs);
  },

  async listUsage(userId, projectId) {
    if (userId !== DEMO_USER.id || projectId !== demoProject.id) return [];
    return clone(demoUsage);
  },
};
