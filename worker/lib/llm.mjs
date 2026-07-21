/**
 * OpenAI Responses API adapter with Structured Outputs. Every call:
 * enforces a strict JSON schema at the API layer, re-validates the
 * parsed result with the prompt module's validator, re-asks once on
 * invalid output, retries transient failures with backoff, and returns
 * token usage for cost tracking.
 */

const MAX_RETRIES = 3;

/** Cents per 1M tokens: [input, output]. Conservative defaults. */
const COST_CENTS_PER_MTOKEN = {
  "gpt-4.1": [200, 800],
  "gpt-4.1-mini": [40, 160],
  "gpt-4o": [250, 1000],
  "gpt-4o-mini": [15, 60],
};

export function estimateTextCostCents(model, inputTokens, outputTokens) {
  const [inRate, outRate] = COST_CENTS_PER_MTOKEN[model] ?? [200, 800];
  return Math.ceil(
    (inputTokens / 1_000_000) * inRate + (outputTokens / 1_000_000) * outRate,
  );
}

export class LlmError extends Error {
  constructor(message, { errorCode, retryable, userMessage } = {}) {
    super(message);
    this.errorCode = errorCode ?? "MODEL_TIMEOUT";
    this.retryable = retryable ?? true;
    this.userMessage = userMessage ?? "The AI stage failed — retry when ready.";
  }
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const message = (payload.output ?? []).find((o) => o.type === "message");
  const textPart = (message?.content ?? []).find(
    (c) => c.type === "output_text",
  );
  return textPart?.text ?? null;
}

async function callOnce({ model, apiKey, system, user, jsonSchema, fetchImpl, sleep }) {
  for (let attempt = 1; ; attempt++) {
    let response;
    try {
      response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          text: {
            format: {
              type: "json_schema",
              name: jsonSchema.name,
              schema: jsonSchema.schema,
              strict: jsonSchema.strict !== false,
            },
          },
        }),
      });
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        throw new LlmError(`Network failure: ${err.message}`);
      }
      await sleep(1000 * 2 ** attempt);
      continue;
    }

    if (response.ok) {
      const payload = await response.json();
      const text = extractOutputText(payload);
      const usage = {
        inputTokens: payload.usage?.input_tokens ?? 0,
        outputTokens: payload.usage?.output_tokens ?? 0,
      };
      return { text, usage };
    }

    const body = await response.text().catch(() => "");
    const transient = response.status === 429 || response.status >= 500;
    if (!transient) {
      throw new LlmError(
        `Responses API rejected the request (${response.status}): ${body.slice(0, 200)}`,
        { errorCode: "INVALID_MODEL_OUTPUT", retryable: false },
      );
    }
    if (attempt >= MAX_RETRIES) {
      throw new LlmError(
        `Responses API unavailable after ${MAX_RETRIES} attempts (${response.status})`,
        {
          errorCode: response.status === 429 ? "MODEL_RATE_LIMITED" : "MODEL_TIMEOUT",
        },
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

/**
 * Run a prompt module against the Responses API. Returns
 * { data, usage } where data passed the module's validator.
 */
export async function runStructured(
  promptModule,
  userPrompt,
  {
    model,
    apiKey,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  },
) {
  const totalUsage = { inputTokens: 0, outputTokens: 0 };

  for (let ask = 1; ask <= 2; ask++) {
    const { text, usage } = await callOnce({
      model,
      apiKey,
      system: promptModule.system,
      user:
        ask === 1
          ? userPrompt
          : `${userPrompt}\n\nYour previous response failed validation. Follow the schema exactly this time.`,
      jsonSchema: promptModule.jsonSchema,
      fetchImpl,
      sleep,
    });
    totalUsage.inputTokens += usage.inputTokens;
    totalUsage.outputTokens += usage.outputTokens;

    if (text) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      if (parsed) {
        const problems = promptModule.validate(parsed);
        if (problems.length === 0) {
          return { data: parsed, usage: totalUsage };
        }
        if (ask === 2) {
          throw new LlmError(
            `Model output failed validation after re-ask: ${problems.join("; ")}`,
            {
              errorCode: "INVALID_MODEL_OUTPUT",
              retryable: true,
              userMessage:
                "The AI returned malformed results — retry when ready.",
            },
          );
        }
        continue;
      }
    }
    if (ask === 2) {
      throw new LlmError("Model returned unparseable output twice", {
        errorCode: "INVALID_MODEL_OUTPUT",
        retryable: true,
      });
    }
  }
  throw new LlmError("unreachable");
}
