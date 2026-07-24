import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { isDemoMode } from "@/lib/config";
import { formatTimestamp } from "@/lib/validation";
import { Card, PageHeader } from "@/components/ui";
import { UploadPanel } from "./upload-panel";
import { deleteAssetAction, retryAssetAction } from "./actions";

export const metadata = { title: "Sources" };

const DOCUMENT_KINDS = new Set(["slide_deck", "workbook", "note"]);

/** Documents reuse the media status enum; relabel the audio-specific
 * stages so a PDF never claims to be "transcribing". */
function statusLabel(kind: string, status: string): string {
  if (DOCUMENT_KINDS.has(kind)) {
    if (status === "TRANSCRIBING" || status === "PREPARING_AUDIO") {
      return "reading text";
    }
    if (status === "TRANSCRIBED") return "text extracted";
  }
  return status.toLowerCase().replace(/_/g, " ");
}

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const assets = await getDataSource().listAssets(user.id, id);
  const demo = isDemoMode();

  return (
    <div>
      <PageHeader
        title="Source library"
        subtitle="Upload one to ten trainings on one topic, plus any slides, workbooks or notes the trainings reference."
      />

      {demo ? (
        <div className="bg-warn-soft text-warn mb-6 rounded-md p-3 text-sm">
          Uploads are disabled in demo mode — the library below is the seeded
          example.
        </div>
      ) : (
        <div className="mb-8">
          <UploadPanel projectId={id} />
        </div>
      )}

      <div className="space-y-2">
        {assets.map((a) => {
          const uploadMinutesAgo =
            a.status === "UPLOADING"
              ? Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 60000)
              : null;
          const stalled = uploadMinutesAgo !== null && uploadMinutesAgo >= 20;

          return (
          <Card
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{a.displayTitle}</p>
              <p className="text-ink-faint text-xs">
                {a.originalFilename}
                {a.durationSeconds ? ` · ${formatTimestamp(a.durationSeconds)}` : ""}
                {` · ${(a.sizeBytes / 1024 ** 2).toFixed(0)} MB`}
                {uploadMinutesAgo !== null &&
                  ` · started ${uploadMinutesAgo < 1 ? "just now" : `${uploadMinutesAgo} min ago`}`}
                {a.errorMessage && (
                  <span className="text-danger"> · {a.errorMessage}</span>
                )}
                {stalled && (
                  <span className="text-warn">
                    {" "}
                    · Taking unusually long — if the browser tab was closed
                    or the connection dropped, delete this and upload again.
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  a.status === "READY" || a.status === "TRANSCRIBED"
                    ? "bg-ok-soft text-ok"
                    : a.status === "FAILED"
                      ? "bg-danger-soft text-danger"
                      : stalled
                        ? "bg-warn-soft text-warn"
                        : "bg-paper text-ink-soft border-line border"
                }`}
              >
                {statusLabel(a.kind, a.status)}
              </span>
              {!demo && a.status === "FAILED" && (
                <form action={retryAssetAction}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="assetId" value={a.id} />
                  <button
                    type="submit"
                    className="border-line hover:border-ink rounded-md border px-2.5 py-1 text-xs font-medium"
                  >
                    Retry
                  </button>
                </form>
              )}
              {!demo && (
                <form action={deleteAssetAction}>
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="assetId" value={a.id} />
                  <button
                    type="submit"
                    className="text-danger rounded-md px-2 py-1 text-xs hover:underline"
                  >
                    Delete
                  </button>
                </form>
              )}
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
