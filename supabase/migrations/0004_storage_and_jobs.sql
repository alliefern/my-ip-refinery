-- Storage buckets, storage RLS, and job-queue plumbing for the
-- upload → transcription pipeline (Milestone 2).

-- ── Private buckets ──────────────────────────────────────────────────
-- Object paths are always {user_id}/{project_id}/{asset_id}/{filename},
-- so the first path segment is the owner and storage RLS can enforce
-- ownership without extra lookups.

insert into storage.buckets (id, name, public)
values ('sources', 'sources', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

create policy "sources_owner_select" on storage.objects
  for select using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sources_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sources_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "exports_owner_select" on storage.objects
  for select using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Job queue plumbing ───────────────────────────────────────────────

-- Retry backoff: a failed attempt re-queues with a future run_after.
alter table processing_jobs
  add column run_after timestamptz not null default now();

drop index processing_jobs_pending_idx;
create index processing_jobs_pending_idx
  on processing_jobs (run_after, created_at)
  where status = 'PENDING';

-- Atomic claim for the worker: one job per call, skipping rows other
-- workers hold. Service-role only — not part of the public API.
create or replace function public.claim_next_job()
returns setof processing_jobs
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from processing_jobs
  where status = 'PENDING' and run_after <= now()
  order by created_at
  limit 1
  for update skip locked;

  if v_id is null then
    return;
  end if;

  update processing_jobs
  set status = 'RUNNING',
      started_at = now(),
      attempt_count = attempt_count + 1
  where id = v_id;

  return query select * from processing_jobs where id = v_id;
end;
$$;

revoke execute on function public.claim_next_job() from public, anon, authenticated;
