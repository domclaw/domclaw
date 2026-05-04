CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('user', 'domclaw')),
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target TEXT,
  payload TEXT,
  reasoning TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mood_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  energy INTEGER NOT NULL CHECK(energy BETWEEN 1 AND 10),
  irritation INTEGER NOT NULL CHECK(irritation BETWEEN 1 AND 10),
  boredom INTEGER NOT NULL CHECK(boredom BETWEEN 1 AND 10),
  interest INTEGER NOT NULL CHECK(interest BETWEEN 1 AND 10),
  summary TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- seed initial mood
INSERT OR IGNORE INTO mood_snapshots (id, energy, irritation, boredom, interest, summary)
VALUES (1, 5, 3, 6, 4, 'Just woke up. Nothing interesting yet.');
