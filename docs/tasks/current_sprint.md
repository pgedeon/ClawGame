# Current Sprint: M14 Playtest Lab + Publishing

**Status:** 🟡 In Progress  
**Started:** 2026-04-10  
**Previous:** M13 Gameplay Authoring Layer ✅ Complete

---

## Context

M13 shipped the gameplay authoring layer with behavior graphs, visual logic, navigation, genre kits, and AI-assisted graph generation — all 217+ tests passing, build/lint/typecheck clean.

M14 focuses on the loop from build → test → share. Making preview, QA, export, and publishing equally fast as creation.

---

## M14 Deliverables

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Multi-device layout preview | ✅ Done | DevicePreviewFrame component: phone/tablet/desktop profiles with rotate, responsive mode |
| Local + cloud preview environments | 📋 TODO | Cloud target placeholder exists |
| Deterministic replay capture | 📋 TODO | |
| Time-travel debugging | 📋 TODO | |
| AI playtest mode | 📋 TODO | |
| Export improvements | 📋 TODO | |
| One-click publish targets | 📋 TODO | |

### This Run (2026-04-10)
- **Multi-device layout preview** — New `DevicePreviewFrame` component:
  - 8 device profiles: iPhone SE, iPhone 15, Pixel 8, iPad Mini, iPad Pro, Laptop, Desktop + Responsive
  - Phone notch simulation, device-specific border radii and shadows
  - Rotate button for portrait/landscape toggle
  - Responsive scaling for oversized frames
  - Integrated into GamePreviewPage wrapping the canvas container
  - All quality gates pass: build ✅, test ✅ (79 web + 217 engine), lint ✅

### Quality Gates

| Gate | Status | Details |
|------|--------|---------|
| `pnpm test` | ✅ Pass | All tests passing |
| `pnpm build` | ✅ Pass | Clean build |
| `pnpm lint` | ✅ Pass | No issues |

---

## Exit Criteria

- [ ] Users can preview the same game across multiple device profiles
- [ ] Bugs found during playtests can be replayed and attached to AI debugging workflows
- [ ] Publishing is a guided product flow, not just a raw export button

---

**Sprint Owner:** @dev  
**Last Updated:** 2026-04-10 13:18 UTC
