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

---

# Research addendum 2026-08-24 — onboarding & time-to-playable

Commissioned by acting CEO (strategy lane). Method: **live logged-out browser walkthroughs** (headless Chromium, 2026-08-24 ~01:40–02:00 CET) of rosebud.ai, websim.com, astrocade.com (+`/create`), gdevelop.io + `editor.gdevelop.io`, capturing every screen between landing and first playable/generation attempt; supplemented by web sources cited inline. Click/input counts = observed minimum from landing page. Items not verifiable from primary observation or a named source are marked UNCONFIRMED.

## Per-competitor findings

### Rosebud AI (rosebud.ai)

- **Landing = creation-first.** Prompt box ("Describe your game idea", model picker rosie/rosie-agentic, image upload, 1000-char cap) and a "Start from Template" wizard sit directly on the homepage above the fold. Both paths visible simultaneously — neither template-first nor prompt-first wins; they are parallel entries.
- **Template path = 3-step wizard, no account needed to configure:** Step 1 pick genre (Interactive Story, Multiplayer Obby, City Builder, RPG, FPS; 3D Quest + Crowd Rush shown disabled "Coming Soon"), Step 2 pick style/theme (Wednesday, Hazbin Hotel, Goblin Tavern, Elf Ranger observed), Step 3 "Review assets" with BACK/NEXT pagination.
- **Signup wall fires at CREATE GAME** — modal "Sign in to Rosebud": Google, Microsoft, or email + ToS consent checkbox. Browsing and configuring are anonymous; the first billable action (generation) requires auth.
- **Prompt path:** type idea → Create → same wall. Minimum observed inputs to first playable (template route): 3 wizard interactions + auth = 4 inputs, then AI generates.
- Secondary corroboration: "The onboarding process is fast, allowing immediate immersion into game creation with helpful prompts and templates" (ai-review.com, 2025-10-26); "gets you from zero to testable faster than any…" for prototype founders (mvpable.com, 2026-03-03).
- Sources: live walkthrough 2026-08-24 (all steps above observed directly); ai-review.com; mvpable.com.

### Websim (websim.com)

- **Landing = consumer feed, not a creation tool.** Hot / For You / Top (Today/Week/Month/All-time) / New sections of community games with play counts (e.g. Modern Wars 1088k plays) and like counts. Footer tagline: "Create games apps free help make internet fun again."
- **Playing community games requires no account** — Play buttons are public (observed logged-out).
- **Create button → immediate signup dialog:** "Start creating free — 300 credits included, no card needed." Google or Discord OAuth only. Creation is gated BEFORE any prompt input; there is no template gallery in the creation entry (prompt-first once inside).
- Strong remix culture visible in feed ([REMIX VERSION 1.0] entries, remix lineage in titles).
- Conflict flag: launchtoolsai.com (2026-05-25) claims "As of May 2026, WebSim is completely free. There is no Pro tier, no token system" while opentools.ai (2026-06-04) lists "Starting at $9.99/mo" — contradicts both each other and the observed "300 credits included" dialog. Current monetization UNCONFIRMED.
- Sources: live walkthrough 2026-08-24; launchtoolsai.com; opentools.ai; aitools.aiting.com (templates/remix description).

### Astrocade (astrocade.com)

