-- Milestone 6: the generated student workbook lives on the project.
alter table projects
  add column workbook_json jsonb not null default '{}';
