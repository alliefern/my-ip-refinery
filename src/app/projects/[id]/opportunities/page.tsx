import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { isDemoMode } from "@/lib/config";
import { Card, PageHeader, ScoreBar } from "@/components/ui";
import { selectOpportunityAction } from "./actions";

export const metadata = { title: "Course Direction" };

export default async function OpportunitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = getDataSource();
  const [project, opportunities] = await Promise.all([
    data.getProject(user.id, id),
    data.listOpportunities(user.id, id),
  ]);
  if (!project) redirect("/dashboard");

  return (
    <div>
      <PageHeader
        title="Course direction"
        subtitle="Your library supports more than one course. These are the viable directions, scored by evidence strength — not by which sounds most exciting."
      />

      <div className="space-y-5">
        {opportunities.map((opp) => {
          const isSelected = project.selectedCourseOpportunityId === opp.id;
          return (
            <Card
              key={opp.id}
              className={isSelected ? "border-accent border-2" : ""}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl">{opp.title}</h2>
                    {opp.isRecommended && (
                      <span className="bg-accent-soft text-accent rounded-full px-2 py-0.5 text-xs font-medium">
                        Recommended
                      </span>
                    )}
                    {isSelected && (
                      <span className="bg-ok-soft text-ok rounded-full px-2 py-0.5 text-xs font-medium">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-ink-soft mt-1 text-sm">
                    For {opp.audience.toLowerCase()}
                  </p>
                </div>
                <ScoreBar label="Evidence strength" value={opp.strengthScore} />
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
                    Transformation
                  </dt>
                  <dd className="mt-0.5">{opp.transformation}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
                    Why your content supports it
                  </dt>
                  <dd className="text-ink-soft mt-0.5">{opp.rationale}</dd>
                </div>
                {opp.missingMaterial.length > 0 && (
                  <div>
                    <dt className="text-ink-faint text-xs font-medium tracking-wide uppercase">
                      What's missing
                    </dt>
                    <dd className="mt-0.5">
                      <ul className="text-warn list-inside list-disc space-y-0.5">
                        {opp.missingMaterial.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>

              {!isDemoMode() && !isSelected && (
                <form action={selectOpportunityAction} className="mt-4">
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="opportunityId" value={opp.id} />
                  <button
                    type="submit"
                    className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
                  >
                    Choose this direction
                  </button>
                </form>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
