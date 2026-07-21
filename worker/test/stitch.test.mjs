import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupeOverlap, normalizeTranscript, stitchChunks } from "../lib/stitch.mjs";

test("dedupeOverlap removes the repeated boundary words", () => {
  const prev = "and that is why we always price the outcome not the hours";
  const next = "price the outcome not the hours because hourly billing punishes speed";
  assert.equal(
    dedupeOverlap(prev, next),
    "because hourly billing punishes speed",
  );
});

test("dedupeOverlap matches despite punctuation and case differences", () => {
  const prev = "Here is the rule: price the outcome, not the hours.";
  const next = "Price the outcome not the hours — and anchor to problem cost.";
  assert.equal(dedupeOverlap(prev, next), "— and anchor to problem cost.");
});

test("dedupeOverlap leaves text alone when there is no overlap", () => {
  const prev = "completely different ending words here";
  const next = "a fresh start with new content entirely";
  assert.equal(dedupeOverlap(prev, next), next);
});

test("dedupeOverlap ignores tiny coincidental matches below the minimum run", () => {
  const prev = "we will talk about the";
  const next = "the next section is pricing";
  assert.equal(dedupeOverlap(prev, next), next);
});

test("stitchChunks joins chunks into one transcript without duplication", () => {
  const chunks = [
    "welcome to the workshop today we cover the offer spine",
    "we cover the offer spine which has four parts person problem process proof",
    "person problem process proof and that is the whole framework",
  ];
  const stitched = stitchChunks(chunks);
  assert.equal(
    stitched,
    "welcome to the workshop today we cover the offer spine which has four parts person problem process proof and that is the whole framework",
  );
});

test("stitchChunks handles empty input", () => {
  assert.equal(stitchChunks([]), "");
});

test("normalizeTranscript collapses whitespace without rewriting words", () => {
  assert.equal(
    normalizeTranscript("so   the thing  is ,  pricing matters ."),
    "so the thing is, pricing matters.",
  );
});
