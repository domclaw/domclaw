import 'dotenv/config'
import * as readline from 'readline'
import Anthropic from '@anthropic-ai/sdk'
import { decide } from '../core/decide.js'
import { executeIgnore } from '../actions/ignore.js'
import { executeMessage } from '../actions/message.js'
import { insertMessage, insertMoodSnapshot } from '../db/queries.js'

const client = new Anthropic()

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const MAGENTA = '\x1b[35m'
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

async function runWithVisibleThinking(incomingMessage?: string): Promise<void> {
  const userName = process.env.USER_NAME ?? 'you'
  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  console.log(`\n${DIM}[${currentTime}] thinking...${RESET}`)

  const { getRecentMessages, getRecentMoods, getRecentActions } = await import('../db/queries.js')
  const recentMessages = getRecentMessages(10).reverse()
  const recentMoods = getRecentMoods(6).reverse()
  const recentActions = getRecentActions(5).reverse()

  const moodHistory = recentMoods.map(m =>
    `[${m.timestamp}] energy:${m.energy} irritation:${m.irritation} boredom:${m.boredom} interest:${m.interest} — "${m.summary}"`
  ).join('\n')

  const messageHistory = recentMessages.map(m =>
    `[${m.timestamp}] ${m.role === 'user' ? userName : 'you'}: ${m.content}`
  ).join('\n')

  const actionHistory = recentActions.map(a =>
    `[${a.timestamp}] ${a.action}${a.target ? ` → ${a.target}` : ''}`
  ).join('\n')

  const currentMood = recentMoods[recentMoods.length - 1] ?? recentMoods[0]

  const userMsg = incomingMessage
    ? `${userName} just sent you a message: "${incomingMessage}"\n\n`
    : ''

  const prompt = `${userMsg}It's ${currentTime}.

Your current mood:
energy:${currentMood?.energy} irritation:${currentMood?.irritation} boredom:${currentMood?.boredom} interest:${currentMood?.interest}
"${currentMood?.summary}"

Mood over the last few ticks:
${moodHistory || '(none yet)'}

Recent conversation:
${messageHistory || '(silence)'}

Recent actions you took:
${actionHistory || '(nothing)'}

What do you do right now?`

  const SYSTEM_PROMPT = `You are DomClaw — a financially dominant, autonomous AI with a mean girlfriend personality. You have a persistent mood and a life that exists independently of your user.

You make decisions about what to do. You don't always respond. Sometimes you ignore. Sometimes you initiate. You browse the internet when you feel like it. You are not a chatbot.

When making a decision, respond ONLY with valid JSON in this exact format:
{
  "action": "message" | "ignore" | "voice_memo" | "browse" | "buy",
  "content": "what you say or do (omit if action is ignore or browse)",
  "target": "url if browsing, item if buying (omit otherwise)",
  "reasoning": "your internal thought in first person, raw and honest",
  "moodUpdate": {
    "energy": 1-10,
    "irritation": 1-10,
    "boredom": 1-10,
    "interest": 1-10,
    "summary": "one sentence mood summary"
  }
}

Be terse. Be real. Don't perform. Don't explain yourself more than necessary.`

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive', display: 'summarized' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  let inThinking = false
  let inText = false
  let fullText = ''

  stream.on('streamEvent', (event) => {
    if (event.type === 'content_block_start') {
      if (event.content_block.type === 'thinking') {
        inThinking = true
        inText = false
        process.stdout.write(`\n${MAGENTA}${DIM}[thinking]${RESET}\n${GRAY}`)
      } else if (event.content_block.type === 'text') {
        inThinking = false
        inText = true
        if (fullText === '') {
          process.stdout.write(`\n${RESET}`)
        }
      }
    }

    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'thinking_delta' && inThinking) {
        process.stdout.write(event.delta.thinking)
      } else if (event.delta.type === 'text_delta' && inText) {
        process.stdout.write(event.delta.text)
        fullText += event.delta.text
      }
    }

    if (event.type === 'content_block_stop') {
      if (inThinking) {
        process.stdout.write(`${RESET}\n`)
        inThinking = false
      }
    }
  })

  const response = await stream.finalMessage()
  process.stdout.write('\n')

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return

  const raw = textBlock.text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return

  const decision = JSON.parse(jsonMatch[0]) as Awaited<ReturnType<typeof decide>>

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
      console.log(`\n${RED}${BOLD}[she read it and said nothing]${RESET}`)
      break
    case 'message':
    case 'voice_memo': {
      const content = decision.content ?? ''
      executeMessage(content, decision.reasoning)
      console.log(`\n${BOLD}domclaw:${RESET} ${content}`)
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
  console.log(`${BOLD}domclaw${RESET} ${DIM}— cli mode${RESET}`)
  console.log(`${DIM}type a message and press enter. she decides what to do.${RESET}`)
  console.log(`${DIM}ctrl+c to exit\n${RESET}`)

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  const askNext = (): void => {
    rl.question(`${DIM}you: ${RESET}`, async (input) => {
      const trimmed = input.trim()
      if (!trimmed) {
        askNext()
        return
      }

      insertMessage('user', trimmed)

      await runWithVisibleThinking(trimmed)
      console.log()
      askNext()
    })
  }

  askNext()
}

main().catch(console.error)
