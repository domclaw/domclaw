import { insertAction, insertMessage } from '../db/queries.js'

export function executeMessage(content: string, reasoning: string): string {
  insertMessage('domclaw', content)
  insertAction('message', null, content, reasoning)
  return content
}
