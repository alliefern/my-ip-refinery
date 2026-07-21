import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";
import { safeFilename } from "./validation";

export const SOURCES_BUCKET = "sources";

/** {user}/{project}/{asset}/{filename} — first segment drives storage RLS. */
export function sourceObjectPath(
  userId: string,
  projectId: string,
  assetId: string,
  originalFilename: string,
): string {
  return `${userId}/${projectId}/${assetId}/${safeFilename(originalFilename)}`;
}

/**
 * Short-lived signed upload target for a direct browser → storage
 * upload. The token is single-use and scoped to exactly this path.
 */
export async function createSignedUpload(path: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(SOURCES_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

/** Verify an object landed in storage (post-upload check). */
export async function objectExists(path: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const idx = path.lastIndexOf("/");
  const prefix = path.slice(0, idx);
  const name = path.slice(idx + 1);
  const { data, error } = await admin.storage
    .from(SOURCES_BUCKET)
    .list(prefix, { search: name });
  if (error) throw error;
  return (data ?? []).some((o) => o.name === name);
}

export async function deleteObject(path: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(SOURCES_BUCKET).remove([path]);
  if (error) throw error;
}
