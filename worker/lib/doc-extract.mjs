/**
 * Document text extraction: PDF, DOCX, PPTX, plain text/Markdown.
 * The output feeds the same chunk → IP extraction pipeline as audio
 * transcripts, so extraction failures must be *diagnosed*, not just
 * reported — "your PDF is scanned images" is actionable; "extraction
 * failed" is not.
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export class DocExtractError extends Error {
  constructor(message, { errorCode, userMessage, retryable = false } = {}) {
    super(message);
    this.errorCode = errorCode ?? "DOC_UNREADABLE";
    this.retryable = retryable;
    this.userMessage =
      userMessage ?? "This document could not be read — it may be corrupt.";
  }
}

/** Total extracted text is capped so a pathological document cannot
 * produce an unbounded number of AI extraction calls. ~500k chars is
 * roughly a 250-page book — far beyond any realistic training doc. */
const MAX_TEXT_CHARS = 500_000;

/** Below this many characters of real text, a PDF is almost certainly
 * scanned images (or an empty deck) rather than a text document. */
const MIN_MEANINGFUL_CHARS = 200;

let pdfjsModule = null;
async function loadPdfjs() {
  // Legacy build: runs in plain Node without a DOM or canvas.
  pdfjsModule ??= await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsModule;
}

export async function extractPdfText(buffer) {
  const { getDocument } = await loadPdfjs();
  let doc;
  try {
    doc = await getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise;
  } catch (err) {
    const name = err?.name ?? "";
    const msg = String(err?.message ?? err);
    if (name === "PasswordException" || /password|encrypt/i.test(msg)) {
      throw new DocExtractError(`PDF encrypted: ${msg}`, {
        errorCode: "DOC_PASSWORD_PROTECTED",
        userMessage:
          "This PDF is password-protected. Remove the password (printing it to a new PDF works) and upload it again.",
      });
    }
    throw new DocExtractError(`PDF parse failed: ${msg}`, {
      userMessage:
        "This PDF could not be read — it may be corrupt. Try re-exporting it and uploading again.",
    });
  }

  try {
    const pageTexts = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => item.str ?? "").join(" "));
    }
    const text = normalizeWhitespace(pageTexts.join("\n\n"));
    if (text.length < MIN_MEANINGFUL_CHARS) {
      throw new DocExtractError("PDF has no extractable text", {
        errorCode: "DOC_NO_TEXT",
        userMessage:
          "This PDF appears to be scanned images or slides without selectable text, so there's nothing the Refinery can read. If you can select and copy text when the PDF is open on your computer, try re-exporting it; otherwise upload the original document or a recording instead.",
      });
    }
    return { text, pageCount: doc.numPages };
  } finally {
    await doc.destroy().catch(() => {});
  }
}

export async function extractDocxText(buffer) {
  const mammoth = require("mammoth");
  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (err) {
    throw new DocExtractError(`DOCX parse failed: ${err?.message ?? err}`, {
      userMessage:
        "This Word document could not be read — it may be corrupt or an old .doc file. Save it as .docx and upload again.",
    });
  }
  const text = normalizeWhitespace(result.value ?? "");
  if (text.length < MIN_MEANINGFUL_CHARS) {
    throw new DocExtractError("DOCX has no meaningful text", {
      errorCode: "DOC_NO_TEXT",
      userMessage:
        "This Word document contains almost no readable text — if the content is in images, the Refinery can't read it.",
    });
  }
  return { text, pageCount: null };
}

