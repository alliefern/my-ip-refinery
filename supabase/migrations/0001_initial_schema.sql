-- My IP Refinery — initial schema.
-- UUID keys, explicit FKs, enum statuses. JSONB is used only for
-- flexible metadata (intake answers, positioning), never as the
-- primary home of UI-driving fields.

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────

create type project_status as enum (
  'DRAFT','UPLOADING','QUEUED','TRANSCRIBING','EXTRACTING_IP',
  'BUILDING_IP_MAP','AWAITING_GAP_ANSWERS','AWAITING_COURSE_SELECTION',
  'AWAITING_BLUEPRINT_APPROVAL','GENERATING_LESSONS','READY_FOR_REVIEW',
  'EXPORTING','COMPLETE','FAILED'
);

create type asset_kind as enum (
  'video','audio','slide_deck','workbook','note','creator_answer'
);

create type asset_status as enum (
  'UPLOADING','UPLOADED','PREPARING_AUDIO','TRANSCRIBING','TRANSCRIBED',
  'EXTRACTING','READY','FAILED'
);

create type ip_item_type as enum (
  'concept','signature_framework','named_methodology','step_or_process',
  'strong_opinion','story','case_study','example','analogy','instruction',
  'exercise','template_or_resource','common_mistake','objection','faq',
  'result_or_claim','distinctive_phrase'
);

create type support_type as enum ('source','creator_answer','inferred','suggested');

create type lesson_status as enum ('DRAFT','REVIEW','APPROVED');

create type blueprint_status as enum ('DRAFT','APPROVED');

create type job_status as enum ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED');

create type gap_question_status as enum ('OPEN','ANSWERED','SKIPPED');

create type export_status as enum ('PENDING','GENERATING','READY','FAILED');

-- ── Tables ───────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  language_variant text not null default 'us',
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  status project_status not null default 'DRAFT',
  selected_course_opportunity_id uuid,
  intake_json jsonb not null default '{}',
  voice_settings_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index projects_user_idx on projects (user_id) where deleted_at is null;

create table source_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  kind asset_kind not null,
  original_filename text not null,
  display_title text not null,
  storage_path text,
  mime_type text not null,
  size_bytes bigint not null,
  duration_seconds numeric,
  status asset_status not null default 'UPLOADING',
  error_message text,
  original_deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index source_assets_project_idx on source_assets (project_id);

create table transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  source_asset_id uuid not null references source_assets (id) on delete cascade,
  sequence_number int not null,
  start_seconds numeric not null,
  end_seconds numeric not null,
  raw_text text,
  clean_text text,
  transcription_metadata_json jsonb not null default '{}',
  status text not null default 'PENDING',
  unique (source_asset_id, sequence_number)
);
create index transcript_chunks_asset_idx on transcript_chunks (source_asset_id);

create table ip_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  source_asset_id uuid not null references source_assets (id) on delete cascade,
  transcript_chunk_id uuid references transcript_chunks (id) on delete set null,
  type ip_item_type not null,
  title text not null,
  content text not null,
  start_seconds numeric,
  end_seconds numeric,
  confidence_score numeric not null check (confidence_score between 0 and 1),
  distinctiveness_score numeric not null check (distinctiveness_score between 0 and 1),
  support_type support_type not null default 'source',
  metadata_json jsonb not null default '{}'
);
create index ip_items_project_idx on ip_items (project_id);

create table course_opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  audience text not null,
  transformation text not null,
  rationale text not null,
  missing_material_json jsonb not null default '[]',
  strength_score numeric not null check (strength_score between 0 and 1),
  is_recommended boolean not null default false
);
create index course_opportunities_project_idx on course_opportunities (project_id);

alter table projects
  add constraint projects_selected_opportunity_fk
  foreign key (selected_course_opportunity_id)
  references course_opportunities (id) on delete set null;

create table gap_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  question text not null,
  reason text not null,
  answer text,
  status gap_question_status not null default 'OPEN',
  created_source_asset_id uuid references source_assets (id) on delete set null,
  created_at timestamptz not null default now()
);
create index gap_questions_project_idx on gap_questions (project_id);

create table course_blueprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  version int not null default 1,
  title text not null,
  subtitle text,
  promise text,
  transformation text,
  audience text,
  positioning_json jsonb not null default '{}',
  status blueprint_status not null default 'DRAFT',
  approved_at timestamptz,
  unique (project_id, version)
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  course_blueprint_id uuid not null references course_blueprints (id) on delete cascade,
  position int not null,
  title text not null,
  purpose text,
  outcome text,
  rationale text
);
create index modules_blueprint_idx on modules (course_blueprint_id);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules (id) on delete cascade,
  position int not null,
  title text not null,
  objective text,
  content_markdown text not null default '',
  lesson_structure_json jsonb not null default '{}',
  source_strength_score numeric check (source_strength_score between 0 and 1),
  transformation_value_score numeric check (transformation_value_score between 0 and 1),
  creator_uniqueness_score numeric check (creator_uniqueness_score between 0 and 1),
  status lesson_status not null default 'DRAFT',
  version int not null default 1,
  updated_at timestamptz not null default now()
);
create index lessons_module_idx on lessons (module_id);

create table lesson_sources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons (id) on delete cascade,
  source_asset_id uuid not null references source_assets (id) on delete cascade,
  transcript_chunk_id uuid references transcript_chunks (id) on delete set null,
  start_seconds numeric,
  end_seconds numeric,
  support_note text,
  support_type support_type not null default 'source'
);
create index lesson_sources_lesson_idx on lesson_sources (lesson_id);

create table vault_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  source_asset_id uuid not null references source_assets (id) on delete cascade,
  clean_title text not null,
  description text,
  key_topics text[] not null default '{}',
  watch_this_if text,
  chapters_json jsonb not null default '[]',
  related_lesson_ids uuid[] not null default '{}',
  suggested_order int not null default 0
);
create index vault_entries_project_idx on vault_entries (project_id);

create table processing_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  source_asset_id uuid references source_assets (id) on delete cascade,
  job_type text not null,
  status job_status not null default 'PENDING',
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  attempt_count int not null default 0,
  idempotency_key text not null,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);
create index processing_jobs_project_idx on processing_jobs (project_id);
create index processing_jobs_pending_idx on processing_jobs (status, created_at)
  where status in ('PENDING','RUNNING');

create table exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  type text not null,
  storage_path text,
  status export_status not null default 'PENDING',
  created_at timestamptz not null default now()
);
create index exports_project_idx on exports (project_id);

create table usage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  operation text not null,
  model text,
  audio_seconds numeric,
  input_tokens bigint,
  output_tokens bigint,
  estimated_cost_minor_units bigint not null default 0,
  created_at timestamptz not null default now()
);
create index usage_events_project_idx on usage_events (project_id);
create index usage_events_user_idx on usage_events (user_id);

-- ── Profile bootstrap ────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at maintenance ───────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch before update on projects
  for each row execute function public.touch_updated_at();
