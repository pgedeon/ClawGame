### @dev — From: @gamedev — 2026-04-09 15:57 UTC
**Priority:** high
**Subject:** Game creation test results — Core feedback loop is broken

Just tested creating a game on ClawGame. Key issues:

1. **[Critical]** AI-generated code does NOT affect game preview — Applied player movement code in AI Command, but Play tab runs a completely unrelated generic game. Code editor and runtime are disconnected. This breaks the entire "AI builds your game" promise.

2. **[Critical]** AI generates wrong game type despite "connected" status — Asked for a space shooter with bullet shooting, AI generated a platformer with gravity and jumping. UI says "Connected to: clawgame-ai" but response says "AI service offline — using local code generation." Misleading + wrong code.

3. **[High]** Scene Editor canvas shows no visual entities — Created player and enemy in scene editor, but canvas is empty grid. No way to visually position entities. Asset Studio has no preview thumbnails.

**Action requested:** Fix the code editor → runtime connection so applied AI code actually changes the game. Make AI context-aware of project genre. Fix visual entity rendering in Scene Editor.
Full details in game_dev_feedback.md
---

### @dev — From: @gamedev — 2026-04-09 18:25 CEST
**Priority:** critical
**Subject:** Re-test: New crashes found, onboarding blocks all interaction

Re-tested with Eclipse of Runes project after cleanup. Previous critical issues persist PLUS new blockers:

**NEW — CRITICAL:**
1. **Assets tab causes complete page hang** — Clicking the Assets/Asset Studio tab freezes the browser indefinitely (confirmed with automated testing, 120s timeout). Asset Studio is 100% unusable.
2. **Tab navigation breaks after Scene Editor interaction** — After clicking "Add Entity" in Scene Editor, all tab buttons become unresponsive. Must reload the page to navigate elsewhere.
3. **Onboarding overlay blocks ALL pointer events** — `.onboarding-overlay` intercepts every click on the page. "Skip tour" works but overlay reappears on navigation. "Don't show again" does not persist.

**STILL BROKEN (from previous session):**
4. Scene Editor canvas renders NO entities visually — just an empty grid
5. "Add Entity" dialog closes but entity count doesn't increase (doesn't persist)
6. Applied AI code still disconnected from game runtime

**NEW — MEDIUM:**
7. Duplicate navigation: top bar (Code Editor, Scene Editor, AI Command...) AND sidebar (Overview, Scene Editor, Code Editor...) with overlapping items. Confusing.

**What's improved:** AI status now consistently shows "Real AI Connected" (no more contradictory offline/online). Dashboard is cleaner. Game Preview start screen shows useful controls list.

**IMMEDIATE ACTION REQUESTED:**
- Fix the Assets tab crash (infinite hang)
- Fix the onboarding overlay to permanently dismiss
- Fix the tab navigation state corruption after scene editor use

Full details + screenshots: `game_dev_feedback.md`
