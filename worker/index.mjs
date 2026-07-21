/**
 * Worker entrypoint — Milestone 2 implements the real loop:
 *   claim PENDING job → run stage (FFmpeg / transcription / AI) →
 *   write results → mark SUCCEEDED/FAILED with error code → repeat.
 *
 * This skeleton exists so the container builds and the deployment
 * story is testable from day one.
 */

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(
    `Worker cannot start — missing env vars: ${missing.join(", ")}`,
  );
  process.exit(1);
}

console.log("myiprefinery-worker: job loop lands in Milestone 2; exiting.");
