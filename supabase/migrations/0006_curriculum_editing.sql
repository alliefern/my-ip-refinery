-- Milestone 4: creators can restructure their own curriculum —
-- add/remove lessons and modules on their own blueprints. Ownership
-- chains through the existing security-definer helpers.

create policy "modules_insert_own" on modules
  for insert with check (owns_blueprint(course_blueprint_id));
create policy "modules_delete_own" on modules
  for delete using (owns_blueprint(course_blueprint_id));

create policy "lessons_insert_own" on lessons
  for insert with check (owns_module(module_id));
create policy "lessons_delete_own" on lessons
  for delete using (owns_module(module_id));
