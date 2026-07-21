import { createClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 3;

/** Data-access helpers for the worker (service role — RLS bypassed,
 * so every query is scoped by explicit ids from the claimed job). */
export function createDb() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  return {
    supabase,

    async claimNextJob() {
      const { data, error } = await supabase.rpc("claim_next_job");
      if (error) throw error;
      return data?.[0] ?? null;
    },

    async completeJob(jobId) {
      await supabase
        .from("processing_jobs")
        .update({
          status: "SUCCEEDED",
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    },

    /** Retryable failures re-queue with exponential backoff until
     * MAX_ATTEMPTS; then the job (and its asset) goes FAILED. */
    async failJob(job, { code, message, retryable }) {
      const canRetry = retryable && job.attempt_count < MAX_ATTEMPTS;
      if (canRetry) {
        const backoffSeconds = 30 * 2 ** (job.attempt_count - 1);
        await supabase
          .from("processing_jobs")
          .update({
            status: "PENDING",
            run_after: new Date(Date.now() + backoffSeconds * 1000).toISOString(),
            error_code: code,
            error_message: message,
          })
          .eq("id", job.id);
        return;
      }
      await supabase
        .from("processing_jobs")
        .update({
          status: "FAILED",
          error_code: code,
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (job.source_asset_id) {
        await supabase
          .from("source_assets")
          .update({ status: "FAILED", error_message: message })
          .eq("id", job.source_asset_id);
      }
    },

    async setProgress(jobId, percent) {
      await supabase
        .from("processing_jobs")
        .update({ progress_percent: percent })
        .eq("id", jobId);
    },

    async getAsset(assetId) {
      const { data, error } = await supabase
        .from("source_assets")
        .select("*")
        .eq("id", assetId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async updateAsset(assetId, fields) {
      await supabase.from("source_assets").update(fields).eq("id", assetId);
    },

    async getExistingChunk(assetId, sequenceNumber) {
      const { data } = await supabase
        .from("transcript_chunks")
        .select("id, status, clean_text")
        .eq("source_asset_id", assetId)
        .eq("sequence_number", sequenceNumber)
        .maybeSingle();
      return data;
    },

    async upsertChunk(assetId, chunk) {
      const { error } = await supabase.from("transcript_chunks").upsert(
        {
          source_asset_id: assetId,
          sequence_number: chunk.sequenceNumber,
          start_seconds: chunk.startSeconds,
          end_seconds: chunk.endSeconds,
          raw_text: chunk.rawText,
          clean_text: chunk.cleanText,
          status: "DONE",
          transcription_metadata_json: chunk.metadata ?? {},
        },
        { onConflict: "source_asset_id,sequence_number" },
      );
      if (error) throw error;
    },

    async signedDownloadUrl(storagePath, expiresIn = 3600) {
      const { data, error } = await supabase.storage
        .from("sources")
        .createSignedUrl(storagePath, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    },

    async recordUsage(projectId, userId, event) {
      await supabase.from("usage_events").insert({
        project_id: projectId,
        user_id: userId,
        ...event,
      });
    },

    async getProjectOwner(projectId) {
      const { data } = await supabase
        .from("projects")
        .select("user_id, deleted_at")
        .eq("id", projectId)
        .maybeSingle();
      return data;
    },
  };
}
