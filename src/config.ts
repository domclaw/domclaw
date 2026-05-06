import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Provider } from './core/llm.js'

const CONFIG_PATH = join(process.cwd(), '.domclaw.json')

export interface DomclawConfig {
  userName: string
  domName: string
  pronouns: 'she/her' | 'he/him' | 'they/them'
  intensity: 'cold' | 'cruel' | 'brutal'
  spendingLimitCents: number
  userGender: 'male' | 'female' | 'unspecified'
  provider: Provider
  apiKey: string
  model?: string
}

export function configExists(): boolean {
  return existsSync(CONFIG_PATH)
}

export function loadConfig(): DomclawConfig {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as DomclawConfig
}

export function writeConfig(config: DomclawConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}
