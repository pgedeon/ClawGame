# ClawGame Product Spec

## Document Status

* Status: Draft v1
* Product: ClawGame
* Type: OpenClaw implementation spec
* Owner: Peter
* Purpose: Define the product, architecture, feature set, repo shape, milestones, and execution plan for an AI-first web-based game development engine that OpenClaw can build and operate natively.

---

# 1. Product Summary

## 1.1 Product Name

**ClawGame**

## 1.2 One-Sentence Pitch

ClawGame is an AI-first, web-based game development engine and editor that lets users design, generate, debug, iterate, and ship games using integrated coding agents, asset generation pipelines, and native OpenClaw orchestration.

## 1.3 Product Vision

ClawGame should function like a browser-based game studio operating system.

Instead of asking the user to manually build every system, ClawGame should let the user express intent while AI handles architecture, code generation, difficult implementation work, debugging, asset creation, and repetitive production tasks.

## 1.4 Core Differentiator

ClawGame is not just a browser game editor with a chatbot attached.

It is:

* AI-first
* task-driven
* agent-native
* Git-native
* OpenClaw-native
* able to coordinate code, assets, design, testing, and iteration inside one product

---

# 2. Product Goals

## 2.1 Primary Goals

1. Let a user create a playable game prototype from natural language.
2. Let AI generate and maintain gameplay code.
3. Let AI and ComfyUI generate art assets such as sprite sheets, tilesets, icons, textures, portraits, and UI elements.
4. Let OpenClaw work with ClawGame natively as part of the same production workflow.
5. Make Git and versioned changes first-class inside the editor.
6. Allow rapid playtesting and AI-assisted debugging inside the browser.
7. Create a strong foundation for future team collaboration, plugin support, and advanced export targets.

## 2.2 Secondary Goals

1. Reduce technical barriers for solo creators.
2. Improve productivity for technical users through structured delegation.
3. Make project context persistent so AI can operate with continuity.
4. Enable design-to-prototype and bug-to-fix workflows with minimal manual friction.

## 2.3 Long-Term Goals

1. Expand from 2D-first into 2.5D and 3D.
2. Support richer agent collaboration models.
3. Support reusable templates, workflows, and plugin ecosystems.
4. Become a full AI-native creation platform for indie game teams.

---

# 3. Non-Goals for MVP

The MVP should **not** try to do all of the following at once:

* advanced 3D engine support
* console export
* production-grade multiplayer networking
* app-store release automation
* full live collaborative multi-user editing
* highly advanced shader graph tooling
* AAA-grade animation pipelines
* every genre-specific editor at launch

The MVP should stay focused on a **2D browser-first game creation workflow**.

---

# 4. Core User Types

## 4.1 Solo Creator

A person with game ideas who wants AI to help implement mechanics, systems, and assets.

## 4.2 Technical Creative

A user comfortable with code who wants a faster AI-assisted workflow.

## 4.3 OpenClaw Power User

A user who wants ClawGame projects to be directly operable by OpenClaw agents.

## 4.4 Small Team User

A future user type that needs project coordination, review flows, and structured collaboration.

---

# 5. Product Principles

1. **Intent before implementation**
 * The user should describe what they want.
 * The system should translate intent into code, assets, tasks, and builds.

2. **AI with structure, not chaos**
 * AI changes should be scoped, explainable, reviewable, and reversible.

3. **Project memory matters**
 * The engine should remember architecture, lore, art direction, naming, and technical decisions.

4. **Git is part of the product**
 * Every meaningful AI change should be inspectable and versioned.

5. **OpenClaw should feel native**
 * ClawGame should expose enough project state and actions for OpenClaw to operate naturally.

6. **Fast iteration beats giant scope**
 * Optimize for short loops: idea → implementation → playtest → fix → commit.

---

# 6. MVP Scope

## 6.1 MVP Thesis

The MVP should prove that ClawGame can take a game idea and help a user build a playable 2D browser game using AI-assisted coding, AI-assisted asset generation, and OpenClaw-native project operations.

## 6.2 MVP Includes

* web app shell
* project dashboard
* code workspace
* AI command center
* 2D scene editor
* live in-browser playtest window
* basic entity/component workflow
* asset manager
* ComfyUI integration
* Git initialization and commit flow
* OpenClaw-native project profile
* prompt-to-feature generation
* bug-fixing workflow
* browser export

## 6.3 MVP Excludes

* full 3D scene editing
* sophisticated multiplayer infrastructure
* team collaboration in real time
* marketplace/plugin store
* advanced commercial deployment features

