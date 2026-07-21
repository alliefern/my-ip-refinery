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
