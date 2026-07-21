"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";

export async function answerGapQuestionAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();
  if (!questionId || !answer) return;
  await getDataSource().answerGapQuestion(user.id, questionId, answer);
  revalidatePath(`/projects/${projectId}/gaps`);
}
