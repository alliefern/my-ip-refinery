"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode, limits } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  enqueueDocumentExtractJob,
  enqueueTranscribeJob,
  requeueFailedJob,
} from "@/lib/jobs";
import {
  createSignedUpload,
  deleteObject,
  objectExists,
  sourceObjectPath,
} from "@/lib/storage";
import {
  validateDocumentFile,
  validateMediaFile,
  SUPPORTED_MEDIA_MIME_TYPES,
} from "@/lib/validation";
import { canTransition } from "@/lib/status";

interface PrepareUploadInput {
  projectId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export type PrepareUploadResult =
  | { ok: true; assetId: string; signedUrl: string }
  | { ok: false; message: string };

function kindForMime(mimeType: string): "video" | "audio" | "slide_deck" | "workbook" | "note" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "slide_deck";
  if (mimeType.includes("wordprocessingml") || mimeType.includes("presentationml")) {
    return "workbook";
  }
  return "note";
}

export async function prepareUploadAction(
  input: PrepareUploadInput,
): Promise<PrepareUploadResult> {
  if (isDemoMode()) return { ok: false, message: "Uploads are disabled in demo mode." };
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const supabase = await createSupabaseServerClient();
  // RLS scopes this to the caller; a missing row means not theirs.
  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", input.projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!project) return { ok: false, message: "Project not found." };

  const isMedia = (SUPPORTED_MEDIA_MIME_TYPES as readonly string[]).includes(
    input.mimeType,
  );

  if (isMedia) {
    const { count } = await supabase
      .from("source_assets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", input.projectId)
      .in("kind", ["video", "audio"]);
    const validationError = validateMediaFile(
      { mimeType: input.mimeType, sizeBytes: input.sizeBytes },
      count ?? 0,
    );
    if (validationError) return { ok: false, message: validationError.message };
  } else {
    const validationError = validateDocumentFile({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
    if (validationError) return { ok: false, message: validationError.message };
    // Documents are mined by the AI pipeline like trainings now, so the
    // same per-project cap applies (they cost real processing money).
    const { count } = await supabase
      .from("source_assets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", input.projectId)
      .in("kind", ["slide_deck", "workbook", "note"]);
    if ((count ?? 0) >= limits.maxFilesPerProject) {
      return {
        ok: false,
        message: `A project can contain up to ${limits.maxFilesPerProject} written documents.`,
      };
    }
  }

  const { data: asset, error } = await supabase
    .from("source_assets")
    .insert({
      project_id: input.projectId,
      kind: kindForMime(input.mimeType),
      original_filename: input.filename,
      display_title: input.filename.replace(/\.[^.]+$/, ""),
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      status: "UPLOADING",
    })
    .select("id")
    .single();
  if (error || !asset) return { ok: false, message: "Could not register the upload." };

  const path = sourceObjectPath(user.id, input.projectId, asset.id, input.filename);
  await supabase
    .from("source_assets")
    .update({ storage_path: path })
    .eq("id", asset.id);

  try {
    const { signedUrl } = await createSignedUpload(path);
    return { ok: true, assetId: asset.id, signedUrl };
  } catch {
    // The row already exists (status UPLOADING) — without this, it would
    // sit there forever with no upload ever having been attempted.
    await supabase
      .from("source_assets")
      .update({
        status: "FAILED",
        error_message: "Could not create an upload destination. Try again.",
      })
      .eq("id", asset.id);
    return { ok: false, message: "Could not create an upload destination." };
  }
}

/**
 * Called by the client when the browser → storage transfer itself fails
 * (network drop, tab backgrounded, connection reset). Without this, a
 * failed PUT only updates transient in-browser state — the database row
 * stays UPLOADING forever with no way to retry.
 */
export async function failUploadAction(input: {
  projectId: string;
  assetId: string;
  message: string;
}): Promise<void> {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("source_assets")
    .update({ status: "FAILED", error_message: input.message })
    .eq("id", input.assetId)
    .eq("project_id", input.projectId)
    .eq("status", "UPLOADING");
  revalidatePath(`/projects/${input.projectId}/sources`);
}

export async function completeUploadAction(input: {
  projectId: string;
  assetId: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (isDemoMode()) return { ok: false, message: "Demo mode." };
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const supabase = await createSupabaseServerClient();
  const { data: asset } = await supabase
    .from("source_assets")
    .select("id, project_id, kind, storage_path, status")
    .eq("id", input.assetId)
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (!asset?.storage_path) return { ok: false, message: "Asset not found." };

  if (!(await objectExists(asset.storage_path))) {
    return { ok: false, message: "The file never arrived in storage — retry the upload." };
  }

  await supabase
    .from("source_assets")
    .update({ status: "UPLOADED" })
    .eq("id", asset.id);

  if (asset.kind === "video" || asset.kind === "audio") {
    await enqueueTranscribeJob(asset.project_id, asset.id);
  } else if (asset.kind !== "creator_answer") {
    // Written material (slide_deck, workbook, note) mines the same IP
    // pipeline via text extraction instead of transcription.
    await enqueueDocumentExtractJob(asset.project_id, asset.id);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("status")
    .eq("id", asset.project_id)
    .single();
  if (project && canTransition(project.status, "QUEUED")) {
    await supabase
      .from("projects")
      .update({ status: "QUEUED" })
      .eq("id", asset.project_id);
  }

  revalidatePath(`/projects/${input.projectId}/sources`);
  return { ok: true };
}

export async function retryAssetAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const assetId = String(formData.get("assetId") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data: asset } = await supabase
    .from("source_assets")
    .select("id, project_id, kind, storage_path")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!asset) return;

  // The file may never have actually finished uploading (a stalled or
  // interrupted transfer). Re-queuing transcription for a file that
  // isn't in storage would just fail again — the only real fix is a
  // fresh upload, so surface that instead of a doomed retry.
  const fileIsPresent = asset.storage_path
    ? await objectExists(asset.storage_path)
    : false;
  if (!fileIsPresent) {
    await supabase
      .from("source_assets")
      .update({
        status: "FAILED",
        error_message: "The file never finished uploading. Delete this and upload it again.",
      })
      .eq("id", assetId);
    revalidatePath(`/projects/${projectId}/sources`);
    return;
  }

  await supabase
    .from("source_assets")
    .update({ status: "UPLOADED", error_message: null })
    .eq("id", assetId);
  const requeued = await requeueFailedJob(projectId, assetId);
  if (!requeued) {
    if (asset.kind === "video" || asset.kind === "audio") {
      await enqueueTranscribeJob(projectId, assetId);
    } else if (asset.kind !== "creator_answer") {
      await enqueueDocumentExtractJob(projectId, assetId);
    }
  }
  revalidatePath(`/projects/${projectId}/sources`);
}

export async function deleteAssetAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const assetId = String(formData.get("assetId") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data: asset } = await supabase
    .from("source_assets")
    .select("id, storage_path")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!asset) return;

  if (asset.storage_path) {
    try {
      await deleteObject(asset.storage_path);
    } catch {
      // Row deletion proceeds; orphaned objects are caught by the
      // retention sweep documented in ops notes.
    }
  }
  await supabase.from("source_assets").delete().eq("id", assetId);
  revalidatePath(`/projects/${projectId}/sources`);
}
