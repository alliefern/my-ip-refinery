# Architecture

## System shape

```
Browser ── Next.js (Netlify) ── Supabase (Auth, Postgres+RLS, private Storage)
                │                        ▲
                │ enqueue jobs           │ service role
                ▼                        │
        processing_jobs table ◄── Worker container (FFmpeg, OpenAI)
```

- **Web app**: Next.js App Router, server components, server actions.
  All data access goes through `src/lib/data` (the `DataSource`
  interface). `DEMO_MODE=true` swaps in the in-memory demo
  implementation; nothing else in the app changes.
- **Database**: Supabase Postgres. Every user-owned table has RLS
  (see `supabase/migrations/0002_rls_policies.sql`). The worker uses the
  service role and therefore must validate ownership explicitly.
- **Storage**: private buckets only; access via short-lived signed URLs.
  Uploads go directly from the browser to storage (resumable), never
  through a synchronous app request.
- **Worker**: a small container that polls `processing_jobs`, runs
  FFmpeg audio extraction/chunking, calls the OpenAI transcription and
  Responses APIs, and writes results back. It survives browser close and
  retries idempotently (`idempotency_key` is unique per logical job).

## Processing pipeline (hierarchical — never one giant prompt)

1. **Upload & validate** — type/size/limit checks (`src/lib/validation.ts`),
   one processing job per source file.
2. **Audio prep** — FFmpeg extract → mono compressed audio → chunks below
   the transcription API limit with 5s overlap; each chunk keeps
   `start_seconds`/`end_seconds` relative to the original media
   (`computeChunkBoundaries`).
3. **Transcription** — per chunk, stored raw + cleaned, stitched with
   overlap dedup. A failed chunk retries alone.
4. **Per-chunk IP extraction** — structured output, one chunk at a time.
5. **Per-training synthesis** — summary, strongest teachings, weak spots.
6. **Cross-training IP map** — themes, frameworks, repetition,
   contradictions, gaps, up to three course opportunities.
7. **Gap questions** — asked, never invented. Answers become labelled
   source material (`support_type = 'creator_answer'`).
8. **Blueprint** — generated as structured data; **hard stop for human
   approval**.
9. **Lesson generation** — one lesson at a time, retrieval-scoped to the
   relevant chunks + creator answers + neighbouring lessons; followed by
   a separate source-support check that flags (never hides) unsupported
   claims.
10. **Vault, workbook, exports** — only after lessons are complete.

## Status model

Project lifecycle enum and legal transitions live in `src/lib/status.ts`
(mirrored by the Postgres enum). `FAILED` fans back into the stage that
failed; approval stages cannot be skipped. Unit-tested.

## Source traceability

Every IP item and lesson source row carries `source_asset_id`, optional
`transcript_chunk_id`, approximate offsets and a `support_type`
(`source | creator_answer | inferred | suggested`). The UI renders these
as badges and citation links into the transcript viewer; exports carry
them into `07-source-map.csv`.

## Prompts

All AI prompts and JSON schemas live under `src/prompts/`, versioned in
files, separate from UI and route code. Model names come from env vars.
Every machine-consumed response is schema-validated server-side before
touching the database.

## Demo mode

`DEMO_MODE=true` (default) bypasses auth as a demo user and serves the
seeded project from `src/lib/demo/seed.ts` via `src/lib/data/demo.ts`.
Demo mutations (gap answers, lesson edits) persist in process memory.
The Supabase implementation (`src/lib/data/supabase.ts`) is complete for
the same read/write surface and activates when credentials exist.

## Billing readiness (deliberately not implemented)

`usage_events` records transcription seconds, tokens and estimated cost
per operation; limits are env-configurable (`src/lib/config.ts`).
Subscription enforcement will hang off these tables — Stripe is handled
outside the app for now, per the product owner's decision.
