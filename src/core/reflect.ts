import Anthropic from '@anthropic-ai/sdk'
import { getActiveInterests, upsertInterest, insertBrowseHistory } from '../db/queries.js'

const client = new Anthropic()

interface InterestUpdate {
  topic: string
  depth: number
  threads: string[]
  note: string
  status: 'active' | 'cooling'
}

interface ReflectionOutput {
  interests: InterestUpdate[]
  browseSummary: string
}

export async function reflect(browsedPages: Array<{ url: string; text: string }>): Promise<void> {
  if (browsedPages.length === 0) return

  const activeInterests = getActiveInterests()
  const interestContext = activeInterests.length > 0
    ? activeInterests.map(i => {
        const threads = JSON.parse(i.threads) as string[]
        return `- "${i.topic}" (depth:${i.depth}/10, ${i.status}) — ${i.note}${threads.length > 0 ? `\n  threads: ${threads.join(', ')}` : ''}`
      }).join('\n')
    : '(none yet)'

  const pagesContext = browsedPages.map(p =>
    `URL: ${p.url}\n${p.text.slice(0, 1500)}`
  ).join('\n\n---\n\n')

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You just browsed these pages:

${pagesContext}

Your current interests:
${interestContext}

Reflect honestly. What are you now more curious about? What threads do you want to follow? What are you done with?

Respond ONLY with valid JSON:
{
  "browseSummary": "one sentence — what you actually got out of this session",
  "interests": [
    {
      "topic": "short topic label",
      "depth": 1-10,
      "threads": ["specific angle to follow", "another thread"],
      "note": "what you think, where you want to go next, or why you're done",
      "status": "active" | "cooling"
    }
  ]
}

Only include interests you actually care about after this session. If something bored you, set status to "cooling" and depth low. If you want to go deeper, set depth high and name specific threads.`,
    }],
  })

  const text = response.content.find(b => b.type === 'text')?.text?.trim() ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return

  const output = JSON.parse(jsonMatch[0]) as ReflectionOutput

  // persist browse history
  for (const page of browsedPages) {
    insertBrowseHistory(page.url, output.browseSummary)
  }

  // upsert interest updates
  for (const update of output.interests) {
    upsertInterest(update.topic, update.depth, update.threads, update.note, update.status)
  }
}
