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
