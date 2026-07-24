import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { PROJECT_STATUSES } from "@/lib/types";
import { PROJECT_STATUS_LABELS } from "@/lib/status";
import { formatTimestamp } from "@/lib/validation";
import { Card, PageHeader } from "@/components/ui";
import { retryProjectJobAction } from "./actions";
import { isDemoMode } from "@/lib/config";

export const metadata = { title: "Overview" };

/** Pipeline stages shown on the truthful-progress view. */
const PIPELINE = PROJECT_STATUSES.filter(
  (s) => !["DRAFT", "FAILED", "COMPLETE"].includes(s),
);

/** Project-level jobs (no source_asset_id) that have a manual retry
 * path once they've permanently failed. Source-asset jobs are retried
 * from the Sources page instead, which verifies the file actually
 * landed in storage first. */
const RETRYABLE_JOB_TYPES = new Set([
  "build_ip_map",
  "generate_blueprint",
  "generate_lessons",
  "generate_course_assets",
]);

export default async function ProjectOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const demo = isDemoMode();
  const data = getDataSource();
  const [project, assets, jobs, usage] = await Promise.all([
    data.getProject(user.id, id),
    data.listAssets(user.id, id),
    data.listJobs(user.id, id),
    data.listUsage(user.id, id),
  ]);
  if (!project) redirect("/dashboard");

  const currentIndex = PIPELINE.indexOf(
    project.status as (typeof PIPELINE)[number],
  );
  const totalCostCents = usage.reduce(
    (sum, u) => sum + u.estimatedCostMinorUnits,
    0,
  );
  const mediaAssets = assets.filter((a) => a.durationSeconds !== null);
  const totalMinutes = Math.round(
    mediaAssets.reduce((s, a) => s + (a.durationSeconds ?? 0), 0) / 60,
  );

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Processing continues even when you close this tab. Come back any time."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg">Pipeline</h2>
          <ol className="space-y-2">
            {PIPELINE.map((stage, i) => {
              const state =
                i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
              return (
                <li key={stage} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      state === "done"
                        ? "bg-ok-soft text-ok"
                        : state === "active"
                          ? "bg-accent text-paper"
                          : "bg-line text-ink-faint"
                    }`}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span
                    className={
                      state === "active"
                        ? "font-medium"
                        : state === "todo"
                          ? "text-ink-faint"
                          : "text-ink-soft"
                    }
                  >
                    {PROJECT_STATUS_LABELS[stage]}
                    {state === "active" && " — waiting on you"}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-lg">Library</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-faint">Trainings</dt>
                <dd>{mediaAssets.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Supporting files</dt>
                <dd>{assets.length - mediaAssets.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-faint">Total duration</dt>
                <dd>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg">Usage</h2>
            <dl className="space-y-1.5 text-sm">
              {usage.map((u) => (
                <div key={u.id} className="flex justify-between">
                  <dt className="text-ink-faint">{u.operation.replace(/_/g, " ")}</dt>
                  <dd className="tabular-nums">
                    ${(u.estimatedCostMinorUnits / 100).toFixed(2)}
                  </dd>
                </div>
              ))}
              <div className="border-line flex justify-between border-t pt-1.5 font-medium">
                <dt>Estimated total</dt>
                <dd className="tabular-nums">${(totalCostCents / 100).toFixed(2)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <h2 className="mt-10 mb-4 text-lg">Source library</h2>
      <div className="space-y-2">
        {assets.map((a) => (
          <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{a.displayTitle}</p>
              <p className="text-ink-faint text-xs">
                {a.originalFilename}
                {a.durationSeconds
                  ? ` · ${formatTimestamp(a.durationSeconds)}`
                  : ""}
                {` · ${(a.sizeBytes / 1024 ** 3).toFixed(2)} GB`}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                a.status === "READY"
                  ? "bg-ok-soft text-ok"
                  : a.status === "FAILED"
                    ? "bg-danger-soft text-danger"
                    : "bg-paper text-ink-soft border-line border"
              }`}
            >
              {a.status === "READY" ? "Ready" : a.status.toLowerCase()}
            </span>
          </Card>
        ))}
      </div>

      {jobs.length > 0 && (
        <>
          <h2 className="mt-10 mb-4 text-lg">Recent jobs</h2>
          <div className="space-y-2">
            {jobs.map((j) => {
              const canRetry =
                !demo &&
                j.status === "FAILED" &&
                j.sourceAssetId === null &&
                RETRYABLE_JOB_TYPES.has(j.jobType);
              return (
                <div key={j.id} className="text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink-soft">
                      {j.jobType.replace(/_/g, " ")}
                      {j.attemptCount > 1 && ` (attempt ${j.attemptCount})`}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={
                          j.status === "FAILED" ? "text-danger" : "text-ink-faint"
                        }
                      >
                        {j.status.toLowerCase()}
                      </span>
                      {canRetry && (
                        <form action={retryProjectJobAction}>
                          <input type="hidden" name="projectId" value={id} />
                          <input type="hidden" name="jobType" value={j.jobType} />
                          <button
                            type="submit"
                            className="border-line hover:border-ink rounded-md border px-2.5 py-1 text-xs font-medium"
                          >
                            Retry
                          </button>
                        </form>
                      )}
                    </span>
                  </div>
                  {j.status === "FAILED" && j.errorMessage && (
                    <p className="text-danger mt-0.5 text-xs">{j.errorMessage}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
