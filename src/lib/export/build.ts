import "server-only";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import JSZip from "jszip";
import type {
  CourseBlueprint,
  Lesson,
  LessonSource,
  Module,
  SourceAsset,
  VaultEntry,
  Workbook,
} from "../types";
import { formatTimestamp } from "../validation";

/**
 * Export builders. Everything is generated from the CURRENT database
 * state at request time, so exports always reflect the latest saved
 * edits — never an earlier AI draft.
 */

export interface ExportData {
  blueprint: CourseBlueprint;
  modules: Module[];
  lessonsByModule: Lesson[][];
  sourcesByLesson: Map<string, LessonSource[]>;
  assets: SourceAsset[];
  vault: VaultEntry[];
  workbook: Workbook | null;
}

const csvEscape = (value: string) => `"${(value ?? "").replace(/"/g, '""')}"`;

export function buildPositioningMd(data: ExportData): string {
  const p = data.blueprint.positioning as unknown as Record<string, string>;
  const get = (snake: string, camel: string) => p[snake] ?? p[camel] ?? "";
  return `# ${data.blueprint.title}

*${data.blueprint.subtitle ?? ""}*

## Core promise

${data.blueprint.promise ?? ""}

## Student transformation

${data.blueprint.transformation ?? ""}

## Ideal student

${get("ideal_student", "idealStudent")}

## Who it is not for

${get("not_for", "notFor")}

## Prerequisites

${get("prerequisites", "prerequisites")}

## Recommended format and scope

${get("format_and_scope", "formatAndScope")}

## By the end of this course…

${get("outcome_statement", "outcomeStatement")}

## Strategic rationale

${get("strategic_rationale", "strategicRationale")}
`;
}

export function buildBlueprintMd(data: ExportData): string {
  const lines = [`# ${data.blueprint.title} — Course Blueprint`, ""];
  data.modules.forEach((mod, i) => {
    lines.push(`## Module ${mod.position}: ${mod.title}`, "");
    lines.push(`**Purpose:** ${mod.purpose ?? ""}`, "");
    lines.push(`**Outcome:** ${mod.outcome ?? ""}`, "");
    lines.push(`**Why here:** ${mod.rationale ?? ""}`, "");
    for (const lesson of data.lessonsByModule[i] ?? []) {
      lines.push(
        `- **${mod.position}.${lesson.position} ${lesson.title}** — ${lesson.objective ?? ""}`,
      );
    }
    lines.push("");
  });
  return lines.join("\n");
}

export function buildCourseMd(data: ExportData): string {
  const lines = [`# ${data.blueprint.title}`, ""];
  data.modules.forEach((mod, i) => {
    lines.push(`# Module ${mod.position}: ${mod.title}`, "");
    for (const lesson of data.lessonsByModule[i] ?? []) {
      lines.push(`## ${mod.position}.${lesson.position} ${lesson.title}`, "");
      lines.push(lesson.contentMarkdown || "*(not yet generated)*", "");
    }
  });
  return lines.join("\n");
}

