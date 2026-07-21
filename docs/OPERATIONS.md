# Operational notes

## Retrying failed work

- **Failed asset (transcription/extraction)**: the Sources screen shows
  a Retry button per failed asset — it re-arms the failed job
  (`requeueFailedJob`) or enqueues a fresh one. Chunk-level idempotency
  means only unfinished chunks re-run and re-bill.
- **Failed project-level job** (IP map, blueprint, lessons, assets):
  jobs re-queue themselves with backoff up to 3 attempts. After final
  failure, re-trigger from the UI action that started them (re-select
  the course direction, re-approve, etc.) or flip the job row back to
  `PENDING` in SQL:
  `update processing_jobs set status='PENDING', run_after=now() where id='…';`
- **Stuck RUNNING job** (worker died mid-job): the claim function skips
  RUNNING rows, so reset it manually the same way. Jobs are idempotent;
  completed sub-steps are skipped on the re-run.

## Inspecting usage and cost

`usage_events` records every transcription second and every model
token, with `estimated_cost_minor_units` (US cents). Per-project totals
appear on the project Overview. Account-wide:

```sql
select operation, count(*), sum(estimated_cost_minor_units)/100.0 as usd
from usage_events group by operation order by usd desc;
```

## Worker deployment

See `worker/README.md`. One instance is enough for early usage;
multiple instances are safe (claims use SKIP LOCKED).

## Data retention

Deleting a project removes database rows (cascade) and storage objects
(`sources/` and `exports/` under the user/project prefix) immediately —
see `deleteProjectAction`. Users can delete an individual training's
original media while retaining its transcript from the Sources screen
(asset delete removes everything; original-only retention arrives with
the configurable retention plan).
