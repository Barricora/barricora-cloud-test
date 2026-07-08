CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT,
  company TEXT,
  role TEXT,
  site TEXT,
  status TEXT,
  updated_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(name);
CREATE INDEX IF NOT EXISTS idx_workers_company ON workers(company);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);

CREATE TABLE IF NOT EXISTS ppe_stock (
  id TEXT PRIMARY KEY,
  category TEXT,
  type TEXT,
  label TEXT,
  qty INTEGER DEFAULT 0,
  min_qty INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ppe_stock_category ON ppe_stock(category);
CREATE INDEX IF NOT EXISTS idx_ppe_stock_type ON ppe_stock(type);
CREATE INDEX IF NOT EXISTS idx_ppe_stock_qty ON ppe_stock(qty);

CREATE TABLE IF NOT EXISTS ppe_issues (
  id TEXT PRIMARY KEY,
  worker_id TEXT,
  worker_name TEXT,
  item_id TEXT,
  date TEXT,
  created_at TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ppe_issues_worker_id ON ppe_issues(worker_id);
CREATE INDEX IF NOT EXISTS idx_ppe_issues_worker_name ON ppe_issues(worker_name);
CREATE INDEX IF NOT EXISTS idx_ppe_issues_date ON ppe_issues(date);
