import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDataSource } from "@/lib/data";
import {
  buildExportFile,
  buildZip,
  EXPORT_FILES,
  type ExportData,
  type ExportFile,
} from "@/lib/export/build";
import { safeFilename } from "@/lib/validation";
import type { Lesson, LessonSource } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * On-demand export generation from current database state. Ownership
 * is enforced by getDataSource (demo scoping / RLS); files never touch
 * disk and are streamed straight to the download.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(request.url);
  const file = url.searchParams.get("file") ?? "zip";

  const data = getDataSource();
  const blueprint = await data.getBlueprint(user.id, id);
  if (!blueprint) {
    return NextResponse.json(
      { error: "No blueprint yet — exports become available once the course is designed." },
      { status: 409 },
    );
  }
  const [modules, assets, vault, workbook] = await Promise.all([
    data.listModules(user.id, blueprint.id),
    data.listAssets(user.id, id),
    data.listVault(user.id, id),
    data.getWorkbook(user.id, id),
  ]);
  const lessonsByModule: Lesson[][] = await Promise.all(
    modules.map((m) => data.listLessons(user.id, m.id)),
  );
  const sourcesByLesson = new Map<string, LessonSource[]>();
  for (const lessons of lessonsByModule) {
    for (const lesson of lessons) {
      sourcesByLesson.set(
        lesson.id,
        await data.listLessonSources(user.id, lesson.id),
      );
    }
  }
  const exportData: ExportData = {
    blueprint,
    modules,
    lessonsByModule,
    sourcesByLesson,
    assets,
    vault,
    workbook,
  };

  const courseSlug = safeFilename(blueprint.title || "course");

  if (file === "zip") {
    const zip = await buildZip(exportData);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${courseSlug}-export.zip"`,
        "cache-control": "no-store",
      },
    });
  }

  if (!(EXPORT_FILES as readonly string[]).includes(file)) {
    return NextResponse.json({ error: "Unknown export file" }, { status: 400 });
  }
  const { body, contentType } = await buildExportFile(file as ExportFile, exportData);
  const payload = typeof body === "string" ? body : new Uint8Array(body);
  return new NextResponse(payload, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${file}"`,
      "cache-control": "no-store",
    },
  });
}
