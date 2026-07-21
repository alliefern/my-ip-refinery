-- User feedback (bug reports, testimonials, general notes) submitted from
-- the in-app "Send feedback" form. Written by the server action using the
-- service role; RLS still restricts direct client access to the owner's
-- own insert, in case anything ever calls this from the browser client.

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_email text not null,
  type text not null default 'general' check (type in ('bug', 'testimonial', 'general')),
  message text not null check (char_length(message) between 1 and 4000),
  page_path text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index feedback_user_idx on feedback (user_id);

alter table feedback enable row level security;

create policy "feedback_insert_own" on feedback
  for insert with check (user_id = auth.uid());
