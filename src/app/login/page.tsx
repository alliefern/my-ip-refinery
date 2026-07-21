import Link from "next/link";
import { brand, isDemoMode } from "@/lib/config";
import { Card, Logo } from "@/components/ui";
import { magicLinkAction, signInAction, signUpAction } from "@/app/auth/actions";

export const metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  "check-email": "Account created — check your email to confirm, then sign in.",
  "magic-link-sent": "Magic link sent — check your email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; mode?: string }>;
}) {
  const { error, notice, mode } = await searchParams;

  if (isDemoMode()) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
        <Logo className="h-10 w-auto" />
        <p className="text-ink-soft mt-3">{brand.tagline}.</p>
        <Card className="mt-8">
          <p className="text-sm">
            The app is running in <strong>demo mode</strong>. Authentication is
            bypassed and a seeded example project is loaded so you can explore
            every screen.
          </p>
          <Link
            href="/dashboard"
            className="bg-ink text-paper mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Enter the demo →
          </Link>
        </Card>
        <p className="text-ink-faint mt-6 text-xs">
          To enable real accounts, set DEMO_MODE=false and configure Supabase
          credentials.
        </p>
      </main>
    );
  }

  const signUp = mode === "signup";

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
      <Logo className="h-10 w-auto" />
      <p className="text-ink-soft mt-3">{brand.tagline}.</p>

      {error && (
        <div className="bg-danger-soft text-danger mt-6 rounded-md p-3 text-sm" role="alert">
          {error}
        </div>
      )}
      {notice && NOTICES[notice] && (
        <div className="bg-ok-soft text-ok mt-6 rounded-md p-3 text-sm" role="status">
          {NOTICES[notice]}
        </div>
      )}

      <Card className="mt-6">
        <h2 className="text-lg">{signUp ? "Create your account" : "Sign in"}</h2>
        <form action={signUp ? signUpAction : signInAction} className="mt-4 space-y-3">
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
              autoComplete={signUp ? "new-password" : "current-password"}
              required
              minLength={8}
              className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-ink text-paper w-full rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            {signUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <form action={magicLinkAction} className="border-line mt-4 border-t pt-4">
          <p className="text-ink-faint mb-2 text-xs">
            Already have an account and prefer no password? Enter your email
            and we'll send a magic link.
          </p>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="magic-email">
              Email for magic link
            </label>
            <input
              id="magic-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="border-line hover:border-ink shrink-0 rounded-md border px-3 py-2 text-sm font-medium"
            >
              Send link
            </button>
          </div>
        </form>
      </Card>

      <p className="text-ink-soft mt-4 text-sm">
        {signUp ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/login?mode=signup" className="text-accent hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
      <p className="text-ink-faint mt-6 text-xs">
        Your uploads are private: encrypted in transit, stored in private
        buckets, and visible only to your account. AI output requires human
        review before you publish it.
      </p>
    </main>
  );
}
