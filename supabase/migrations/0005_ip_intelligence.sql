-- Milestone 3: IP intelligence storage.
-- Per-training synthesis lives on the asset; the cross-training map
-- lives on the project. Both drive read-only UI panels, while the
-- relational tables (ip_items, course_opportunities, gap_questions)
-- remain the primary structured outputs.

alter table source_assets
  add column synthesis_json jsonb not null default '{}';

alter table projects
  add column ip_map_json jsonb not null default '{}';
