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
