import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { isDemoMode } from "@/lib/config";
import { Card, PageHeader } from "@/components/ui";
import { deleteProjectAction, updateIntakeAction } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const project = await getDataSource().getProject(user.id, id);
  if (!project) redirect("/dashboard");
  const demo = isDemoMode();

  return (
    <div>
      <PageHeader
        title="Project settings"
        subtitle="Intake answers and voice settings feed every AI stage; changes apply to future generations and regenerations."
      />

      {error === "confirm-mismatch" && (
        <div className="bg-danger-soft text-danger mb-6 rounded-md p-3 text-sm" role="alert">
          The project name you typed didn't match — nothing was deleted.
        </div>
      )}

      <Card>
        <h2 className="text-lg">Intake &amp; voice</h2>
        <form action={updateIntakeAction} className="mt-4 space-y-4 text-sm">
          <input type="hidden" name="projectId" value={id} />
          <div>
            <label className="mb-1 block font-medium" htmlFor="name">
              Project name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={project.name}
              disabled={demo}
              className="border-line w-full rounded-md border bg-white px-3 py-2 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium" htmlFor="topic">
              Topic
            </label>
            <input
              id="topic"
              name="topic"
              type="text"
              defaultValue={project.intake.topic}
              disabled={demo}
              className="border-line w-full rounded-md border bg-white px-3 py-2 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium" htmlFor="studentResult">
              Student result
            </label>
            <textarea
              id="studentResult"
              name="studentResult"
              rows={2}
              defaultValue={project.intake.studentResult}
              disabled={demo}
              className="border-line w-full rounded-md border bg-white px-3 py-2 disabled:opacity-60"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-medium" htmlFor="tone">
                Tone
              </label>
              <select
                id="tone"
                name="tone"
                defaultValue={project.voiceSettings.tone}
                disabled={demo}
                className="border-line w-full rounded-md border bg-white px-3 py-2 disabled:opacity-60"
              >
                <option value="conversational">Conversational</option>
                <option value="polished">Polished</option>
                <option value="provocative">Provocative</option>
                <option value="academic">Academic</option>
                <option value="warm">Warm</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium" htmlFor="languageVariant">
                Language
              </label>
              <select
                id="languageVariant"
                name="languageVariant"
                defaultValue={project.voiceSettings.languageVariant}
                disabled={demo}
                className="border-line w-full rounded-md border bg-white px-3 py-2 disabled:opacity-60"
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
                defaultValue={project.voiceSettings.profanity}
                disabled={demo}
                className="border-line w-full rounded-md border bg-white px-3 py-2 disabled:opacity-60"
              >
                <option value="none">None</option>
                <option value="light">Light</option>
                <option value="natural">Natural</option>
                <option value="preserve_source">Preserve source</option>
              </select>
            </div>
          </div>
          {!demo && (
            <button
              type="submit"
              className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Save settings
            </button>
          )}
        </form>
      </Card>

      <Card className="border-danger/40 mt-8">
        <h2 className="text-danger text-lg">Delete this project</h2>
        <p className="text-ink-soft mt-1 text-sm">
          Permanently removes the project, its transcripts, IP map, course
          content, exports and all stored original files. This cannot be
          undone.
        </p>
        {demo ? (
          <p className="text-ink-faint mt-3 text-xs">
            Deletion is disabled for the demo project.
          </p>
        ) : (
          <form action={deleteProjectAction} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={id} />
            <div>
              <label className="text-ink-faint mb-1 block text-xs" htmlFor="confirmName">
                Type the project name to confirm: <strong>{project.name}</strong>
              </label>
              <input
                id="confirmName"
                name="confirmName"
                type="text"
                required
                className="border-line focus:border-danger w-72 rounded-md border bg-white px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-danger text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Delete project permanently
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
