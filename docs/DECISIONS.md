# Build decisions log

Decisions made during the build, per the brief's instruction to decide
and document rather than block on questions.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Name: **My IP Refinery**, domain myiprefinery.com | Owner's choice; domain purchased 2026-07-21 (Namecheap). Brand name is env-configurable (`NEXT_PUBLIC_BRAND_NAME`). |
| 2 | No Stripe in-app | Owner bills subscribers outside the app. Usage events + limits keep billing hooks ready. |
| 3 | Demo-mode-first | Whole product clickable with zero credentials; real integrations activate via env vars. |
| 4 | Data access behind a `DataSource` interface | One switch flips demo ↔ Supabase; UI code never knows which is active. |
| 5 | Tailwind v4, system-font editorial design | No webfont downloads at build (proxy-safe, faster); brief demands calm/editorial, not AI-gradient. |
| 6 | Dependency-free Markdown renderer for lessons | Input escaped before transform; avoids pulling a rich-text stack before the editor milestone (TipTap arrives with Milestone 5). |
| 7 | Optimistic concurrency on lesson saves (`version` column in the UPDATE WHERE clause) | Brief requires "no accidental overwrites"; a stale editor gets a conflict, not a silent clobber. |
| 8 | Worker = container polling `processing_jobs` | Portable across Fly.io/Railway (~$5/mo); no vendor lock-in vs. a managed runner. Decision on host deferred until go-live. |
| 9 | Supabase region us-east-1 proposed | Owner declined automated project creation mid-session — creation pending owner's preference (region/project ownership). Migrations are host-agnostic. |
| 10 | `raw_text` kept alongside `clean_text` per chunk | Normalisation must never destroy the creator's original wording. |
| 11 | Prompt library lives in `worker/prompts/` (not `src/prompts/`) | Prompts execute in the worker; keeping them beside their runtime avoids a cross-package import while staying versioned and separate from UI code. |
| 12 | Map-level analysis stored as `projects.ip_map_json`, syntheses as `source_assets.synthesis_json` | These are read-only UI panels; relational tables (ip_items, opportunities, gap_questions) remain the structured outputs that drive workflows. |
| 13 | Invalid structured output → one re-ask, then retryable job failure | Balances resilience against runaway token spend; both calls' tokens are recorded in usage_events. |
| 14 | Curriculum reordering uses accessible up/down controls, not drag-and-drop (yet) | Keyboard-accessible and dependency-free for the MVP; a dnd layer can be added over the same position-swap actions later. |
| 15 | Blueprint regeneration replaces only DRAFT blueprints | An approved blueprint is a contract with the user; choosing a new direction creates the next version instead of mutating approved work. |
| 16 | Lesson retrieval is lexical (term overlap + blueprint-named-training boost), not embeddings | Zero extra infrastructure for the MVP; the retrieval interface is isolated in `worker/lib/retrieval.mjs` so embeddings can replace scoring without touching the pipeline. |
| 17 | Lessons generate sequentially in one job, not fan-out | Each lesson receives the previous lesson's actual takeaways (brief §9.15 anti-repetition rule); resume-on-retry skips lessons that already have content. |
| 18 | Exports generate on demand from live data, no stored export files | Guarantees "latest saved edits, never an earlier draft" (brief §14) and keeps storage costs at zero; the `exports` table remains for future cached/emailed packages. |
| 19 | Vault + workbook generate when the last lesson is marked Approved | Brief stage 10: assets only after core lessons are complete; approval of every lesson is the concrete signal. |
| 20 | Logo image (`public/logo.png`) replaces `brand.name` text wherever the wordmark appears in the UI; `src/app/icon.png` provides the favicon via Next's file convention | Owner supplied brand assets post-launch; `brand.name` remains the accessible `alt` text and the `<title>` source. |
| 21 | Magic-link sign-in is registration-gated (`shouldCreateUser: false`) | Owner requires accounts to exist before magic-link access — matches password sign-up as the only way to create an account, since there's no in-app billing to gate on instead. |
| 22 | Account creation moved off `/login` to an unlisted `/create-access` route (noindex + `robots.txt` disallow) | No in-app paywall, so the URL itself is the access gate; the owner shares it directly with paying subscribers. `/login` now only offers sign-in and magic link. |
| 23 | `Logo` component forces `self-start` on the wordmark image | `/login`'s `flex-col` layout has no `align-items` override, so the default `stretch` was distorting the image's `w-auto` width to fill the card; `self-start` makes the image size from its own aspect ratio regardless of the parent's alignment. |
| 24 | Feedback saves to a dedicated `feedback` table on every submit; email notification (Resend) is best-effort on top | The database row is the source of truth and never depends on a third-party API being configured or up; `RESEND_API_KEY` is optional — unset, feedback still saves, it just isn't emailed. |
| 25 | Sign in / create account / magic link buttons show a spinner via `useFormStatus`, not `useActionState` | These forms are plain server actions with redirects on success — `useFormStatus` gets pending state for free from the nearest ancestor `<form>` without restructuring them around client-side state. |
| 26 | Upload failures (client PUT errors, signed-URL creation errors) now write `FAILED` + `error_message` back to the row instead of only updating transient browser state | A real user's 10-file, ~7 GB batch upload left every row stuck at `UPLOADING` forever with zero error visibility — the browser saw failures but never told the server. |
| 27 | Client caps concurrent uploads at 2, reinstated after briefly trying uncapped | Owner reversed course to prioritize reliability over speed — a client's own upload bandwidth is the real constraint, not Supabase capacity, so 2-at-a-time is safer regardless of plan. |
| 28 | `sources` bucket now has an explicit 4 GB `file_size_limit` matching `MAX_FILE_BYTES` | The bucket previously had no override and silently depended on the platform default, which didn't necessarily match what the app told users. |
