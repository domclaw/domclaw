import db from './client.js'

export interface BrowseHistoryEntry {
  id: number
  url: string
  summary: string
  timestamp: string
}

export interface Interest {
  id: number
  topic: string
  depth: number
  threads: string
  note: string
  status: 'active' | 'cooling' | 'dead'
  last_engaged: string
  created_at: string
}

export interface Message {
  id: number
  role: 'user' | 'domclaw'
  content: string
  timestamp: string
}

export interface Action {
  id: number
  action: string
  target: string | null
  payload: string | null
  reasoning: string | null
  timestamp: string
}

export interface MoodSnapshot {
  id: number
  energy: number
  irritation: number
  boredom: number
  interest: number
  summary: string
  timestamp: string
}

export function getRecentMessages(limit = 20): Message[] {
  return db.prepare(`
    SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?
  `).all(limit) as Message[]
}

export function insertMessage(role: 'user' | 'domclaw', content: string): void {
  db.prepare(`
    INSERT INTO messages (role, content) VALUES (?, ?)
  `).run(role, content)
}

export function getRecentActions(limit = 10): Action[] {
  return db.prepare(`
    SELECT * FROM actions ORDER BY timestamp DESC LIMIT ?
  `).all(limit) as Action[]
}

export function insertAction(
  action: string,
  target: string | null,
  payload: string | null,
  reasoning: string | null
): void {
  db.prepare(`
    INSERT INTO actions (action, target, payload, reasoning) VALUES (?, ?, ?, ?)
  `).run(action, target, payload, reasoning)
}

export function getLatestMood(): MoodSnapshot {
  return db.prepare(`
    SELECT * FROM mood_snapshots ORDER BY timestamp DESC LIMIT 1
  `).get() as MoodSnapshot
}

export function getRecentMoods(limit = 6): MoodSnapshot[] {
  return db.prepare(`
    SELECT * FROM mood_snapshots ORDER BY timestamp DESC LIMIT ?
  `).all(limit) as MoodSnapshot[]
}

export function insertBrowseHistory(url: string, summary: string): void {
  db.prepare(`INSERT INTO browse_history (url, summary) VALUES (?, ?)`).run(url, summary)
}

export function getRecentBrowseHistory(limit = 10): BrowseHistoryEntry[] {
  return db.prepare(`SELECT * FROM browse_history ORDER BY timestamp DESC LIMIT ?`).all(limit) as BrowseHistoryEntry[]
}

export function getActiveInterests(): Interest[] {
  return db.prepare(`SELECT * FROM interests WHERE status != 'dead' ORDER BY depth DESC, last_engaged DESC`).all() as Interest[]
}

export function upsertInterest(topic: string, depth: number, threads: string[], note: string, status: 'active' | 'cooling'): void {
  db.prepare(`
    INSERT INTO interests (topic, depth, threads, note, status, last_engaged)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(topic) DO UPDATE SET
      depth = excluded.depth,
      threads = excluded.threads,
      note = excluded.note,
      status = excluded.status,
      last_engaged = datetime('now')
  `).run(topic, depth, JSON.stringify(threads), note, status)
}

export function decayInterests(): void {
  // decay depth by 1 for anything not engaged this tick
  db.prepare(`
    UPDATE interests
    SET depth = depth - 1,
        status = CASE WHEN depth - 1 <= 0 THEN 'dead' WHEN depth - 1 <= 3 THEN 'cooling' ELSE 'active' END
    WHERE last_engaged < datetime('now', '-4 minutes')
  `).run()
}

export function insertMoodSnapshot(
  energy: number,
  irritation: number,
  boredom: number,
  interest: number,
  summary: string
): void {
  db.prepare(`
    INSERT INTO mood_snapshots (energy, irritation, boredom, interest, summary) VALUES (?, ?, ?, ?, ?)
  `).run(energy, irritation, boredom, interest, summary)
}
