CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  category TEXT,
  label TEXT,
  site TEXT,
  area TEXT,
  auditor TEXT,
  score INTEGER,
  saved_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audits_saved_at ON audits(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_site ON audits(site);


CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  type TEXT,
  label TEXT,
  site TEXT,
  area TEXT,
  contractor TEXT,
  raised_by TEXT,
  saved_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_findings_saved_at ON findings(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_findings_site ON findings(site);
CREATE INDEX IF NOT EXISTS idx_findings_contractor ON findings(contractor);
