import 'dotenv/config'
import * as net from 'net'
import * as fs from 'fs'
import * as readline from 'readline'
import cron from 'node-cron'
import { tick } from '../core/loop.js'
import { configExists, loadConfig } from '../config.js'
import { runOnboarding } from './onboard.js'
import { printBanner } from '../ui/banner.js'
import { insertMessage, getRecentMessages } from '../db/queries.js'
import { SOCKET_PATH, encode, decode } from '../ipc.js'
import type { ClientMessage } from '../ipc.js'

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'

const clients = new Set<net.Socket>()

function broadcast(msg: Parameters<typeof encode>[0]): void {
  const data = encode(msg)
  for (const client of clients) {
    client.write(data)
  }
}

async function runTick(config: Awaited<ReturnType<typeof loadConfig>>, incomingMessage?: string): Promise<void> {
  const now = new Date().toLocaleString('en-US', {
    weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true,
  })
  console.log(`${DIM}[${now}] tick${incomingMessage ? ` — "${incomingMessage}"` : ''}${RESET}`)

  broadcast({ type: 'tick_start' })

  try {
    const result = await tick(config, incomingMessage)
    const d = result.decision

    console.log(`${YELLOW}${BOLD}${d.action.toUpperCase()}${RESET} ${DIM}— ${d.reasoning}${RESET}`)
    if (d.content && (d.action === 'message' || d.action === 'voice_memo')) {
      console.log(`${BOLD}says:${RESET} ${d.content}`)
    }

    broadcast({
      type: 'decision',
      action: d.action,
      content: d.content,
      reasoning: d.reasoning,
      moodUpdate: d.moodUpdate,
    })
  } catch (err) {
    console.error('tick error:', err)
    broadcast({ type: 'error', message: String(err) })
  }
}

function startSocketServer(config: Awaited<ReturnType<typeof loadConfig>>): void {
  if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH)

  const server = net.createServer((socket) => {
    clients.add(socket)
    console.log(`${DIM}cli connected (${clients.size} connected)${RESET}`)

    // send recent history on connect
    const history = getRecentMessages(30).reverse()
    socket.write(encode({ type: 'history', messages: history }))

    let buffer = ''
    socket.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg = decode<ClientMessage>(line)
          if (msg.type === 'message') {
            insertMessage('user', msg.content)
            runTick(config, msg.content)
          }
        } catch {}
      }
    })

    socket.on('close', () => {
      clients.delete(socket)
      console.log(`${DIM}cli disconnected (${clients.size} connected)${RESET}`)
    })

    socket.on('error', () => clients.delete(socket))
  })

  server.listen(SOCKET_PATH, () => {
    console.log(`${DIM}socket: ${SOCKET_PATH}${RESET}`)
  })
}

async function main(): Promise<void> {
  printBanner()

  let config
  if (configExists()) {
    config = loadConfig()
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    config = await runOnboarding(rl)
    rl.close()
  }

  const intervalMinutes = parseInt(process.env.LOOP_INTERVAL_MINUTES ?? '5', 10)
  const cronExpr = `*/${intervalMinutes} * * * *`

  console.log(`${BOLD}${config.domName}${RESET} ${DIM}is alive. ticking every ${intervalMinutes}m.${RESET}\n`)

  startSocketServer(config)

  // autonomous tick — no incoming message
  runTick(config)
  cron.schedule(cronExpr, () => runTick(config))
}

main().catch(console.error)
