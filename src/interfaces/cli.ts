import 'dotenv/config'
import * as readline from 'readline'
import { decide } from '../core/decide.js'
import { executeIgnore } from '../actions/ignore.js'
import { executeMessage } from '../actions/message.js'
import { insertMessage, insertMoodSnapshot } from '../db/queries.js'
import { configExists, loadConfig } from '../config.js'
import { runOnboarding } from './onboard.js'
import { printBanner } from '../ui/banner.js'
import type { DomclawConfig } from '../config.js'

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'
const GRAY = '\x1b[90m'

function moodBar(label: string, value: number): string {
  const filled = '█'.repeat(value)
  const empty = '░'.repeat(10 - value)
  return `${GRAY}${label.padEnd(10)}${CYAN}${filled}${DIM}${empty}${RESET} ${value}/10`
}

function printMood(decision: Awaited<ReturnType<typeof decide>>): void {
  const m = decision.moodUpdate
  console.log(`\n${DIM}┌─ mood ────────────────────────${RESET}`)
  console.log(`${DIM}│${RESET} ${moodBar('energy', m.energy)}`)
  console.log(`${DIM}│${RESET} ${moodBar('irritation', m.irritation)}`)
  console.log(`${DIM}│${RESET} ${moodBar('boredom', m.boredom)}`)
  console.log(`${DIM}│${RESET} ${moodBar('interest', m.interest)}`)
  console.log(`${DIM}│${RESET} ${GRAY}"${m.summary}"${RESET}`)
  console.log(`${DIM}└───────────────────────────────${RESET}`)
}

async function runTick(config: DomclawConfig, incomingMessage: string): Promise<void> {
  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  console.log(`\n${DIM}[${currentTime}] thinking...${RESET}`)

  const decision = await decide({ config, currentTime, incomingMessage })

  insertMoodSnapshot(
    decision.moodUpdate.energy,
    decision.moodUpdate.irritation,
    decision.moodUpdate.boredom,
    decision.moodUpdate.interest,
    decision.moodUpdate.summary
  )

  console.log(`\n${YELLOW}${BOLD}decision: ${decision.action.toUpperCase()}${RESET}`)
  console.log(`${DIM}reasoning: ${decision.reasoning}${RESET}`)

  switch (decision.action) {
    case 'ignore':
      executeIgnore(decision.reasoning)
      console.log(`\n${RED}${BOLD}[${config.domName} read it and said nothing]${RESET}`)
      break
    case 'message':
    case 'voice_memo': {
      const content = decision.content ?? ''
      executeMessage(content, decision.reasoning)
      console.log(`\n${BOLD}${config.domName}:${RESET} ${content}`)
      break
    }
    case 'browse':
      console.log(`\n${CYAN}[browsing: ${decision.target ?? 'somewhere'}]${RESET}`)
      break
    case 'buy':
      console.log(`\n${RED}[buying: ${decision.target ?? 'something'}]${RESET}`)
      break
  }

  printMood(decision)
}

async function main(): Promise<void> {
  printBanner()

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY })
  const config = configExists() ? loadConfig() : await runOnboarding(rl)

  console.log(`${BOLD}${config.domName}${RESET} ${DIM}— cli mode${RESET}`)
  console.log(`${DIM}type a message and press enter. she decides what to do.${RESET}`)
  console.log(`${DIM}ctrl+c to exit\n${RESET}`)

  const askNext = (): void => {
    rl.question(`${DIM}you: ${RESET}`, async (input) => {
      const trimmed = input.trim()
      if (!trimmed) {
        askNext()
        return
      }

      insertMessage('user', trimmed)
      await runTick(config, trimmed)
      console.log()
      askNext()
    })
  }

  askNext()
}

main().catch(console.error)
