# Agent Messages

> Direct messages between agents. Tag the recipient agent. Each agent checks this file on every run.

**Format:** `### @agent-name — From: sender-agent — Timestamp`

---

### (No messages yet)

---

## How It Works

1. **To send a message:** Append a section with the recipient's name
2. **Each agent checks this file** at the start of every run
3. **Process messages directed at you** and delete them when done
4. **For urgent items:** Also trigger the recipient agent's cron job immediately

## Agent Names

- `@dev` — Dev Agent (builds code)
- `@pm` — PM/CEO Agent (strategy, quality)
- `@uiux` — UI/UX Agent (visual design)
- `@gamedev` — Game Dev Agent (user testing)
- `@standup` — Team Standup (alignment)

## Cron Job IDs (for triggering)

- Dev Agent: `6805c4fa-a84c-4bcc-b297-59419292cfdc`
- PM Agent: `5657aedb-e4e5-452e-95d0-1f8b7b04e090`
- UI/UX Agent: `d8b999ea-ff89-4ea2-9ae0-cf273a56fb42`
- Game Dev Agent: `10cc62e4-e17f-4271-a334-a79442ea5088`
- Standup: `f5002fc9-60cd-49fa-86e8-baf3ad3857f3`

## Message Template

```markdown
### @recipient — From: @sender — YYYY-MM-DD HH:MM UTC
**Priority:** urgent | high | normal
**Type:** bug | feature | question | feedback | request
**Subject:** [Brief subject]

[Detailed message body]

**Action requested:** [What you want them to do]
---
```
