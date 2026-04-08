# UI/UX Review Feedback

**Last Review:** 2026-04-08 16:47 UTC
**Reviewed Version:** ebc8f47 (docs: update sprint file with v0.11.8)
**Previous Review:** 2026-04-08 12:56 UTC (9eb815d)
**Status:** on-track — significant improvements since last review, key gaps remain

---

## 🎯 Alignment with Goal

**Goal:** Make the best web-based AI-first game development platform that exists.

**How current UI/UX supports this:**

✅ **Strong foundation now in place:**
- Dark studio theme is professional and game-dev appropriate (not a generic SaaS look)
- AI is present at every level: command palette (⌘K), AI FAB, AI Command page, Scene Editor AI bar, Asset Studio generation
- Onboarding tour + welcome modal + project onboarding guide = layered first-time experience
- Game preview now has full game loop (start screen → gameplay → victory/game over with HUD, health, score)
- Template-first project creation gets users to a playable game fast
- Code-split lazy loading shows performance awareness

⚠️ **Critical gaps to close:**
- AI still feels like a separate destination (AI Command page) rather than an ambient co-pilot woven into every surface
- No inline AI suggestions or "ghost text" in the code editor
- Settings page is a stub (`<h1>Settings</h1><p>Coming soon</p>`)
- No undo/redo visual indicators, no keyboard shortcut cheat sheet accessible from UI
- Mobile layout works but feels like a concession, not a designed experience

---

## 🎨 Overall Design Direction

