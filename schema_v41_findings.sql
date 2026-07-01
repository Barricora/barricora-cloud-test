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
