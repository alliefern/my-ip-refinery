# Prompt library

Every AI stage's prompt and JSON schema lives here — versioned,
testable, and never inlined in route handlers or UI components. The
methodology encoded in these prompts is the product's moat; treat
changes like schema migrations (new version file, not silent edits).

Layout (populated milestone by milestone):

```
extraction/     Stage 4 — per-chunk IP extraction (v1 lands in Milestone 3)
synthesis/      Stage 5 — per-training synthesis
ip-map/         Stage 6 — cross-training analysis + course opportunities
gap-questions/  Stage 7 — targeted creator questions
blueprint/      Stage 8 — positioning + curriculum as structured data
lessons/        Stage 9 — lesson generation + source-support verifier
assets/         Stage 10 — vault descriptions, workbook
shared/         Voice rules, banned-phrase list, support-type definitions
```

Rules that apply to every prompt (from the product brief §9):

1. Never invent frameworks, stories, results, statistics or quotes.
2. Distinguish source-supported / inferred / suggested material.
3. Preserve exact framework names and creator terminology.
4. Flag contradictions; ask, don't guess, at missing steps.
5. No generic AI phrasing or motivational filler.

Each stage ships as `vN.ts` exporting `{ system, buildUserPrompt, schema }`
where `schema` is a Zod schema validated server-side before any DB write.
