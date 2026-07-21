"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode, limits } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createProjectAction(formData: FormData) {
  if (isDemoMode()) redirect("/dashboard");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const topic = String(formData.get("topic") ?? "").trim();
  if (!name) redirect("/projects/new?error=name-required");

  const intake = {
    coursePurpose: String(formData.get("purpose") ?? "paid_mini_course"),
    topic,
    studentResult: String(formData.get("result") ?? "").trim(),
    audience: String(formData.get("audience") ?? "").trim(),
    audienceProblem: String(formData.get("problem") ?? "").trim(),
    depth: String(formData.get("depth") ?? "mini_course"),
  };
  const voiceSettings = {
    languageVariant: String(formData.get("language") ?? "us"),
    tone: String(formData.get("tone") ?? "conversational"),
    profanity: String(formData.get("profanity") ?? "light"),
    preserveSignaturePhrases: true,
  };

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if ((count ?? 0) >= limits.maxActiveProjectsPerUser) {
    redirect("/projects/new?error=project-limit");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      status: "DRAFT",
      intake_json: intake,
      voice_settings_json: voiceSettings,
    })
    .select("id")
    .single();
  if (error || !data) {
    redirect("/projects/new?error=create-failed");
  }
  redirect(`/projects/${data.id}/sources`);
}