---

# 7. High-Level Product Modules

## 7.1 Project Dashboard

Main landing page for a game project.

### Responsibilities

* display current project state
* show milestones and tasks
* show current build status
* show recent AI activity
* show warnings and unresolved issues
* show recent commits and test results

### Core UI Elements

* project overview card
* build status panel
* milestone tracker
* recent tasks panel
* AI actions log
* playtest/build links
* errors/warnings summary

## 7.2 AI Command Center

The central AI interaction surface.

### Responsibilities

* receive user prompts
* route tasks to agents or AI providers
* show plans before major changes
* summarize file changes
* support debugging and refactoring workflows

### Example Commands

* Create a top-down movement system.
* Add health, damage, and enemy collision.
* Generate a snowy tileset.
* Fix the attack cooldown bug.
* Refactor the inventory to be data-driven.

### Core Behaviors

* analyze project context
* identify affected files/systems
* propose implementation plan
* execute through tools
* report outcomes
* write task notes to project memory

## 7.3 Code Workspace

Browser-based editor for scripts and project files.

### Responsibilities

* file editing
* syntax highlighting
* diagnostics
* inline AI actions
* diff review
* quick navigation

### Required Features

* file tree
* tabs
* search
* AI actions per file/selection
* explain file
* refactor selection
* write tests
* fix diagnostics

## 7.4 2D Scene Editor

Visual editor for levels and scenes.

### Responsibilities

* entity placement
* tilemap editing
* layers and hierarchy
* trigger/collision setup
* camera preview
* scene property editing

### Required Features

* scene canvas
* zoom/pan
* selection and transform tools
* layer panel
* entity list
* property inspector
* grid/snapping
* tile brush basics
* collision overlays

## 7.5 Live Preview / Playtest Window

Immediate runtime feedback inside the browser.

### Responsibilities

* launch game preview
* hot reload core changes where possible
* show debug overlays
* support issue capture from current state

### Required Features

* run/stop/restart
* FPS info
* error console
* collision/debug toggle
* snapshot state for bug reports

## 7.6 Asset Studio

ComfyUI-connected asset generation and management surface.

### Responsibilities

* generate art assets
* track workflows and prompts
* store variations
* import assets into project
* help keep style consistency

### Required Features

* prompt input
* workflow template selection
* generation history
* image preview grid
* asset metadata
* import to project
* sprite slicing basics
* transparent background support

## 7.7 World/Data Manager

Structured game data editor.

### Responsibilities

* manage item data
* manage enemy definitions
* manage quests/dialogue data later
* manage spawn tables and config files

### Required MVP Features

* JSON or structured data editing
* schema-aware forms for key game objects
* versioned edits

## 7.8 Git/History Center

Version control inside the product.

### Responsibilities

* initialize repo
* show staged/unstaged changes
* commit changes
* review diffs
* restore prior state

### Required MVP Features

* repo init
* changed files list
* AI-generated commit summary
* commit action
* simple rollback path

---

# 8. AI System Design

## 8.1 AI Roles

ClawGame should internally support multiple AI role types even if the MVP exposes them simply.

### Role A: Builder AI

Focus: coding, debugging, architecture, implementation.

### Role B: Art AI

Focus: asset generation, style consistency, sprite workflows, texture generation.

### Role C: Director AI

Focus: planning, milestone generation, task decomposition, consistency checking.

## 8.2 AI Responsibilities

The AI layer should be able to:

* inspect project structure
* read relevant files
* identify architectural patterns
* write code changes
* generate new files
* explain changes
* suggest tests
* fix runtime and build errors
* request assets from the asset pipeline
* update task/memory logs

## 8.3 AI Change Policy

Every meaningful AI action should ideally include:

1. change goal
2. affected systems/files
3. risk level
4. expected outcome
5. actual result
6. suggested validation steps

## 8.4 AI Context Sources

The AI should assemble context from:

* project manifest
* current scene metadata
* selected files
* game design notes
* architecture notes
* task history
* recent errors/logs
* asset metadata
* project memory

## 8.5 AI Modes

* build mode
* refactor mode
* debug mode
* explain mode
* design mode
* asset mode
* playtest analysis mode

---

# 9. ComfyUI Integration Spec

## 9.1 Purpose

ClawGame should connect to ComfyUI to generate visual game assets as part of the normal project workflow.

## 9.2 Supported Asset Types

MVP target asset types:

* character sprites
* tilesets
* textures
* icons
* item art
* portraits
* UI elements
* simple background layers

## 9.3 Workflow Requirements

