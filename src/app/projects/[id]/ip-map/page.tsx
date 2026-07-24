import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { isDemoMode } from "@/lib/config";
import { IP_ITEM_TYPES, type IpItemType } from "@/lib/types";
import { formatTimestamp } from "@/lib/validation";
import { Card, PageHeader, ScoreBar, SupportBadge } from "@/components/ui";
import { retryProjectJobAction } from "../actions";
import { thinMaterialMessage } from "../job-messages";

export const metadata = { title: "IP Map" };

function MapList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone?: "warn";
}) {
  return (
    <div>
      <p className="text-ink-faint text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <ul
        className={`mt-1 list-inside list-disc space-y-0.5 ${tone === "warn" ? "text-warn" : "text-ink-soft"}`}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const TYPE_LABELS: Record<IpItemType, string> = {
  concept: "Concept",
  signature_framework: "Signature framework",
  named_methodology: "Named methodology",
  step_or_process: "Step / process",
  strong_opinion: "Strong opinion",
  story: "Story",
  case_study: "Case study",
  example: "Example",
  analogy: "Analogy",
  instruction: "Instruction",
  exercise: "Exercise",
  template_or_resource: "Template / resource",
  common_mistake: "Common mistake",
  objection: "Objection",
  faq: "FAQ",
  result_or_claim: "Result / claim",
  distinctive_phrase: "Distinctive phrase",
};

export default async function IpMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type: typeFilter } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = getDataSource();
  const [project, items, assets, jobs] = await Promise.all([
    data.getProject(user.id, id),
    data.listIpItems(user.id, id),
    data.listAssets(user.id, id),
    data.listJobs(user.id, id),
  ]);
  const assetTitle = new Map(assets.map((a) => [a.id, a.displayTitle]));
  const map = project?.ipMap ?? null;
  const mapJob = jobs.find(
    (j) => j.jobType === "build_ip_map" && j.sourceAssetId === null,
  );
  const presentTypes = IP_ITEM_TYPES.filter((t) =>
    items.some((i) => i.type === t),
  );
  const filtered = typeFilter
    ? items.filter((i) => i.type === typeFilter)
    : items;

  return (
    <div>
      <PageHeader
        title="IP Map"
        subtitle="Everything mined from your trainings, traceable to its source. Nothing here was invented."
      />

      {!map && mapJob?.status === "FAILED" && (
        <Card className="border-danger/30 bg-danger-soft mb-8">
          {(() => {
            const { headline, detail } = thinMaterialMessage(mapJob);
            return (
              <>
                <p className="text-danger text-sm font-medium">{headline}</p>
                {detail && (
                  <p className="text-ink-faint mt-2 text-xs">
                    Technical detail: {detail}
                  </p>
                )}
              </>
            );
          })()}
          <p className="text-ink-faint mt-2 text-xs">
            The individual items below are unaffected — they were mined
            training by training, before this stage runs. Course direction
            options won't appear until this stage succeeds.
          </p>
          {!isDemoMode() && (
            <form action={retryProjectJobAction} className="mt-4">
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="jobType" value="build_ip_map" />
              <button
                type="submit"
                className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Retry
              </button>
            </form>
          )}
        </Card>
      )}

      {map && (
        <Card className="mb-8">
          <h2 className="text-lg">Cross-training analysis</h2>
          <div className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
            {map.dominant_themes && map.dominant_themes.length > 0 && (
              <MapList label="Dominant themes" items={map.dominant_themes} />
            )}
            {map.signature_frameworks && map.signature_frameworks.length > 0 && (
              <MapList label="Signature frameworks" items={map.signature_frameworks} />
            )}
            {map.repeated_teachings && map.repeated_teachings.length > 0 && (
              <MapList label="Repeated teachings" items={map.repeated_teachings} />
            )}
            {map.unique_insights && map.unique_insights.length > 0 && (
              <MapList label="Unique insights" items={map.unique_insights} />
            )}
            {map.missing_steps && map.missing_steps.length > 0 && (
              <MapList label="Missing steps" items={map.missing_steps} tone="warn" />
            )}
            {map.bonus_material && map.bonus_material.length > 0 && (
              <MapList label="Belongs in the bonus vault" items={map.bonus_material} />
            )}
            {map.other_product_material && map.other_product_material.length > 0 && (
              <MapList
                label="Unused opportunities (different product)"
                items={map.other_product_material}
              />
            )}
          </div>
          {map.contradictions && map.contradictions.length > 0 && (
            <div className="bg-warn-soft mt-5 rounded-md p-3">
              <p className="text-warn text-xs font-semibold tracking-wide uppercase">
                Contradictions to resolve
              </p>
              <ul className="text-warn mt-1 space-y-1.5 text-sm">
                {map.contradictions.map((c) => (
                  <li key={c.topic}>
                    <span className="font-medium">{c.topic}:</span>{" "}
                    {c.positions.join(" — versus — ")}{" "}
                    <span className="opacity-75">({c.trainings.join(", ")})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={`/projects/${id}/ip-map`}
          className={`rounded-full border px-3 py-1 text-sm ${
            !typeFilter
              ? "bg-ink text-paper border-ink"
              : "border-line text-ink-soft hover:border-ink-faint"
          }`}
        >
          All ({items.length})
        </Link>
        {presentTypes.map((t) => (
          <Link
            key={t}
            href={`/projects/${id}/ip-map?type=${t}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              typeFilter === t
                ? "bg-ink text-paper border-ink"
                : "border-line text-ink-soft hover:border-ink-faint"
            }`}
          >
            {TYPE_LABELS[t]} ({items.filter((i) => i.type === t).length})
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((item) => (
          <Card key={item.id}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-ink-faint text-xs font-medium tracking-wide uppercase">
                {TYPE_LABELS[item.type]}
              </span>
              <SupportBadge type={item.supportType} />
            </div>
            <h2 className="text-lg">{item.title}</h2>
            <p className="text-ink-soft mt-1.5 text-sm">{item.content}</p>
            <div className="mt-3 space-y-1">
              <ScoreBar label="Confidence" value={item.confidenceScore} />
              <ScoreBar label="Distinctiveness" value={item.distinctivenessScore} />
            </div>
            <p className="text-ink-faint mt-3 text-xs">
              {assetTitle.get(item.sourceAssetId) ?? "Unknown source"}
              {item.startSeconds !== null && item.endSeconds !== null ? (
                <>
                  {" · ≈ "}
                  {item.transcriptChunkId ? (
                    <Link
                      href={`/projects/${id}/transcripts?asset=${item.sourceAssetId}&chunk=${item.transcriptChunkId}`}
                      className="text-accent hover:underline"
                    >
                      {formatTimestamp(item.startSeconds)}–{formatTimestamp(item.endSeconds)}
                    </Link>
                  ) : (
                    `${formatTimestamp(item.startSeconds)}–${formatTimestamp(item.endSeconds)}`
                  )}
                </>
              ) : (
                item.transcriptChunkId && (
                  <>
                    {" · "}
                    <Link
                      href={`/projects/${id}/transcripts?asset=${item.sourceAssetId}&chunk=${item.transcriptChunkId}`}
                      className="text-accent hover:underline"
                    >
                      view source text
                    </Link>
                  </>
                )
              )}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