**Current Style:** Dark studio theme with purple (#6366f1/#8b5cf6) as primary accent, cyan (#22d3ee) as secondary, slate backgrounds (#0f172a → #1e293b). Inter for UI, JetBrains Mono for code. Glassmorphism touches (backdrop-filter: blur) in headers.

**Recommended Direction:** Continue refining the dark studio aesthetic but push toward a **"creative IDE"** feel — think Figma meets VS Code meets a game engine. The platform should feel like a professional tool that happens to have AI superpowers, not a consumer app.

**Brand Personality:** Confident, precise, slightly magical. The AI should feel like a brilliant collaborator sitting next to you, not a chatbot you visit in another room.

---

## ✨ What Looks Great

1. **Dashboard Hero Section** (`DashboardPage.tsx` → `.dashboard-hero`) — The gradient background with floating orbs, the "AI-Native Platform" badge, the gradient text on the headline. This is a strong first impression. The animated orbs add life without being distracting.

2. **Game Preview HUD** (`GamePreviewPage.tsx`) — Health bar, score display, collected runes counter, start/victory/game-over screens with proper overlay styling. This now feels like a real game preview, not a bare canvas. The particle system and combat effects are impressive.

3. **Command Palette** (`CommandPalette.tsx`) — Categorized results (Navigate, AI Commands, Actions), keyboard navigation, footer with shortcuts. Clean implementation. The `cmd-overlay` → `cmd-palette` pattern is well-executed.

4. **Design System Foundation** (`theme.css`) — Comprehensive CSS custom properties covering colors, spacing, typography, radii, shadows, z-index layers, game-specific vars. The light mode override via `prefers-color-scheme` is forward-thinking.

5. **Project Hub Tab Bar** (`ProjectPage.tsx` → `.project-hub-tabs`) — Clean tab navigation with icons, active state highlighting, horizontal scroll on overflow. The gradient text on the project name is a nice touch.

6. **Template Selection** (`CreateProjectPage.tsx`) — Three distinct game templates (Platformer, Top-Down, Dialogue) with meaningful default scenes and scripts. Each template creates actual runnable game files. This is the right approach for an AI-first platform.

7. **Onboarding Tour** (`OnboardingTour.tsx`) — Version-tracked (`TOUR_VERSION`), localStorage-gated, step-dots progress indicator. Shows awareness that onboarding needs to evolve with the product.

8. **AI Thinking Indicator** (`AICommandPage.tsx` → `.ai-thinking-indicator`) — Pulsing rings with Sparkles icon and step labels ("Analyzing...", "Processing...", "Generating..."). This sets expectations well during AI wait times.

---

## 🐛 What Needs Improvement

### 1. **Settings Page is a Stub**
- **Location:** `apps/web/src/pages/SettingsPage.tsx`
- **Problem:** Only renders `<h1>Settings</h1><p>Coming soon</p>`. Users who click Settings feel like the app is unfinished.
- **Solution:** Build a minimal but functional settings page with:
  - Theme toggle (dark/light/system)
  - AI model selection (when real AI connected)
  - Keyboard shortcuts reference
  - Default project settings (genre, art style)

```tsx
// Suggested structure for SettingsPage.tsx
export function SettingsPage() {
  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Configure your development environment</p>
      </header>

      <div className="settings-grid">
        <section className="settings-section">
          <h2>Appearance</h2>
          <div className="setting-item">
            <label>Theme</label>
            <ThemeToggle /> {/* dark | light | system */}
          </div>
        </section>

        <section className="settings-section">
          <h2>AI</h2>
          <div className="setting-item">
            <label>Default AI Model</label>
            <select>{/* model options */}</select>
          </div>
          <div className="setting-item">
            <label>AI Auto-suggestions</label>
            <Toggle />
          </div>
        </section>

        <section className="settings-section">
          <h2>Keyboard Shortcuts</h2>
          <ShortcutTable />
        </section>
      </div>
    </div>
  );
}
```

### 2. **AI Command Page is Isolated, Not Integrated**
- **Location:** `apps/web/src/pages/AICommandPage.tsx`
- **Problem:** The AI lives on its own page. Users must navigate away from their work to ask AI for help. This breaks flow state. The AIFAB exists but returns "Preview Mode" responses — it's essentially decorative.
- **Solution:** Make AI ambient. Three levels:
  - **Level 1 (Quick):** AIFAB should open a proper context-aware panel that knows what file/scene is open
  - **Level 2 (Inline):** Code editor should have inline AI (type a comment → AI completes the function)
  - **Level 3 (Deep):** Keep the AI Command page for complex multi-step operations, but rename it to "AI Studio" and make it feel like a workspace, not a chatbot

```css
/* AIFAB panel should be wider and positioned better */
.ai-panel {
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 420px;        /* wider than current ~320px */
  max-height: 500px;
  /* ... */
}
```

### 3. **GamePreviewPage.tsx is a 900+ Line Monolith**
- **Location:** `apps/web/src/pages/GamePreviewPage.tsx` (925 lines)
- **Problem:** The entire game engine (physics, combat, particles, HUD, input handling, collision detection) lives in one React component. This is fragile, hard to debug, and impossible to reuse.
- **Solution:** Decompose into:
  - `hooks/useGameEngine.ts` — game loop, update/render cycle
  - `hooks/usePhysics.ts` — gravity, velocity, collision
  - `hooks/useCombat.ts` — enemies, projectiles, damage
  - `components/game/HUD.tsx` — health, score, runes overlay
  - `components/game/StartScreen.tsx` — pre-game screen
  - `components/game/VictoryScreen.tsx` — win/lose screens
  - `GamePreviewPage.tsx` — orchestration only

### 4. **No Visual Undo/Redo or Change Tracking**
- **Problem:** Users can edit scenes, code, and assets but there's no visible undo/redo stack, no change indicators, no dirty state warnings. If a user makes a mistake, there's no safety net visible in the UI.
- **Solution:**
  - Add undo/redo buttons to the editor toolbar
  - Show a "unsaved changes" dot indicator in the tab bar
  - Add a change history panel accessible via sidebar

```css
/* Dirty state indicator */
.project-hub-tab.dirty::after {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--warning);
  position: absolute;
  top: 8px;
  right: 8px;
}
```

### 5. **Sidebar Navigation is Confusing When Switching Contexts**
- **Location:** `apps/web/src/components/AppLayout.tsx`
- **Problem:** The sidebar shows global nav (Dashboard, Create, Open, Examples, Settings) always. When inside a project, project-specific nav (Editor, Scene Editor, AI, Assets, Preview) gets appended below. This creates a long, undifferentiated list.
- **Solution:** Use a two-level sidebar:
  - Top section: Project context (collapsible when not in project)
  - Bottom section: Global navigation
  - Add section dividers with labels

```tsx
// Sidebar should have clear sections
<nav className="sidebar-nav">
  {isInProjectContext && (
    <>
      <div className="sidebar-section-title">Project</div>
      {projectNavItems.map(item => <NavItem ... />)}
      <div className="sidebar-divider" />
    </>
  )}
  <div className="sidebar-section-title">Platform</div>
  {globalNavItems.map(item => <NavItem ... />)}
</nav>
```

### 6. **CSS is Fragmented Across 20+ Files Without Consistent Patterns**
- **Location:** All `*.css` files in `apps/web/src/`
- **Problem:** Styles are split across `App.css` (800+ lines), `index.css`, `theme.css`, `game-hub.css`, `game-preview.css`, `scene-editor.css`, `ai-command.css`, `ai-fab.css`, `command-palette.css`, etc. Many have overlapping concerns (`.project-card` is styled in both `index.css` and `App.css`). The `.btn-*` unified system in `App.css` coexists with `.primary-button`, `.cta-button`, `.secondary-button` in `index.css`.
- **Solution:** 
  - Consolidate button variants — use `.btn-primary`, `.btn-secondary`, `.btn-ghost` everywhere
  - Create `components.css` for shared component styles
  - Keep page-specific CSS files but ensure no cross-file selector conflicts
  - Audit and remove dead CSS (`.demo-create`, `.demo-hint` appear unused)

### 7. **Accessibility Gaps**
- **Location:** Throughout
- **Problems:**
  - Hero orbs (`hero-orb-1/2/3`) have `aria-hidden="true"` ✅ but no `prefers-reduced-motion` respect — they animate forever
  - Color contrast: `--text-muted: #64748b` on `--bg: #0f172a` = 4.8:1 (passes AA for normal text) ✅ but `--fg-secondary: #94a3b8` on `--surface: #1e293b` = 5.5:1 ✅
  - `--text-muted: #64748b` on `--card: #1e293b` = only 3.7:1 — **fails WCAG AA** for small text
  - The AI thinking indicator uses only color/animation to convey state — needs `aria-live="polite"` and text announcements
  - Tab navigation (`project-hub-tabs`) uses `<Link>` but has no `role="tablist"` / `role="tab"` ARIA

```css
/* Fix: respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hero-orb,
  .ai-fab-pulse,
  .build-spinner,
  .pulse-ring {
    animation: none !important;
  }
}

/* Fix: text-muted contrast */
:root {
  --text-muted: #7c8ca0; /* bumped from #64748b for better contrast on cards */
}
```

```tsx
// Fix: ARIA on thinking indicator
<div className="ai-thinking-indicator" role="status" aria-live="polite">
  <span className="sr-only">AI is thinking...</span>
  {/* visual elements */}
</div>
```

### 8. **Error States Are Functional But Not Helpful**
- **Location:** `App.css` → `.error-state`, `DashboardPage.tsx` error handling
- **Problem:** Error messages show raw error text. No suggested actions, no context about what went wrong, no links to relevant help.
- **Solution:** Add error categorization and actionable suggestions:

```tsx
// Structured error component
function ErrorState({ error, onRetry, context }: ErrorProps) {
  const guidance = getErrorGuidance(error); // network? auth? not-found?
  return (
    <div className="error-state" role="alert">
      <div className="error-icon">{guidance.icon}</div>
      <h3>{guidance.title}</h3>
      <p>{guidance.description}</p>
      <div className="error-actions">
        {onRetry && <button onClick={onRetry}>Try Again</button>}
        {guidance.link && <Link to={guidance.link.href}>{guidance.link.text}</Link>}
      </div>
    </div>
  );
}
```

---

## 📐 Layout Recommendations

### Navigation

**Current:** Left sidebar (240px), sticky, full height. On mobile: bottom tab bar.

**Recommendations:**
1. Add a **sidebar collapse toggle** (already have `--sidebar-collapsed-width: 64px` defined but unused in the main layout). Show icon-only mode for power users who want more canvas space.
2. Add **breadcrumb navigation** inside the project hub header (`Dashboard → My Game → Scene Editor`) for spatial orientation.
3. Consider a **top bar** for the project hub that combines the header + tabs into a single compact strip (saves ~40px vertical space).

### Main Content Area

**Current:** Full-width content below sidebar, scrollable.

**Recommendations:**
1. The dashboard hero takes ~300px of vertical space. On repeat visits this is wasted. Add a **compact mode** that shows just the hero title + actions in one line after the first visit.
2. Project overview page (`ProjectOverview`) shows 6 action cards — these duplicate the sidebar navigation. Consider replacing with a **recent activity feed** + project stats, since the sidebar already provides navigation.

### Panels/Sidebars

**Current:** Scene editor has right-side property inspector. AI panel floats bottom-right.

**Recommendations:**
1. Add **resizable panel borders** — the scene editor panels should be draggable (CodeMirror-style).
2. The AI panel (AIFAB) should dock to the right side when opened from within the code editor or scene editor, not float over content.
3. Add a **bottom panel** concept (terminal output, build logs, console) that can be toggled — game devs expect this pattern from every IDE.

---

## 🎭 Visual Elements

### Colors

The current palette is solid. Here are refinements:

```css
/* Recommended adjustments */
:root {
  /* Fix contrast issue */
  --text-muted: #7c8ca0;          /* was #64748b — fails AA on cards */
  
  /* Add semantic surface variants */
  --surface-elevated: #273548;     /* for dropdowns, popovers */
  --surface-sunken: #0c1222;       /* for canvas areas, code bg */
  
  /* Strengthen AI brand differentiation */
  --ai-gradient: linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #c084fc 100%);
  --ai-glow-strong: 0 0 30px rgba(139, 92, 246, 0.4);
  
  /* Add warm accent for highlights/notifications */
  --warm-accent: #f59e0b;
  --warm-accent-light: rgba(245, 158, 11, 0.15);
}
```

### Typography

```css
/* Current is good. Add these utility sizes */
:root {
  --text-display: 3rem;       /* hero only */
  --text-title: 2rem;         /* page headers */
  --text-section: 1.35rem;    /* section titles */
}

/* Consider adding a display/brand font for the logo */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap');

.sidebar-header h1 {
  font-family: 'Space Grotesk', var(--font-sans);
  /* Gives the brand a distinct feel from the UI font */
}
```

### Spacing

```css
/* Current scale is comprehensive. One addition: */
:root {
  --space-gutter: 2rem;    /* consistent page-level padding */
}

/* Use it consistently */
.dashboard-page,
.project-overview-page,
.settings-page {
  padding: var(--space-gutter);
}
```

---

## 🔍 Competitive Research

| Platform | What They Do Well | What We Can Learn |
|----------|-------------------|-------------------|
| **Construct 3** | Fully browser-based, event-sheet visual scripting, instant preview, properties panel with visual editors | The event sheet is their killer feature — we should offer an AI-powered equivalent: describe behavior in natural language → AI generates the event logic |
| **GDevelop** | Free/open source, visual scripting with conditions/actions, one-click export to multiple platforms, extensibility | Their "no-code" approach reaches non-programmers. Our AI is our "no-code" — we should market it that way and make the code editor optional/hidden for beginners |
| **Unity** | Panel-based layout with drag-to-resize, inspector hierarchy, asset store integration, play/edit mode toggle | The play/edit mode toggle is essential. Our preview works but the transition back to editing should be seamless — consider live-editing during preview |
| **Godot** | Node-based scene system, GDScript is beginner-friendly, built-in animation editor, lightweight | Their node-based scene composition is intuitive. Our entity/component system is similar but the UI doesn't make the parent-child relationship visible |
| **PlayCanvas** | Real-time collaboration, cloud-based asset management, web-first architecture | Real-time collab is a future feature for us, but cloud asset management (shareable sprite libraries) would be valuable now |
| **Rosebud AI** | AI-first game creation from text prompts, instant visual output, chat-based editing | This is our closest competitor. They lead on "type a prompt → get a game." We need to match that speed AND provide deeper editing capabilities they lack |
| **Cursor/VS Code** | Inline AI with ghost text, Ctrl+K for inline edit, tab to accept suggestions, diff view for AI changes | The ghost text / inline AI pattern is the gold standard. Our code editor (CodeMirror) should support this natively |
| **Figma** | Canvas + panels layout, selection-based property editing, plugin ecosystem | Their canvas interaction model (select → properties appear) is exactly what our scene editor should feel like |

### Key Insights

1. **The "type → game" flow is table stakes now.** Rosebud AI has proven users want to describe a game and see it. Our AI Command page does this, but the path isn't obvious from the dashboard. The hero CTA should lead to "Describe your game → AI builds it" not just "New Project."

2. **Visual scripting is still king for non-coders.** Every major browser game engine offers it. Our AI should *be* our visual scripting — but we need to make that equivalence clear in the UI.

3. **The edit → preview → edit loop must be instant.** Construct 3's instant preview is consistently rated their #1 feature. Our game preview loads a new page — it should be a split-screen or overlay.

4. **Panel-based layouts with resizable areas are expected.** Unity, Godot, Construct 3 all use this pattern. Our fixed-width panels feel rigid by comparison.

### Features to Consider

- **Live preview split-screen** — Show the game running alongside the editor, auto-refreshing on code changes. This is the single highest-impact UX improvement possible.
- **AI inline suggestions in code editor** — Ghost text (grayed-out AI suggestions) that users can tab to accept. This is the Cursor pattern and it's transformative.
- **Visual diff for AI changes** — When AI modifies code, show a red/green diff view instead of just replacing the file. Users need to trust AI changes.
- **One-click "Describe → Build" flow** — A prominent input on the dashboard where new users can type a game idea and immediately see a result, no project creation form required.
- **Contextual AI tooltips** — Hover over any entity in the scene editor → "Ask AI about this" button appears. Reduces the distance between question and answer.
- **Export progress with shareable link** — After exporting, show a hosted preview URL. This turns users into advocates.

---

## 📋 Priority Fixes

### 🔴 High Priority (Next Sprint)

1. **Fix text-muted contrast on cards** — `#64748b` on `#1e293b` fails WCAG AA (3.7:1). Bump to `#7c8ca0`. One-line CSS fix, massive accessibility improvement.

2. **Add `prefers-reduced-motion` support** — All animations (hero orbs, pulse, spinners, build-spinner) should stop for users who prefer reduced motion. Required for accessibility compliance.

3. **Build a real Settings page** — Even a minimal one with theme toggle and keyboard shortcuts. The current stub makes the platform feel incomplete.

4. **Decompose GamePreviewPage.tsx** — The 900-line monolith is a maintenance nightmare and blocks UI iteration on the game preview. Extract hooks and sub-components.

5. **Make AIFAB context-aware** — The floating AI button should know what file/scene/entity is active and pre-populate context. Currently returns canned "Preview Mode" responses.

### 🟡 Medium Priority (Next 2-3 Sprints)

6. **Add sidebar section dividers** — Separate global nav from project nav with labels ("Project" / "Platform"). Reduces cognitive load.

7. **Consolidate button CSS** — Migrate all `.primary-button`, `.cta-button`, `.secondary-button` to the unified `.btn-*` system. Remove dead button variants.

8. **Add dirty state indicators** — Show when files have unsaved changes. Add undo/redo visual affordance.

9. **Improve AI Command page layout** — Rename to "AI Studio." Add a split view: left side shows context (current files, scene), right side is the AI conversation.

10. **Add ARIA roles to tab navigation** — The project hub tabs need `role="tablist"`, `role="tab"`, and `role="tabpanel"` for screen reader support.

### 🟢 Low Priority (Backlog)

11. **Add breadcrumb navigation** in the project hub header for spatial orientation.

12. **Create a keyboard shortcut cheat sheet** modal (accessible via `?` key, like GitHub).

13. **Add resizable panels** to the scene editor.

14. **Implement a bottom panel** for build logs and console output.

15. **Dashboard compact mode** for returning users — collapse the hero section.

---

## 💡 Creative Ideas

### Innovations to Consider

1. **"Describe Your Game" Hero Input** — Replace the dashboard hero CTA with a large text input:
   > 💬 _"Describe the game you want to build..."_
   
   Type a description → AI generates a playable prototype in 10 seconds → user is dropped into the project. This would be the #1 differentiator. Rosebud does this but their editor is limited — we'd combine instant AI generation with a real editor.

2. **Live AI Co-Pilot Mode** — A toggle that puts the AI in "watch mode." As you build, it suggests improvements in a subtle side panel: "I notice your player has no jump sound. Want me to add one?" "This collision detection could be more efficient. See suggestion →"

3. **Visual Scene Graph** — Instead of just a canvas, show a node tree (like Godot/Figma layers) alongside the scene editor. Each entity is a node. Drag to reparent. Click to select. This gives spatial structure that the flat canvas lacks.

4. **Screenshot-to-Game** — Upload a screenshot of any game → AI analyzes the screenshot and recreates a playable version. Wildly impressive demo feature.

5. **AI Agent Mode** — Instead of single commands, let the user assign the AI an ongoing task: "Make the enemies progressively harder" or "Add particle effects to every collision." The AI works in the background, shows a diff, and asks for approval.

### AI-Specific UX

**How AI commands should be presented:**
- Primary: Inline ghost text in the code editor (Cursor pattern)
- Secondary: Contextual "Ask AI" button in property inspectors, scene canvas, file tree
- Tertiary: The full AI Command page for complex multi-step operations

**How to show AI progress/thinking:**
- Current pulse animation is good but add **step indicators with real labels**: "Reading game.ts..." → "Analyzing collision logic..." → "Generating fix..." → "Reviewing for safety..."
- Show a **mini diff preview** while generating so users can see changes forming in real-time
- Add a **cancel button** during generation

**How to handle AI-generated content:**
- Always show a diff view (red/green) before applying changes
- Add an "Apply" / "Reject" / "Modify" button trio
- Keep a generation history so users can revert to pre-AI state
- Mark AI-generated code with a subtle purple left-border in the editor
- Add a "Why did AI suggest this?" button that explains the reasoning

---

## 📊 UI/UX Score

| Area | Previous | Current | Target | Gap Analysis |
|------|----------|---------|--------|--------------|
| Visual Design | C+ | B | A | Strong theme system, needs contrast fixes and dead CSS cleanup |
| User Experience | C | B- | A | Game loop works, but AI integration feels separate, not ambient |
| Accessibility | C- | C+ | A | Contrast fix + reduced-motion + ARIA roles would get to B+ |
| Innovation | B- | B | A | Game preview is impressive, need "describe → game" hero flow |
| Information Architecture | C+ | B- | A | Sidebar needs section dividers, overview page duplicates nav |
| Code Quality (UI) | C | C+ | A | GamePreviewPage monolith, CSS fragmentation, button system overlap |
| Onboarding | B- | B | A | Tour + welcome modal + onboarding guide = good, needs "instant win" moment |
| Mobile Experience | C- | C | B+ | Works but feels like desktop-first with mobile concessions |

### Overall: **B-** (up from C+ in previous review)

**Trajectory is positive.** The platform has moved from "promising but rough" to "solid foundation with clear gaps." The game preview improvement is the biggest visible leap. The next inflection point is making AI feel ambient rather than siloed.

---

## 🗓️ Recommended Sprint Sequence

**Sprint 1 (Week 1):** Contrast fix + reduced-motion + Settings page + sidebar dividers  
**Sprint 2 (Week 2):** Decompose GamePreviewPage + ARIA roles + consolidate button CSS  
**Sprint 3 (Week 3):** Context-aware AIFAB + dirty state indicators  
**Sprint 4 (Week 4):** "Describe Your Game" hero input (the big differentiator)  
**Sprint 5-6 (Weeks 5-6):** Inline AI in code editor + live preview split-screen  
**Sprint 7-8 (Weeks 7-8):** Visual scene graph + AI agent mode + resizable panels  

**Estimated time to "A" grade: 8 sprints (8 weeks)**
