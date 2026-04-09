# Current Sprint: Milestone 8 Recovery

**Sprint Goal:** Restore repository trust: green checks, closed high-severity risks, and one accurate planning source before more feature work ships.

**Started:** 2026-04-08  
**Reset:** 2026-04-09  
**Status:** Recovery mode - feature work paused until release blockers are cleared

**Source of Truth:** This is the active sprint plan. Historical release notes belong in `CHANGELOG.md`.

---

## Reality Check (2026-04-09)

| Area | Actual State | Evidence |
|------|--------------|----------|
| Build | Red | `pnpm build` fails in `@clawgame/web` due `CodeDiffView.tsx` TypeScript errors |
| Tests | Red | `pnpm test` fails in `@clawgame/web` due `rpg-systems.test.ts` quest expectation mismatch |
| Lint | Red | `pnpm lint` fails because `eslint` is referenced but not installed |
| Security | High-risk issues open | File API path validation can escape into sibling project dirs; AI markdown rendering injects raw HTML |
| Docs | Drifted | `docs/product/roadmap.md` still reports Milestone 6 while sprint docs previously claimed blockers were resolved |
| Worktree | Dirty | Active AI UI work is in progress and generated project data is present under `apps/api/data/` |

---

## Sprint Rules

- No new feature work until all Priority 0 items are complete.
- No version bump until `pnpm build`, `pnpm test`, and `pnpm lint` pass at the repository root.
- Any AI UI work must keep TypeScript green and get a browser smoke check before merge.
- Update `docs/qa/known_issues.md`, `docs/product/roadmap.md`, and `CHANGELOG.md` only after recovery work lands.

---

## Priority 0: Restore Safety and Green Checks

| Task | Status | Notes |
|------|--------|-------|
| Fix file sandbox validation in `apps/api/src/services/fileService.ts` | `TODO` | Replace prefix-based path checks with `resolve`/`relative`-safe validation |
| Remove or harden unsafe AI markdown rendering | `DONE` | Stop injecting unsanitized model output into the DOM |
| Fix CodeDiffView.tsx / restore pnpm build | `DONE` (build was already passing) | `CodeDiffView.tsx` currently breaks the web build |
| Fix failing RPG quest test | `DONE` | `pnpm test` must pass cleanly at root |
| Make lint a real gate | `DONE` (tsc --noEmit) | Install/configure ESLint or remove dead scripts; current `pnpm lint` is non-functional |
| Stop tracking generated project data in git | `DONE` | Ignore `apps/api/data/projects/` and related runtime artifacts |

---

## Priority 1: Validate Core User Flows

| Task | Status | Notes |
|------|--------|-------|
| Verify AI status indicator is truthful | `DONE` | UI must distinguish real AI, mock mode, and fallback mode clearly |
| Validate tab navigation and scene entity creation | `DONE` (v0.13.5 fixes) | Close the long-running "needs browser validation" gap |
| Verify export flow end-to-end | `TODO` | Confirm browser download and generated output work |
| Smoke-test AI Command apply/reject flow | `TODO` | Required after AI page fixes land |

---

## Priority 2: Planning and Process Cleanup

| Task | Status | Notes |
|------|--------|-------|
| Sync `docs/product/roadmap.md` to the current milestone and version | `DONE` | Do this after Priority 0 is complete so roadmap reflects reality |
| Keep a single active sprint document | `IN PROGRESS` | `docs/sprints/current_sprint.md` is being retired in favor of this file |
| Move release-by-release detail to `CHANGELOG.md` | `TODO` | Sprint file should track present tense work, not become a second changelog |

---

## Exit Criteria

- `pnpm build` passes
- `pnpm test` passes
- `pnpm lint` passes
- High-severity security issues are closed or explicitly mitigated
- One active sprint file exists with no contradictory milestone status
- Working tree is clean or any remaining WIP is intentionally documented

---

## Deferred Until Recovery Ends

- RPG UI integration
- New AI UX polish
- Visual scripting
- Settings page expansion
- Milestone reshuffling beyond doc sync

---

## Immediate Next Actions

1. Fix `fileService.ts` sandbox validation and add regression coverage.
2. Make AI response rendering safe and restore `@clawgame/web` build.
3. Make root test and lint commands pass.
4. Run browser validation on repaired AI, scene, navigation, and export flows.
5. Sync roadmap, known issues, and changelog to match the repaired state.

---

**Sprint Owner:** @dev  
**Last Updated:** 2026-04-09
