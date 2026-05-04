import { insertAction } from '../db/queries.js'

export function executeIgnore(reasoning: string): void {
  insertAction('ignore', null, null, reasoning)
}
