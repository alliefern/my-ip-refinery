import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { formatTimestamp } from "@/lib/validation";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Bonus Vault" };

export default async function VaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const vault = await getDataSource().listVault(user.id, id);

  return (
    <div>
      <PageHeader
        title="Bonus video vault"
        subtitle="Your original trainings, organized as a searchable bonus library students can watch alongside the course."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {vault.map((entry) => (
          <Card key={entry.id}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg">{entry.cleanTitle}</h2>
              <span className="text-ink-faint shrink-0 text-xs">
                Watch #{entry.suggestedOrder}
              </span>
            </div>
            <p className="text-ink-soft mt-1 text-sm">{entry.description}</p>
            <p className="mt-2 text-sm">
              <span className="text-ink-faint font-medium">Watch this if:</span>{" "}
              {entry.watchThisIf}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.keyTopics.map((topic) => (
                <span
                  key={topic}
                  className="bg-paper border-line text-ink-soft rounded-full border px-2 py-0.5 text-xs"
                >
                  {topic}
                </span>
              ))}
            </div>
            {entry.chapters.length > 0 && (
              <ul className="border-line mt-4 space-y-1 border-t pt-3 text-sm">
                {entry.chapters.map((ch) => (
                  <li key={ch.title} className="flex justify-between">
                    <span>{ch.title}</span>
                    <span className="text-ink-faint tabular-nums">
                      ≈ {formatTimestamp(ch.startSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {entry.relatedLessonIds.length > 0 && (
              <p className="text-ink-faint mt-3 text-xs">
                Related lessons:{" "}
                {entry.relatedLessonIds.map((lid, i) => (
                  <span key={lid}>
                    {i > 0 && ", "}
                    <Link
                      href={`/projects/${id}/course/${lid}`}
                      className="text-accent hover:underline"
                    >
                      open
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
