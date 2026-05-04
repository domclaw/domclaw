import db from './client.js'

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
