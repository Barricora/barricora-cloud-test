CREATE TABLE IF NOT EXISTS rams_register (
  id TEXT PRIMARY KEY,
  status TEXT,
  title TEXT,
  label TEXT,
  site TEXT,
  contractor TEXT,
  task TEXT,
  revision TEXT,
  uploaded_date TEXT,
  review_date TEXT,
  saved_at TEXT,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rams_saved_at ON rams_register(saved_at);
CREATE INDEX IF NOT EXISTS idx_rams_status ON rams_register(status);
CREATE INDEX IF NOT EXISTS idx_rams_review_date ON rams_register(review_date);
