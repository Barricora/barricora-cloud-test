CREATE TABLE IF NOT EXISTS daily_checklists (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  type TEXT,
  label TEXT,
  site TEXT,
  area TEXT,
  checked_by TEXT,
  saved_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_checklists_saved_at ON daily_checklists(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_checklists_status ON daily_checklists(status);
CREATE INDEX IF NOT EXISTS idx_daily_checklists_site ON daily_checklists(site);
CREATE INDEX IF NOT EXISTS idx_daily_checklists_checked_by ON daily_checklists(checked_by);
