export const DB_NAME = 'backonfit_db';
export const DB_VERSION = 1;

export const CREATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_schedule_time TEXT,
  version INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('time','step')),
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  effort_time INTEGER, -- null if step-based
  rest_time INTEGER NOT NULL,
  effective_from INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- FUTURE USAGE but created now to simplify migrations later
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id TEXT NOT NULL,
  config_id INTEGER NOT NULL,
  performed_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  completed_iterations INTEGER,
  notes TEXT,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (config_id) REFERENCES activity_configs(id) ON DELETE CASCADE
);

PRAGMA foreign_keys = ON;
`;
