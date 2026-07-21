/**
 * Background worker: claims jobs from processing_jobs and runs the
 * media pipeline. Designed to run as a small container (see Dockerfile)
 * on Fly.io/Railway; survives browser close by definition and shuts
 * down cleanly on SIGTERM so deploys never strand a RUNNING job.
 */

import { createDb } from "./lib/db.mjs";
import { runTranscribeAsset } from "./lib/pipeline.mjs";

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Worker cannot start — missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000);
const db = createDb();
let shuttingDown = false;

process.on("SIGTERM", () => {
  console.log("SIGTERM received — finishing current job then exiting");
  shuttingDown = true;
});
process.on("SIGINT", () => {
  shuttingDown = true;
});

const HANDLERS = {
  transcribe_asset: runTranscribeAsset,
};

async function tick() {
  const job = await db.claimNextJob();
  if (!job) return false;

  console.log(`claimed job ${job.id} (${job.job_type}, attempt ${job.attempt_count})`);
  const handler = HANDLERS[job.job_type];
  if (!handler) {
    await db.failJob(job, {
      code: "UNKNOWN_JOB_TYPE",
      message: `No handler for job type ${job.job_type}`,
      retryable: false,
    });
    return true;
  }

  try {
    await handler(db, job);
    await db.completeJob(job.id);
    console.log(`job ${job.id} succeeded`);
  } catch (err) {
    const code = err?.errorCode ?? "WORKER_ERROR";
    const retryable = err?.retryable ?? true;
    console.error(`job ${job.id} failed (${code}):`, err?.message ?? err);
    await db.failJob(job, {
      code,
      message: err?.userMessage ?? "Processing failed — retry when ready.",
      retryable,
    });
  }
  return true;
}

console.log("myiprefinery-worker started");
for (;;) {
  if (shuttingDown) break;
  let didWork = false;
  try {
    didWork = await tick();
  } catch (err) {
    console.error("tick error:", err);
  }
  if (!didWork) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
console.log("worker stopped");
