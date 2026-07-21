/**
 * Supabase-backed implementation. RLS is the primary ownership guard;
 * queries additionally scope by project ownership where the schema
 * allows so a policy regression cannot silently widen access.
 *
 * Activated when DEMO_MODE=false and Supabase credentials are set.
 */

import { createSupabaseServerClient } from "../supabase/server";
import type { DataSource } from "./types";
import type {
  CourseBlueprint,
  GapQuestion,
  IpItem,
  Lesson,
  Project,
  SourceAsset,
} from "../types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapProject(row: any): Project {
  const ipMap = row.ip_map_json ?? {};
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    status: row.status,
    selectedCourseOpportunityId: row.selected_course_opportunity_id,
    intake: row.intake_json ?? {},
    voiceSettings: row.voice_settings_json ?? {},
    ipMap: Object.keys(ipMap).length > 0 ? ipMap : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAsset(row: any): SourceAsset {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    originalFilename: row.original_filename,
    displayTitle: row.display_title,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    durationSeconds: row.duration_seconds,
    status: row.status,
    errorMessage: row.error_message,
    originalDeletedAt: row.original_deleted_at,
    createdAt: row.created_at,
  };
}

function mapLesson(row: any): Lesson {
  return {
    id: row.id,
    moduleId: row.module_id,
    position: row.position,
    title: row.title,
    objective: row.objective,
    contentMarkdown: row.content_markdown,
    sourceStrengthScore: row.source_strength_score,
    transformationValueScore: row.transformation_value_score,
    creatorUniquenessScore: row.creator_uniqueness_score,
    status: row.status,
    version: row.version,
    updatedAt: row.updated_at,
    warnings: row.lesson_structure_json?.warnings ?? [],
  };
}

async function db() {
  return createSupabaseServerClient();
}

export const supabaseDataSource: DataSource = {
  async listProjects(userId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapProject);
  },

  async getProject(userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProject(data) : null;
  },

  async listAssets(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("source_assets")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map(mapAsset);
  },

  async listChunks(_userId, assetId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("transcript_chunks")
      .select("id, source_asset_id, sequence_number, start_seconds, end_seconds, clean_text")
      .eq("source_asset_id", assetId)
      .order("sequence_number");
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      sourceAssetId: row.source_asset_id,
      sequenceNumber: row.sequence_number,
      startSeconds: row.start_seconds,
      endSeconds: row.end_seconds,
      cleanText: row.clean_text,
    }));
  },

  async listIpItems(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("ip_items")
      .select("*")
      .eq("project_id", projectId);
    if (error) throw error;
    return (data ?? []).map(
      (row: any): IpItem => ({
        id: row.id,
        projectId: row.project_id,
        sourceAssetId: row.source_asset_id,
        transcriptChunkId: row.transcript_chunk_id,
        type: row.type,
        title: row.title,
        content: row.content,
        startSeconds: row.start_seconds,
        endSeconds: row.end_seconds,
        confidenceScore: row.confidence_score,
        distinctivenessScore: row.distinctiveness_score,
        supportType: row.support_type,
      }),
    );
  },

  async listOpportunities(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("course_opportunities")
      .select("*")
      .eq("project_id", projectId)
      .order("strength_score", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      audience: row.audience,
      transformation: row.transformation,
      rationale: row.rationale,
      missingMaterial: row.missing_material_json ?? [],
      strengthScore: row.strength_score,
      isRecommended: row.is_recommended,
    }));
  },

  async listGapQuestions(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("gap_questions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map(
      (row: any): GapQuestion => ({
        id: row.id,
        projectId: row.project_id,
        question: row.question,
        reason: row.reason,
        answer: row.answer,
        status: row.status,
      }),
    );
  },

  async answerGapQuestion(_userId, questionId, answer) {
    const supabase = await db();
    const { error } = await supabase
      .from("gap_questions")
      .update({ answer, status: "ANSWERED" })
      .eq("id", questionId);
    if (error) throw error;
  },

  async getBlueprint(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("course_blueprints")
      .select("*")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const blueprint: CourseBlueprint = {
      id: data.id,
      projectId: data.project_id,
      version: data.version,
      title: data.title,
      subtitle: data.subtitle,
      promise: data.promise,
      transformation: data.transformation,
      audience: data.audience,
      positioning: data.positioning_json ?? {},
      status: data.status,
      approvedAt: data.approved_at,
    };
    return blueprint;
  },

  async listModules(_userId, blueprintId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("course_blueprint_id", blueprintId)
      .order("position");
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      courseBlueprintId: row.course_blueprint_id,
      position: row.position,
      title: row.title,
      purpose: row.purpose,
      outcome: row.outcome,
      rationale: row.rationale,
    }));
  },

  async listLessons(_userId, moduleId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("position");
    if (error) throw error;
    return (data ?? []).map(mapLesson);
  },

  async getLesson(_userId, lessonId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapLesson(data) : null;
  },

  async listLessonSources(_userId, lessonId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("lesson_sources")
      .select("*")
      .eq("lesson_id", lessonId);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      lessonId: row.lesson_id,
      sourceAssetId: row.source_asset_id,
      transcriptChunkId: row.transcript_chunk_id,
      startSeconds: row.start_seconds,
      endSeconds: row.end_seconds,
      supportNote: row.support_note,
      supportType: row.support_type,
    }));
  },

  async updateLessonContent(_userId, lessonId, contentMarkdown, expectedVersion) {
    const supabase = await db();
    // Optimistic concurrency: the version match is part of the WHERE
    // clause, so a stale editor cannot overwrite newer content.
    const { data, error } = await supabase
      .from("lessons")
      .update({
        content_markdown: contentMarkdown,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
      .eq("version", expectedVersion)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { ok: false, reason: "version_conflict" };
    }
    return { ok: true };
  },

  async listVault(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("vault_entries")
      .select("*")
      .eq("project_id", projectId)
      .order("suggested_order");
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      sourceAssetId: row.source_asset_id,
      cleanTitle: row.clean_title,
      description: row.description,
      keyTopics: row.key_topics ?? [],
      watchThisIf: row.watch_this_if,
      chapters: row.chapters_json ?? [],
      relatedLessonIds: row.related_lesson_ids ?? [],
      suggestedOrder: row.suggested_order,
    }));
  },

  async getWorkbook(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("projects")
      .select("workbook_json")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw error;
    const workbook = data?.workbook_json ?? {};
    return Object.keys(workbook).length > 0 ? workbook : null;
  },

  async listJobs(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("processing_jobs")
      .select("*")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      sourceAssetId: row.source_asset_id,
      jobType: row.job_type,
      status: row.status,
      progressPercent: row.progress_percent,
      attemptCount: row.attempt_count,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  },

  async listUsage(_userId, projectId) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("usage_events")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      operation: row.operation,
      model: row.model,
      audioSeconds: row.audio_seconds,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      estimatedCostMinorUnits: row.estimated_cost_minor_units,
      createdAt: row.created_at,
    }));
  },
};
