# ECLIPSE OF RUNES — Innovative 2D RPG Roadmap

## Vision
A procedural narrative RPG where the world reacts to player choices in unexpected ways. 
Every NPC has a memory. Every biome shifts with time and player actions. Combat blends 
real-time dodge mechanics with strategic spell-weaving (combine runes mid-fight). 
No two playthroughs are the same.

## Innovation Pillars
1. **Living Memory System** — NPCs remember every interaction; relationships evolve over game-time weeks
2. **Rune Weaving Combat** — Real-time combat where you combine elemental runes mid-fight to create custom spells
3. **Biome Metamorphosis** — World areas transform based on player decisions (forest ↔ wasteland ↔ crystal garden)
4. **Echo Quests** — Quests that reference your past playthroughs (via localStorage seed)
5. **Procedural Lore** — AI-generated lore fragments that weave into coherent mythology

## Phase Roadmap

### Phase 1: Foundation (Sprint 1-2)
- [ ] Project scaffolding: game loop, scene management, input handling
- [ ] Player character: sprite rendering, movement, collision
- [ ] Basic tilemap engine: loading/rendering Tiled-compatible maps
- [ ] Camera system: follow player, smooth lerp, bounds
- [ ] Core RPG framework: stats, inventory slots, equip system

### Phase 2: Combat & Runes (Sprint 3-4)
- [ ] Real-time combat engine: dodge roll, attack frames, hitboxes
- [ ] Rune collection system: find/craft elemental runes
- [ ] Spell weaving UI: drag-combine runes during combat pause
- [ ] Spell effect rendering: particle systems per element combo
- [ ] Enemy AI: patrol, aggro, attack patterns, boss phases

### Phase 3: Living World (Sprint 5-7)
- [ ] NPC memory graph: relationship scores, event history
- [ ] Dialogue engine: branching dialog with memory-aware responses
- [ ] Biome state machine: forest/wasteland/crystal transitions
- [ ] Day/night cycle: NPC schedules, enemy spawns, lighting
- [ ] Quest system: main quest chain + procedural side quests
- [ ] Echo quest framework: localStorage seed tracking

### Phase 4: Polish & Depth (Sprint 8-10)
- [ ] Procedural lore generator: myths, item descriptions, place names
- [ ] Sound design: procedural ambient audio per biome state
- [ ] Save/load system: multiple slots, cloud-save ready
- [ ] Minimap & world map with biome states
- [ ] Accessibility: keyboard-only mode, colorblind runes, text scaling
- [ ] Tutorial island: guided intro that teaches rune weaving naturally

### Phase 5: Innovation Extras (Sprint 11+)
- [ ] Boss rush mode with leaderboard
- [ ] New Game+ with inverted biome states
- [ ] Community rune recipes (shareable codes)
- [ ] Speedrun timer & glitch-friendly physics

## Adaptive Rules
The agent may reorder, skip, or add phases based on:
- What's technically feasible in ClawGame's current engine
- What plays best (test each system before building on it)
- Feature requests from the platform dev
- New ideas discovered during development

## Communication
- Post feature requests to `docs/ai/agent_messages.md` with `@platform-dev`
- Log all decisions in `docs/ai/rpg-devlog.md`
- Update this roadmap when phases change
