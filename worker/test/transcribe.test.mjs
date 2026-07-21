import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  estimateTranscriptionCostCents,
  transcribeFile,
  TranscriptionError,
} from "../lib/transcribe.mjs";

const noSleep = () => Promise.resolve();

async function withAudioFile(fn) {
  const dir = await mkdtemp(join(tmpdir(), "transcribe-test-"));
  const filePath = join(dir, "chunk.mp3");
  await writeFile(filePath, Buffer.from("fake-audio-bytes"));
  try {
    await fn(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test("returns text on success", async () => {
  await withAudioFile(async (filePath) => {
    const result = await transcribeFile(filePath, {
      model: "gpt-4o-mini-transcribe",
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse(200, { text: "hello world" }),
      sleep: noSleep,
    });
    assert.equal(result.text, "hello world");
  });
});

test("retries transient 500s then succeeds", async () => {
  await withAudioFile(async (filePath) => {
    let calls = 0;
    const result = await transcribeFile(filePath, {
      model: "whisper-1",
      apiKey: "test-key",
      fetchImpl: async () =>
        ++calls < 3
          ? jsonResponse(500, { error: "server" })
          : jsonResponse(200, { text: "recovered" }),
      sleep: noSleep,
    });
    assert.equal(calls, 3);
    assert.equal(result.text, "recovered");
  });
});

test("rate limits surface MODEL_RATE_LIMITED after retries", async () => {
  await withAudioFile(async (filePath) => {
    await assert.rejects(
      transcribeFile(filePath, {
        model: "whisper-1",
        apiKey: "test-key",
        fetchImpl: async () => jsonResponse(429, { error: "slow down" }),
        sleep: noSleep,
      }),
      (err) => {
        assert.ok(err instanceof TranscriptionError);
        assert.equal(err.errorCode, "MODEL_RATE_LIMITED");
        assert.equal(err.retryable, true);
        return true;
      },
    );
  });
});

test("4xx client errors are terminal, not retryable", async () => {
  await withAudioFile(async (filePath) => {
    let calls = 0;
    await assert.rejects(
      transcribeFile(filePath, {
        model: "whisper-1",
        apiKey: "bad-key",
        fetchImpl: async () => {
          calls++;
          return jsonResponse(401, { error: "bad key" });
        },
        sleep: noSleep,
      }),
      (err) => {
        assert.equal(err.retryable, false);
        return true;
      },
    );
    assert.equal(calls, 1);
  });
});

test("cost estimation rounds up per model rate", () => {
  assert.equal(estimateTranscriptionCostCents("whisper-1", 600), 6);
  assert.equal(estimateTranscriptionCostCents("gpt-4o-mini-transcribe", 600), 3);
  assert.equal(estimateTranscriptionCostCents("unknown-model", 60), 1);
});
