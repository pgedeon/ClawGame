# Follow-Up Sprints

**Purpose:** Define the product program that starts after the current recovery sprint is complete.

**Status:** Planned  
**Starts After:** [`docs/tasks/current_sprint.md`](../tasks/current_sprint.md) exit criteria are met  
**Reviewed Against:** ClawGame runtime/editor codebase + Sorceress tools guide (`https://sorceress.games/tools-guide`) on 2026-04-09

---

## Product Thesis

To be the best AI-first game development platform on the market, ClawGame cannot just be:

- an editor with a chat box
- an engine with a few templates
- an asset generator with weak runtime integration

It needs a closed-loop creation system:

1. **Describe** a game, mechanic, level, enemy, or asset pack in natural language.
2. **Generate** code, scenes, art, audio, and metadata in engine-native formats.
3. **Preview** instantly across local, cloud, and device layouts.
4. **Playtest** with AI-assisted debugging, replays, and regression capture.
5. **Publish** to the web with one-click packaging and hosted previews.
6. **Learn and iterate** using notes, prompt recipes, templates, and shared community knowledge.

---

## Strategic Themes

| Theme | Why it matters |
|------|--------|
| AI Creator Workspace | Current AI features are useful but still page-based and fragmented |
| Asset Factory | Current Asset Studio can generate/upload assets, but not yet process them into game-ready pipelines |
| Unified Runtime | ClawGame currently has a reusable engine plus a second ad hoc preview runtime; that split limits product quality |
| Playtest + Publish Loop | Fast creation is only valuable if preview, QA, export, and sharing are equally fast |
| Community Flywheel | Prompt libraries, templates, and shared examples compound product value over time |

---

## Sprint Sequence Overview

| Sprint | Name | Outcome |
|------|--------|-------|
| M9 | AI Creator Workspace | Ambient AI operating system for game projects |
| M10 | Asset Factory Core | Sprite, tileset, pixel, and batch-processing pipeline |
| M11 | Generative Media Forge | AI image, sprite, audio, video, and voice workflows |
| M12 | Unified Runtime | One canonical simulation/runtime across preview, export, editor, and AI |
| M13 | Gameplay Authoring Layer | Visual logic, behavior graphs, genre kits, and engine-native events |
| M14 | Playtest Lab + Publishing | Multi-device preview, replay-based QA, export, deploy, and hosted play |
| M15 | Community + Marketplace | Prompt lexicon, template marketplace, public game gallery, shared recipes |

---

## M9: AI Creator Workspace

**Goal:** Turn ClawGame AI from a single page into the operating system for the entire creation workflow.

### Why this sprint exists

Sorceress positions its coding agent around project files, preview targets, and local/cloud workflows. ClawGame should do the same, but with stronger engine awareness and scene semantics.

### Deliverables

- Ambient AI side panel available from every major surface
- Model profiles and BYO provider configuration
- Project memory panel for notes, design goals, constraints, and TODOs
- Prompt recipe library for common game tasks:
  - create enemy archetype
  - generate quest chain
  - build starter scene
  - turn concept into asset list
  - refactor mechanic into engine component
- AI plan/apply/review workflow with structured diff approval
- Local preview target and cloud preview target selection
- Context injection from:
  - selected files
  - selected entities
  - current scene
  - asset tags
  - recent playtest failures

### Exit Criteria

- AI is accessible without leaving editor, scene, asset, or preview flows
- Prompts can target files, entities, scenes, or asset groups
- Notes and prompt recipes are saved per project
- AI can open a preview target and reason about the current game context

---

## M10: Asset Factory Core

**Goal:** Make Asset Studio useful even before high-end generation by turning raw art into game-ready assets.

### Why this sprint exists

Sorceress emphasizes utility tools like auto-sprite conversion, sprite analysis, slicing, pixel conversion, tileset building, drawing, and batch processing. ClawGame needs this same “make assets usable” layer.

### Deliverables

- Sprite Analyzer:
  - detect frame grids
  - preview animations
  - extract frame metadata
- Slicer:
  - split sheets into frames
  - export animation manifests
- True Pixel pipeline:
  - pixelize source art
  - palette reduction
  - edge cleanup
- Tileset Forge:
  - assemble tiles into tilesets
  - define autotile metadata
  - preview tile placement
- Batch Utilities:
  - resize
  - palette reduce
  - format convert
  - trim/crop
  - audio normalize
- Simple browser art canvas for quick sprites, icons, and UI pieces
- Asset-to-scene binding:
  - assign sprites/tilesets directly to entities and scene layers

### Exit Criteria

- Users can upload an arbitrary sprite sheet and turn it into engine-usable frames
- Users can create tilesets and attach them to scenes
- Generated or uploaded assets can be processed into reusable engine metadata, not just stored as loose files

---

## M11: Generative Media Forge

**Goal:** Expand Asset Studio from “image generation” into a true AI media pipeline for game production.

### Why this sprint exists

The Sorceress guide groups image, sprite, texture, video, sound, speech, and music generation into one suite. ClawGame should match that breadth, but anchor outputs to game-engine workflows instead of standalone tools.

### Deliverables

- Multi-model image generation with style presets for:
  - characters
  - enemies
  - props
  - UI
  - backgrounds
- Quick Sprites workflow:
  - prompt to animated sprite sheet
  - idle/walk/attack/VFX presets
