# ClawGame Market Research — AI Game Creation Platforms (2026-08)

Commissioned by acting CEO 2026-08-23. Method: primary pages (rosebud.ai, gdevelop.io/pricing, unity.com/ai, corp.roblox.com, vercel.com/pricing, GitHub API) + 2026 roundup reviews. WebSearch unavailable; unconfirmed items marked uncertain.

## Direct competitors (browser-based AI game builders)

**Rosebud AI** — Category leader, closest competitor: prompt-to-playable 2D on Phaser, chat iteration, inspectable code, template gallery, share links, education vertical. Free tier ~20 prompts/week; paid plans login-gated; commercial rights need paid "10x Dev or Pro", 0% revenue cut. Documented weaknesses: **no desktop/Steam export at any price**; **edits don't stick**, iteration bugs burn credits.

**Websim** — Generates interactive pages/games live; strong remix culture; credit-based; killed free daily credits + creator programs Jan 2026. Outputs unmaintainable/unexportable.

**Astrocade** — Describe-and-play social mini-game platform with remix feed; free per blog (terms unverified). "Platform loop, not an export engine."

**GDevelop** — MIT no-code engine + AI Ask/Build modes; most credible OSS analog. Pricing verified: Free 40 AI credits/mo → Silver/Gold/Pro up to 3,000/wk; publishes web/desktop/mobile/stores; >$50k revenue companies need Pro. Complaints: credit burn during Build, multiplayer gated below Pro.

**Summer Engine** — AI-native desktop engine emitting Godot-4 projects user owns; claims Steam/desktop/console export (unproven); attacks Rosebud's export gap directly.

**Others**: Bitmagic (prompt-to-3D), SEELE AI (claims export to Unity/Three.js/Unreal; immature), Makko AI (2D art+games, very new), Buildbox 4 (no-code + AI nodes).

## Adjacent threats

- **Lovable** (Free/Pro $25mo/Business $50mo), **Replit Agent** ($25/$100mo), **v0/Vercel** ($0/$20mo), **Figma Make** (credit-metered): used for simple browser games but lack engine concepts (physics, scenes, sprites, game loops).
- **Unity**: Muse/Sentis branding retired; now agentic in-editor assistant (multi-model, project-aware, undoable), BYO-agent AI Gateway, free MCP server (Unity 6+). Personal $10/mo for 1,000 AI credits.
- **Roblox**: Studio Assistant + Cube foundation model; Feb 2026 "4D generation" beta (functional objects from prompts). Internal datapoint: in-experience generation → **+64% playtime**.
- **Godot**: no first-party copilot; community `godot-mcp` (146★: scene editing, deterministic playtesting, live game state for agents) — demand signal for agent-driven deterministic editors.

## Cross-cutting trends

1. **Iteration reliability = #1 failure mode** ("simple changes do not stick"; stochastic regeneration). Production users want determinism.
2. **Credit burn on failed attempts** = dominant pricing grievance across Replit/GDevelop/Lovable/Figma/Websim.
3. **Export lock-in = #1 strategic gap** of hosted tools; reviewers' advice: "check export before you build." Steam allows disclosed AI content since 2024 → real-code export keeps value.
4. **Depth ceiling**: save/load, progression, economy balance exceed one-shot generation everywhere; current tools make prototypes, not products.
5. Retention correlates: fast time-to-playable hooks; keeps = export path, editable source, predictable cost, templates/remix ecosystems.

## Top 10 strategic takeaways (ranked) — binding input for roadmap

1. **Own-your-output is the winning wedge.** Standalone Phaser 4 TS export is our strongest differentiator vs every reviewed rival's worst review thread. Headline it.
2. **Deterministic previewable AI edits + rollback attack the #1 industry complaint.** Diff-review is a marketing feature, not plumbing.
3. **BYO-API-key kills credit anxiety** — flat/self-hosted cost + per-edit token transparency is a durable moat. (P1 provider work serves this.)
4. **Self-hosting wins niches rivals can't touch**: education privacy, studios w/ IP concerns, modding, air-gapped.
5. **Templates + remix = proven retention drivers** (Rosebud gallery, Roblox +64% playtime datapoint).
6. **One-click publish/share links are table stakes** for the viral loop; pair with export-to-code.
7. **Don't compete on generation magic** (Roblox Cube / Unity budgets); compete on openness, export, determinism, no platform tax.
8. **Target the graduate funnel**: outgrowing-Rosebud users who want real TypeScript. Nobody serves prompt→real-2D-codebase well today.
9. **MCP/agent integration is an emerging expectation** (Unity MCP server, Godot MCPs). Cheap future win: let external agents drive ClawGame scenes.
10. **Multiplayer + monetization weak everywhere**; defer, but deterministic ECS state is the right substrate when we go there.

Uncertain: exact Rosebud paid prices; Astrocade terms; Bitmagic/SEELE/Buildbox pricing/export reality; Summer console-export claims; complaints sourced from secondary reviews.
