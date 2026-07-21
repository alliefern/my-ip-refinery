"use server";

import { getSessionUser } from "@/lib/auth";
import { isDemoMode, feedbackNotifyEmail } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type FeedbackState = { ok: boolean; error?: string };

const TYPES = new Set(["bug", "testimonial", "general"]);
const TYPE_LABELS: Record<string, string> = {
  bug: "Bug report",
  testimonial: "Testimonial",
  general: "Feedback",
};

export async function submitFeedbackAction(
  _prevState: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  if (isDemoMode()) {
    return { ok: false, error: "Feedback isn't available in demo mode." };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const type = TYPES.has(String(formData.get("type")))
    ? String(formData.get("type"))
    : "general";
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { ok: false, error: "Enter a message first." };
  if (message.length > 4000) {
    return { ok: false, error: "Keep it under 4000 characters." };
  }
  const pagePath = String(formData.get("pagePath") ?? "").trim() || null;

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("feedback")
    .insert({
      user_id: user.id,
      user_email: user.email,
      type,
      message,
      page_path: pagePath,
    })
    .select("id")
    .single();
  if (error || !row) {
    return { ok: false, error: "Something went wrong saving that. Try again." };
  }

  try {
    const sent = await sendNotificationEmail({
      type,
      message,
      userEmail: user.email,
      pagePath,
    });
    if (sent) {
      await admin
        .from("feedback")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", row.id);
    }
  } catch {
    // Feedback is already saved; the email is a best-effort notification.
  }

  return { ok: true };
}

async function sendNotificationEmail(input: {
  type: string;
  message: string;
  userEmail: string;
  pagePath: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const label = TYPE_LABELS[input.type] ?? "Feedback";
  const bodyLines = [
    input.message,
    "",
    `— ${input.userEmail}`,
    input.pagePath ? `Page: ${input.pagePath}` : null,
  ].filter((line): line is string => line !== null);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "My IP Refinery <onboarding@resend.dev>",
      to: [feedbackNotifyEmail],
      reply_to: input.userEmail,
      subject: `[${label}] from ${input.userEmail}`,
      text: bodyLines.join("\n"),
    }),
  });
  return res.ok;
}
