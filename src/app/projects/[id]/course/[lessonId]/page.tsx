import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { LessonContent } from "@/lib/markdown";
import { formatTimestamp } from "@/lib/validation";
import { BackLink, Card, ScoreBar, SupportBadge } from "@/components/ui";
import { saveLessonAction } from "./actions";

export const metadata = { title: "Lesson" };

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; lessonId: string }>;
  searchParams: Promise<{ edit?: string; conflict?: string }>;
}) {
  const { id, lessonId } = await params;
  const { edit, conflict } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = getDataSource();
  const [lesson, sources, assets] = await Promise.all([
    data.getLesson(user.id, lessonId),
    data.listLessonSources(user.id, lessonId),
    data.listAssets(user.id, id),
  ]);
  if (!lesson) notFound();
  const assetTitle = new Map(assets.map((a) => [a.id, a.displayTitle]));
  const editing = edit === "1";

  return (
    <div>
      <BackLink href={`/projects/${id}/course`} label="All lessons" />

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_290px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl">{lesson.title}</h1>
              <p className="text-ink-soft mt-1 text-sm">{lesson.objective}</p>
            </div>
            {!editing && (
              <Link
                href={`/projects/${id}/course/${lessonId}?edit=1`}
                className="border-line hover:border-ink rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
              >
                Edit lesson
              </Link>
            )}
          </div>

          {conflict === "1" && (
            <div className="bg-danger-soft text-danger mt-4 rounded-md p-3 text-sm">
              This lesson changed since you opened the editor, so your edit was
              not saved over the newer version. Copy your changes, reload, and
              try again.
            </div>
          )}

          {lesson.warnings.length > 0 && (
            <div className="bg-warn-soft mt-4 rounded-md p-3">
              <p className="text-warn text-xs font-semibold tracking-wide uppercase">
                Source warnings
              </p>
              <ul className="text-warn mt-1 list-inside list-disc text-sm">
                {lesson.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {editing ? (
            <form action={saveLessonAction} className="mt-6">
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="lessonId" value={lessonId} />
              <input type="hidden" name="expectedVersion" value={lesson.version} />
              <label className="sr-only" htmlFor="content">
                Lesson content (Markdown)
              </label>
              <textarea
                id="content"
                name="content"
                rows={28}
                defaultValue={lesson.contentMarkdown}
                className="border-line focus:border-ink w-full rounded-md border bg-white p-4 font-mono text-sm leading-relaxed"
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="submit"
                  className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  Save changes
                </button>
                <Link
                  href={`/projects/${id}/course/${lessonId}`}
                  className="text-ink-soft px-2 py-2 text-sm hover:underline"
                >
                  Cancel
                </Link>
              </div>
            </form>
          ) : (
            <div className="mt-6">
              <LessonContent markdown={lesson.contentMarkdown} />
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <Card>
            <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
              Lesson scores
            </h2>
            <div className="space-y-1.5">
              <ScoreBar label="Source strength" value={lesson.sourceStrengthScore} />
              <ScoreBar label="Transformation" value={lesson.transformationValueScore} />
              <ScoreBar label="Uniqueness" value={lesson.creatorUniquenessScore} />
            </div>
            <p className="text-ink-faint mt-3 text-xs">
              Version {lesson.version} · {lesson.status.toLowerCase()}
            </p>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
              Sources
            </h2>
            <ul className="space-y-3">
              {sources.map((s) => (
                <li key={s.id} className="text-sm">
                  <SupportBadge type={s.supportType} />
                  <p className="mt-1 font-medium">
                    {assetTitle.get(s.sourceAssetId) ?? "Creator answer"}
                  </p>
                  <p className="text-ink-faint text-xs">{s.supportNote}</p>
                  {s.startSeconds !== null && s.endSeconds !== null && (
                    <Link
                      href={`/projects/${id}/transcripts?asset=${s.sourceAssetId}${s.transcriptChunkId ? `&chunk=${s.transcriptChunkId}` : ""}`}
                      className="text-accent text-xs hover:underline"
                    >
                      ≈ {formatTimestamp(s.startSeconds)}–{formatTimestamp(s.endSeconds)} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
