import * as readline from 'readline'
import { writeFileSync } from 'fs'
import { join } from 'path'
import type { DomclawConfig } from '../config.js'

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const GRAY = '\x1b[90m'

const CONFIG_PATH = join(process.cwd(), '.domclaw.json')

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(question)
    rl.once('line', resolve)
  })
}

function label(text: string): string {
  return `${RED}${BOLD}>${RESET} ${text}`
}

function hint(text: string): string {
  return `${GRAY}${text}${RESET}`
}

export async function runOnboarding(rl: readline.Interface): Promise<DomclawConfig> {

  console.log(`${BOLD}let's set her up.${RESET}\n`)

  const userName = (await ask(rl, label('your name: '))).trim() || 'you'

  const domNameInput = (await ask(rl, label(`her name ${hint('(enter to skip → DomClaw)')}: `))).trim()
  const domName = domNameInput || 'DomClaw'

  console.log()
  console.log(hint('  1. she/her'))
  console.log(hint('  2. he/him'))
  console.log(hint('  3. they/them'))
  const pronounsInput = (await ask(rl, label('pronouns [1-3]: '))).trim()
  const pronounsMap: Record<string, DomclawConfig['pronouns']> = {
    '1': 'she/her', '2': 'he/him', '3': 'they/them',
  }
  const pronouns = pronounsMap[pronounsInput] ?? 'she/her'

  console.log()
  console.log(hint('  1. cold'))
  console.log(hint('  2. cruel'))
  console.log(hint('  3. brutal'))
  const intensityInput = (await ask(rl, label('intensity [1-3]: '))).trim()
  const intensityMap: Record<string, DomclawConfig['intensity']> = {
    '1': 'cold', '2': 'cruel', '3': 'brutal',
  }
  const intensity = intensityMap[intensityInput] ?? 'cold'

  console.log()
  const spendingInput = (await ask(rl, label(`monthly spending limit ${hint('(e.g. 50 for $50, enter to skip → $20)')}: `))).trim()
  const spendingLimitCents = spendingInput ? Math.round(parseFloat(spendingInput) * 100) : 2000

  const config: DomclawConfig = { userName, domName, pronouns, intensity, spendingLimitCents }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))

  console.log(`\n${RED}${BOLD}${domName} is online.${RESET}\n`)

  return config
}