/** PPTX is a zip of XML; slide text lives in <a:t> runs. */
export async function extractPptxText(buffer) {
  const JSZip = require("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (err) {
    throw new DocExtractError(`PPTX unzip failed: ${err?.message ?? err}`, {
      userMessage:
        "This PowerPoint file could not be read — it may be corrupt or an old .ppt file. Save it as .pptx and upload again.",
    });
  }
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => slideNumber(a) - slideNumber(b));
  const notesNames = Object.keys(zip.files).filter((n) =>
    /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n),
  );

  const parts = [];
  for (const name of slideNames) {
    const xml = await zip.files[name].async("string");
    const slideText = xmlTextRuns(xml);
    if (slideText) parts.push(`Slide ${slideNumber(name)}: ${slideText}`);
  }
  for (const name of notesNames.sort((a, b) => slideNumber(a) - slideNumber(b))) {
    const xml = await zip.files[name].async("string");
    const noteText = xmlTextRuns(xml);
    if (noteText) parts.push(`Speaker notes (slide ${slideNumber(name)}): ${noteText}`);
  }

  const text = normalizeWhitespace(parts.join("\n"));
  if (text.length < MIN_MEANINGFUL_CHARS) {
    throw new DocExtractError("PPTX has no meaningful text", {
      errorCode: "DOC_NO_TEXT",
      userMessage:
        "These slides contain almost no readable text — image-heavy decks give the Refinery nothing to work with. A recording of you presenting them works far better.",
    });
  }
  return { text, pageCount: slideNames.length };
}

function slideNumber(name) {
  return Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0);
}

export function xmlTextRuns(xml) {
  const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) =>
    decodeXmlEntities(m[1]),
  );
  return runs.join(" ").replace(/\s+/g, " ").trim();
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

export function extractPlainText(buffer) {
  const text = normalizeWhitespace(buffer.toString("utf8"));
  if (text.length < MIN_MEANINGFUL_CHARS) {
    throw new DocExtractError("Text file nearly empty", {
      errorCode: "DOC_NO_TEXT",
      userMessage: "This text file contains almost no content.",
    });
  }
  return { text, pageCount: null };
}

/** Dispatch on MIME type (with filename fallback for octet-stream). */
export async function extractDocumentText(buffer, mimeType, filename = "") {
  const lower = (filename || "").toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    return extractPdfText(buffer);
  }
  if (mimeType.includes("wordprocessingml") || lower.endsWith(".docx")) {
    return extractDocxText(buffer);
  }
  if (mimeType.includes("presentationml") || lower.endsWith(".pptx")) {
    return extractPptxText(buffer);
  }
  if (
    mimeType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md")
  ) {
    return extractPlainText(buffer);
  }
  throw new DocExtractError(`Unsupported document type: ${mimeType}`, {
    errorCode: "DOC_UNREADABLE",
    userMessage: "This file type isn't supported for text extraction.",
  });
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

/**
 * Chunk document text on paragraph boundaries with light overlap, the
 * same shape the audio chunker produces (sequence-numbered pieces the
 * extraction stage can process one at a time). Labels are 1-based and
 * human-readable because they surface directly in the UI and lesson
 * source citations.
 */
export function chunkDocumentText(text, { chunkChars = 6000, overlapChars = 300 } = {}) {
  if (!text || !text.trim()) return [];
  if (chunkChars <= overlapChars) {
    throw new Error("chunkChars must exceed overlapChars");
  }
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkChars, text.length);
    if (end < text.length) {
      // Prefer to break at a paragraph, then a sentence, inside the
      // last quarter of the window — never mid-word if avoidable.
      const windowStart = start + Math.floor(chunkChars * 0.75);
      const paraBreak = text.lastIndexOf("\n\n", end);
      const sentenceBreak = text.lastIndexOf(". ", end);
      if (paraBreak > windowStart) end = paraBreak;
      else if (sentenceBreak > windowStart) end = sentenceBreak + 1;
    }
    chunks.push({ text: text.slice(start, end).trim(), start, end });
    if (end >= text.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }
  const total = chunks.length;
  return chunks
    .filter((c) => c.text.length > 0)
    .map((c, i) => ({
      sequenceNumber: i + 1,
      text: c.text,
      locationLabel: total > 1 ? `Part ${i + 1} of ${total}` : "Full document",
    }));
}
