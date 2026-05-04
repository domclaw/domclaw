import { decide } from './decide.js'
import { executeIgnore } from '../actions/ignore.js'
import { executeMessage } from '../actions/message.js'
import { insertMoodSnapshot } from '../db/queries.js'

export interface LoopResult {
  decision: Awaited<ReturnType<typeof decide>>
  output?: string
}

export async function tick(incomingMessage?: string): Promise<LoopResult> {
  const userName = process.env.USER_NAME ?? 'you'
  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  })

  const decision = await decide({ userName, currentTime, incomingMessage })

  insertMoodSnapshot(
    decision.moodUpdate.energy,
    decision.moodUpdate.irritation,
    decision.moodUpdate.boredom,
    decision.moodUpdate.interest,
    decision.moodUpdate.summary
  )

  let output: string | undefined

  switch (decision.action) {
    case 'ignore':
      executeIgnore(decision.reasoning)
      break
    case 'message':
      output = executeMessage(decision.content ?? '', decision.reasoning)
      break
    case 'voice_memo':
      // ElevenLabs — Phase 3
      output = executeMessage(decision.content ?? '', decision.reasoning)
      break
    case 'browse':
      // Browser MCP — Phase 2
      insertMoodSnapshot(
        decision.moodUpdate.energy,
        decision.moodUpdate.irritation,
        decision.moodUpdate.boredom,
        decision.moodUpdate.interest,
        decision.moodUpdate.summary
      )
      break
    case 'buy':
      // Stripe MCP — Phase 3
      break
  }

  return { decision, output }
}
