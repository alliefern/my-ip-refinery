import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateTextCostCents, LlmError, runStructured } from "../lib/llm.mjs";

const noSleep = () => Promise.resolve();

const promptModule = {
  system: "test system",
  jsonSchema: {
    name: "test",
    schema: { type: "object", properties: { value: { type: "number" } } },
  },
  validate: (data) =>
    typeof data?.value === "number" ? [] : ["value missing"],
};

function apiResponse(status, outputObject, usage = { input_tokens: 100, output_tokens: 20 }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => ({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(outputObject) }],
        },
      ],
      usage,
    }),
    text: async () => "error body",
  };
}

test("returns validated data and accumulates usage", async () => {
  const { data, usage } = await runStructured(promptModule, "prompt", {
    model: "gpt-4.1",
    apiKey: "k",
    fetchImpl: async () => apiResponse(200, { value: 42 }),
    sleep: noSleep,
  });
  assert.equal(data.value, 42);
  assert.equal(usage.inputTokens, 100);
  assert.equal(usage.outputTokens, 20);
});

test("re-asks once when validation fails, then succeeds", async () => {
  let calls = 0;
  const { data, usage } = await runStructured(promptModule, "prompt", {
    model: "gpt-4.1",
    apiKey: "k",
    fetchImpl: async () =>
      ++calls === 1
        ? apiResponse(200, { wrong: true })
        : apiResponse(200, { value: 7 }),
    sleep: noSleep,
  });
  assert.equal(calls, 2);
  assert.equal(data.value, 7);
  assert.equal(usage.inputTokens, 200); // both calls counted
});

test("fails with INVALID_MODEL_OUTPUT after two invalid responses", async () => {
  await assert.rejects(
    runStructured(promptModule, "prompt", {
      model: "gpt-4.1",
      apiKey: "k",
      fetchImpl: async () => apiResponse(200, { wrong: true }),
      sleep: noSleep,
    }),
    (err) => {
      assert.ok(err instanceof LlmError);
      assert.equal(err.errorCode, "INVALID_MODEL_OUTPUT");
      return true;
    },
  );
});

test("retries 500s with backoff then succeeds", async () => {
  let calls = 0;
  const { data } = await runStructured(promptModule, "prompt", {
    model: "gpt-4.1",
    apiKey: "k",
    fetchImpl: async () =>
      ++calls < 3
        ? { ok: false, status: 500, headers: { get: () => null }, text: async () => "boom" }
        : apiResponse(200, { value: 1 }),
    sleep: noSleep,
  });
  assert.equal(calls, 3);
  assert.equal(data.value, 1);
});

test("cost estimation uses per-model rates", () => {
  assert.equal(estimateTextCostCents("gpt-4.1", 1_000_000, 0), 200);
  assert.equal(estimateTextCostCents("gpt-4.1-mini", 1_000_000, 1_000_000), 200);
  assert.equal(estimateTextCostCents("unknown", 500_000, 0), 100);
});
