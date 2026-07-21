import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Exports" };

const PACKAGE_FILES: [string, string][] = [
  ["01-course-positioning.md", "Positioning, promise and audience"],
  ["02-course-blueprint.md", "Modules, lessons and rationale"],
  ["03-full-course-content.docx", "Every lesson, editable Word document"],
  ["04-full-course-content.md", "Every lesson, Markdown"],
  ["05-student-workbook.docx", "Exercises, checklists and prompts"],
  ["06-bonus-video-vault.md", "The organized training library"],
  ["07-source-map.csv", "Lesson → source training → timestamp map"],
  ["08-structured-course.json", "Portable structured export"],
];

export default async function ExportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const blueprint = await getDataSource().getBlueprint(user.id, id);

  return (
    <div>
      <PageHeader
        title="Export centre"
        subtitle="Every file is generated fresh from your latest saved edits, never from an earlier AI draft."
      />
      {!blueprint ? (
        <EmptyState
          title="Nothing to export yet"
          body="Exports become available once your course blueprint exists."
        />
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg">Complete course package</h2>
            <a
              href={`/api/projects/${id}/export?file=zip`}
              className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Download ZIP
            </a>
          </div>
          <ul className="border-line mt-4 divide-y divide-(--color-line) border-t">
            {PACKAGE_FILES.map(([file, description]) => (
              <li
                key={file}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div>
                  <p className="font-mono text-sm">{file}</p>
                  <p className="text-ink-faint text-xs">{description}</p>
                </div>
                <a
                  href={`/api/projects/${id}/export?file=${file}`}
                  className="border-line hover:border-ink shrink-0 rounded-md border px-3 py-1 text-xs font-medium"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
