export const SCHEMA_VERSION = 10;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS analysis_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_es TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_es TEXT NOT NULL DEFAULT '',
  icon_name TEXT NOT NULL DEFAULT 'science',
  color_hex TEXT NOT NULL DEFAULT '#2196F3',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS indicators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_type_id INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_es TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  reference_min REAL,
  reference_max REAL,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  formula TEXT DEFAULT NULL,
  FOREIGN KEY (analysis_type_id) REFERENCES analysis_types(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_date TEXT NOT NULL,
  lab_name TEXT NOT NULL DEFAULT '',
  doctor_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'pdf-import',
  pdf_data TEXT DEFAULT NULL,
  pdf_filename TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_type_id INTEGER NOT NULL,
  record_date TEXT NOT NULL,
  lab_name TEXT NOT NULL DEFAULT '',
  doctor_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  batch_id TEXT DEFAULT NULL,
  order_id INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (analysis_type_id) REFERENCES analysis_types(id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL,
  indicator_id INTEGER NOT NULL,
  value REAL NOT NULL,
  ref_min_snapshot REAL,
  ref_max_snapshot REAL,
  is_flagged INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id),
  UNIQUE(record_id, indicator_id)
);

CREATE TABLE IF NOT EXISTS import_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER,
  source_type TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  raw_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vaccines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vaccine_date TEXT NOT NULL,
  name TEXT NOT NULL,
  dose TEXT NOT NULL DEFAULT '',
  lot_number TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  dose TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'daily',
  start_date TEXT NOT NULL,
  end_date TEXT DEFAULT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_date TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS symptoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symptom_date TEXT NOT NULL,
  name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
  duration TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS symptom_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symptom_id INTEGER NOT NULL,
  data TEXT NOT NULL,
  filename TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (symptom_id) REFERENCES symptoms(id) ON DELETE CASCADE
);
`;

export const MIGRATIONS: Record<number, string[]> = {
  2: [
    "ALTER TABLE indicators ADD COLUMN formula TEXT DEFAULT NULL",
  ],
  3: [
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')",
  ],
  4: [
    "ALTER TABLE records ADD COLUMN batch_id TEXT DEFAULT NULL",
  ],
  5: [
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_date TEXT NOT NULL,
      lab_name TEXT NOT NULL DEFAULT '',
      doctor_name TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'pdf-import',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    "ALTER TABLE records ADD COLUMN order_id INTEGER DEFAULT NULL REFERENCES orders(id) ON DELETE SET NULL",
  ],
  6: [
    `CREATE TABLE IF NOT EXISTS vaccines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vaccine_date TEXT NOT NULL,
      name TEXT NOT NULL,
      dose TEXT NOT NULL DEFAULT '',
      lot_number TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dose TEXT NOT NULL DEFAULT '',
      frequency TEXT NOT NULL DEFAULT 'daily',
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      milestone_date TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ],
  7: [
    `CREATE TABLE IF NOT EXISTS symptoms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symptom_date TEXT NOT NULL,
      name TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'moderate',
      duration TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ],
  8: [
    `CREATE TABLE IF NOT EXISTS symptom_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symptom_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      filename TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (symptom_id) REFERENCES symptoms(id) ON DELETE CASCADE
    )`,
  ],
  9: [
    "ALTER TABLE orders ADD COLUMN pdf_data TEXT DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN pdf_filename TEXT DEFAULT NULL",
  ],
  10: [
    "CREATE INDEX IF NOT EXISTS idx_indicators_analysis_type_id ON indicators(analysis_type_id)",
    "CREATE INDEX IF NOT EXISTS idx_records_analysis_type_id ON records(analysis_type_id)",
    "CREATE INDEX IF NOT EXISTS idx_records_order_id ON records(order_id)",
    "CREATE INDEX IF NOT EXISTS idx_records_record_date ON records(record_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_results_record_id ON results(record_id)",
    "CREATE INDEX IF NOT EXISTS idx_results_indicator_id ON results(indicator_id)",
    "CREATE INDEX IF NOT EXISTS idx_import_history_record_id ON import_history(record_id)",
    "CREATE INDEX IF NOT EXISTS idx_symptom_photos_symptom_id ON symptom_photos(symptom_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_vaccines_vaccine_date ON vaccines(vaccine_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_medications_start_date ON medications(start_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_milestones_milestone_date ON milestones(milestone_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_symptoms_symptom_date ON symptoms(symptom_date DESC)",
  ],
};
