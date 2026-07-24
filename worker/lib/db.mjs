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
          start_seconds: chunk.startSeconds ?? null,
          end_seconds: chunk.endSeconds ?? null,
          location_label: chunk.locationLabel ?? null,
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
        .select("user_id, deleted_at, intake_json, status")
        .eq("id", projectId)
        .maybeSingle();
      return data;
    },

    async enqueueJob(projectId, sourceAssetId, jobType, idempotencyKey) {
      const { error } = await supabase.from("processing_jobs").insert({
        project_id: projectId,
        source_asset_id: sourceAssetId,
        job_type: jobType,
        idempotency_key: idempotencyKey,
      });
      if (error && error.code !== "23505") throw error; // 23505: already queued
    },

    async updateProjectStatusIf(projectId, fromStatuses, to) {
      await supabase
        .from("projects")
        .update({ status: to })
        .eq("id", projectId)
        .in("status", fromStatuses);
    },

    async listChunksForAsset(assetId) {
      const { data, error } = await supabase
        .from("transcript_chunks")
        .select(
          "id, sequence_number, start_seconds, end_seconds, location_label, clean_text",
        )
        .eq("source_asset_id", assetId)
        .eq("status", "DONE")
        .order("sequence_number");
      if (error) throw error;
      return data ?? [];
    },

    async chunkHasIpItems(chunkId) {
      const { count, error } = await supabase
        .from("ip_items")
        .select("id", { count: "exact", head: true })
        .eq("transcript_chunk_id", chunkId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },

    async insertIpItems(rows) {
      if (rows.length === 0) return;
      const { error } = await supabase.from("ip_items").insert(rows);
      if (error) throw error;
    },

    async saveAssetSynthesis(assetId, synthesis) {
      await supabase
        .from("source_assets")
        .update({ synthesis_json: synthesis })
        .eq("id", assetId);
    },

    async listMediaAssets(projectId) {
      const { data, error } = await supabase
        .from("source_assets")
        .select("id, display_title, kind, status, synthesis_json")
        .eq("project_id", projectId)
        .in("kind", ["video", "audio"]);
      if (error) throw error;
      return data ?? [];
    },

    /** All mineable source material: media trainings AND written
     * documents. Excludes creator_answer rows (gap answers are pulled
     * separately and quoted verbatim, never re-mined). */
    async listContentAssets(projectId) {
      const { data, error } = await supabase
        .from("source_assets")
        .select("id, display_title, kind, status, synthesis_json")
        .eq("project_id", projectId)
        .in("kind", ["video", "audio", "slide_deck", "workbook", "note"]);
      if (error) throw error;
      return data ?? [];
    },

    async listProjectIpItems(projectId) {
      const { data, error } = await supabase
        .from("ip_items")
        .select("type, title, content, distinctiveness_score, source_asset_id")
        .eq("project_id", projectId);
      if (error) throw error;
      return data ?? [];
    },

    /** build_ip_map is retryable: wipe its previous outputs first so a
     * re-run never duplicates opportunities or questions. */
    async clearIpMapOutputs(projectId) {
      await supabase
        .from("projects")
        .update({ selected_course_opportunity_id: null })
        .eq("id", projectId);
      await supabase.from("course_opportunities").delete().eq("project_id", projectId);
      await supabase
        .from("gap_questions")
        .delete()
        .eq("project_id", projectId)
        .is("answer", null);
    },

    async insertOpportunities(projectId, rows) {
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("course_opportunities")
        .insert(rows.map((row) => ({ ...row, project_id: projectId })));
      if (error) throw error;
    },

    async insertGapQuestions(projectId, rows) {
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("gap_questions")
        .insert(rows.map((row) => ({ ...row, project_id: projectId })));
      if (error) throw error;
    },

    async saveProjectIpMap(projectId, map) {
      await supabase
        .from("projects")
        .update({ ip_map_json: map })
        .eq("id", projectId);
    },

    async getProjectDetail(projectId) {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, user_id, deleted_at, status, intake_json, voice_settings_json, ip_map_json, selected_course_opportunity_id",
        )
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async getOpportunity(opportunityId) {
      const { data, error } = await supabase
        .from("course_opportunities")
        .select("*")
        .eq("id", opportunityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async listAnsweredGapQuestions(projectId) {
      const { data, error } = await supabase
        .from("gap_questions")
        .select("question, answer")
        .eq("project_id", projectId)
        .eq("status", "ANSWERED")
        .not("answer", "is", null);
      if (error) throw error;
      return data ?? [];
    },

    /** Blueprint generation is retryable: unapproved drafts are
     * replaced wholesale; approved blueprints are never touched. */
    async deleteDraftBlueprints(projectId) {
      await supabase
        .from("course_blueprints")
        .delete()
        .eq("project_id", projectId)
        .eq("status", "DRAFT");
    },

    async nextBlueprintVersion(projectId) {
      const { data } = await supabase
        .from("course_blueprints")
        .select("version")
        .eq("project_id", projectId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.version ?? 0) + 1;
    },

    async insertBlueprintTree(projectId, version, blueprint) {
      const { data: bp, error } = await supabase
        .from("course_blueprints")
        .insert({
          project_id: projectId,
          version,
          title: blueprint.positioning.title,
          subtitle: blueprint.positioning.subtitle,
          promise: blueprint.positioning.promise,
          transformation: blueprint.positioning.transformation,
          audience: blueprint.positioning.audience,
          positioning_json: blueprint.positioning,
          status: "DRAFT",
        })
        .select("id")
        .single();
      if (error) throw error;

      for (let mi = 0; mi < blueprint.modules.length; mi++) {
        const mod = blueprint.modules[mi];
        const { data: moduleRow, error: moduleError } = await supabase
          .from("modules")
          .insert({
            course_blueprint_id: bp.id,
            position: mi + 1,
            title: mod.title,
            purpose: mod.purpose,
            outcome: mod.outcome,
            rationale: mod.rationale,
          })
          .select("id")
          .single();
        if (moduleError) throw moduleError;

        const lessonRows = mod.lessons.map((lesson, li) => ({
          module_id: moduleRow.id,
          position: li + 1,
          title: lesson.title,
          objective: lesson.objective,
          content_markdown: "",
          lesson_structure_json: {
            planned_elements: lesson.planned_elements,
            source_trainings: lesson.source_trainings,
          },
          source_strength_score: lesson.source_strength,
          transformation_value_score: lesson.transformation_value,
          creator_uniqueness_score: lesson.creator_uniqueness,
          status: "DRAFT",
        }));
        const { error: lessonError } = await supabase
          .from("lessons")
          .insert(lessonRows);
        if (lessonError) throw lessonError;
      }
      return bp.id;
    },

    async getApprovedBlueprint(projectId) {
      const { data, error } = await supabase
        .from("course_blueprints")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "APPROVED")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async listBlueprintModules(blueprintId) {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("course_blueprint_id", blueprintId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },

    async listModuleLessons(moduleId) {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },

    async getLessonRow(lessonId) {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async saveLessonGeneration(lessonId, fields) {
      await supabase.from("lessons").update(fields).eq("id", lessonId);
    },

    async replaceLessonSources(lessonId, rows) {
      await supabase.from("lesson_sources").delete().eq("lesson_id", lessonId);
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("lesson_sources")
        .insert(rows.map((row) => ({ ...row, lesson_id: lessonId })));
      if (error) throw error;
    },

    async listAllProjectChunks(projectId) {
      const { data, error } = await supabase
        .from("transcript_chunks")
        .select(
          "id, source_asset_id, start_seconds, end_seconds, location_label, clean_text, source_assets!inner(project_id, display_title)",
        )
        .eq("source_assets.project_id", projectId)
        .eq("status", "DONE");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        source_asset_id: row.source_asset_id,
        start_seconds: row.start_seconds,
        end_seconds: row.end_seconds,
        location_label: row.location_label,
        clean_text: row.clean_text,
        assetTitle: row.source_assets.display_title,
      }));
    },

    async listProjectIpItemsDetailed(projectId) {
      const { data, error } = await supabase
        .from("ip_items")
        .select("source_asset_id, title, type, start_seconds")
        .eq("project_id", projectId);
      if (error) throw error;
      return data ?? [];
    },

    async replaceVaultEntries(projectId, rows) {
      await supabase.from("vault_entries").delete().eq("project_id", projectId);
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("vault_entries")
        .insert(rows.map((row) => ({ ...row, project_id: projectId })));
      if (error) throw error;
    },

    async saveProjectWorkbook(projectId, workbook) {
      await supabase
        .from("projects")
        .update({ workbook_json: workbook })
        .eq("id", projectId);
    },
  };
}
