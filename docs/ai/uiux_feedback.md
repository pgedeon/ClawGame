# UI/UX Review Feedback

**Last Review:** 2026-04-09 20:26 UTC
**Reviewed Version:** 3295238 (7 commits since last review: M9/M10 sprint work)
**Reviewer:** UI/UX Design Agent
**Status:** on-track

---

## 🎯 Alignment with Goal

ClawGame continues to build momentum as an **AI-first, browser-based game dev platform**. The M9/M10 sprint added meaningful pieces — AI Settings, Project Notes, Animation Preview, Asset Factory, prompt recipe library, and scene binding. The design system (`theme.css`) remains a genuine strength: consistent tokens, dark studio palette, proper spacing/radius/z-index scales. The AI FAB with contextual injection is the right architectural call.

The gap now is **polish and cohesion** — individual features work, but the experience doesn't yet feel unified. Several new components hardcode colors instead of using design tokens, and the AI workflow (prompt → generate → preview → iterate) has friction points.

---

## ✨ What Looks Great

1. **Design system (theme.css)** — Comprehensive, well-organized tokens. Dark studio palette is cohesive. AI-specific branding vars (`--ai-primary`, `--ai-gradient`, `--ai-glow`) create a distinct AI identity. This is genuinely strong.

2. **Animation Preview** — The checkerboard transparency background, pixel-art-friendly rendering (`image-rendering: pixelated`), frame strip with active state, FPS slider — this is professional quality. The purple highlight on active frames feels right.

3. **AI FAB + Panel** — Floating action button with glow animation, thinking state, recipe library toggle, contextual entity actions. The panel animation (`ai-panel-in`) is smooth. Mobile responsive (bottom sheet on small screens). This is the most "AI-native" element.

4. **Prompt Recipe Library** — Category pills, search, icon + title + description cards. Good progressive disclosure (collapsed by default). This teaches users what AI can do without overwhelming them.

5. **Accessibility foundations** — Skip link, focus-visible styles, reduced-motion media query, contrast fix for `--text-muted`. Not an afterthought.

6. **Code-splitting** — Lazy loading for project-scoped pages. Good performance hygiene.

---

## 🐛 What Needs Improvement (Top 5)

### 1. **Hardcoded colors in new components** — Inconsistent with design system

**Location:** `animation-preview.css`, `asset-studio.css`, `game-preview.css`
**Problem:** New M9/M10 components use raw hex values (`#64748b`, `#1e293b`, `#cbd5e1`, `#8b5cf6`) instead of design tokens. Animation preview has ~15 hardcoded colors. This breaks theme consistency and makes light-mode support impossible for these components.
**Solution:** Replace all hardcoded colors with CSS custom properties.

```css
/* ❌ animation-preview.css */
background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px;
color: #94a3b8;
background: rgba(15, 23, 42, 0.8);

/* ✅ Should be */
background: repeating-conic-gradient(var(--surface) 0% 25%, var(--bg) 0% 50%) 50% / 16px 16px;
color: var(--fg-secondary);
background: rgba(var(--bg-rgb), 0.8);
```

**Priority:** HIGH — Every new component that hardcodes colors increases technical debt.

---

### 2. **AI Settings page is disconnected from the AI experience**

**Location:** `apps/web/src/pages/AISettingsPage.tsx`, `apps/web/src/ai-settings.css`
**Problem:** AI Settings lives as a separate page (`/project/:id/ai-settings`) when it should feel like a configuration extension of the AI FAB/panel. Users who open the AI panel to create content shouldn't need to navigate away to check model status. The page also hardcodes `localhost:3000` for API calls.
**Solution:**
- Add a "Model status" indicator inside the AI FAB panel header (small dot + model name, clickable to expand settings)
- Keep the full settings page for advanced config, but make it reachable from the FAB panel
- Use the `api` client instead of raw `fetch('http://localhost:3000/...')`

**Priority:** MEDIUM — UX friction for a key AI workflow.

---

### 3. **Project Notes Panel needs visual integration**

**Location:** `apps/web/src/components/ProjectNotesPanel.tsx`, `apps/web/src/project-notes.css`
**Problem:** The notes panel is a standalone component but its visual treatment doesn't match other sidebar panels (scene hierarchy, asset panels). It's unclear where it lives in the layout — is it a sidebar panel? A modal? A drawer? The default sections (goals, constraints, TODOs, notes) are smart, but the collapsed/expanded states need to match the design language of other collapsible sections.
**Solution:**
- Use consistent panel chrome (same header style as scene hierarchy)
- Add a subtle AI integration: "Summarize my notes" or "Generate TODOs from goals" quick action
- Match the sidebar panel padding, borders, and collapse animation of existing panels

**Priority:** MEDIUM — Notes are where users capture intent; AI should be able to read them.

---

### 4. **Dashboard hero section lacks a compelling first impression**

**Location:** `apps/web/src/pages/DashboardPage.tsx`, hero section
**Problem:** The dashboard hero with animated orbs is decorative but doesn't communicate value. For first-time visitors, the hero says "Welcome to ClawGame" but doesn't show *what you can build* or *how AI helps*. The orbs are generic — they could be any SaaS product.
**Solution:**
- Replace static orbs with a **mini interactive demo**: show a small canvas where a pre-built game runs, or cycle through screenshots of example games built with ClawGame
- Add a one-line value prop under the heading: "Describe your game. AI builds it. You refine."
- The "Try AI Command ⌘K" CTA is good — make it more prominent, maybe as the primary action