ClawGame should support:

* sending prompts to ComfyUI workflows
* selecting workflow templates
* tracking seed/workflow info
* saving outputs to project asset directories
* attaching metadata to each asset
* generating multiple variations
* importing outputs into scenes or entity definitions

## 9.4 Suggested Workflow Templates

* pixel art character generator
* sprite sheet / frame sequence generator
* icon generator
* seamless texture generator
* tileset generator
* UI icon/button generator
* portrait generator
* environment prop pack generator

## 9.5 Asset Metadata

Each generated asset should track:

* prompt
* negative prompt if used
* workflow/template name
* seed
* generation timestamp
* source references if any
* project/style tags
* imported destination path

## 9.6 Future Asset Features

* automatic background removal
* sprite slicing refinement
* atlas packing
* animation frame interpolation
* style drift detection
* reference-character consistency workflows

---

# 10. OpenClaw Native Integration Spec

## 10.1 Core Requirement

OpenClaw should be able to work with ClawGame projects natively, without fragile ad hoc prompting.

## 10.2 Integration Goals

OpenClaw should be able to:

* inspect a ClawGame project
* read current project status
* update files
* run builds/tests/previews
* generate assets via the asset pipeline
* create and update tasks
* understand project memory and design constraints
* coordinate specialized agents against the repo

## 10.3 ClawGame Project Profile

Each project should include machine-readable project metadata for OpenClaw.

Suggested file:

* `clawgame.project.json`

This file should define:

* project name
* engine version
* runtime target
* game genre
* art style
* architecture notes
* scene list
* entity/component references
* asset pipeline config
* AI providers
* OpenClaw integration settings

## 10.4 ClawGame Memory Files

Suggested project memory files:

* `docs/product/vision.md`
* `docs/design/game_design.md`
* `docs/architecture/architecture.md`
* `docs/architecture/engine_notes.md`
* `docs/tasks/backlog.md`
* `docs/tasks/current_sprint.md`
* `docs/qa/known_issues.md`
* `docs/ai/project_memory.md`

## 10.5 OpenClaw Agent Roles for This Repo

Suggested built-in agent profiles:

* `director-agent`
* `gameplay-agent`
* `ui-agent`
* `tools-agent`
* `asset-agent`
* `qa-agent`
* `performance-agent`

## 10.6 Desired OpenClaw Capabilities

ClawGame should expose enough structure that OpenClaw agents can do the following reliably:

* add or edit game systems
* inspect scenes and assets
* fix bugs from logs
* generate or revise design docs
* update roadmap/task status
* review diffs before commit
* propose next tasks

---

# 11. Engine and Runtime Direction

## 11.1 MVP Engine Direction

A 2D browser-first runtime.

### Recommended technical direction

* TypeScript-first
* Web-based editor frontend
* 2D rendering via Canvas/WebGL/WebGPU-compatible path
* Runtime optimized for browser playtesting and export

## 11.2 Runtime Responsibilities

* scene management
* entity/component support or equivalent modular object model
* input handling
* collisions/physics basics
* animation playback
* UI rendering hooks
* audio playback
* save/load basics

## 11.3 Engine Design Goal

The engine should be data-friendly and AI-legible.

That means:

* clear folder structure
* declarative data where possible
* reasonably modular systems
* predictable naming
* docs that agents can interpret easily

---

# 12. Suggested Technical Architecture

## 12.1 Major Subsystems

1. Frontend editor app
2. Backend API server
3. AI orchestration layer
4. Runtime engine
5. Asset pipeline service
6. Git/project service
7. OpenClaw integration service

## 12.2 Frontend Responsibilities

* editor shell UI
* project dashboard
* scene editor
* code workspace
* asset studio
* live preview integration
* AI command surfaces

## 12.3 Backend Responsibilities

* project CRUD
* file operations
* build/test execution
* Git operations
* AI request orchestration
* ComfyUI communication
* project metadata storage
* logging and task state

## 12.4 AI Orchestration Responsibilities

* provider routing
* prompt assembly
* context gathering
* tool calling
* task tracking
* memory integration
* role-specific AI actions

## 12.5 Asset Service Responsibilities

* connect to ComfyUI
* run generation workflows
* track metadata
* store outputs
* import/slice assets

## 12.6 OpenClaw Integration Responsibilities

* expose project state in stable format
* support agent-oriented repo workflows
* integrate with task and memory files
* optionally expose tool endpoints later

---

# 13. Suggested Repo Structure

