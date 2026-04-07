# 🎮 ClawGame

**AI-first, web-based 2D game engine and editor.**

[![Version](https://img.shields.io/badge/version-0.1.0--foundation-blue.svg)](./VERSION.json)
[![Milestone](https://img.shields.io/badge/milestone-0%20Foundation-green.svg)](./docs/product/roadmap.md)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

ClawGame lets you design, generate, debug, iterate, and ship 2D browser games using integrated AI coding agents, asset generation pipelines (ComfyUI), and native OpenClaw orchestration.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/clawgame/clawgame.git
cd clawgame

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

- **Web Editor**: http://localhost:5173
- **API Server**: http://localhost:3000

## 📁 Project Structure

```
clawgame/
├── apps/
│   ├── web/              # React-based editor frontend
│   └── api/              # Fastify backend API
├── packages/
│   ├── engine/           # 2D runtime engine
│   ├── editor-core/      # Editor logic and state
│   ├── ai-orchestrator/  # AI provider routing
│   ├── asset-pipeline/   # ComfyUI integration
│   ├── project-sdk/      # Project manipulation API
│   ├── ui/               # Shared UI components
│   └── shared/           # Shared utilities and types
├── docs/
│   ├── product/          # Vision, roadmap
│   ├── design/           # Game design, UX notes
│   ├── architecture/     # System architecture
│   ├── tasks/            # Backlog, sprint docs
│   ├── qa/               # Known issues, test plans
│   └── ai/               # AI project memory
├── examples/             # Sample game projects
├── projects/             # User game projects (gitignored)
├── CHANGELOG.md          # Version history
├── VERSION.json          # Current version info
└── clawgame.project.json # Machine-readable project metadata
```

## 🎯 Current Status

**Milestone 0: Foundation** — Creating repo, package layout, docs skeleton, and initial project metadata model.

See [Roadmap](docs/product/roadmap.md) for full timeline.

## 🤖 AI Integration

ClawGame is designed to be operable by AI agents natively:

- **OpenClaw Integration**: Agents can inspect and modify projects
- **Multi-role AI**: Builder, Art, and Director roles
- **ComfyUI**: Asset generation for sprites, tilesets, textures

### AI Agent Roles

| Role | Responsibility |
|------|---------------|
| `director-agent` | Roadmap, task decomposition, consistency |
| `gameplay-agent` | Runtime, systems, templates |
| `ui-agent` | Editor interface and UX |
| `tools-agent` | Monorepo, build system, tooling |
| `asset-agent` | ComfyUI integration, asset metadata |
| `qa-agent` | Validation, test plans, regression checks |

## 📖 Documentation

- [Product Vision](docs/product/vision.md)
- [Architecture Overview](docs/architecture/architecture.md)
- [Current Sprint](docs/tasks/current_sprint.md)
- [Known Issues](docs/qa/known_issues.md)
- [Full Product Spec](CLAWGAME_SPEC.md)

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @clawgame/engine test
```

## 🛠️ Development

```bash
# Development servers
pnpm dev              # Start all
pnpm dev:web          # Frontend only
pnpm dev:api          # Backend only

# Build
pnpm build

# Lint
pnpm lint
```

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [OpenClaw](https://openclaw.ai) native integration
- Asset generation via [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- Inspired by the vision of AI-first game development

---

*ClawGame: From idea to playable 2D browser game with AI assistance.*
