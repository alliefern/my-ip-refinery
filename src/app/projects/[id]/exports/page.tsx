import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Exports" };

const PACKAGE_FILES = [
  ["01-course-positioning.md", "Positioning, promise and audience"],
  ["02-course-blueprint.md", "Modules, lessons and rationale"],
  ["03-full-course-content.docx", "Every lesson, editable Word document"],
  ["04-full-course-content.md", "Every lesson, Markdown"],
  ["05-student-workbook.docx", "Exercises, checklists and prompts"],
  ["06-bonus-video-vault.md", "The organized training library"],
  ["07-source-map.csv", "Lesson → source training → timestamp map"],
  ["08-structured-course.json", "Portable structured export"],
] as const;

export default async function ExportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  void id;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Export centre"
        subtitle="Exports always reflect your latest saved edits, never an earlier AI draft."
      />
      <Card>
        <h2 className="text-lg">Complete course package (ZIP)</h2>
        <ul className="border-line mt-4 divide-y divide-(--color-line) border-t">
          {PACKAGE_FILES.map(([file, description]) => (
            <li key={file} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="font-mono text-sm">{file}</p>
                <p className="text-ink-faint text-xs">{description}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          {isDemoMode() ? (
            <p className="bg-warn-soft text-warn inline-block rounded-md px-3 py-2 text-sm">
              Export generation activates outside demo mode (Milestone 6). The
              package layout above is final.
            </p>
          ) : (
            <button
              type="button"
              className="bg-ink text-paper rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Generate package
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