export function buildVaultMd(data: ExportData): string {
  const lines = ["# Bonus Video Vault", ""];
  for (const entry of [...data.vault].sort((a, b) => a.suggestedOrder - b.suggestedOrder)) {
    lines.push(`## ${entry.suggestedOrder}. ${entry.cleanTitle}`, "");
    lines.push(entry.description ?? "", "");
    lines.push(`**Watch this if:** ${entry.watchThisIf ?? ""}`, "");
    if (entry.keyTopics.length) {
      lines.push(`**Topics:** ${entry.keyTopics.join(", ")}`, "");
    }
    if (entry.chapters.length) {
      lines.push("**Chapters (approximate):**", "");
      for (const chapter of entry.chapters) {
        lines.push(`- ${formatTimestamp(chapter.startSeconds)} — ${chapter.title}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

export function buildWorkbookMd(data: ExportData): string {
  const wb = data.workbook;
  if (!wb) return "# Student Workbook\n\n*(not yet generated)*\n";
  const lines = [`# ${data.blueprint.title} — Student Workbook`, ""];
  lines.push("## Course roadmap", "", wb.roadmap, "");
  lines.push("## Quick-start checklist", "");
  wb.quick_start_checklist.forEach((item) => lines.push(`- [ ] ${item}`));
  lines.push("");
  for (const exercise of wb.lesson_exercises) {
    lines.push(`## Exercise: ${exercise.lesson_title}`, "", exercise.exercise, "");
  }
  for (const checklist of wb.module_checklists) {
    lines.push(`## Checklist: ${checklist.module_title}`, "");
    checklist.items.forEach((item) => lines.push(`- [ ] ${item}`));
    lines.push("");
  }
  lines.push("## Reflection prompts", "");
  wb.reflection_prompts.forEach((prompt) => lines.push(`- ${prompt}`));
  lines.push("", "## Implementation plan", "", wb.implementation_plan, "");
  lines.push("## Completion checklist", "");
  wb.completion_checklist.forEach((item) => lines.push(`- [ ] ${item}`));
  lines.push("");
  return lines.join("\n");
}

export function buildSourceMapCsv(data: ExportData): string {
  const assetTitle = new Map(data.assets.map((a) => [a.id, a.displayTitle]));
  const rows = [
    ["module", "lesson", "source_training", "timestamp_range", "support_note", "support_type"].join(","),
  ];
  data.modules.forEach((mod, i) => {
    for (const lesson of data.lessonsByModule[i] ?? []) {
      for (const source of data.sourcesByLesson.get(lesson.id) ?? []) {
        const range =
          source.startSeconds !== null && source.endSeconds !== null
            ? `${formatTimestamp(source.startSeconds)}-${formatTimestamp(source.endSeconds)}`
            : "";
        rows.push(
          [
            csvEscape(mod.title),
            csvEscape(lesson.title),
            csvEscape(assetTitle.get(source.sourceAssetId) ?? "creator answer"),
            csvEscape(range),
            csvEscape(source.supportNote ?? ""),
            csvEscape(source.supportType),
          ].join(","),
        );
      }
    }
  });
  return rows.join("\n") + "\n";
}

export function buildStructuredJson(data: ExportData): string {
  return JSON.stringify(
    {
      format: "myiprefinery-course-v1",
      blueprint: data.blueprint,
      modules: data.modules.map((mod, i) => ({
        ...mod,
        lessons: (data.lessonsByModule[i] ?? []).map((lesson) => ({
          ...lesson,
          sources: data.sourcesByLesson.get(lesson.id) ?? [],
        })),
      })),
      vault: data.vault,
      workbook: data.workbook,
    },
    null,
    2,
  );
}

/** Render our markdown subset into a DOCX buffer. */
export async function markdownToDocx(markdown: string): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    const stripped = line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({ text: stripped.slice(2), heading: HeadingLevel.HEADING_1 }),
      );
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({ text: stripped.slice(3), heading: HeadingLevel.HEADING_2 }),
      );
    } else if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({ text: stripped.slice(4), heading: HeadingLevel.HEADING_3 }),
      );
    } else if (/^[-*] \[ \] /.test(line)) {
      paragraphs.push(
        new Paragraph({ text: `☐ ${stripped.replace(/^[-*] \[ \] /, "")}`, bullet: { level: 0 } }),
      );
    } else if (/^[-*] /.test(line)) {
      paragraphs.push(
        new Paragraph({ text: stripped.replace(/^[-*] /, ""), bullet: { level: 0 } }),
      );
    } else if (/^\d+\. /.test(line)) {
      paragraphs.push(
        new Paragraph({ text: stripped, bullet: { level: 0 } }),
      );
    } else if (line.startsWith("> ")) {
      paragraphs.push(
        new Paragraph({ children: [new TextRun({ text: stripped.slice(2), italics: true })] }),
      );
    } else {
      paragraphs.push(new Paragraph({ text: stripped }));
    }
  }
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}

export const EXPORT_FILES = [
  "01-course-positioning.md",
  "02-course-blueprint.md",
  "03-full-course-content.docx",
  "04-full-course-content.md",
  "05-student-workbook.docx",
  "06-bonus-video-vault.md",
  "07-source-map.csv",
  "08-structured-course.json",
] as const;
export type ExportFile = (typeof EXPORT_FILES)[number];

export async function buildExportFile(
  file: ExportFile,
  data: ExportData,
): Promise<{ body: Buffer | string; contentType: string }> {
  switch (file) {
    case "01-course-positioning.md":
      return { body: buildPositioningMd(data), contentType: "text/markdown" };
    case "02-course-blueprint.md":
      return { body: buildBlueprintMd(data), contentType: "text/markdown" };
    case "03-full-course-content.docx":
      return {
        body: await markdownToDocx(buildCourseMd(data)),
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    case "04-full-course-content.md":
      return { body: buildCourseMd(data), contentType: "text/markdown" };
    case "05-student-workbook.docx":
      return {
        body: await markdownToDocx(buildWorkbookMd(data)),
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    case "06-bonus-video-vault.md":
      return { body: buildVaultMd(data), contentType: "text/markdown" };
    case "07-source-map.csv":
      return { body: buildSourceMapCsv(data), contentType: "text/csv" };
    case "08-structured-course.json":
      return { body: buildStructuredJson(data), contentType: "application/json" };
  }
}

export async function buildZip(data: ExportData): Promise<Buffer> {
  const zip = new JSZip();
  for (const file of EXPORT_FILES) {
    const { body } = await buildExportFile(file, data);
    zip.file(file, body);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
