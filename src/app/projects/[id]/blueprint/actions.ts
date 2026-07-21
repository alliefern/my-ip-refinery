"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** All blueprint edits require an unapproved (DRAFT) blueprint owned
 * by the caller; RLS enforces ownership, these guards enforce state. */

async function draftBlueprintId(projectId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("course_blueprints")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "DRAFT")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function updatePositioningAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const blueprintId = String(formData.get("blueprintId") ?? "");
  const supabase = await createSupabaseServerClient();

  const { data: bp } = await supabase
    .from("course_blueprints")
    .select("id, positioning_json, status")
    .eq("id", blueprintId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!bp || bp.status !== "DRAFT") return;

  const fields = [
    "title",
    "subtitle",
    "promise",
    "transformation",
    "audience",
    "ideal_student",
    "not_for",
    "prerequisites",
    "format_and_scope",
    "outcome_statement",
  ] as const;
  const positioning = { ...(bp.positioning_json ?? {}) };
  for (const field of fields) {
    const value = formData.get(field);
    if (value !== null) positioning[field] = String(value).trim();
  }

  await supabase
    .from("course_blueprints")
    .update({
      title: positioning.title,
      subtitle: positioning.subtitle,
      promise: positioning.promise,
      transformation: positioning.transformation,
      audience: positioning.audience,
      positioning_json: positioning,
    })
    .eq("id", blueprintId);
  revalidatePath(`/projects/${projectId}/blueprint`);
}

export async function approveBlueprintAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const blueprintId = String(formData.get("blueprintId") ?? "");
  const supabase = await createSupabaseServerClient();

  await supabase
    .from("course_blueprints")
    .update({ status: "APPROVED", approved_at: new Date().toISOString() })
    .eq("id", blueprintId)
    .eq("project_id", projectId)
    .eq("status", "DRAFT");
  // Lesson generation (stage 9) starts from this checkpoint in
  // Milestone 5; approval is recorded now so the checkpoint is real.
  revalidatePath(`/projects/${projectId}/blueprint`);
}

export async function moveModuleAction(formData: FormData) {
  await swapPositions(formData, "modules", "course_blueprint_id");
}

export async function moveLessonAction(formData: FormData) {
  await swapPositions(formData, "lessons", "module_id");
}

/** Swap position with the neighbour in the given direction. */
async function swapPositions(
  formData: FormData,
  table: "modules" | "lessons",
  parentColumn: string,
) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const rowId = String(formData.get("rowId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from(table)
    .select(`id, position, ${parentColumn}`)
    .eq("id", rowId)
    .maybeSingle<Record<string, string | number>>();
  if (!row) return;

  const neighbourPosition =
    direction === "up" ? Number(row.position) - 1 : Number(row.position) + 1;
  const { data: neighbour } = await supabase
    .from(table)
    .select("id, position")
    .eq(parentColumn, row[parentColumn] as string)
    .eq("position", neighbourPosition)
    .maybeSingle();
  if (!neighbour) return;

  // Two updates via a temporary slot to dodge any unique constraints.
  await supabase.from(table).update({ position: -1 }).eq("id", row.id);
  await supabase.from(table).update({ position: row.position }).eq("id", neighbour.id);
  await supabase.from(table).update({ position: neighbourPosition }).eq("id", row.id);
  revalidatePath(`/projects/${projectId}/blueprint`);
}

export async function addLessonAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  if (!title) return;
  if (!(await draftBlueprintId(projectId))) return;

  const supabase = await createSupabaseServerClient();
  const { data: last } = await supabase
    .from("lessons")
    .select("position")
    .eq("module_id", moduleId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("lessons").insert({
    module_id: moduleId,
    position: (last?.position ?? 0) + 1,
    title,
    objective,
    content_markdown: "",
    lesson_structure_json: { creator_added: true },
    status: "DRAFT",
  });
  revalidatePath(`/projects/${projectId}/blueprint`);
}

export async function deleteLessonAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!(await draftBlueprintId(projectId))) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("lessons").delete().eq("id", lessonId);
  revalidatePath(`/projects/${projectId}/blueprint`);
}
