import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { BackLink, Card, PageHeader } from "@/components/ui";
import { createProjectAction } from "./actions";

export const metadata = { title: "New project" };

const ERRORS: Record<string, string> = {
  "name-required": "Give the project a name before continuing.",
  "project-limit": "You've reached your active-project limit — archive or delete one first.",
  "create-failed": "Something went wrong creating the project. Try again.",
};

/**
 * Project intake wizard. In demo mode the form is fully rendered and
 * navigable but submission is disabled.
 */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <BackLink href="/dashboard" label="Projects" />
      <PageHeader
        title="New project"
        subtitle="Answer what you can — everything is editable later, and non-essential questions can be skipped."
      />

      {error && ERRORS[error] && (
        <div className="bg-danger-soft text-danger mb-6 rounded-md p-3 text-sm" role="alert">
          {ERRORS[error]}
        </div>
      )}

      <form action={createProjectAction} className="space-y-8">
        <Card>
          <h2 className="mb-4 text-lg">Course purpose</h2>
          <div className="space-y-4 text-sm">
            <div>
              <label className="mb-1 block font-medium" htmlFor="name">
                Project name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Signature Offer Trainings"
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="purpose">
                What do you want to create?
              </label>
              <select
                id="purpose"
                name="purpose"
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              >
                <option value="paid_mini_course">Paid mini-course</option>
                <option value="lead_magnet">Lead magnet</option>
                <option value="client_onboarding">Client onboarding programme</option>
                <option value="bonus_programme">Bonus programme</option>
                <option value="internal_training">Internal training</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="topic">
                What topic connects these trainings?
              </label>
              <input
                id="topic"
                name="topic"
                type="text"
                placeholder="e.g. Designing and selling a signature offer"
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="result">
                What result should the student achieve?
              </label>
              <textarea
                id="result"
                name="result"
                rows={2}
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg">Audience</h2>
          <div className="space-y-4 text-sm">
            <div>
              <label className="mb-1 block font-medium" htmlFor="audience">
                Who is the course for?
              </label>
              <input
                id="audience"
                name="audience"
                type="text"
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="problem">
                What problem are they experiencing?
              </label>
              <textarea
                id="problem"
                name="problem"
                rows={2}
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg">Scope &amp; voice</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium" htmlFor="depth">
                Course depth
              </label>
              <select
                id="depth"
                name="depth"
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              >
                <option value="quick_win">Quick win</option>
                <option value="mini_course">Mini-course</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="tone">
                Tone
              </label>
              <select
                id="tone"
                name="tone"
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              >
                <option value="conversational">Conversational</option>
                <option value="polished">Polished</option>
                <option value="provocative">Provocative</option>
                <option value="academic">Academic</option>
                <option value="warm">Warm</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="language">
                Language variant
              </label>
              <select
                id="language"
                name="language"
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              >
                <option value="us">US English</option>
                <option value="uk">UK English</option>
                <option value="au">Australian English</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="profanity">
                Profanity
              </label>
              <select
                id="profanity"
                name="profanity"
                className="border-line w-full rounded-md border bg-white px-3 py-2"
              >
                <option value="none">None</option>
                <option value="light">Light</option>
                <option value="natural">Natural</option>
                <option value="preserve_source">Preserve source language</option>
              </select>
            </div>
          </div>
        </Card>

        {isDemoMode() ? (
          <div className="bg-warn-soft rounded-md p-4 text-sm">
            <p className="text-warn font-medium">
              Project creation is disabled in demo mode.
            </p>
            <p className="text-warn mt-1">
              Explore the seeded example instead —{" "}
              <Link href="/dashboard" className="underline">
                back to your projects
              </Link>
              .
            </p>
          </div>
        ) : (
          <button
            type="submit"
            className="bg-ink text-paper rounded-md px-5 py-2.5 text-sm font-medium hover:opacity-90"
          >
            Continue to upload →
          </button>
        )}
      </form>
    </main>
  );
}