```
clawgame/
 apps/
   web/
   api/
 packages/
   engine/
   editor-core/
   ai-orchestrator/
   asset-pipeline/
   project-sdk/
   ui/
   shared/
 docs/
   product/
     vision.md
     roadmap.md
   design/
     game_design.md
     ux_notes.md
   architecture/
     architecture.md
     engine_notes.md
     ai_integration.md
     comfyui_integration.md
     openclaw_integration.md
   tasks/
     backlog.md
     current_sprint.md
   qa/
     known_issues.md
     test_plan.md
   ai/
     project_memory.md
     agent_roles.md
 examples/
   sample-2d-platformer/
   sample-topdown-action/
 scripts/
 .github/
 clawgame.project.json
 package.json
 pnpm-workspace.yaml
 README.md
```

---

# 14. Functional Requirements

## 14.1 Project Creation

The system must allow users to create a new ClawGame project with:

* project name
* template type
* target runtime
* AI provider settings
* ComfyUI connection settings
* repo initialization option

## 14.2 AI Prompt-to-Feature

The system must allow users to request a gameplay/system feature through natural language and have AI implement it into the current project.

## 14.3 AI Bug Fixing

The system must allow users to submit build/runtime errors and request AI-assisted fixes.

## 14.4 Asset Generation

The system must allow users to generate art assets from inside the project context using ComfyUI.

## 14.5 Live Preview

The system must allow users to run the game in-browser for testing.

## 14.6 Scene Editing

The system must allow users to visually place and configure entities in 2D scenes.

## 14.7 Git Operations

The system must support basic repo initialization, change inspection, and commit creation.

## 14.8 Project Memory

The system must preserve structured project context for AI continuity.

## 14.9 OpenClaw Compatibility

The system must expose enough stable project structure and metadata for OpenClaw to inspect and operate the project.

---

# 15. Non-Functional Requirements

## 15.1 Explainability

AI actions should be explainable and summarized.

## 15.2 Reversibility

Changes should be reviewable and reversible through Git-based flows.

## 15.3 Performance

The editor should feel responsive for normal solo-project usage.

## 15.4 Reliability

File and repo operations should be safe and predictable.

## 15.5 Extensibility

The architecture should allow future plugin and provider expansion.

## 15.6 Agent Readability

The repo, metadata, and docs should be easy for OpenClaw and other agents to interpret.

---

# 16. UX Requirements

## 16.1 Main UX Loop

The primary user loop should be:

1. define or refine intent
2. delegate to AI
3. review changes
4. playtest immediately
5. iterate or rollback

## 16.2 UX Priorities

* reduce friction
* keep AI actions visible
* make generated work inspectable
* preserve a sense of control
* make playtesting very easy

## 16.3 Required UX Concepts

* command palette style access
* AI action log
* side-by-side diff + summary view
* visible build/play buttons
* clear asset import flows
* minimal ambiguity around project state

---

# 17. Security and Safety Constraints

## 17.1 AI Change Guardrails

The product should support:

* scoped changes
* confirmation for risky changes
* protected files/folders if needed
* rollback paths
* visible change summaries

## 17.2 Local/Hosted Considerations

If hosted, project isolation and secrets handling must be addressed.
If local or self-hosted, connection settings for AI providers and ComfyUI must be explicit and inspectable.

---

# 18. Initial Milestones

## Milestone 0: Foundation

### Goal

Create repo, package layout, docs skeleton, and initial project metadata model.

### Deliverables

* monorepo scaffold
* base docs structure
* `clawgame.project.json` schema draft
* initial web app shell
* initial API server shell

### Exit Criteria

* repo installs
* apps run in dev mode
* docs and package structure are in place

## Milestone 1: Core Editor Shell

### Goal

Create usable web app shell with dashboard, navigation, and basic project model.

### Deliverables

* project dashboard UI
* layout and routing
* project open/create flows
* placeholder AI command panel
* placeholder asset studio panel

### Exit Criteria

* user can create/open a project in the web UI
* project metadata is stored and displayed

## Milestone 2: Code + AI Workflow

### Goal

Enable AI-assisted coding workflows.

### Deliverables

* file tree and code editor
* backend file API
* AI command routing
* explain/change/fix flows
* diff summaries

### Exit Criteria

* user can request a code feature and inspect changes

## Milestone 3: 2D Runtime + Preview

### Goal

Make simple playable 2D games possible.

### Deliverables

* basic runtime package
* scene format
* entity handling basics
* in-browser preview
* simple movement template

### Exit Criteria

* a minimal example game can run in the preview panel

