import { test } from "node:test";
import assert from "node:assert/strict";
import * as blueprint from "../prompts/blueprint-v1.mjs";

const positioning = {
  title: "The Signature Offer Sprint",
  subtitle: "s",
  promise: "p",
  transformation: "t",
  audience: "a",
  ideal_student: "i",
  not_for: "n",
  prerequisites: "pr",
  format_and_scope: "f",
  outcome_statement: "o",
  strategic_rationale: "r",
};

const lesson = (overrides = {}) => ({
  title: "L",
  objective: "O",
  source_trainings: ["Workshop"],
  planned_elements: ["hook"],
  source_strength: 0.9,
  transformation_value: 0.8,
  creator_uniqueness: 0.7,
  ...overrides,
});

const moduleWith = (lessons) => ({
  title: "M",
  purpose: "P",
  outcome: "O",
  rationale: "R",
  lessons,
});

test("accepts a well-formed blueprint", () => {
  const problems = blueprint.validate({
    positioning,
    modules: [
      moduleWith([lesson(), lesson(), lesson()]),
      moduleWith([lesson(), lesson()]),
    ],
  });
  assert.deepEqual(problems, []);
});

test("rejects missing positioning essentials", () => {
  const problems = blueprint.validate({
    positioning: { ...positioning, title: "", promise: "  " },
    modules: [moduleWith([lesson(), lesson(), lesson(), lesson()])],
  });
  assert.ok(problems.some((p) => p.includes("positioning.title")));
  assert.ok(problems.some((p) => p.includes("positioning.promise")));
});

test("rejects out-of-range module and lesson counts", () => {
  assert.ok(
    blueprint
      .validate({ positioning, modules: [moduleWith([lesson()])] })
      .some((p) => p.includes("module count")),
  );
  const tooMany = Array.from({ length: 8 }, () => moduleWith([lesson(), lesson(), lesson(), lesson()]));
  assert.ok(
    blueprint
      .validate({ positioning, modules: tooMany })
      .some((p) => p.includes("module count")),
  );
});

test("rejects invalid lesson scores", () => {
  const problems = blueprint.validate({
    positioning,
    modules: [
      moduleWith([lesson({ source_strength: 1.4 }), lesson(), lesson(), lesson()]),
      moduleWith([lesson()]),
    ],
  });
  assert.ok(problems.some((p) => p.includes("source_strength")));
});

test("rejects modules with no lessons", () => {
  const problems = blueprint.validate({
    positioning,
    modules: [moduleWith([]), moduleWith([lesson(), lesson(), lesson(), lesson()])],
  });
  assert.ok(problems.some((p) => p.includes("no lessons")));
});
