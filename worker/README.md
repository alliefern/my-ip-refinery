# Background worker

Long-running media processing lives here — never in a Netlify function
and never in a browser request. The worker is a small container that:

1. Polls `processing_jobs` for `PENDING` work (service role connection).
2. Claims a job atomically (`status → RUNNING`, `attempt_count + 1`).
3. Runs the stage: FFmpeg audio extraction → chunking → transcription →
   AI stages, writing partial results as it goes.
4. Marks `SUCCEEDED` or `FAILED` with an error code from
   `docs/ERROR-CODES.md`; failures are retryable per stage.

Idempotency: every job has a unique `idempotency_key`; re-running a
completed key is a no-op, so retries never duplicate records or charges.

## Deployment

Any container host works. Reference targets:

- **Fly.io** — `fly launch` with the Dockerfile here (~$5/mo, can
  scale to zero between jobs).
- **Railway** — point a service at this directory.

Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`,
`BACKGROUND_WORKER_SECRET`.

## Status

Milestone 2 complete: the `transcribe_asset` pipeline is implemented —
storage download, FFmpeg probe/extract/slice, chunked transcription
with per-chunk idempotency (retries skip finished chunks), overlap-safe
stitching helpers, usage recording, retry/backoff with error codes.
Run `npm test` here for the worker's unit tests (stitching, chunking,
transcription adapter against a mocked API). AI extraction jobs land in
Milestone 3.
