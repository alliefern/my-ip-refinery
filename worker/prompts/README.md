# Prompt library

Every AI stage's prompt, JSON schema and validator lives here —
versioned in files, separate from UI and route code, imported by the
worker that executes them. The methodology encoded in these prompts is
the product's moat; treat changes like schema migrations: add a new
`-vN.mjs` file, don't silently edit history.

Each module exports:

- `system` — the stage's system prompt.
- `buildUserPrompt(...)` — deterministic user-message builder.
- `jsonSchema` — strict JSON schema handed to the Responses API
  (Structured Outputs).
- `validate(data)` — server-side structural validation run on every
  response *after* the API's schema enforcement. Returns a list of
  problems; non-empty means `INVALID_MODEL_OUTPUT` and a re-ask.

## Non-negotiable rules baked into every stage (brief §9)

1. Never invent frameworks, stories, case studies, results, statistics
   or quotations — extract only what the source supports.
2. Distinguish source-supported / inferred / suggested material.
3. Preserve exact framework names and creator terminology.
4. Flag contradictions; ask (gap question), don't guess, at missing steps.
5. No generic AI phrasing, motivational filler or clichés.

## Stages

| File | Stage | Consumes | Produces |
|------|-------|----------|----------|
| `extraction-v1.mjs` | 4 | one transcript chunk | IP items with confidence/distinctiveness |
| `synthesis-v1.mjs` | 5 | one training's full transcript | training summary + strongest teachings |
| `ipmap-v1.mjs` | 6–7 | all syntheses + IP item index | themes, contradictions, gaps, 1–3 course opportunities, gap questions |

Blueprint (stage 8) and lesson generation (stage 9) arrive with
Milestones 4–5.
