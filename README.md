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
      loop.ts          # tick — called by daemon on cron schedule
      decide.ts        # agentic LLM loop with tool use
    actions/
      message.ts       # log + persist outbound messages
      ignore.ts        # explicit do-nothing action (logged)
    tools/
      browser.ts       # puppeteer — browse any URL
    interfaces/
      daemon.ts        # npm start — autonomous cron loop
      cli.ts           # npm run cli — interactive with mood display
      onboard.ts       # first-run setup
      telegram.ts      # Phase 2
    ui/
      banner.ts        # DOMCLAW ASCII banner
    db/
      schema.sql       # SQLite schema
      client.ts        # db connection + auto-init
      queries.ts       # typed read/write helpers
    config.ts          # load/write .domclaw.json
```

---

## Setup

```bash
git clone https://github.com/domclaw/domclaw
cd domclaw
npm install
cp .env.example .env
# add your ANTHROPIC_API_KEY to .env
```

Then run her:

```bash
npm run cli     # interactive CLI — watch her reasoning in real time
npm start       # daemon mode — she runs autonomously every 5 minutes
```

First launch runs onboarding. She asks your name, her name, pronouns, intensity, and spending limit. After that she boots directly.

---

## Configuration

`.domclaw.json` is written on first run and gitignored. Edit it directly to change settings.

`.env` holds API keys only — `ANTHROPIC_API_KEY` is required, everything else is optional until you enable those features.

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
