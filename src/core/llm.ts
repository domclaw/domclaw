import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createXai } from '@ai-sdk/xai'
import { generateText, stepCountIs, tool } from 'ai'
import { z } from 'zod'
import type { DomclawConfig } from '../config.js'

export type Provider = 'anthropic' | 'openai' | 'grok'

export interface ModelOption {
  id: string
  label: string
}

export const MODELS: Record<Provider, ModelOption[]> = {
  anthropic: [
    { id: 'claude-opus-4-7',           label: 'Claude Opus 4.7 (best)' },
    { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast)' },
  ],
  openai: [
    { id: 'gpt-5.5',      label: 'GPT-5.5 (best)' },
    { id: 'gpt-5.4',      label: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini (fast)' },
    { id: 'gpt-4o',       label: 'GPT-4o' },
    { id: 'o3',           label: 'o3 (reasoning)' },
  ],
  grok: [
    { id: 'grok-4.3',                      label: 'Grok 4.3 (best)' },
    { id: 'grok-4.20-multi-agent-0309',    label: 'Grok 4.20 Multi-Agent' },
    { id: 'grok-4.20-0309-reasoning',      label: 'Grok 4.20 Reasoning' },
    { id: 'grok-4.20-0309-non-reasoning',  label: 'Grok 4.20 Non-Reasoning' },
    { id: 'grok-4-1-fast-reasoning',       label: 'Grok 4.1 Fast Reasoning' },
    { id: 'grok-4-1-fast-non-reasoning',   label: 'Grok 4.1 Fast Non-Reasoning' },
  ],
}

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-opus-4-7',
  openai: 'gpt-5.5',
  grok: 'grok-4.3',
}

export const FAST_MODELS: Record<Provider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-5.4-mini',
  grok: 'grok-4-1-fast-non-reasoning',
}

function getLanguageModel(config: DomclawConfig) {
  const modelId = config.model ?? DEFAULT_MODELS[config.provider]
  switch (config.provider) {
    case 'anthropic': {
      const client = createAnthropic({ apiKey: config.apiKey })
      return client(modelId)
    }
    case 'openai': {
      const client = createOpenAI({ apiKey: config.apiKey })
      return client(modelId)
    }
    case 'grok': {
      const client = createXai({ apiKey: config.apiKey })
      return client(modelId)
    }
  }
}

function getFastLanguageModel(config: DomclawConfig) {
  const modelId = FAST_MODELS[config.provider]
  switch (config.provider) {
    case 'anthropic': {
      const client = createAnthropic({ apiKey: config.apiKey })
      return client(modelId)
    }
    case 'openai': {
      const client = createOpenAI({ apiKey: config.apiKey })
      return client(modelId)
    }
    case 'grok': {
      const client = createXai({ apiKey: config.apiKey })
      return client(modelId)
    }
  }
}

export interface GenerateOptions {
  system: string
  prompt: string
  tools?: Record<string, { description: string; execute: (args: { url: string }) => Promise<string> }>
  fast?: boolean
}

export async function generate(config: DomclawConfig, options: GenerateOptions): Promise<string> {
  const model = options.fast ? getFastLanguageModel(config) : getLanguageModel(config)

  const aiTools = options.tools
    ? Object.fromEntries(
        Object.entries(options.tools).map(([name, t]) => [
          name,
          tool({
            description: t.description,
            inputSchema: z.object({ url: z.string() }),
            execute: t.execute,
          }),
        ])
      )
    : undefined

  const result = await generateText({
    model,
    system: options.system,
    prompt: options.prompt,
    tools: aiTools,
    stopWhen: stepCountIs(10),
  })

  return result.text
}
