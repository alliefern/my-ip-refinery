import { test } from "node:test";
import assert from "node:assert/strict";
import { computeChunkBoundaries } from "../lib/chunks.mjs";

test("single chunk for short media", () => {
  assert.deepEqual(computeChunkBoundaries(300), [
    { startSeconds: 0, endSeconds: 300 },
  ]);
});

test("chunks overlap and cover the full duration", () => {
  const chunks = computeChunkBoundaries(1500, 600, 5);
  assert.deepEqual(chunks[0], { startSeconds: 0, endSeconds: 600 });
  assert.equal(chunks[1].startSeconds, 595);
  assert.equal(chunks.at(-1).endSeconds, 1500);
});

test("empty media produces no chunks", () => {
  assert.deepEqual(computeChunkBoundaries(0), []);
});
