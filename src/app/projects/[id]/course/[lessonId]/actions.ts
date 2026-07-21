"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";

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