- **Landing = game feed** (Players' Choice, Recommended For You, category carousels: Simulation, Rhythm, Farm, Chess, Tactics, Creative, Action…) with play counts up to 5M (Slice Rush) and 2.4M (Stickman Archer). Same consumer-feed archetype as Websim.
- **`/create` reachable fully logged-out:** single prompt box ("What game would you like to create?") + "Inspire Me" button. No template grid.
- **Value-demo-before-auth:** submitting a prompt returns an AI-authored game concept BEFORE any signup — observed: named pitch "Cat Coin Caper" with description + feature bullets, plus a "Build step-by-step" toggle (default ON = guided incremental build mode). Signup wall appears only at actual generation: "Sign in to create" button.
- Minimum observed inputs to playable: 1 prompt → read AI pitch → sign in → build starts.
- Scale numbers: ~5M monthly active users, ~140M game plays/month, 75,000+ games from creators in 80 countries; $56M raised May 2026 (Series B led by Sequoia; earlier Sea-led A; NVIDIA, Google AI Futures Fund among investors); $68M total per Tracxn.
- Sources: live walkthrough 2026-08-24; Fortune 2026-05-05; dcahn.substack.com "Investing in Astrocade" 2026-05-05; pocketgamer.biz 2026-05-07; Tracxn 2026-06-12.

### GDevelop (gdevelop.io / editor.gdevelop.io)

- **Landing = classic engine marketing** (published-games showcase: SPECTRUM "played over 5,000,000 times on the web", Vai Juliette! 1M+ mobile downloads). CTA "Start your game now" deep-links straight into the web editor with `?initial-dialog=create&new-project=true`.
- **Web editor opens the "Create new game" dialog with NO login:** top half is an AI prompt ("Build with AI", placeholder "Begin driving game controllable car"); below, a section literally headed "Continue Human Intelligence" lists Empty project + dozens of free examples (Platformer, Top-down, Physics, 3D Platformer, 3D First Person, Point and Click, Multiplayer bounce puzzle…) and paid templates (€6.99–15.99: FPS, Match 3, Beat em Up, Real Time Strategy…).
- **Template detail dialog:** auto-generated project name (observed "Impartial Quartz") + storage choice: GDevelop Cloud (requires account) / desktop app download (disabled in web) / **"Don't save this project now"**. Selecting the latter removes the account buttons and enables "Create new game" → **full editor loads the platformer template playable/editable with zero auth.** Toolbar exposes Ask AI, version history, Save, Share.
- Account is required only for cloud save, publishing, and AI usage beyond the free tier (Free 40 AI credits/mo per pricing verified in main doc; Silver €6.99/mo, Gold €12.99/mo shown on homepage).
- Minimum observed clicks to playable: homepage CTA → pick template → set storage "don't save" → Create new game ≈ **3–4 clicks, zero auth** — the fastest path of the four.
- Sources: live walkthrough 2026-08-24 including a loaded editor session; gdevelop.io homepage; wiki.gdevelop.io/gdevelop5/interface/ai.

## Cross-cutting patterns

1. **Nobody gates looking or playing.** All four let anonymous visitors browse/play community content or configure creations; the wall lands only at generation (Rosebud, Astrocade, Websim-create) or cloud save (GDevelop). GDevelop is the only one allowing full no-auth creation.
2. **Two landing archetypes:** creator-tool landing (Rosebud: prompt + templates above the fold) vs consumer-feed landing (Websim, Astrocade: play feed is the traffic engine, create is a secondary CTA). Feed-first platforms monetize attention; creation is upsold from play.
3. **Value demo before auth is the emerging norm:** Astrocade shows an AI-authored game concept pre-signup; Rosebud previews assets at wizard step 3 pre-signup; GDevelop skips auth entirely until save. The pitch happens before the paywall (or loginwall).
4. **Templates and prompts coexist everywhere.** Templates are the deterministic instant-fun path; prompts are the marketed magic. Even GDevelop — a traditional engine — put "Build with AI" at the top of its create dialog but keeps the biggest real estate on examples.
5. **Guided step-by-step modes are trending:** Rosebud's 3-step wizard, Astrocade's "Build step-by-step" toggle defaulting ON. Structure trades clicks for confidence.

## Public activation/retention numbers tied to onboarding speed

- **None of the four competitors publishes activation-rate or time-to-first-game funnel metrics.** Astrocade's MAU/plays/games counts are scale proof points, not onboarding data. Anything finer is UNCONFIRMED/not public.
- Astrocade scale datapoint: 5M MAU, 140M plays/month, 75k games (Fortune, 2026-05-05).
- Amplitude case study (2025-12-02): cutting time-to-value moved activation 17.4% → 53.5% in eight months, with 30-day retention 64.3% and 90-day 46.4% — direct evidence onboarding speed moves retention.
- Appcues onboarding benchmarks: many SaaS products target 25–50% of new signups reaching their defined activation event within the first session or first week.
- rework.com B2B growth library: users who reach the aha moment in their first session are "2–3x more likely to become active" (secondary aggregation, primary study unnamed — UNCONFIRMED).
- saasmag (2026-05-28): users who do not engage within the first three days have roughly 90% churn probability; "30 to 45 point retention swing on a single onboarding variable" (methodology unpublished — UNCONFIRMED).
- Roblox internal datapoint (already in main doc): in-experience generation → +64% playtime — creation speed inside the play surface drives engagement.

## ClawGame implications (maps to P2 time-to-fun)

Context: P2 items are template audit, onboarding flow (create → first AI edit applied → play, measured in clicks), one-click share/publish. CEO ruling #2 already defines zero-config opencode as guided first-run key entry with mock fallback. ClawGame's structural advantage vs all four competitors: **BYO-key/self-host means we pay nothing per generation**, so the economic reason for their signup walls (metered server inference) does not exist for us.

Ranked recommendations:

1. **No auth before first playable — ever. Local-first projects.** GDevelop proves no-account creation is viable and it is the only one of the four with a sub-4-click zero-auth path; the others wall at generation purely because they fund inference. Our mock-provider fallback means create → edit → play must work with zero keys and zero accounts; persist projects in browser storage; introduce accounts only at share/export/cloud-sync. Target acceptance: landing → playable template ≤ 3 clicks (GDevelop parity), matching the P2 "reduce to minimum" metric.
2. **Fix template demonstrativeness before adding templates (P2 audit first).** Every competitor's template leads to something instantly playable; ours carry known inert behaviors (platformer gravity on `movement.gravity` unread, topdown chase-AI inert without `movement` component — session-5 harness). A template that demos broken physics kills the activation moment regardless of click count. Sequence: audit-fix → then measure onboarding.
3. **Template gallery default, prompt bar beside it — not behind it.** All four ship both paths; templates are the deterministic fast path, prompts are the marketed path. Each ClawGame template should be one click from landing with a visible description of what it demonstrates (GDevelop-style: "2D side-view platformer… coins can be collected"). Keep the AI prompt input on the same first screen (Rosebud pattern) rather than hiding creation behind a feed.
4. **Show a value demo before any key/auth friction.** Astrocade's pre-signup AI pitch is the strongest pattern: the user sees the product understand them before being asked for anything. ClawGame analog: guided first-run applies a mock AI edit to the chosen template immediately (ruling #2), THEN prompts for a real key when the user wants serious iteration. This makes the P2 activation event (create → first AI edit applied → play) completable in session one.
5. **Define and instrument the activation event now.** Proposed event: first Play pressed on a project the user edited. Benchmarks say first-session activation is the strongest retention predictor (Amplitude 17.4→53.5%; Appcues 25–50% target band). Instrument landing→template→editor→AI-edit→play funnel before building share links so the A/B loop (success-metrics requirement) has a baseline.
6. **Share links must work from a no-auth local project, paired with remix.** Feeds with play counts are how Websim/Astrocade grew (140M plays/month); remix lineage is their retention loop. ClawGame: static-export bundle + share URL from a local project; imported shared games open as editable copies ("Remix") since our output is real Phaser TS — this doubles as the graduate-funnel wedge (takeaway #8).
7. **Defer multi-step guided wizards.** Rosebud's 3-step wizard and Astrocade's step-by-step default add inputs before play; fine for them (each step collects style/asset prefs that shape generation cost), wrong for us while our differentiator is speed-to-playable. Revisit only if funnel data shows users stalling at the blank-editor state.

New uncertain items: Websim current pricing/credit model (sources conflict, see above); whether Rosebud's wizard styles constitute licensed IP risk (Wednesday/Hazbin Hotel themed templates observed — worth CEO awareness); exact GDevelop no-auth persistence scope (session-only assumed, UNCONFIRMED beyond observed dialog wording).
