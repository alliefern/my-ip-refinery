import { readFile } from "node:fs/promises";

const MAX_RETRIES = 3;

/** Cents per audio minute, by model. Kept conservative; adjust as
 * OpenAI pricing changes. */
const COST_CENTS_PER_MINUTE = {
  "whisper-1": 0.6,
  "gpt-4o-transcribe": 0.6,
  "gpt-4o-mini-transcribe": 0.3,
};

export function estimateTranscriptionCostCents(model, audioSeconds) {
  const rate = COST_CENTS_PER_MINUTE[model] ?? 0.6;
  return Math.ceil((audioSeconds / 60) * rate);
}

export class TranscriptionError extends Error {
  constructor(message, { errorCode, retryable, userMessage } = {}) {
    super(message);
    this.errorCode = errorCode ?? "CHUNK_TRANSCRIBE_FAILED";
    this.retryable = retryable ?? true;
    this.userMessage =
      userMessage ?? "Transcription failed for part of this training — retry when ready.";
  }
}

/**
 * Transcribe one audio file via the OpenAI Audio Transcriptions API.
 * `fetchImpl` is injectable for tests. Retries transient failures
 * (429/5xx/network) with exponential backoff; 4xx errors are terminal.
 */
export async function transcribeFile(
  filePath,
  { model, apiKey, language, fetchImpl = fetch, sleep = defaultSleep },
) {
  const audio = await readFile(filePath);

  for (let attempt = 1; ; attempt++) {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/mpeg" }), "chunk.mp3");
    form.append("model", model);
    form.append("response_format", "json");
    if (language) form.append("language", language);

    let response;
    try {
      response = await fetchImpl("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        throw new TranscriptionError(`Network failure: ${err.message}`);
      }
      await sleep(1000 * 2 ** attempt);
      continue;
    }

    if (response.ok) {
      const payload = await response.json();
      return { text: payload.text ?? "" };
    }

    const body = await response.text().catch(() => "");
    const transient = response.status === 429 || response.status >= 500;
    if (!transient) {
      throw new TranscriptionError(
        `Transcription API rejected the request (${response.status}): ${body.slice(0, 200)}`,
        {
          errorCode: "CHUNK_TRANSCRIBE_FAILED",
          retryable: false,
        },
      );
    }
    if (attempt >= MAX_RETRIES) {
      throw new TranscriptionError(
        `Transcription API unavailable after ${MAX_RETRIES} attempts (${response.status})`,
        { errorCode: response.status === 429 ? "MODEL_RATE_LIMITED" : "MODEL_TIMEOUT" },
      );
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    await sleep(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * 2 ** attempt,
    );
  }
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
