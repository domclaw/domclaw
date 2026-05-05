import 'dotenv/config'
import cron from 'node-cron'
import { tick } from '../core/loop.js'

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'

const intervalMinutes = parseInt(process.env.LOOP_INTERVAL_MINUTES ?? '5', 10)
const cronExpr = `*/${intervalMinutes} * * * *`

console.log(`${BOLD}domclaw${RESET} ${DIM}— daemon mode${RESET}`)
console.log(`${DIM}ticking every ${intervalMinutes} minutes. she's alive.${RESET}\n`)

async function runTick(): Promise<void> {
  const now = new Date().toLocaleString('en-US', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  console.log(`${DIM}[${now}] tick${RESET}`)

  try {
    const result = await tick()
    const d = result.decision

    console.log(`${YELLOW}${BOLD}decision: ${d.action.toUpperCase()}${RESET}`)
    console.log(`${DIM}reasoning: ${d.reasoning}${RESET}`)

    if (d.action === 'message' || d.action === 'voice_memo') {
      console.log(`\n${BOLD}domclaw:${RESET} ${d.content ?? ''}`)
    } else if (d.action === 'ignore') {
      console.log(`\n${RED}[silence]${RESET}`)
    } else if (d.action === 'browse') {
      console.log(`\n${CYAN}[browsing: ${d.target ?? 'somewhere'}]${RESET}`)
    } else if (d.action === 'buy') {
      console.log(`\n${RED}[buying: ${d.target ?? 'something'}]${RESET}`)
    }

    const m = d.moodUpdate
    console.log(`${DIM}mood: energy:${m.energy} irritation:${m.irritation} boredom:${m.boredom} interest:${m.interest} — "${m.summary}"${RESET}\n`)
  } catch (err) {
    console.error('tick error:', err)
  }
}

// run immediately on start, then on schedule
runTick()
cron.schedule(cronExpr, runTick)
