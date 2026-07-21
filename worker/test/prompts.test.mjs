import { test } from "node:test";
import assert from "node:assert/strict";
import * as extraction from "../prompts/extraction-v1.mjs";
import * as synthesis from "../prompts/synthesis-v1.mjs";
import * as ipmap from "../prompts/ipmap-v1.mjs";

test("extraction: accepts a valid payload", () => {
  const problems = extraction.validate({
    items: [
      {
        type: "signature_framework",
        title: "The Offer Spine",
        description: "Four-part structure",
        start_seconds: 600,
        end_seconds: 900,
        confidence: 0.9,
        distinctiveness: 0.8,
        support: "source",
      },
    ],
  });
  assert.deepEqual(problems, []);
});

test("extraction: rejects bad types, ranges and empty fields", () => {
  const problems = extraction.validate({
    items: [
      {
        type: "not_a_type",
        title: "",
        description: "x",
        start_seconds: 900,
        end_seconds: 600,
        confidence: 1.5,
        distinctiveness: 0.5,
        support: "source",
      },
    ],
  });
  assert.ok(problems.some((p) => p.includes("type invalid")));
  assert.ok(problems.some((p) => p.includes("title empty")));
  assert.ok(problems.some((p) => p.includes("confidence")));
  assert.ok(problems.some((p) => p.includes("timestamps")));
});

test("extraction: empty item list is valid (nothing worth extracting)", () => {
  assert.deepEqual(extraction.validate({ items: [] }), []);
});

test("synthesis: requires summary and purpose", () => {
  const problems = synthesis.validate({ summary: "", primary_purpose: "" });
  assert.ok(problems.length >= 2);
  assert.deepEqual(
    synthesis.validate({
      summary: "s",
      primary_purpose: "p",
      topics: [],
      strongest_teachings: [],
    }),
    [],
  );
});

test("ipmap: exactly one recommended opportunity required", () => {
  const base = {
    dominant_themes: [],
    signature_frameworks: [],
    repeated_teachings: [],
    unique_insights: [],
    contradictions: [],
    possibly_outdated: [],
    missing_steps: [],
    bonus_material: [],
    other_product_material: [],
    gap_questions: [],
  };
  const opp = (rec) => ({
    title: "T",
    audience: "A",
    transformation: "X",
    rationale: "R",
    missing_material: [],
    strength_score: 0.8,
    is_recommended: rec,
  });

  assert.deepEqual(ipmap.validate({ ...base, opportunities: [opp(true)] }), []);
  assert.ok(
    ipmap
      .validate({ ...base, opportunities: [opp(true), opp(true)] })
      .some((p) => p.includes("recommended")),
  );
  assert.ok(
    ipmap
      .validate({ ...base, opportunities: [] })
      .some((p) => p.includes("no opportunities")),
  );
});

test("ipmap: caps opportunities at three", () => {
  const base = {
    dominant_themes: [],
    signature_frameworks: [],
    repeated_teachings: [],
    unique_insights: [],
    contradictions: [],
    possibly_outdated: [],
    missing_steps: [],
    bonus_material: [],
    other_product_material: [],
    gap_questions: [],
  };
  const opp = (rec) => ({
    title: "T",
    audience: "A",
    transformation: "X",
    rationale: "R",
    missing_material: [],
    strength_score: 0.5,
    is_recommended: rec,
  });
  const problems = ipmap.validate({
    ...base,
    opportunities: [opp(true), opp(false), opp(false), opp(false)],
  });
  assert.ok(problems.some((p) => p.includes("more than 3")));
});
