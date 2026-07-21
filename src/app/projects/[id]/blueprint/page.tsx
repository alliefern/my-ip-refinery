import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { isDemoMode } from "@/lib/config";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import {
  addLessonAction,
  approveBlueprintAction,
  deleteLessonAction,
  moveLessonAction,
  moveModuleAction,
  updatePositioningAction,
} from "./actions";

export const metadata = { title: "Blueprint" };

const POSITIONING_FIELDS: { key: string; label: string; long?: boolean }[] = [
  { key: "title", label: "Course title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "promise", label: "Core promise", long: true },
  { key: "transformation", label: "Student transformation", long: true },
  { key: "audience", label: "Audience" },
  { key: "ideal_student", label: "Ideal student", long: true },
  { key: "not_for", label: "Who it is not for", long: true },
  { key: "prerequisites", label: "Prerequisites" },
  { key: "format_and_scope", label: "Format & scope" },
  { key: "outcome_statement", label: "“By the end…” statement", long: true },
];

export default async function BlueprintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = getDataSource();
  const blueprint = await data.getBlueprint(user.id, id);
  const demo = isDemoMode();

  if (!blueprint) {
    const jobs = await data.listJobs(user.id, id);
    const generating = jobs.some(
      (j) =>
        j.jobType === "generate_blueprint" &&
        (j.status === "PENDING" || j.status === "RUNNING"),
    );
    return (
      <div>
        <PageHeader title="Course blueprint" />
        {generating ? (
          <Card>
            <h2 className="text-lg">Designing your curriculum…</h2>
            <p className="text-ink-soft mt-2 text-sm">
              The blueprint is being generated from your IP map and chosen
              course direction. This usually takes a minute or two — you can
              close this tab and come back.
            </p>
          </Card>
        ) : (
          <EmptyState
            title="No blueprint yet"
            body="Choose a course direction first — the blueprint is designed from it."
            action={
              <Link
                href={`/projects/${id}/opportunities`}
                className="text-accent text-sm font-medium"
              >
                Go to course direction →
              </Link>
            }
          />
        )}
      </div>
    );
  }

  const modules = await data.listModules(user.id, blueprint.id);
  const lessonsByModule = await Promise.all(
    modules.map((m) => data.listLessons(user.id, m.id)),
  );
  const isDraft = blueprint.status === "DRAFT";
  const editable = !demo && isDraft;
  const editing = editable && edit === "1";
  const positioning = blueprint.positioning as unknown as Record<string, string>;

  return (
    <div>
      <PageHeader
        title="Course blueprint"
        subtitle={
          isDraft
            ? "The strategic structure, ready for your review. Edit anything, then approve to start lesson generation."
            : "Approved. Lessons are generated from this structure."
        }
        action={
          editable && !editing ? (
            <Link
              href={`/projects/${id}/blueprint?edit=1`}
              className="border-line hover:border-ink rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Edit positioning
            </Link>
          ) : undefined
        }
      />

      {editing ? (
        <Card className="mb-8">
          <h2 className="text-lg">Edit positioning</h2>
          <form action={updatePositioningAction} className="mt-4 space-y-3 text-sm">
            <input type="hidden" name="projectId" value={id} />
            <input type="hidden" name="blueprintId" value={blueprint.id} />
            {POSITIONING_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block font-medium" htmlFor={`pos-${field.key}`}>
                  {field.label}
                </label>
                {field.long ? (
                  <textarea
                    id={`pos-${field.key}`}
                    name={field.key}
                    rows={2}
                    defaultValue={positioning[field.key] ?? ""}
                    className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2"
                  />
                ) : (
                  <input
                    id={`pos-${field.key}`}
                    name={field.key}
                    type="text"
                    defaultValue={positioning[field.key] ?? ""}
                    className="border-line focus:border-ink w-full rounded-md border bg-white px-3 py-2"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Save positioning
              </button>
              <Link
                href={`/projects/${id}/blueprint`}
                className="text-ink-soft px-2 py-2 text-sm hover:underline"
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="mb-8">
          <p className="text-ink-faint text-xs font-medium tracking-wide uppercase">
            Positioning
          </p>
          <h2 className="mt-1 text-2xl">{blueprint.title}</h2>
          <p className="text-ink-soft italic">{blueprint.subtitle}</p>
          <p className="mt-3 text-sm">{blueprint.promise}</p>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
                Ideal student
              </dt>
              <dd className="mt-0.5">{positioning.ideal_student ?? positioning.idealStudent}</dd>
            </div>
            <div>
              <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
                Not for
              </dt>
              <dd className="mt-0.5">{positioning.not_for ?? positioning.notFor}</dd>
            </div>
            <div>
              <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
                Format &amp; scope
              </dt>
              <dd className="mt-0.5">
                {positioning.format_and_scope ?? positioning.formatAndScope}
              </dd>
            </div>
            <div>
              <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
                By the end
              </dt>
              <dd className="mt-0.5">
                {positioning.outcome_statement ?? positioning.outcomeStatement}
              </dd>
            </div>
          </dl>

          <div className="bg-paper border-line mt-5 rounded-md border p-3 text-sm">
            <p className="text-ink-faint mb-1 text-xs font-medium tracking-wide uppercase">
              Why this structure
            </p>
            {positioning.strategic_rationale ?? positioning.strategicRationale}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                blueprint.status === "APPROVED"
                  ? "bg-ok-soft text-ok"
                  : "bg-warn-soft text-warn"
              }`}
            >
              {blueprint.status === "APPROVED"
                ? "Approved"
                : "Draft — awaiting your approval"}
            </span>
            <span className="text-ink-faint text-xs">Version {blueprint.version}</span>
            {editable && (
              <form action={approveBlueprintAction} className="ml-auto">
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="blueprintId" value={blueprint.id} />
                <button
                  type="submit"
                  className="bg-accent text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  Approve blueprint
                </button>
              </form>
            )}
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {modules.map((mod, i) => (
          <Card key={mod.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-accent text-2xl">
                  {String(mod.position).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl">{mod.title}</h3>
                  <p className="text-ink-soft text-sm">{mod.purpose}</p>
                </div>
              </div>
              {editable && (
                <div className="flex gap-1">
                  <MoveButton
                    action={moveModuleAction}
                    projectId={id}
                    rowId={mod.id}
                    direction="up"
                    disabled={i === 0}
                    label={`Move module ${mod.title} up`}
                  />
                  <MoveButton
                    action={moveModuleAction}
                    projectId={id}
                    rowId={mod.id}
                    direction="down"
                    disabled={i === modules.length - 1}
                    label={`Move module ${mod.title} down`}
                  />
                </div>
              )}
            </div>
            <p className="text-ink-faint mt-2 text-xs">
              <span className="font-medium">Why here:</span> {mod.rationale}
            </p>

            <ul className="border-line mt-4 divide-y divide-(--color-line) border-t">
              {(lessonsByModule[i] ?? []).map((lesson, li) => (
                <li key={lesson.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {mod.position}.{lesson.position} {lesson.title}
                    </p>
                    <p className="text-ink-faint truncate text-xs">{lesson.objective}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-ink-faint text-xs tabular-nums">
                      source {Math.round(lesson.sourceStrengthScore * 100)}
                    </span>
                    {editable && (
                      <>
                        <MoveButton
                          action={moveLessonAction}
                          projectId={id}
                          rowId={lesson.id}
                          direction="up"
                          disabled={li === 0}
                          label={`Move lesson ${lesson.title} up`}
                        />
                        <MoveButton
                          action={moveLessonAction}
                          projectId={id}
                          rowId={lesson.id}
                          direction="down"
                          disabled={li === (lessonsByModule[i] ?? []).length - 1}
                          label={`Move lesson ${lesson.title} down`}
                        />
                        <form action={deleteLessonAction}>
                          <input type="hidden" name="projectId" value={id} />
                          <input type="hidden" name="lessonId" value={lesson.id} />
                          <button
                            type="submit"
                            aria-label={`Remove lesson ${lesson.title}`}
                            className="text-danger px-1 text-xs hover:underline"
                          >
                            Remove
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {editable && (
              <form
                action={addLessonAction}
                className="border-line mt-3 flex flex-wrap items-end gap-2 border-t pt-3"
              >
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="moduleId" value={mod.id} />
                <div className="min-w-40 flex-1">
                  <label className="text-ink-faint mb-1 block text-xs" htmlFor={`title-${mod.id}`}>
                    New lesson title
                  </label>
                  <input
                    id={`title-${mod.id}`}
                    name="title"
                    type="text"
                    required
                    className="border-line focus:border-ink w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="min-w-40 flex-1">
                  <label
                    className="text-ink-faint mb-1 block text-xs"
                    htmlFor={`objective-${mod.id}`}
                  >
                    Objective (optional)
                  </label>
                  <input
                    id={`objective-${mod.id}`}
                    name="objective"
                    type="text"
                    className="border-line focus:border-ink w-full rounded-md border bg-white px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="border-line hover:border-ink rounded-md border px-3 py-1.5 text-sm font-medium"
                >
                  Add lesson
                </button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function MoveButton({
  action,
  projectId,
  rowId,
  direction,
  disabled,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  projectId: string;
  rowId: string;
  direction: "up" | "down";
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="rowId" value={rowId} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        className="border-line hover:border-ink rounded border px-1.5 py-0.5 text-xs disabled:opacity-30"
      >
        {direction === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}