## Milestone 4: Scene Editor

### Goal

Allow visual editing of 2D scenes.

### Deliverables

* scene canvas
* entity placement
* inspector panel
* save/load scene data
* layer basics

### Exit Criteria

* user can place and configure entities visually and see changes in preview

## Milestone 5: ComfyUI Asset Pipeline

### Goal

Integrate AI asset generation.

### Deliverables

* ComfyUI connection settings
* workflow selection
* generation requests
* asset import flow
* metadata storage

### Exit Criteria

* user can generate an asset and import it into project assets

## Milestone 6: Git + OpenClaw Native Layer

### Goal

Make ClawGame repo- and agent-native.

### Deliverables

* repo init/commit flow
* docs/task/memory conventions
* OpenClaw integration docs
* stable project metadata

### Exit Criteria

* OpenClaw can inspect the repo and operate against a documented structure reliably

---

# 19. Acceptance Criteria for MVP

The MVP is complete when all of the following are true:

1. A user can create a new ClawGame project from the browser.
2. A user can describe a simple game feature and AI can implement it into the project.
3. A user can inspect the files changed by AI.
4. A user can run the game in a browser preview panel.
5. A user can visually edit a basic 2D scene.
6. A user can generate a simple asset through ComfyUI and import it into the project.
7. A user can initialize and commit the project to Git.
8. The project contains stable metadata/docs that OpenClaw can use.
9. A sample game template can be created and modified successfully.

---

# 20. Suggested Sample Templates

For the first wave of examples, build:

* simple 2D platformer
* top-down action prototype
* dialogue-driven adventure starter

These templates will help validate both engine and AI workflows.

---

# 21. OpenClaw Execution Notes

## 21.1 Required Working Style

When implementing this project with OpenClaw:

* always update task state before and after major work
* keep architecture docs current
* maintain stable repo conventions
* prefer small validated increments
* do not hide unresolved errors
* document every integration boundary clearly

## 21.2 Recommended Agent Assignment

* director-agent: roadmap, task decomposition, consistency
* tools-agent: monorepo, build system, internal tooling
* gameplay-agent: runtime, systems, templates
* ui-agent: editor interface and UX
* asset-agent: ComfyUI integration and asset metadata
* qa-agent: validation, test plans, regression checks

## 21.3 Documentation Discipline

Every milestone should update:

* `docs/tasks/current_sprint.md`
* `docs/architecture/architecture.md`
* `docs/qa/known_issues.md`
* `docs/ai/project_memory.md`

---

# 22. Priority Task Backlog

## P0

* create monorepo scaffold
* define project metadata schema
* build web app shell
* build API shell
* define docs structure
* define OpenClaw repo conventions

## P1

* add code workspace
* add file APIs
* implement AI command flow
* implement diff summaries
* create runtime skeleton
* create live preview

## P2

* build scene editor basics
* create basic entity model
* implement save/load scene format
* create starter templates

## P3

* connect ComfyUI
* support asset generation history
* support asset import and metadata

## P4

* add Git center
* add commit flows
* finalize OpenClaw-native integration docs

---

# 23. Risks and Mitigations

## Risk 1: Scope Explosion

**Mitigation:** keep MVP strictly 2D, browser-first, solo-creator focused.

## Risk 2: AI Generates Fragile Code

**Mitigation:** enforce architecture docs, diff review, validation, and task memory.

## Risk 3: Asset Pipeline Becomes Too Loose

**Mitigation:** require metadata, workflow templates, and stable asset paths.

## Risk 4: OpenClaw Integration Is Too Ad Hoc

**Mitigation:** define explicit machine-readable project metadata and doc conventions early.

## Risk 5: Scene/Runtime Model Is Too Hard for AI to Understand

**Mitigation:** keep formats simple and declarative where possible.

---

# 24. Future Expansion Areas

Not part of MVP, but important:

* visual scripting / node graph editor
* dialogue graph editor
* economy/inventory editors
* performance profiling dashboards
* plugin architecture
* collaborative editing
* multiplayer helpers
* export targets beyond browser
* advanced asset pipeline automation
* in-editor AI playtest bots

---

# 25. Final Product Definition

ClawGame is an AI-first web game engine and editor built to let humans direct game creation while AI handles implementation, generation, debugging, and iteration. It combines code generation, asset generation, live playtesting, Git-aware workflows, and OpenClaw-native orchestration into a single browser-based product.

This MVP should focus on proving one thing clearly:

**a user can go from idea to playable 2D browser game prototype with meaningful AI assistance inside one integrated system.**
