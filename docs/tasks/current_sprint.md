# Current Sprint: Post-Recovery — Transition to Follow-Up Sprints

**Status:** Recovery Complete — Transitioning to M9  
**Recovery Closed:** 2026-04-09  
**Next Sprint:** M9 AI Creator Workspace → [`docs/sprints/follow_up_sprints.md`](../sprints/follow_up_sprints.md)

---

## Recovery Sprint — CLOSED ✅

**Sprint Goal:** Restore repository trust: green checks, closed high-severity risks, and one accurate planning source.

**Started:** 2026-04-08  
**Closed:** 2026-04-09

### Exit Criteria — All Met ✅

| Criterion | Status |
|-----------|--------|
| `pnpm build` passes | ✅ Clean |
| `pnpm test` passes | ✅ 73/73 tests green |
| `pnpm lint` passes (typecheck) | ✅ Clean |
| High-severity security issues closed | ✅ fileService.ts sandbox validation DONE |
| One active sprint file, no contradictory status | ✅ This file |
| Working tree clean or intentionally documented | ✅ Clean |

### Priority 0: Restore Safety and Green Checks — ALL DONE ✅

| Task | Status |
|------|--------|
| Fix file sandbox validation in `fileService.ts` | ✅ DONE |
| Remove/harden unsafe AI markdown rendering | ✅ DONE |
| Fix CodeDiffView.tsx / restore pnpm build | ✅ DONE |
| Fix failing RPG quest test | ✅ DONE |
| Make lint a real gate (tsc --noEmit) | ✅ DONE |
| Stop tracking generated project data in git | ✅ DONE |

### Priority 1: Validate Core User Flows

| Task | Status | Notes |
|------|--------|-------|
| Verify AI status indicator is truthful | ✅ DONE | |
| Validate tab navigation and scene entity creation | ✅ DONE | v0.13.5 |
| Verify export flow end-to-end | 🔲 DEFERRED | Deferred to M9 — export exists but needs browser smoke test |
| Smoke-test AI Command apply/reject flow | 🔲 DEFERRED | Deferred to M9 — AI→runtime connection gap |

### Priority 2: Planning and Process Cleanup

| Task | Status |
|------|--------|
| Sync roadmap to current milestone | ✅ DONE |
| Single active sprint document | ✅ DONE |
| Move release detail to CHANGELOG.md | ✅ DONE |

### Recovery Retrospective

**What went well:**
- All quality gates restored (build, test, lint, typecheck)
- Critical security fix landed (fileService.ts path traversal)
- v0.15.0 shipped with Tower Defense genre mode
- Clean git hygiene throughout

**Deferred items carried forward:**
- Export flow end-to-end browser validation → M9
- AI Command apply/reject smoke test → M9 (AI→runtime disconnect is a strategic gap)
- These are tracked in `docs/sprints/follow_up_sprints.md` under M9 deliverables

---

## Current Work: M9 AI Creator Workspace

See [`docs/sprints/follow_up_sprints.md`](../sprints/follow_up_sprints.md) for the full post-recovery program.

**Active Task:** *(picked per run by @dev agent)*

---

**Sprint Owner:** @dev  
**Last Updated:** 2026-04-09
