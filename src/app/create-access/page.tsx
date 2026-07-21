import Link from "next/link";
import { isDemoMode } from "@/lib/config";
import { Card, Logo } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { signUpAction } from "@/app/auth/actions";

export const metadata = {
  title: "Create access",
  robots: { index: false, follow: false },
};

/**
 * Unlisted account-creation URL — never linked from /login or any public
 * nav. Share it directly with a paying subscriber; there is no in-app
 * paywall, so this URL is the access gate.
 */
export default async function CreateAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (isDemoMode()) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
        <Logo className="h-10 w-auto" />
        <Card className="mt-8">
          <p className="text-sm">
            The app is running in <strong>demo mode</strong>; account creation
            is disabled. Set DEMO_MODE=false and configure Supabase
            credentials to enable real accounts.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <Logo className="h-10 w-auto" />
      <p className="text-ink-soft mt-3">Create your account.</p>

      {error && (
        <div className="bg-danger-soft text-danger mt-6 rounded-md p-3 text-sm" role="alert">
          {error}
        </div>
      )}

      <Card className="mt-6">
        <h2 className="text-lg">Create your account</h2>
        <form action={signUpAction} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2 text-sm"
            />
          </div>
          <SubmitButton
            pendingText="Creating account…"
            className="bg-ink text-paper w-full rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-70"
          >
            Create account
          </SubmitButton>
        </form>
      </Card>

      <p className="text-ink-soft mt-4 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
      <p className="text-ink-faint mt-6 text-xs">
        Account creation is invite-only. This link was shared with you
        directly — if you weren't expecting it, you can ignore this page.
      </p>
    </main>
  );
}