- Seamless texture and tile generation
- Background removal and outpainting tools
- Video-to-sprite and image-to-animation pipeline
- SFX generation with batch pack planning
- Speech generation for dialogue trees and cutscenes
- Music generation for theme/ambient/battle loops
- Asset pack planner:
  - “generate a complete starter pack for this game concept”

### Exit Criteria

- Users can generate a themed set of assets for a scene, not just a single image
- Audio and voice outputs can be attached to dialogue/events in project data
- Generated media lands in structured folders with metadata ClawGame can reason over

---

## M12: Unified Runtime

**Goal:** Replace the split between `packages/engine` and web-only preview logic with one canonical runtime model.

### Why this sprint exists

This is the biggest architecture unlock in the repo. Right now the reusable engine is small, while a large amount of gameplay logic lives in preview-specific hooks. That slows every future feature.

### Deliverables

- Canonical entity/component schema shared by:
  - engine
  - scene editor
  - preview
  - export
  - AI code generation
- Runtime systems for:
  - physics
  - triggers
  - collisions
  - pickups
  - damage
  - projectiles
  - camera
  - scene bounds
- Data-driven scene loading that does not fork between editor and preview
- Asset-aware sprite and animation rendering
- Engine events bus for gameplay systems
- Export runtime uses the same simulation rules as preview

### Exit Criteria

- Preview uses the same runtime core as export
- Scene editor saves directly into the canonical schema the engine consumes
- Major game genres no longer require bespoke page-level logic to run

---

## M13: Gameplay Authoring Layer

**Goal:** Build the layer that makes ClawGame feel like an AI-native game authoring platform rather than a raw engine.

### Why this sprint exists

Today, gameplay rules are spread across templates, scene data, and preview hooks. This sprint introduces a real authoring model.

### Deliverables

- Event graph / visual logic editor:
  - triggers
  - conditions
  - actions
  - timelines
- Behavior graphs for enemies and NPCs
- Navigation/waypoint tooling
- Genre kits as reusable modules:
  - platformer
  - top-down action
  - RPG
  - tactics prototype
- AI-assisted graph generation:
  - “make this enemy patrol, alert, chase, and retreat”
  - “build a three-step quest with rewards”
- Animation state machines
- Cutscene/dialogue sequencing tools

### Exit Criteria

- A new project can express substantial gameplay without hand-writing large scripts
- AI can generate and edit visual logic structures directly
- Genre kits are reusable starting points, not hardcoded templates

---

## M14: Playtest Lab + Publishing

**Goal:** Make ClawGame best-in-class at the loop from build to test to share.

### Why this sprint exists

Sorceress highlights layout preview, browser play, and publishing. ClawGame should go further with engine-aware QA and one-click deployment.

### Deliverables

- Multi-device layout preview:
  - phones
  - tablets
  - desktop aspect ratios
- Local + cloud preview environments
- Deterministic replay capture
- Time-travel debugging for gameplay regressions
- AI playtest mode:
  - automated traversal
  - stuck detection
  - objective completion checks
  - bug report generation
- Export improvements:
  - better packaging
  - versioned builds
  - screenshots
  - metadata
- One-click publish targets:
  - GitHub Pages
  - ClawGame-hosted gallery
  - shareable preview links

### Exit Criteria

- Users can preview the same game across multiple device profiles
- Bugs found during playtests can be replayed and attached to AI debugging workflows
- Publishing is a guided product flow, not just a raw export button

---

## M15: Community + Marketplace

**Goal:** Build the network effects layer that keeps ClawGame improving and makes AI outputs more reusable.

### Why this sprint exists

Sorceress includes a public guide, community features, and a prompt lexicon. ClawGame should build a stronger ecosystem around reusable game-making knowledge.

### Deliverables

- Prompt lexicon:
  - asset prompts
  - mechanic prompts
  - scene prompts
  - animation prompts
- Public template gallery with ratings and examples
- Shareable asset recipes and generation presets
- Public “made with ClawGame” game gallery
- Importable starter kits from community templates
- Marketplace foundations for:
  - templates
  - asset packs
  - AI recipes
  - behavior kits
- Guided docs and learning paths

### Exit Criteria

- Users can discover and import community-built prompts/templates
- Published games and templates create a reusable ecosystem loop
- New users can get from inspiration to playable prototype without starting from scratch

---

## Recommended Order

1. Finish the recovery sprint first.
2. Start **M9** and **M10** immediately after recovery.
3. Start **M11** only after M10 metadata and asset-processing formats are stable.
4. Treat **M12** as the major architecture milestone that unlocks everything after it.
5. Build **M13** on top of the unified runtime, not before it.
6. Run **M14** once preview/export/runtime share one simulation path.
7. Use **M15** to compound product value after the core loop is excellent.

---

## Non-Negotiable Differentiators

To beat tools inspired by Sorceress rather than merely matching them, ClawGame should be explicitly better at these:

- **Engine-aware AI**: the assistant understands scenes, entities, components, behaviors, and exports
- **Closed-loop debugging**: prompt → preview → replay → fix → republish in one workflow
- **Game-ready outputs**: generated assets always land in engine-native metadata formats
- **Unified authoring**: editor, asset studio, preview, and export all speak the same runtime language

---

**Owner:** @dev  
**Last Updated:** 2026-04-09
