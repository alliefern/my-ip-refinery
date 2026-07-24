import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";

/**
 * Enqueue helpers. Jobs are written with the service role because users
 * hold read-only access to processing_jobs; every caller must have
 * verified project ownership first. Idempotency keys make re-enqueues
 * safe: a duplicate insert is a no-op, never a second charge.
 */

export async function enqueueTranscribeJob(
  projectId: string,
  assetId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("processing_jobs").insert({
    project_id: projectId,
    source_asset_id: assetId,
    job_type: "transcribe_asset",
    idempotency_key: `transcribe:${assetId}`,
  });
  // 23505 = unique_violation on idempotency_key: job already queued.
  if (error && error.code !== "23505") throw error;
}

/** Documents (PDF/DOCX/PPTX/TXT) go through text extraction instead of
 * transcription, then join the same extract_ip → IP map chain. */
export async function enqueueDocumentExtractJob(
  projectId: string,
  assetId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("processing_jobs").insert({
    project_id: projectId,
    source_asset_id: assetId,
    job_type: "extract_document_text",
    idempotency_key: `doctext:${assetId}`,
  });
  if (error && error.code !== "23505") throw error;
}

/**
 * Enqueue blueprint generation. Deliberately re-runnable (choosing a
 * new direction regenerates the draft), but never stacked: an existing
 * queued/running blueprint job wins.
 */
export async function enqueueBlueprintJob(projectId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: active } = await admin
    .from("processing_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("job_type", "generate_blueprint")
    .in("status", ["PENDING", "RUNNING"])
    .limit(1);
  if ((active ?? []).length > 0) return;

  const { error } = await admin.from("processing_jobs").insert({
    project_id: projectId,
    job_type: "generate_blueprint",
    idempotency_key: `blueprint:${projectId}:${Date.now()}`,
  });
  if (error && error.code !== "23505") throw error;
}

/** Enqueue full lesson generation after blueprint approval. */
export async function enqueueLessonGeneration(projectId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: active } = await admin
    .from("processing_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("job_type", "generate_lessons")
    .in("status", ["PENDING", "RUNNING"])
    .limit(1);
  if ((active ?? []).length > 0) return;
  const { error } = await admin.from("processing_jobs").insert({
    project_id: projectId,
    job_type: "generate_lessons",
    idempotency_key: `lessons:${projectId}:${Date.now()}`,
  });
  if (error && error.code !== "23505") throw error;
}

/** Enqueue a single-lesson regeneration (key carries the lesson id). */
export async function enqueueRegenerateLesson(
  projectId: string,
  lessonId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: active } = await admin
    .from("processing_jobs")
    .select("id, idempotency_key")
    .eq("project_id", projectId)
    .eq("job_type", "regenerate_lesson")
    .in("status", ["PENDING", "RUNNING"]);
  if ((active ?? []).some((j) => j.idempotency_key.split(":")[1] === lessonId)) {
    return;
  }
  const { error } = await admin.from("processing_jobs").insert({
    project_id: projectId,
    job_type: "regenerate_lesson",
    idempotency_key: `regen:${lessonId}:${Date.now()}`,
  });
  if (error && error.code !== "23505") throw error;
}

/** Enqueue vault + workbook generation. */
export async function enqueueCourseAssets(projectId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: active } = await admin
    .from("processing_jobs")
    .select("id")
    .eq("project_id", projectId)
    .eq("job_type", "generate_course_assets")
    .in("status", ["PENDING", "RUNNING"])
    .limit(1);
  if ((active ?? []).length > 0) return;
  const { error } = await admin.from("processing_jobs").insert({
    project_id: projectId,
    job_type: "generate_course_assets",
    idempotency_key: `assets:${projectId}:${Date.now()}`,
  });
  if (error && error.code !== "23505") throw error;
}

/** Re-arm a failed job for retry without duplicating it. */
export async function requeueFailedJob(
  projectId: string,
  assetId: string,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("processing_jobs")
    .update({
      status: "PENDING",
      run_after: new Date().toISOString(),
      error_code: null,
      error_message: null,
      progress_percent: 0,
    })
    .eq("project_id", projectId)
    .eq("source_asset_id", assetId)
    .eq("status", "FAILED")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Re-arm a failed project-level job (build_ip_map, generate_blueprint,
 * generate_lessons, generate_course_assets — none of which have a
 * source_asset_id). These jobs can otherwise fail permanently with no
 * way back in: build_ip_map in particular uses a fixed idempotency key
 * per project, so a plain re-enqueue is a silent no-op against the
 * existing FAILED row.
 */
export async function requeueFailedProjectJob(
  projectId: string,
  jobType: string,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("processing_jobs")
    .update({
      status: "PENDING",
      run_after: new Date().toISOString(),
      error_code: null,
      error_message: null,
      progress_percent: 0,
    })
    .eq("project_id", projectId)
    .eq("job_type", jobType)
    .is("source_asset_id", null)
    .eq("status", "FAILED")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
