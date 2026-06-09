-- Optional demo rows for a Postgres-backed instance. The in-memory driver seeds
-- an equivalent dataset in code (lib/data/memory/seed.ts), so this file is only
-- needed when DATA_DRIVER=postgres.
--   psql "$DATABASE_URL" -f db/seed.sql

INSERT INTO projects (title, description, status, deadline) VALUES
  ('Customer Portal Redesign', 'Rebuild the self-service portal on the new design system.', 'Active',    CURRENT_DATE + 24),
  ('Warehouse Mobile Scanner', 'Offline-capable Android scanner for pick, pack and cycle counts.', 'Active', CURRENT_DATE + 9),
  ('Billing Platform Migration', 'Move invoicing onto the metered billing service.', 'On Hold',   CURRENT_DATE + 61),
  ('Observability Rollout', 'Structured logs, traces and SLOs for the on-call services.', 'Active', CURRENT_DATE + 38),
  ('Vendor Onboarding Automation', 'Replace the spreadsheet supplier intake with a reviewed workflow.', 'Completed', CURRENT_DATE - 16)
ON CONFLICT DO NOTHING;

INSERT INTO tasks (project_id, title, status, priority, assignee, due_date)
SELECT p.id, t.title, t.status, t.priority, t.assignee, CURRENT_DATE + t.due_offset
FROM projects p
JOIN (VALUES
  ('Customer Portal Redesign',    'Audit current portal accessibility', 'Done',        'High',   'Priya Raman',   -21),
  ('Customer Portal Redesign',    'Build billing history screen',       'In Progress', 'High',   'Priya Raman',     5),
  ('Customer Portal Redesign',    'Retire legacy portal routes',        'Todo',        'Low',    NULL,             20),
  ('Warehouse Mobile Scanner',    'Offline sync conflict rules',        'Done',        'High',   'Tomas Berg',    -34),
  ('Warehouse Mobile Scanner',    'Depot pilot in Rotterdam',           'In Progress', 'High',   'Lena Fischer',   -2),
  ('Warehouse Mobile Scanner',    'Rollout runbook for depot leads',    'Todo',        'Medium', 'Lena Fischer',    8),
  ('Billing Platform Migration',  'Map legacy plan codes',              'Done',        'High',   'Dana Okoye',    -48),
  ('Billing Platform Migration',  'Dual-write invoice records',         'In Progress', 'High',   'Sam Whitfield',  14),
  ('Observability Rollout',       'Standard log schema',                'Done',        'Medium', 'Sam Whitfield',  -9),
  ('Observability Rollout',       'Define SLOs for checkout',           'Todo',        'High',   NULL,             16),
  ('Vendor Onboarding Automation','Two-step approval workflow',         'Done',        'High',   'Sam Whitfield', -44)
) AS t(project_title, title, status, priority, assignee, due_offset)
  ON t.project_title = p.title
ON CONFLICT DO NOTHING;
