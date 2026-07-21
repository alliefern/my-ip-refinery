-- Hardening from Supabase security advisor findings:
-- 1. Pin search_path on trigger function (mutable search_path warning).
-- 2. RLS helper functions and the auth trigger are internal machinery —
--    remove them from the public RPC surface. `authenticated` keeps
--    EXECUTE on owns_* because RLS policy evaluation runs as the
--    querying role; `anon` never needs them.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger functions run as the table owner; no API role needs EXECUTE.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.owns_project(uuid) from public, anon;
revoke execute on function public.owns_asset(uuid) from public, anon;
revoke execute on function public.owns_blueprint(uuid) from public, anon;
revoke execute on function public.owns_module(uuid) from public, anon;
revoke execute on function public.owns_lesson(uuid) from public, anon;
