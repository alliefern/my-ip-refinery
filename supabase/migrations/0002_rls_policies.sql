-- Row Level Security: every user-owned table is locked to its owner.
-- The service role (worker, server-side jobs) bypasses RLS by design;
-- application code must still validate ownership explicitly.

alter table profiles enable row level security;
alter table projects enable row level security;
alter table source_assets enable row level security;
alter table transcript_chunks enable row level security;
alter table ip_items enable row level security;
alter table course_opportunities enable row level security;
alter table gap_questions enable row level security;
alter table course_blueprints enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table lesson_sources enable row level security;
alter table vault_entries enable row level security;
alter table processing_jobs enable row level security;
alter table exports enable row level security;
alter table usage_events enable row level security;

-- profiles: self only
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- projects: full CRUD on own rows
create policy "projects_select_own" on projects
  for select using (user_id = auth.uid());
create policy "projects_insert_own" on projects
  for insert with check (user_id = auth.uid());
create policy "projects_update_own" on projects
  for update using (user_id = auth.uid());
create policy "projects_delete_own" on projects
  for delete using (user_id = auth.uid());

-- Helper: does the current user own the project?
create or replace function public.owns_project(p_project_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from projects
    where id = p_project_id and user_id = auth.uid()
  );
$$;

-- source_assets
create policy "assets_select_own" on source_assets
  for select using (owns_project(project_id));
create policy "assets_insert_own" on source_assets
  for insert with check (owns_project(project_id));
create policy "assets_update_own" on source_assets
  for update using (owns_project(project_id));
create policy "assets_delete_own" on source_assets
  for delete using (owns_project(project_id));

-- transcript_chunks (owned via asset → project)
create or replace function public.owns_asset(p_asset_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from source_assets sa
    join projects p on p.id = sa.project_id
    where sa.id = p_asset_id and p.user_id = auth.uid()
  );
$$;

create policy "chunks_select_own" on transcript_chunks
  for select using (owns_asset(source_asset_id));

-- ip_items
create policy "ip_items_select_own" on ip_items
  for select using (owns_project(project_id));

-- course_opportunities
create policy "opportunities_select_own" on course_opportunities
  for select using (owns_project(project_id));
create policy "opportunities_update_own" on course_opportunities
  for update using (owns_project(project_id));

-- gap_questions: user reads and answers
create policy "gaps_select_own" on gap_questions
  for select using (owns_project(project_id));
create policy "gaps_update_own" on gap_questions
  for update using (owns_project(project_id));

-- course_blueprints
create policy "blueprints_select_own" on course_blueprints
  for select using (owns_project(project_id));
create policy "blueprints_update_own" on course_blueprints
  for update using (owns_project(project_id));

-- modules / lessons / lesson_sources (owned via blueprint → project)
create or replace function public.owns_blueprint(p_blueprint_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from course_blueprints cb
    join projects p on p.id = cb.project_id
    where cb.id = p_blueprint_id and p.user_id = auth.uid()
  );
$$;

create or replace function public.owns_module(p_module_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from modules m
    join course_blueprints cb on cb.id = m.course_blueprint_id
    join projects p on p.id = cb.project_id
    where m.id = p_module_id and p.user_id = auth.uid()
  );
$$;

create or replace function public.owns_lesson(p_lesson_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from lessons l
    join modules m on m.id = l.module_id
    join course_blueprints cb on cb.id = m.course_blueprint_id
    join projects p on p.id = cb.project_id
    where l.id = p_lesson_id and p.user_id = auth.uid()
  );
$$;

create policy "modules_select_own" on modules
  for select using (owns_blueprint(course_blueprint_id));
create policy "modules_update_own" on modules
  for update using (owns_blueprint(course_blueprint_id));

create policy "lessons_select_own" on lessons
  for select using (owns_module(module_id));
create policy "lessons_update_own" on lessons
  for update using (owns_module(module_id));

create policy "lesson_sources_select_own" on lesson_sources
  for select using (owns_lesson(lesson_id));

-- vault_entries
create policy "vault_select_own" on vault_entries
  for select using (owns_project(project_id));
create policy "vault_update_own" on vault_entries
  for update using (owns_project(project_id));

-- processing_jobs: read-only for users (worker writes via service role)
create policy "jobs_select_own" on processing_jobs
  for select using (owns_project(project_id));

-- exports
create policy "exports_select_own" on exports
  for select using (owns_project(project_id));

-- usage_events: read own
create policy "usage_select_own" on usage_events
  for select using (user_id = auth.uid());
