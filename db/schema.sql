-- Schema for the project dashboard. Applied automatically by the Postgres
-- container (docker-compose mounts this into /docker-entrypoint-initdb.d), or
-- by hand with: psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(50)  NOT NULL DEFAULT 'Active',
  deadline    DATE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_status_check CHECK (status IN ('Active', 'On Hold', 'Completed'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(50)  NOT NULL DEFAULT 'Todo',
  priority    VARCHAR(50)  NOT NULL DEFAULT 'Medium',
  assignee    VARCHAR(255),
  due_date    DATE,
  photo_urls  TEXT[]       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_status_check   CHECK (status   IN ('Todo', 'In Progress', 'Done')),
  CONSTRAINT tasks_priority_check CHECK (priority IN ('Low', 'Medium', 'High'))
);

-- Every task read filters on project_id; without this index the project page is
-- a sequential scan of the whole table.
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks (project_id);

-- Serves GROUP BY project_id, status (the dashboard's per-project tallies)
-- directly from the index.
CREATE INDEX IF NOT EXISTS tasks_project_status_idx ON tasks (project_id, status);

-- The overdue count in /api/analytics.
CREATE INDEX IF NOT EXISTS tasks_open_due_date_idx ON tasks (due_date) WHERE status <> 'Done';

-- Project list ordering and the status filter.
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects (status);
