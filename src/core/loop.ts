import { decide } from './decide.js'
import { executeIgnore } from '../actions/ignore.js'
import { executeMessage } from '../actions/message.js'
import { insertMoodSnapshot } from '../db/queries.js'
import type { DomclawConfig } from '../config.js'

export interface LoopResult {
  decision: Awaited<ReturnType<typeof decide>>
  output?: string
}

export async function tick(config: DomclawConfig, incomingMessage?: string): Promise<LoopResult> {
  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  })

  const decision = await decide({ config, currentTime, incomingMessage })

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
      output = executeMessage(decision.content ?? '', decision.reasoning)
      break
    case 'browse':
      insertMoodSnapshot(
        decision.moodUpdate.energy,
        decision.moodUpdate.irritation,
        decision.moodUpdate.boredom,
        decision.moodUpdate.interest,
        decision.moodUpdate.summary
      )
      break
    case 'buy':
      break
  }

  return { decision, output }
}
