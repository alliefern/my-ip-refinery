import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { IP_ITEM_TYPES, type IpItemType } from "@/lib/types";
import { formatTimestamp } from "@/lib/validation";
import { Card, PageHeader, ScoreBar, SupportBadge } from "@/components/ui";

export const metadata = { title: "IP Map" };

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
  const [items, assets] = await Promise.all([
    data.listIpItems(user.id, id),
    data.listAssets(user.id, id),
  ]);
  const assetTitle = new Map(assets.map((a) => [a.id, a.displayTitle]));
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
              {item.startSeconds !== null && item.endSeconds !== null && (
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
              )}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
