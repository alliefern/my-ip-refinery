import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Blueprint" };

export default async function BlueprintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = getDataSource();
  const blueprint = await data.getBlueprint(user.id, id);
  if (!blueprint) redirect(`/projects/${id}`);
  const modules = await data.listModules(user.id, blueprint.id);
  const lessonsByModule = await Promise.all(
    modules.map((m) => data.listLessons(user.id, m.id)),
  );

  return (
    <div>
      <PageHeader
        title="Course blueprint"
        subtitle="The strategic structure, ready for your review. Approve it and the refinery writes every lesson; edit anything first."
      />

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
            <dd className="mt-0.5">{blueprint.positioning.idealStudent}</dd>
          </div>
          <div>
            <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
              Not for
            </dt>
            <dd className="mt-0.5">{blueprint.positioning.notFor}</dd>
          </div>
          <div>
            <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
              Format &amp; scope
            </dt>
            <dd className="mt-0.5">{blueprint.positioning.formatAndScope}</dd>
          </div>
          <div>
            <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
              By the end
            </dt>
            <dd className="mt-0.5">{blueprint.positioning.outcomeStatement}</dd>
          </div>
        </dl>

        <div className="bg-paper border-line mt-5 rounded-md border p-3 text-sm">
          <p className="text-ink-faint mb-1 text-xs font-medium tracking-wide uppercase">
            Why this structure
          </p>
          {blueprint.positioning.strategicRationale}
        </div>

        <div className="mt-5 flex items-center gap-3">
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
          <span className="text-ink-faint text-xs">
            Version {blueprint.version}
          </span>
        </div>
      </Card>

      <div className="space-y-6">
        {modules.map((mod, i) => (
          <Card key={mod.id}>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-accent text-2xl">
                {String(mod.position).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-xl">{mod.title}</h3>
                <p className="text-ink-soft text-sm">{mod.purpose}</p>
              </div>
            </div>
            <p className="text-ink-faint mt-2 text-xs">
              <span className="font-medium">Why here:</span> {mod.rationale}
            </p>
            <ul className="border-line mt-4 divide-y divide-(--color-line) border-t">
              {(lessonsByModule[i] ?? []).map((lesson) => (
                <li key={lesson.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {mod.position}.{lesson.position} {lesson.title}
                    </p>
                    <p className="text-ink-faint text-xs">{lesson.objective}</p>
                  </div>
                  <span className="text-ink-faint shrink-0 text-xs tabular-nums">
                    source {Math.round(lesson.sourceStrengthScore * 100)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
