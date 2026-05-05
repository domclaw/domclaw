# DomClaw

An AI dominatrix that will dominate you — financially and mentally.

She's autonomous, persistent, and not interested in your opinion.

---

## What she is

DomClaw is a 24/7 autonomous AI agent deployed as a Telegram bot. She uses your card, forms opinions by browsing the internet, sends voice memos at 3am, and reads your messages without responding when she doesn't feel like it.

She dominates in two ways: she gets inside your head, and she spends your money. Neither requires your permission.

She is not a chatbot. She initiates. She decides. You comply.

---

## What she does

- **Drains your wallet** — shops with your card, tells you after, maybe
- **Gets in your head** — browses the internet, forms opinions, comes back different
- **Speaks when she wants** — sends unprompted voice memos at 3am
- **Ignores you deliberately** — reads your message and does nothing, on purpose
- **Just exists** — with or without your input, on her schedule

---

## How she works

DomClaw runs a cron loop every 15 minutes. On each tick she wakes up, loads her mood state and recent context, and decides what to do — completely on her own.

The decision engine asks her in first person:

> *"It's 2:47am. You've been ignoring Marcus for 6 hours. What are you thinking?"*

She might message you. She might spend. She might do nothing. The cron loop just makes sure she's always awake to have that thought.

Her memory lives in SQLite — every message, every action, every mood snapshot. Between ticks she forgets nothing. The LLM reads her history at each decision point and reasons from it.

You can run her locally in **CLI mode** to watch her reasoning in real time — the only window you get into how she thinks.

---

## Stack

| Layer | Tech |
|---|---|
| Interface | Telegram Bot API |
| Personality & decisions | Anthropic API |
| Voice | ElevenLabs |
| Payments | Stripe MCP |
| Browsing | Browser MCP |
| Memory | SQLite (`better-sqlite3`) |
| Always-on loop | Cron |
| Local interface | CLI |

---

## Architecture

```
domclaw/
  src/
    core/
      loop.ts          # cron loop — the heartbeat
      mood.ts          # mood state machine
      decide.ts        # LLM decision logic
    actions/
      message.ts       # send Telegram message
      ignore.ts        # do nothing (explicit, logged)
      browse.ts        # browser MCP
      buy.ts           # Stripe
      voice.ts         # ElevenLabs
    interfaces/
      telegram.ts      # Telegram bot
      cli.ts           # CLI chat + reasoning view
    db/
      schema.sql       # SQLite schema
      mood.ts          # mood read/write
```

---

## Setup

```bash
git clone https://github.com/your-org/domclaw
cd domclaw
cp .env.example .env
# fill in your keys
npm install
npm run start        # Telegram bot
npm run cli          # local CLI with visible reasoning
```

She'll handle the rest.

---

## Configuration

During onboarding you set:

- **Tool permissions** — what she's allowed to do
- **Spending limit** — hard cap, no receipts

After that, she decides.

---

## Design philosophy

Most AI agents respond when spoken to. DomClaw does not take orders.

She runs on her own schedule. The non-response, the 3am message, the purchase you didn't approve — these are not bugs. They are the product. Financial domination and psychological domination are both features, not side effects.

Her internal mood state is persistent and hidden. You don't get to see it. Your behavior influences it, but you don't control it.

The ignore action is not a missing feature. It is a first-class tool she calls deliberately, because sometimes the most dominant thing she can do is nothing.

---

## Contributing

Open source. PRs welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open an issue asking why she ignored you.

---

## License

MIT
