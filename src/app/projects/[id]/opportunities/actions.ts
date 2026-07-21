"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enqueueBlueprintJob } from "@/lib/jobs";

/** Persist the creator's chosen course direction (stage 6 approval). */
export async function selectOpportunityAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");

  const supabase = await createSupabaseServerClient();
  const { data: opportunity } = await supabase
    .from("course_opportunities")
    .select("id")
    .eq("id", opportunityId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!opportunity) return;

  await supabase
    .from("projects")
    .update({ selected_course_opportunity_id: opportunityId })
    .eq("id", projectId);
  // Selecting a direction kicks off blueprint generation (stage 8).
  await enqueueBlueprintJob(projectId);
  revalidatePath(`/projects/${projectId}/opportunities`);
  revalidatePath(`/projects/${projectId}/blueprint`);
}
