CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invited_by INTEGER,
  email TEXT UNIQUE NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TEXT,
  reg_ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  kp_status TEXT NOT NULL DEFAULT 'ready'
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  section TEXT,
  selected INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  question_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  fail_reason TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  stem TEXT NOT NULL,
  opt_a TEXT NOT NULL, opt_b TEXT NOT NULL, opt_c TEXT NOT NULL, opt_d TEXT NOT NULL,
  answer TEXT NOT NULL,
  analysis TEXT NOT NULL,
  knowledge_point TEXT NOT NULL,
  review_passed INTEGER NOT NULL DEFAULT 1,
  qtype TEXT DEFAULT 'single',
  subject TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  paper_id INTEGER NOT NULL,
  answers TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  duration_sec INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wrong_book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  your_answer TEXT,
  box INTEGER DEFAULT 1,
  due_at TEXT,
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_mat_user ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_kp_mat ON knowledge_points(material_id);
CREATE INDEX IF NOT EXISTS idx_paper_user ON papers(user_id);
CREATE INDEX IF NOT EXISTS idx_q_paper ON questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_att_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_wb_user ON wrong_book(user_id);

CREATE TABLE IF NOT EXISTS question_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS redeem_codes (
  code TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  days INTEGER NOT NULL,
  used_by INTEGER,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS real_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  qtype TEXT NOT NULL DEFAULT 'single',
  stem TEXT NOT NULL,
  opt_a TEXT NOT NULL, opt_b TEXT NOT NULL, opt_c TEXT NOT NULL, opt_d TEXT NOT NULL,
  answer TEXT NOT NULL,
  analysis TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  kp_name TEXT NOT NULL DEFAULT '',
  kp_confidence REAL NOT NULL DEFAULT 1,
  answer_disputed INTEGER NOT NULL DEFAULT 0,
  third_party_material INTEGER NOT NULL DEFAULT 0,
  UNIQUE(year, seq)
);
CREATE INDEX IF NOT EXISTS idx_rq_year ON real_questions(year);
CREATE INDEX IF NOT EXISTS idx_rq_kp ON real_questions(kp_name);

CREATE TABLE IF NOT EXISTS real_subjective (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  stem TEXT NOT NULL,
  questions TEXT NOT NULL DEFAULT '[]',
  answer_points TEXT NOT NULL DEFAULT '[]',
  kp_name TEXT NOT NULL DEFAULT '',
  kp_confidence REAL NOT NULL DEFAULT 1,
  third_party_material INTEGER NOT NULL DEFAULT 0,
  UNIQUE(year, seq)
);
CREATE INDEX IF NOT EXISTS idx_rs_year ON real_subjective(year);

CREATE TABLE IF NOT EXISTS orders (
  out_trade_no TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  plan TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_att_paper ON attempts(paper_id);