**Priority:** MEDIUM — First impression drives adoption.

---

### 5. **Light mode is broken in practice**

**Location:** `apps/web/src/theme.css` (light mode overrides exist)
**Problem:** The `prefers-color-scheme: light` overrides exist in theme.css, but almost every component CSS file hardcodes dark-mode assumptions. The accessibility.css file overrides `--text-muted` outside the media query. Light mode would look broken — dark text on light backgrounds with dark-specific opacity values everywhere.
**Solution:**
- Either commit to light mode properly (use tokens everywhere, test it) or remove the light mode overrides and position ClawGame as a **dark-mode-only professional tool** (like Figma, Unity, Blender). Dark-only is fine and reduces scope.
- If keeping dark-only: add a comment in theme.css explaining this choice, remove the misleading light mode block.

**Priority:** LOW — But the current state is worse than committing to one direction.

---

## 📐 Layout Recommendations

### Navigation
- The sidebar is well-structured with section titles and active states. Good.
- **Missing:** Breadcrumbs inside project pages. When you're in `/project/abc/scene-editor`, there's no visible path back to dashboard or project root beyond the sidebar. A subtle breadcrumb bar would help orientation.

### AI Workflow Path
- The path from "idea → AI generates → preview → refine" has too many page transitions. Scene Editor → AI Command → Preview are separate routes. Consider an **inline preview** in the scene editor (small picture-in-picture canvas) so users can test without context-switching.

---

## 🔍 Competitive Research

| Platform | What They Do Well | What We Can Learn |
|----------|------------------|-------------------|
| **Construct 3** | Event sheet system is visual and intuitive. Layout editor with instant preview. Properties panel is contextually rich. | Contextual property panels — show relevant properties based on selection. Their layout/preview combo is the gold standard for browser editors. |
| **GDevelop** | Open-source, free, growing AI integration ("Use AI to learn and build faster"). Asset store integration. Visual scripting events. | Their community-driven asset sharing is powerful. We should consider a shared asset/template library. |
| **Rosebud AI** | Pure prompt-to-game. Minimal UI friction. | The "just describe it" approach validates our AI-first direction. But their output quality is limited — we can win on depth. |
| **Cursor/Replit** | AI is ambient and always available, not a separate mode. Inline diffs, contextual suggestions. | AI should never feel like a separate tool. It should be embedded in every panel, every workflow. |

**Key Insights:**
- Construct 3's UX is the benchmark for browser game editors — their layout/properties/events paradigm is mature
- The "AI as feature add-on" approach (GDevelop, Unity) feels bolted on; ClawGame's "AI as foundation" is the right differentiator
- Rosebud proves there's demand for prompt-to-game, but depth and iterability are the gaps to fill
- Micro-interactions and visual polish (Figma-level attention to detail) are what separate "impressive demo" from "professional tool"

**Features to Consider:**
- **Contextual property panel** — When selecting an entity in scene editor, show all editable properties in a sidebar panel (like Construct 3). This is table stakes for game editors.
- **Inline mini-preview** — Small canvas overlay in scene editor for quick testing without page navigation.
- **Asset drag-and-drop** — From asset studio directly onto scene canvas (GDevelop users specifically request this).

---

## 📋 Priority Fixes

1. **🔴 HIGH: Token compliance audit** — Run a pass over all CSS files added in M9/M10 and replace hardcoded colors with design tokens. This is accumulating debt that gets harder to fix over time.
2. **🟡 MEDIUM: AI Settings integration into FAB** — Don't make users leave their workflow to check model status. Add inline status to the AI panel.
3. **🟡 MEDIUM: Dashboard first impression** — Replace decorative orbs with something that communicates value (mini game demo, example screenshots, or interactive prompt).
4. **🟢 LOW: Commit to dark-only or fix light mode** — Don't leave it in the ambiguous middle.
5. **🟢 LOW: Breadcrumbs** — Add orientation cues inside project pages.

---

## 💡 Creative Ideas

**AI-Specific UX Innovations:**
- **"AI Confidence" indicator** — When AI generates code/assets, show a confidence level or "I'm 80% sure this is what you want. Want me to try again?" This sets expectations and encourages iteration.
- **Inline AI annotations** — In the scene editor, let AI leave notes/annotations on entities ("This sprite might look better with a shadow" or "Consider adding a collider here"). Like code review comments but on game objects.
- **AI suggestion chips** — After any AI action, show 2-3 follow-up suggestion chips ("Add enemies", "Polish animation", "Test in preview") to guide the next step. Reduces blank-canvas syndrome.

**Standout Features:**
- **Game Jam mode** — A timer-based constraint mode where AI helps you build a game in 48 hours. Shows progress, suggests shortcuts, auto-generates placeholders. Marketable and differentiated.
- **"Show me what AI changed"** — Visual diff overlay for AI-generated changes. Highlight new entities in green, modified in yellow, deleted in red. Makes AI actions transparent and trustworthy.

---

## 📊 UI/UX Score

| Area | Current | Target | Notes |
|------|---------|--------|-------|
| Visual Design | B | A | Design system is solid; new components need token compliance |
| User Experience | B- | A | AI workflow has friction; dashboard needs better first impression |
| Accessibility | B | A | Good foundations; needs more keyboard navigation testing |
| AI-Native Feel | B+ | A+ | FAB + recipes + contextual injection are great; needs ambient integration everywhere |
| Innovation | B+ | A | AI-first positioning is right; needs more "wow" moments (inline preview, annotations) |

**Overall: B (on-track, needs polish pass)**
