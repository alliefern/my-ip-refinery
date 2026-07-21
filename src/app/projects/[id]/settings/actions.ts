"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function updateIntakeAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, intake_json, voice_settings_json")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const intake = { ...(project.intake_json ?? {}) };
  for (const key of ["topic", "studentResult", "audience", "audienceProblem"]) {
    const value = formData.get(key);
    if (value !== null) intake[key] = String(value).trim();
  }
  const voice = { ...(project.voice_settings_json ?? {}) };
  for (const key of ["tone", "languageVariant", "profanity"]) {
    const value = formData.get(key);
    if (value !== null) voice[key] = String(value);
  }
  const name = formData.get("name");

  await supabase
    .from("projects")
    .update({
      ...(name ? { name: String(name).trim() } : {}),
      intake_json: intake,
      voice_settings_json: voice,
    })
    .eq("id", projectId);
  revalidatePath(`/projects/${projectId}/settings`);
}

/**
 * Delete the project and all derived data. Database rows cascade from
 * the project; storage objects are removed explicitly (service role,
 * after RLS-scoped ownership is proven by the select above failing or
 * succeeding).
 */
export async function deleteProjectAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const confirmName = String(formData.get("confirmName") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;
  if (confirmName.trim() !== project.name) {
    redirect(`/projects/${projectId}/settings?error=confirm-mismatch`);
  }

  // Remove stored originals and exports under this user's project prefix.
  const admin = createSupabaseAdminClient();
  for (const bucket of ["sources", "exports"]) {
    const prefix = `${user.id}/${projectId}`;
    const { data: objects } = await admin.storage.from(bucket).list(prefix, {
      limit: 1000,
    });
    // Objects live one level deeper (asset folders); walk them.
    const paths: string[] = [];
    for (const entry of objects ?? []) {
      const { data: nested } = await admin.storage
        .from(bucket)
        .list(`${prefix}/${entry.name}`, { limit: 1000 });
      if (nested && nested.length > 0) {
        nested.forEach((n) => paths.push(`${prefix}/${entry.name}/${n.name}`));
      } else {
        paths.push(`${prefix}/${entry.name}`);
      }
    }
    if (paths.length > 0) await admin.storage.from(bucket).remove(paths);
  }

  // Row delete cascades to assets, chunks, IP, blueprints, lessons, jobs.
  await supabase.from("projects").delete().eq("id", projectId);
  redirect("/dashboard");
}
