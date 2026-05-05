import { join } from 'path'
import type { Decision } from './core/decide.js'
import type { Message } from './db/queries.js'

export const SOCKET_PATH = join('/tmp', 'domclaw.sock')

export type DaemonMessage =
  | { type: 'history'; messages: Message[] }
  | { type: 'tick_start' }
  | { type: 'decision'; action: string; content?: string; reasoning: string; moodUpdate: Decision['moodUpdate'] }
  | { type: 'error'; message: string }

export type ClientMessage =
  | { type: 'message'; content: string }

export function encode(msg: DaemonMessage | ClientMessage): string {
  return JSON.stringify(msg) + '\n'
}

export function decode<T>(line: string): T {
  return JSON.parse(line.trim()) as T
}
