-- Barricora v87 App Log + Support Access tables. Run this in your existing D1 database.

CREATE TABLE IF NOT EXISTS app_activity_log (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  user_id TEXT,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_activity_company_created ON app_activity_log(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_app_activity_action ON app_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_app_activity_user ON app_activity_log(user_id);

CREATE TABLE IF NOT EXISTS app_support_access (
  company_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  note TEXT,
  updated_by TEXT,
  updated_at TEXT
);
