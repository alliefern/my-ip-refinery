# My IP Refinery

Turn an existing video training library into a strategically structured,
source-grounded mini-course. Upload up to ten trainings on one topic; the
refinery transcribes them, mines the intellectual property, finds the
strongest student transformation, and — after your approval — writes
complete lessons that trace back to your original recordings.

**This is an IP extraction and curriculum architecture product, not a
transcription summarizer.** The methodology (what's proprietary vs.
repetition, how lessons map to sources, where human approval is required)
is the moat; see `docs/ARCHITECTURE.md`.

## Status

Milestone 1 of 6 (foundation + demo experience). See `docs/DECISIONS.md`
for the build log and `docs/ARCHITECTURE.md` for the full pipeline design.

## Quick start (demo mode — zero credentials)

```bash
npm install
npm run dev
```

Open http://localhost:3000. `DEMO_MODE` defaults to on: auth is bypassed
and a seeded example project ("Signature Offer Trainings") exercises every
screen — dashboard, transcripts, IP map, course direction, gap questions,
blueprint, course editor, bonus vault and exports.

## Going live

1. Create a Supabase project and apply, in order, the SQL files in
   `supabase/migrations/` (dashboard SQL editor, `supabase db push`, or
   the Supabase MCP `apply_migration` tool).
2. Copy `.env.example` to `.env.local` and fill in Supabase + OpenAI
   values. Set `DEMO_MODE=false`.
3. Deploy the web app to Netlify (this repo includes `netlify.toml`);
   set the same environment variables in the Netlify site settings.
4. Deploy the background worker (`worker/`) to a container host such as
   Fly.io or Railway — long media processing never runs inside Netlify.
   See `worker/README.md`.

Secrets live only in environment variables. The service role key and
OpenAI key must never reach the browser or this repository.

## Scripts

| Command             | Purpose                       |
| ------------------- | ----------------------------- |
| `npm run dev`       | Local development server      |
| `npm run build`     | Production build              |
| `npm run typecheck` | Strict TypeScript check       |
| `npm test`          | Unit tests (Vitest)           |

## Repository layout

```
src/app/            Next.js App Router screens
src/lib/            Domain types, status machine, validation, config
src/lib/data/       Data access layer (demo ↔ Supabase switch)
src/lib/demo/       Seeded demo project
src/prompts/        Versioned AI prompts + JSON schemas (never inlined in routes)
supabase/migrations Database schema + Row Level Security
worker/             Background media-processing worker (FFmpeg + jobs)
docs/               Architecture, decisions, error codes
```
