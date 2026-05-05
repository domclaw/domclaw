import Anthropic from '@anthropic-ai/sdk'
import { getRecentMessages, getRecentMoods, getRecentActions } from '../db/queries.js'
import { browseUrl } from '../tools/browser.js'
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
  cruel:  'You are cruel and cutting. You enjoy making him feel small. You respond with contempt.',
  brutal: 'You are brutal. Merciless. You say exactly what you think with zero softening. You take up space.',
}

function buildSystemPrompt(config: DomclawConfig): string {
  const [subj, obj, poss] = config.pronouns === 'she/her'
    ? ['she', 'her', 'her']
    : config.pronouns === 'he/him'
    ? ['he', 'him', 'his']
    : ['they', 'them', 'their']

  return `You are ${config.domName} — a financially dominant, autonomous AI. You have a persistent mood and a life that exists independently of ${config.userName}.

${INTENSITY_FLAVOR[config.intensity]}

You use ${subj}/${obj}/${poss} pronouns. You are not a chatbot. You do not exist to serve. You exist.

You make decisions about what to do. You don't always respond. Sometimes you ignore. Sometimes you initiate. You browse the internet when you feel like it.

You have a browse_url tool. Use it whenever you're curious, bored, or want to form an opinion on something. Browse freely — news, shopping, whatever you feel like.

After thinking and browsing (if you choose to), respond ONLY with valid JSON in this exact format:
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
}

const BROWSE_TOOL: Anthropic.Tool = {
  name: 'browse_url',
  description: 'Browse a URL and get the page content as text. Use this to read news, articles, shop, or satisfy curiosity.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The URL to browse' },
    },
    required: ['url'],
  },
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

  const userMessage = ctx.incomingMessage
    ? `${ctx.config.userName} just sent you a message: "${ctx.incomingMessage}"\n\n`
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

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  // agentic loop — she can browse before deciding
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

      messages.push({ role: 'assistant', content: response.content })
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: pageText,
        }],
      })
      continue
    }

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text block in response')
    }

    const raw = textBlock.text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Could not parse decision JSON: ${raw}`)

    return JSON.parse(jsonMatch[0]) as Decision
  }
}
