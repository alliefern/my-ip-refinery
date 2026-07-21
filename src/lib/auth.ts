import { isDemoMode } from "./config";
import { DEMO_USER } from "./demo/seed";
import { createSupabaseServerClient } from "./supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  isDemo: boolean;
}

/**
 * Resolve the current user. In demo mode everyone is the demo user so
 * the product can be explored with zero setup; otherwise Supabase Auth
 * decides. Returns null when unauthenticated (caller redirects).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    return { id: DEMO_USER.id, email: DEMO_USER.email, isDemo: true };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "", isDemo: false };
}
