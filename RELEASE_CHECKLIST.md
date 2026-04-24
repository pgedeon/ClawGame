# ClawGame 1.0 Release Checklist

## Pre-Release

- [x] All quality gates pass (engine typecheck/test, web typecheck/test, phaser-runtime lint/test, build)
- [x] CI workflow configured (`.github/workflows/ci.yml`)
- [x] CHANGELOG.md written with 1.0.0 entry
- [x] README.md matches actual repo structure
- [x] `docs/qa/known_issues.md` updated
- [x] E2E smoke tests cover critical paths
- [x] Migration tests verify backward compatibility
- [x] No known high-priority bugs

## All Milestones Complete

- [x] M0: Project Scaffolding
- [x] M1: Core ECS Engine
- [x] M2: Web Editor Shell
- [x] M3: Scene Editor v1
- [x] M4: Asset Pack Editor
- [x] M5: Code Export
- [x] M6: Physics Tooling
- [x] M7: Animations Editor
- [x] M8: Tilemap Editor
- [x] M9: Prefabs and Components
- [x] M10: AI-Assisted Editor Workflows
- [x] M11: UX and Product Polish
- [x] M12: Release Hardening

## Post-Release

- [ ] Tag release: `git tag v1.0.0 && git push --tags`
- [ ] Create GitHub Release with CHANGELOG summary
- [ ] Verify CI passes on tagged commit
- [ ] Update documentation site if applicable
