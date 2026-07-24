import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  DocExtractError,
  chunkDocumentText,
  extractDocumentText,
  extractDocxText,
  extractPdfText,
  extractPlainText,
  extractPptxText,
  xmlTextRuns,
} from "../lib/doc-extract.mjs";
import * as extractionDoc from "../prompts/extraction-doc-v1.mjs";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");

const LONG_TEXT = "The Offer Spine has four vertebrae: promise, proof, price and path. ".repeat(
  10,
);

/** Byte-accurate minimal single-page PDF. Text renders one line per
 * array entry — the realistic shape; pdf.js truncates a single
 * hundreds-of-characters text run that walks off the page. */
function buildMinimalPdf(lines) {
  const textLines = Array.isArray(lines) ? lines : [lines];
  const chunks = [];
  let len = 0;
  const push = (s) => {
    chunks.push(s);
    len += Buffer.byteLength(s, "latin1");
  };
  push("%PDF-1.4\n");
  const offsets = [];
  const stream = textLines
    .map((line, i) => `BT /F1 12 Tf 72 ${720 - i * 14} Td (${line}) Tj ET`)
    .join("\n");
  const bodies = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  bodies.forEach((body, i) => {
    offsets.push(len);
    push(`${i + 1} 0 obj\n${body}\nendobj\n`);
  });
  const xrefStart = len;
  push(`xref\n0 ${bodies.length + 1}\n`);
  push("0000000000 65535 f\r\n");
  for (const off of offsets) push(`${String(off).padStart(10, "0")} 00000 n\r\n`);
  push(
    `trailer\n<< /Size ${bodies.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );
  return Buffer.from(chunks.join(""), "latin1");
}

async function buildMinimalDocx(paragraphs) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
    .join("");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

async function buildMinimalPptx(slides, notes = []) {
  const zip = new JSZip();
  slides.forEach((slideText, i) => {
    zip.file(
      `ppt/slides/slide${i + 1}.xml`,
      `<?xml version="1.0"?><p:sld xmlns:p="x" xmlns:a="y"><a:t>${slideText}</a:t></p:sld>`,
    );
  });
  notes.forEach((noteText, i) => {
    zip.file(
      `ppt/notesSlides/notesSlide${i + 1}.xml`,
      `<?xml version="1.0"?><p:notes xmlns:p="x" xmlns:a="y"><a:t>${noteText}</a:t></p:notes>`,
    );
  });
  return zip.generateAsync({ type: "nodebuffer" });
}

test("chunkDocumentText: empty input produces no chunks", () => {
  assert.deepEqual(chunkDocumentText(""), []);
  assert.deepEqual(chunkDocumentText("   "), []);
});

test("chunkDocumentText: short text is one 'Full document' chunk", () => {
  const chunks = chunkDocumentText("A short guide.");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].sequenceNumber, 1);
  assert.equal(chunks[0].locationLabel, "Full document");
});

test("chunkDocumentText: long text splits with overlap and part labels", () => {
  const text = Array.from({ length: 200 }, (_, i) => `Sentence number ${i} about pricing strategy.`).join(" ");
  const chunks = chunkDocumentText(text, { chunkChars: 1000, overlapChars: 100 });
  assert.ok(chunks.length > 3);
  assert.equal(chunks[0].locationLabel, `Part 1 of ${chunks.length}`);
  assert.equal(chunks.at(-1).locationLabel, `Part ${chunks.length} of ${chunks.length}`);
  // Every character of the source is covered (overlap means adjacent
  // chunks share text, never skip it).
  const combined = chunks.map((c) => c.text).join("");
  assert.ok(combined.includes("Sentence number 199"));
  assert.ok(combined.includes("Sentence number 0"));
});

test("chunkDocumentText: rejects overlap >= chunk size", () => {
  assert.throws(() => chunkDocumentText("text", { chunkChars: 100, overlapChars: 100 }));
});

test("xmlTextRuns: extracts and decodes entities", () => {
  const xml = `<p><a:t>Price &amp; positioning</a:t><x/><a:t>the &quot;10x Gap&quot;</a:t></p>`;
  assert.equal(xmlTextRuns(xml), `Price & positioning the "10x Gap"`);
});

test("extractPlainText: rejects near-empty files, accepts real ones", () => {
  assert.throws(
    () => extractPlainText(Buffer.from("hi")),
    (err) => err instanceof DocExtractError && err.errorCode === "DOC_NO_TEXT",
  );
  const { text } = extractPlainText(Buffer.from(LONG_TEXT));
  assert.ok(text.includes("Offer Spine"));
});

test("extractPdfText: reads a real text PDF", async () => {
  const buf = buildMinimalPdf(
    Array.from(
      { length: 4 },
      () =>
        "The Offer Spine has four vertebrae, and this line pads the text past the minimum threshold.",
    ),
  );
  const { text, pageCount } = await extractPdfText(buf);
  assert.ok(text.includes("Offer Spine"));
  assert.equal(pageCount, 1);
});

test("extractPdfText: text-free PDF fails as DOC_NO_TEXT (scanned-image case)", async () => {
  const buf = buildMinimalPdf(" ");
  await assert.rejects(
    () => extractPdfText(buf),
    (err) => err instanceof DocExtractError && err.errorCode === "DOC_NO_TEXT",
  );
});

test("extractPdfText: corrupt file fails with a readable message", async () => {
  await assert.rejects(
    () => extractPdfText(Buffer.from("this is not a pdf at all")),
    (err) => err instanceof DocExtractError && /could not be read/.test(err.userMessage),
  );
});

test("extractDocxText: reads paragraphs from a DOCX", async () => {
  const buf = await buildMinimalDocx([LONG_TEXT]);
  const { text } = await extractDocxText(buf);
  assert.ok(text.includes("four vertebrae"));
});

test("extractDocxText: corrupt DOCX fails cleanly", async () => {
  await assert.rejects(
    () => extractDocxText(Buffer.from("garbage")),
    (err) => err instanceof DocExtractError && err.errorCode === "DOC_UNREADABLE",
  );
});

test("extractPptxText: reads slides in order plus speaker notes", async () => {
  const buf = await buildMinimalPptx(
    [LONG_TEXT, "Slide two content about the Red Flag Filter."],
    ["Remember to mention the Founding Five."],
  );
  const { text, pageCount } = await extractPptxText(buf);
  assert.ok(text.indexOf("Offer Spine") < text.indexOf("Red Flag Filter"));
  assert.ok(text.includes("Founding Five"));
  assert.equal(pageCount, 2);
});

test("extractPptxText: image-only deck fails as DOC_NO_TEXT", async () => {
  const buf = await buildMinimalPptx(["", ""]);
  await assert.rejects(
    () => extractPptxText(buf),
    (err) => err instanceof DocExtractError && err.errorCode === "DOC_NO_TEXT",
  );
});

test("extractDocumentText: dispatches by mime type and rejects unknown types", async () => {
  const { text } = await extractDocumentText(Buffer.from(LONG_TEXT), "text/plain");
  assert.ok(text.length > 0);
  await assert.rejects(
    () => extractDocumentText(Buffer.from("x"), "application/zip", "file.zip"),
    (err) => err instanceof DocExtractError,
  );
});

test("extraction-doc prompt: validates items without timestamps", () => {
  assert.deepEqual(
    extractionDoc.validate({
      items: [
        {
          type: "signature_framework",
          title: "The Offer Spine",
          description: "Four-part offer structure",
          confidence: 0.9,
          distinctiveness: 0.8,
          support: "source",
        },
      ],
    }),
    [],
  );
  const problems = extractionDoc.validate({
    items: [
      {
        type: "nope",
        title: "",
        description: "",
        confidence: 2,
        distinctiveness: 0.5,
        support: "source",
      },
    ],
  });
  assert.ok(problems.some((p) => p.includes("type invalid")));
  assert.ok(problems.some((p) => p.includes("title empty")));
  assert.ok(problems.some((p) => p.includes("confidence")));
});

test("extraction-doc prompt: user prompt cites location label, not seconds", () => {
  const prompt = extractionDoc.buildUserPrompt({
    chunk: { clean_text: "Some content", location_label: "Part 2 of 6" },
    assetTitle: "Pricing Guide",
    topic: "pricing",
  });
  assert.ok(prompt.includes("Part 2 of 6"));
  assert.ok(!prompt.includes("time range"));
});
