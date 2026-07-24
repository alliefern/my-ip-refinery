import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { formatTimestamp } from "@/lib/validation";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Transcripts" };

export default async function TranscriptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ asset?: string; chunk?: string }>;
}) {
  const { id } = await params;
  const { asset: assetParam, chunk: highlightChunk } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = getDataSource();
  const DOCUMENT_KINDS = new Set(["slide_deck", "workbook", "note"]);
  const assets = (await data.listAssets(user.id, id)).filter(
    (a) =>
      a.durationSeconds !== null ||
      (DOCUMENT_KINDS.has(a.kind) &&
        ["TRANSCRIBED", "EXTRACTING", "READY"].includes(a.status)),
  );
  const selected =
    assets.find((a) => a.id === assetParam) ?? assets[0] ?? null;
  const chunks = selected ? await data.listChunks(user.id, selected.id) : [];

  return (
    <div>
      <PageHeader
        title="Transcripts"
        subtitle="Timestamps are machine-generated approximations from audio chunking. Written documents show their extracted text in reading order."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {assets.map((a) => (
          <Link
            key={a.id}
            href={`/projects/${id}/transcripts?asset=${a.id}`}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              selected?.id === a.id
                ? "bg-ink text-paper border-ink"
                : "border-line text-ink-soft hover:border-ink-faint"
            }`}
          >
            {a.displayTitle}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {chunks.map((chunk) => (
          <Card
            key={chunk.id}
            className={
              highlightChunk === chunk.id ? "border-accent border-2" : ""
            }
          >
            <p className="text-ink-faint mb-2 text-xs font-medium tracking-wide">
              {chunk.startSeconds !== null && chunk.endSeconds !== null
                ? `≈ ${formatTimestamp(chunk.startSeconds)} – ${formatTimestamp(chunk.endSeconds)}`
                : (chunk.locationLabel ?? `Part ${chunk.sequenceNumber}`)}
            </p>
            <p className="text-[15px] leading-relaxed">{chunk.cleanText}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
