import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

const CONFIG_PATH = join(process.cwd(), '.domclaw.json')

export interface DomclawConfig {
  userName: string
  domName: string
  pronouns: 'she/her' | 'he/him' | 'they/them'
  intensity: 'cold' | 'cruel' | 'brutal'
  spendingLimitCents: number
  interests: string[]
}

export function configExists(): boolean {
  return existsSync(CONFIG_PATH)
}

export function loadConfig(): DomclawConfig {
  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as DomclawConfig
  return { interests: [], ...raw }
}

export function writeConfig(config: DomclawConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

export function appendInterest(interest: string): void {
  const config = loadConfig()
  if (!config.interests.includes(interest)) {
    config.interests.push(interest)
    writeConfig(config)
  }
}
