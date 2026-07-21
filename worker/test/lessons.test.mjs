import { test } from "node:test";
import assert from "node:assert/strict";
import * as lessonPrompt from "../prompts/lesson-v1.mjs";
import * as verifyPrompt from "../prompts/verify-v1.mjs";
import * as assetsPrompt from "../prompts/assets-v1.mjs";
import { assembleLessonMarkdown } from "../lib/lesson-pipeline.mjs";
import {
  buildSourceBlock,
  queryTerms,
  rankChunks,
  scoreChunk,
} from "../lib/retrieval.mjs";

const validSections = {
  opening_hook: "Here's the pattern nobody notices.",
  why_it_matters: "Because targeting kills offers before price does.",
  teaching_content_markdown: "x".repeat(500),
  steps: ["Name the person", "Name the problem"],
  example_or_story: "Dana doubled her booking rate.",
  common_mistakes: ["Building for a crowd"],
  action_step: "Write the one-sentence target.",
  exercise: "Fill in the template.",
  key_takeaways: ["Targeting first", "Price second"],
  transition_to_next: "Next: the Offer Spine.",
  source_usage: [{ training_title: "Workshop", used_for: "core framework" }],
  inferred_or_new_material: [],
};

test("lesson validator accepts a complete lesson", () => {
  assert.deepEqual(lessonPrompt.validate(validSections), []);
});

test("lesson validator rejects thin content and missing takeaways", () => {
  const problems = lessonPrompt.validate({
    ...validSections,
    teaching_content_markdown: "too short",
    key_takeaways: ["only one"],
  });
  assert.ok(problems.some((p) => p.includes("too short")));
  assert.ok(problems.some((p) => p.includes("takeaways")));
});

test("assembleLessonMarkdown produces a full ordered document", () => {
  const md = assembleLessonMarkdown(validSections);
  const order = [
    "Here's the pattern",
    "## Why this matters",
    "## The steps",
    "## From the trainings",
    "## Common mistakes",
    "## Action step",
    "## Exercise",
    "## Key takeaways",
    "*Next: the Offer Spine.*",
  ];
  let lastIndex = -1;
  for (const marker of order) {
    const index = md.indexOf(marker);
    assert.ok(index > lastIndex, `${marker} out of order or missing`);
    lastIndex = index;
  }
});

test("verify validator accepts an empty flag list and rejects bad severities", () => {
  assert.deepEqual(
    verifyPrompt.validate({ unsupported: [], grounded_summary: "ok" }),
    [],
  );
  const problems = verifyPrompt.validate({
    unsupported: [{ lesson_text: "claim", problem: "no source", severity: "huge" }],
    grounded_summary: "x",
  });
  assert.ok(problems.some((p) => p.includes("severity")));
});

test("assets validator requires vault entries and workbook checklist", () => {
  const problems = assetsPrompt.validate({
    vault: [],
    workbook: { roadmap: "", quick_start_checklist: [] },
  });
  assert.ok(problems.some((p) => p.includes("vault empty")));
  assert.ok(problems.some((p) => p.includes("roadmap")));
  assert.ok(problems.some((p) => p.includes("quick_start_checklist")));
});

test("retrieval scores and ranks chunks by term overlap with named-asset boost", () => {
  const lesson = {
    title: "The Offer Spine",
    objective: "Structure the offer around four vertebrae",
    planned_elements: ["framework walkthrough"],
  };
  const terms = queryTerms(lesson, "Build the Offer");
  assert.ok(terms.includes("spine"));
  assert.ok(!terms.includes("the"));

  assert.ok(scoreChunk(terms, "the offer spine has four vertebrae") > 0);
  assert.equal(scoreChunk(terms, "completely unrelated cooking content"), 0);

  const chunks = [
    { id: "a", source_asset_id: "asset-1", clean_text: "offer spine vertebrae framework", start_seconds: 0, end_seconds: 10 },
    { id: "b", source_asset_id: "asset-2", clean_text: "offer spine vertebrae framework", start_seconds: 0, end_seconds: 10 },
    { id: "c", source_asset_id: "asset-2", clean_text: "nothing relevant here at all", start_seconds: 0, end_seconds: 10 },
  ];
  const ranked = rankChunks(lesson, "Build the Offer", chunks, new Set(["asset-1"]));
  assert.equal(ranked[0].chunk.id, "a"); // named-asset boost wins the tie
  assert.ok(!ranked.some((r) => r.chunk.id === "c")); // zero-score dropped
});

test("buildSourceBlock respects the character budget and reports used chunks", () => {
  const ranked = [
    { chunk: { id: "a", source_asset_id: "s", start_seconds: 0, end_seconds: 10, clean_text: "x".repeat(300), assetTitle: "T" }, score: 1 },
    { chunk: { id: "b", source_asset_id: "s", start_seconds: 10, end_seconds: 20, clean_text: "y".repeat(300), assetTitle: "T" }, score: 0.5 },
  ];
  const { text, usedChunks } = buildSourceBlock({
    rankedChunks: ranked,
    ipItems: [],
    creatorAnswers: [{ question: "Q", answer: "A" }],
    charBudget: 500,
  });
  assert.ok(text.includes("Creator-supplied answer"));
  assert.equal(usedChunks.length, 1); // second chunk exceeded the budget
  assert.equal(usedChunks[0].id, "a");
});
