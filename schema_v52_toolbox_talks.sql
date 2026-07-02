CREATE TABLE IF NOT EXISTS toolbox_talks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  topic TEXT,
  label TEXT,
  site TEXT,
  area TEXT,
  delivered_by TEXT,
  company TEXT,
  saved_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_toolbox_talks_saved_at ON toolbox_talks(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_status ON toolbox_talks(status);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_topic ON toolbox_talks(topic);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_site ON toolbox_talks(site);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_delivered_by ON toolbox_talks(delivered_by);
