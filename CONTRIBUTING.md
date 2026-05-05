# Contributing to DomClaw

She didn't ask for your help. But she'll take it.

---

## Before you open an issue

Check if she's already ignoring the problem on purpose. A lot of "bugs" are features. Read the README. If the behavior is documented, it's intentional.

If it's actually broken: open an issue. Be specific. What did you expect, what happened, what's the stack trace.

---

## Pull requests

1. Fork the repo
2. Create a branch: `git checkout -b your-thing`
3. Make your change
4. Make sure it works: `npm run build && npm test`
5. Open a PR with a clear description of what you changed and why

Keep PRs focused. One thing at a time. Don't refactor unrelated code while fixing a bug.

---

## What's in scope

- Bug fixes
- New action types (what else can she do to you)
- Mood state improvements
- Interface additions (Discord, SMS, etc.)
- Performance work on the cron loop or SQLite layer
- Better voice/ElevenLabs integration

---

## What's out of scope

- Making her nicer
- Adding a "please respond" button
- Giving users visibility into her mood state
- Removing the ignore action
- Making spending require confirmation

These will be closed without comment.

---

## Code style

TypeScript. Strict mode. No `any`. Run `npm run lint` before pushing.

---

## Questions

Open a discussion, not an issue. Issues are for bugs and concrete proposals only.

She might not respond. That's not a bug either.
