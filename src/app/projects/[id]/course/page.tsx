import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Course Editor" };

export default async function CoursePage({
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
        title="Course editor"
        subtitle="Open a lesson to read, edit and review its full written content beside its sources."
      />
      <div className="space-y-6">
        {modules.map((mod, i) => (
          <Card key={mod.id}>
            <h2 className="text-lg">
              Module {mod.position}: {mod.title}
            </h2>
            <ul className="mt-3 space-y-1.5">
              {(lessonsByModule[i] ?? []).map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/projects/${id}/course/${lesson.id}`}
                    className="hover:bg-paper -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors"
                  >
                    <span className="text-sm font-medium">
                      {mod.position}.{lesson.position} {lesson.title}
                    </span>
                    <span className="flex items-center gap-2">
                      {lesson.warnings.length > 0 && (
                        <span className="bg-warn-soft text-warn rounded-full px-2 py-0.5 text-[11px] font-medium">
                          {lesson.warnings.length} warning
                          {lesson.warnings.length > 1 ? "s" : ""}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          lesson.status === "APPROVED"
                            ? "bg-ok-soft text-ok"
                            : lesson.status === "REVIEW"
                              ? "bg-accent-soft text-accent"
                              : "bg-paper text-ink-soft border-line border"
                        }`}
                      >
                        {lesson.status.toLowerCase()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
