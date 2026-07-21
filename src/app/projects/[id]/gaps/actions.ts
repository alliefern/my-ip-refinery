"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function answerGapQuestionAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();
  if (!questionId || !answer) return;

  await getDataSource().answerGapQuestion(user.id, questionId, answer);

  if (!isDemoMode()) {
    const supabase = await createSupabaseServerClient();
    // The answer becomes labelled project source material for later
    // AI stages (support_type "creator_answer" throughout).
    const { data: question } = await supabase
      .from("gap_questions")
      .select("id, question, created_source_asset_id")
      .eq("id", questionId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (question && !question.created_source_asset_id) {
      const { data: asset } = await supabase
        .from("source_assets")
        .insert({
          project_id: projectId,
          kind: "creator_answer",
          original_filename: "creator-answer.txt",
          display_title: `Answer: ${question.question.slice(0, 80)}`,
          mime_type: "text/plain",
          size_bytes: answer.length,
          status: "READY",
        })
        .select("id")
        .single();
      if (asset) {
        await supabase
          .from("gap_questions")
          .update({ created_source_asset_id: asset.id })
          .eq("id", questionId);
      }
    }
    await advanceIfAllResolved(projectId);
  }

  revalidatePath(`/projects/${projectId}/gaps`);
}

export async function skipGapQuestionAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("gap_questions")
    .update({ status: "SKIPPED" })
    .eq("id", questionId)
    .eq("project_id", projectId)
    .eq("status", "OPEN");
  await advanceIfAllResolved(projectId);
  revalidatePath(`/projects/${projectId}/gaps`);
}

/** All questions answered or explicitly skipped → course selection. */
async function advanceIfAllResolved(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("gap_questions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "OPEN");
  if ((count ?? 0) === 0) {
    await supabase
      .from("projects")
      .update({ status: "AWAITING_COURSE_SELECTION" })
      .eq("id", projectId)
      .eq("status", "AWAITING_GAP_ANSWERS");
  }
}
