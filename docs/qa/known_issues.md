# Known Issues

> Track issues discovered during development.

**Last Updated:** 2026-04-10 07:49 UTC

---

## Active Issues

### 🟡 Medium Priority

| Issue | Description | Discovered | Impact | Workaround |
|-------|-------------|------------|--------|------------|
| AI service misleading status | AI Command shows "Connected to: clawgame-ai / glm-4.5-flash" on welcome screen, but generation falls back to templates with "⚠️ AI service offline — using local code generation". Users don't know if real AI is actually working. | 2026-04-09 (Game Dev) | Medium - Falls back to functional templates but confusing UX | Set `USE_REAL_AI=1` in API environment to verify real AI is active |
| Game canvas visual rendering | Game Preview shows entities but no visible sprites. Canvas is dark and hard to tell what's happening during gameplay. | 2026-04-09 (Game Dev) | Medium - Game runs but visual feedback is poor | Entities have colored rectangles as fallback; add sprite images to assets |

### 🟢 Low Priority

| Issue | Description | Discovered | Impact | Workaround |
|-------|-------------|------------|--------|------------|
| AICommandPage too large | AICommandPage.tsx is 454 lines. UI/UX target is <300 lines per file for maintainability. | 2026-04-09 (UI/UX) | Low - Code is functional but harder to maintain | Already partially decomposed from 578 lines; further extraction pending |
| No project thumbnails | Dashboard project cards show text only (name, genre, status). No thumbnail/screenshot to visually distinguish games. | 2026-04-09 (UI/UX) | Low - Dashboard functional but less engaging | Games are visual - users can click through to preview |
| AI is separate page | AI Command is a separate page users navigate to, breaking flow. AI should be an ambient side-panel accessible from any page. | 2026-04-09 (UI/UX) | Low - Feature works but requires context switching | Use existing FAB to open AI Command; panel-based design pending |
| No empty states for sub-pages | When a new project has no code or no entities, editor areas may look broken rather than intentionally empty. | 2026-04-09 (UI/UX) | Low - UX confusion for new users | Manually create files/entities via UI controls |
| Mobile experience | Dashboard and project browsing not optimized for tablets. Sidebar collapses poorly and touch targets are small. | 2026-04-09 (UI/UX) | Low - Not primary use case but could be better | Use desktop browser for best experience |

---

## Resolved Issues

| Issue | Description | Discovered | Resolved | Fix Version |
|-------|-------------|------------|----------|-------------|
| NavigationPage TypeScript errors | NavigationPage.tsx used incorrect Toast API (`toast.success()` instead of `toast.showToast()`), causing TypeScript compilation failures. | 2026-04-10 (Game Dev) | 2026-04-10 | v0.19.1 |
| Game Preview "require is not defined" error | ESM/CommonJS mismatch broke game runtime. Replaced all `require()` calls with proper ESM imports. | 2026-04-09 (Game Dev) | 2026-04-09 | v0.13.0 |
| No error details on failure | Runtime errors showed generic message with no stack trace. Added error tracking with expandable details. | 2026-04-09 (PM) | 2026-04-09 | v0.13.0 |
| API project creation lacks validation | Server accepted invalid/missing required fields. Added input validation for name, genre, artStyle. | 2026-04-09 (PM) | 2026-04-09 | v0.13.0 |
| CSS syntax errors in game-preview.css | Orphaned closing braces caused build warnings. Fixed malformed CSS. | 2026-04-09 (PM) | 2026-04-09 | v0.13.0 |
| Asset Studio "prev is not iterable" crash | Parameter shadowing in setState callback caused full-page crash on asset delete. Fixed variable naming. | 2026-04-08 (Game Dev) | 2026-04-08 | v0.11.8 |
| 23 missing CSS classes in game preview | Game over and victory screens had no styling (broken UI). Added all missing CSS classes. | 2026-04-08 (Game Dev) | 2026-04-08 | v0.11.8 |
| Play tab returns 404 | Navigation to `/project/:id/play` failed with 404. Added redirect route to `/project/:id/preview`. | 2026-04-09 (Game Dev) | 2026-04-09 | v0.13.1 |
| Code Editor tab returns 404 | Navigation to `/project/:id/code-editor` failed with 404. Added redirect route to `/project/:id/editor`. | 2026-04-09 (Game Dev) | 2026-04-09 | v0.13.1 |
| Asset generation fails silently | Asset Studio generation showed progress but assets didn't appear. Implemented `pollAndCreateAssets` backend. | 2026-04-09 (Game Dev) | 2026-04-09 | v0.13.1 |
| AI Command has no "Apply Code" button | Generated code showed "Proposed Changes" but had no way to apply it to the project. Added Apply/Apply All buttons. | 2026-04-09 (Game Dev) | 2026-04-09 | v0.13.2 |
| Asset list doesn't auto-refresh | After generation completed, users had to manually click "Refresh assets" to see new items. Added immediate refresh on completion. | 2026-04-09 (Game Dev) | 2026-04-09 | v0.13.3 |
| Inline styles in AICommandPage | Cancel/retry buttons used inline styles instead of design system CSS classes. Refactored to CSS classes. | 2026-04-09 (UI/UX) | 2026-04-09 | v0.13.2 |
| GamePreviewPage too large | GamePreviewPage.tsx was 1058 lines. Extracted hooks and components to reduce to 203 lines. | 2026-04-09 (PM) | 2026-04-09 | v0.13.0 |
| Onboarding overlay blocks all clicks, reappears on navigation | OnboardingTour and ProjectOnboarding initialized dismiss state in useEffect instead of synchronously, causing a visible flash on every component remount (route navigation). Fixed by using useState(() => ...) with direct localStorage read. Added persistent "Don't show again" button. | 2026-04-09 (Game Dev) | 2026-04-10 | v0.19.0 |
| Export history always empty | Export filenames used project name but listExports filtered by projectId — exports never appeared in history. Fixed with projectId in filename + .meta.json sidecar. | 2026-04-09 (Dev) | 2026-04-09 | v0.15.0 |
| Assets tab causes complete browser hang | `loadGenerations()` called `pollGenerations()` for completed gens without SVG, which called `loadGenerations()` again — infinite recursion. Fixed by removing the re-entrant call, adding `isPollingRef` guard, and using `useCallback` for stable references. | 2026-04-09 (Game Dev) | 2026-04-10 | v0.19.0 |

---

## Issue Categories

- **High Priority** 🟡: Blocking core workflows or major UX issues
- **Medium Priority** 🟢: Functional but with significant UX gaps or confusion
- **Low Priority** 🟢: Nice-to-have improvements or polish

---

## Process Notes

- This document is updated after every issue resolution or new discovery
- All resolved issues include the version number where the fix was released
- Active issues are prioritized based on user impact and alignment with platform goals
- Feedback sources: Game Dev (@gamedev), PM (@pm), UI/UX (@uiux)