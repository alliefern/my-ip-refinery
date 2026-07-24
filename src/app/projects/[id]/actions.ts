"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requeueFailedProjectJob } from "@/lib/jobs";

/** Where a retry of each project-level job type should refresh. */
const RETRYABLE_JOB_PATHS: Record<string, string[]> = {
  build_ip_map: ["ip-map", "opportunities"],
  generate_blueprint: ["blueprint"],
  generate_lessons: ["course"],
  generate_course_assets: ["vault", "exports"],
};

/**
 * Manually re-arm a permanently-failed project-level job. These jobs
 * (unlike source-asset jobs) have no per-page retry path once they hit
 * MAX_ATTEMPTS — a thin library (e.g. one short training) can trip the
 * IP map's validation and strand the project with nothing clickable.
 */
export async function retryProjectJobAction(formData: FormData) {
  if (isDemoMode()) return;
  const user = await getSessionUser();
  if (!user) return;
  const projectId = String(formData.get("projectId") ?? "");
  const jobType = String(formData.get("jobType") ?? "");
  if (!(jobType in RETRYABLE_JOB_PATHS)) return;

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  await requeueFailedProjectJob(projectId, jobType);
  revalidatePath(`/projects/${projectId}`);
  for (const path of RETRYABLE_JOB_PATHS[jobType] ?? []) {
    revalidatePath(`/projects/${projectId}/${path}`);
  }
}
