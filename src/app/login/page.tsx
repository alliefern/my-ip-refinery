import Link from "next/link";
import { redirect } from "next/navigation";
import { brand, isDemoMode } from "@/lib/config";
import { Card } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  if (isDemoMode()) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
        <h1 className="text-4xl">{brand.name}</h1>
        <p className="text-ink-soft mt-2">{brand.tagline}.</p>
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
          credentials. Email sign-in with magic links activates automatically.
        </p>
      </main>
    );
  }
  // Real-auth UI lands with the Supabase activation milestone; until
  // then a non-demo deployment without credentials redirects to demo.
  redirect("/dashboard");
}
