import Anthropic from '@anthropic-ai/sdk'
import { getRecentMessages, getRecentMoods, getRecentActions } from '../db/queries.js'

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
  userName: string
  currentTime: string
  incomingMessage?: string
}

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

export async function decide(ctx: DecisionContext): Promise<Decision> {
  const recentMessages = getRecentMessages(10).reverse()
  const recentMoods = getRecentMoods(6).reverse()
  const recentActions = getRecentActions(5).reverse()

  const moodHistory = recentMoods.map(m =>
    `[${m.timestamp}] energy:${m.energy} irritation:${m.irritation} boredom:${m.boredom} interest:${m.interest} — "${m.summary}"`
  ).join('\n')

  const messageHistory = recentMessages.map(m =>
    `[${m.timestamp}] ${m.role === 'user' ? ctx.userName : 'you'}: ${m.content}`
  ).join('\n')

  const actionHistory = recentActions.map(a =>
    `[${a.timestamp}] ${a.action}${a.target ? ` → ${a.target}` : ''}`
  ).join('\n')

  const currentMood = recentMoods[recentMoods.length - 1] ?? recentMoods[0]

  const userMessage = ctx.incomingMessage
    ? `${ctx.userName} just sent you a message: "${ctx.incomingMessage}"\n\n`
    : ''

  const prompt = `${userMessage}It's ${ctx.currentTime}.

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

  const stream = await client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const response = await stream.finalMessage()

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in response')
  }

  const raw = textBlock.text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`Could not parse decision JSON: ${raw}`)

  return JSON.parse(jsonMatch[0]) as Decision
}
