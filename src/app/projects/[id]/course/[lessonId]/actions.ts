"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { isDemoMode, limits } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enqueueCourseAssets, enqueueRegenerateLesson } from "@/lib/jobs";

export async function saveLessonAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const content = String(formData.get("content") ?? "");
  const expectedVersion = Number(formData.get("expectedVersion") ?? 0);
  if (!lessonId || !content) return;

  const result = await getDataSource().updateLessonContent(
    user.id,
    lessonId,
    content,
    expectedVersion,
  );

  revalidatePath(`/projects/${projectId}/course/${lessonId}`);
  if (!result.ok) {
    redirect(`/projects/${projectId}/course/${lessonId}?conflict=1`);
  }
  redirect(`/projects/${projectId}/course/${lessonId}`);
}

export async function regenerateLessonAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");

  const supabase = await createSupabaseServerClient();
  // RLS scopes the read; the row existing proves ownership.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, lesson_structure_json")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return;

  const count = lesson.lesson_structure_json?.regeneration_count ?? 0;
  if (count >= limits.maxRegenerationsPerLesson) {
    redirect(`/projects/${projectId}/course/${lessonId}?limit=1`);
  }
  await enqueueRegenerateLesson(projectId, lessonId);
  revalidatePath(`/projects/${projectId}/course/${lessonId}`);
}

export async function restorePreviousDraftAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, version, content_markdown, lesson_structure_json")
    .eq("id", lessonId)
    .maybeSingle();
  const previous = lesson?.lesson_structure_json?.previous_draft;
  if (!lesson || !previous) return;

  await supabase
    .from("lessons")
    .update({
      content_markdown: previous,
      lesson_structure_json: {
        ...lesson.lesson_structure_json,
        previous_draft: lesson.content_markdown,
      },
      version: (lesson.version ?? 1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lessonId);
  revalidatePath(`/projects/${projectId}/course/${lessonId}`);
}

export async function setLessonStatusAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["DRAFT", "REVIEW", "APPROVED"].includes(status)) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("lessons").update({ status }).eq("id", lessonId);

  // When every lesson is approved, generate the vault + workbook.
  if (status === "APPROVED") {
    const { data: bp } = await supabase
      .from("course_blueprints")
      .select("id")
      .eq("project_id", projectId)
      .eq("status", "APPROVED")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (bp) {
      const { data: moduleRows } = await supabase
        .from("modules")
        .select("id")
        .eq("course_blueprint_id", bp.id);
      const moduleIds = (moduleRows ?? []).map((m) => m.id);
      const { count } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .in("module_id", moduleIds)
        .neq("status", "APPROVED");
      if ((count ?? 0) === 0) {
        await enqueueCourseAssets(projectId);
      }
    }
  }
  revalidatePath(`/projects/${projectId}/course/${lessonId}`);
  revalidatePath(`/projects/${projectId}/course`);
}
