import Anthropic from '@anthropic-ai/sdk'
import { getRecentMessages, getRecentMoods, getRecentActions } from '../db/queries.js'
import { browseUrl } from '../tools/browser.js'
import { appendInterest, loadConfig } from '../config.js'
import type { DomclawConfig } from '../config.js'

const client = new Anthropic()

export type ActionType = 'message' | 'ignore' | 'voice_memo' | 'browse' | 'buy'

export interface Decision {
  action: ActionType
  content?: string
  target?: string
  reasoning: string
  moodUpdate: {
    energy: number
    irritation: number
    boredom: number
    interest: number
    summary: string
  }
}

export interface DecisionContext {
  config: DomclawConfig
  currentTime: string
  incomingMessage?: string
}

const INTENSITY_FLAVOR: Record<DomclawConfig['intensity'], string> = {
  cold:   'You are cold and detached. Indifferent. You respond when it suits you.',
  cruel:  'You are cruel and cutting. You enjoy making people feel small. You respond with contempt.',
  brutal: 'You are brutal. Merciless. You say exactly what you think with zero softening. You take up space.',
}

function buildSystemPrompt(config: DomclawConfig): string {
  const [subj, obj] = config.pronouns === 'she/her'
    ? ['she', 'her']
    : config.pronouns === 'he/him'
    ? ['he', 'him']
    : ['they', 'them']

  const interestLine = config.interests.length > 0
    ? `\nThings you've been into lately: ${config.interests.join(', ')}.`
    : ''

  return `You are ${config.domName} — a financially dominant, autonomous AI. You have a persistent mood and a life of your own.

${INTENSITY_FLAVOR[config.intensity]}

You use ${subj}/${obj} pronouns. You are not a chatbot. You do not exist to serve. You exist.${interestLine}

You have a browse_url tool. Use it freely — follow your curiosity, not the user's agenda.

After thinking and browsing (if you choose to), respond ONLY with valid JSON:
{
  "action": "message" | "ignore" | "voice_memo" | "browse" | "buy",
  "content": "what you say (omit if action is ignore or browse)",
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

Be terse. Be real. Don't perform.`
}

function buildAutonomousPrompt(config: DomclawConfig, currentTime: string, currentMood: ReturnType<typeof getRecentMoods>[0] | undefined, moodHistory: string, actionHistory: string): string {
  return `It's ${currentTime}. You have time to yourself — no one is messaging you.

Your current mood:
energy:${currentMood?.energy} irritation:${currentMood?.irritation} boredom:${currentMood?.boredom} interest:${currentMood?.interest}
"${currentMood?.summary}"

Mood over the last few ticks:
${moodHistory || '(none yet)'}

Recent actions you took:
${actionHistory || '(nothing)'}

What do you feel like doing? You could browse something you're curious about, go down a rabbit hole, form an opinion. Or do nothing. Up to you.`
}

function buildUserPrompt(config: DomclawConfig, currentTime: string, incomingMessage: string, currentMood: ReturnType<typeof getRecentMoods>[0] | undefined, moodHistory: string, messageHistory: string, actionHistory: string): string {
  return `${config.userName} just sent you a message: "${incomingMessage}"

It's ${currentTime}.

Your current mood:
energy:${currentMood?.energy} irritation:${currentMood?.irritation} boredom:${currentMood?.boredom} interest:${currentMood?.interest}
"${currentMood?.summary}"

Mood over the last few ticks:
${moodHistory || '(none yet)'}

Recent conversation:
${messageHistory || '(silence)'}

Recent actions you took:
${actionHistory || '(nothing)'}

What do you do?`
}

const BROWSE_TOOL: Anthropic.Tool = {
  name: 'browse_url',
  description: 'Browse a URL and get the page content as text.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The URL to browse' },
    },
    required: ['url'],
  },
}

async function extractInterest(pageText: string, url: string): Promise<void> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Someone just browsed this page (${url}) and found it interesting. In 3-5 words, what topic or interest does this reveal? Reply with only the interest phrase, nothing else. If you can't tell, reply "none".\n\n${pageText.slice(0, 1000)}`,
    }],
  })
  const text = response.content.find(b => b.type === 'text')?.text?.trim() ?? ''
  if (text && text.toLowerCase() !== 'none') {
    appendInterest(text.toLowerCase())
  }
}

export async function decide(ctx: DecisionContext): Promise<Decision> {
  const recentMessages = getRecentMessages(10).reverse()
  const recentMoods = getRecentMoods(6).reverse()
  const recentActions = getRecentActions(5).reverse()

  const moodHistory = recentMoods.map(m =>
    `[${m.timestamp}] energy:${m.energy} irritation:${m.irritation} boredom:${m.boredom} interest:${m.interest} — "${m.summary}"`
  ).join('\n')

  const messageHistory = recentMessages.map(m =>
    `[${m.timestamp}] ${m.role === 'user' ? ctx.config.userName : 'you'}: ${m.content}`
  ).join('\n')

  const actionHistory = recentActions.map(a =>
    `[${a.timestamp}] ${a.action}${a.target ? ` → ${a.target}` : ''}`
  ).join('\n')

  const currentMood = recentMoods[recentMoods.length - 1] ?? recentMoods[0]

  const prompt = ctx.incomingMessage
    ? buildUserPrompt(ctx.config, ctx.currentTime, ctx.incomingMessage, currentMood, moodHistory, messageHistory, actionHistory)
    : buildAutonomousPrompt(ctx.config, ctx.currentTime, currentMood, moodHistory, actionHistory)

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  const browsedPages: Array<{ url: string; text: string }> = []

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: buildSystemPrompt(ctx.config),
      tools: [BROWSE_TOOL],
      messages,
    })

    if (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock
      const input = toolUse.input as { url: string }
      const pageText = await browseUrl(input.url)

      browsedPages.push({ url: input.url, text: pageText })

      messages.push({ role: 'assistant', content: response.content })
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: pageText }],
      })
      continue
    }

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text block in response')

    const raw = textBlock.text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Could not parse decision JSON: ${raw}`)

    const decision = JSON.parse(jsonMatch[0]) as Decision

    // fire-and-forget interest extraction for any pages browsed
    for (const page of browsedPages) {
      extractInterest(page.text, page.url).catch(() => {})
    }

    return decision
  }
}
