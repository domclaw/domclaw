import 'dotenv/config'
import * as net from 'net'
import * as readline from 'readline'
import { SOCKET_PATH, encode, decode } from '../ipc.js'
import { printBanner } from '../ui/banner.js'
import type { DaemonMessage } from '../ipc.js'

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

function printMood(m: DaemonMessage & { type: 'decision' }): void {
  const mood = m.moodUpdate
  console.log(`\n${DIM}┌─ mood ────────────────────────${RESET}`)
  console.log(`${DIM}│${RESET} ${moodBar('energy', mood.energy)}`)
  console.log(`${DIM}│${RESET} ${moodBar('irritation', mood.irritation)}`)
  console.log(`${DIM}│${RESET} ${moodBar('boredom', mood.boredom)}`)
  console.log(`${DIM}│${RESET} ${moodBar('interest', mood.interest)}`)
  console.log(`${DIM}│${RESET} ${GRAY}"${mood.summary}"${RESET}`)
  console.log(`${DIM}└───────────────────────────────${RESET}\n`)
}

function printHistory(messages: Extract<DaemonMessage, { type: 'history' }>['messages']): void {
  if (messages.length === 0) return
  console.log(`${DIM}── recent conversation ──────────${RESET}`)
  for (const m of messages) {
    const who = m.role === 'user' ? `${DIM}you${RESET}` : `${BOLD}domclaw${RESET}`
    console.log(`${who}: ${m.content}`)
  }
  console.log(`${DIM}─────────────────────────────────${RESET}\n`)
}

async function main(): Promise<void> {
  printBanner()

  const socket = net.createConnection(SOCKET_PATH)

  socket.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT' || err.code === 'ECONNREFUSED') {
      console.error(`${RED}daemon is not running. start it with: npm start${RESET}`)
    } else {
      console.error(`${RED}connection error: ${err.message}${RESET}`)
    }
    process.exit(1)
  })

  socket.on('connect', () => {
    console.log(`${DIM}connected to daemon${RESET}\n`)
  })

  socket.on('close', () => {
    console.log(`\n${DIM}disconnected from daemon${RESET}`)
    process.exit(0)
  })

  let buffer = ''
  socket.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const msg = decode<DaemonMessage>(line)
        handleDaemonMessage(msg)
      } catch {}
    }
  })

  function handleDaemonMessage(msg: DaemonMessage): void {
    switch (msg.type) {
      case 'history':
        printHistory(msg.messages)
        break
      case 'tick_start':
        process.stdout.write(`${DIM}thinking...${RESET}\n`)
        break
      case 'decision': {
        console.log(`${YELLOW}${BOLD}${msg.action.toUpperCase()}${RESET} ${DIM}— ${msg.reasoning}${RESET}`)
        if (msg.action === 'message' || msg.action === 'voice_memo') {
          console.log(`\n${BOLD}domclaw:${RESET} ${msg.content ?? ''}`)
        } else if (msg.action === 'ignore') {
          console.log(`\n${RED}[she read it and said nothing]${RESET}`)
        } else if (msg.action === 'browse') {
          console.log(`\n${CYAN}[browsing]${RESET}`)
        } else if (msg.action === 'buy') {
          console.log(`\n${RED}[bought something]${RESET}`)
        }
        printMood(msg)
        break
      }
      case 'error':
        console.error(`${RED}daemon error: ${msg.message}${RESET}`)
        break
    }
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY })

  const askNext = (): void => {
    rl.question(`${DIM}you: ${RESET}`, (input) => {
      const trimmed = input.trim()
      if (trimmed) {
        socket.write(encode({ type: 'message', content: trimmed }))
      }
      askNext()
    })
  }

  askNext()

  rl.on('close', () => socket.destroy())
}

main().catch(console.error)
