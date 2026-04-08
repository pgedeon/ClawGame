# UI/UX Review Feedback

**Last Review:** 2026-04-08 17:06 UTC
**Reviewed Version:** f3ddb43
**Previous Review:** ebc8f47 (2026-04-08 16:47 UTC)
**Status:** on-track (significant improvement since last review)

---

## 🎯 Alignment with Goal

ClawGame is converging on a strong AI-first identity. The dark studio theme, command palette (⌘K), AI FAB, contextual AI bar, and the "Build Games with AI" hero copy all reinforce the core proposition. The gap is no longer *identity* — it's *depth*: making the AI feel truly woven into every interaction rather than bolted on at key touchpoints.

**What changed since last review (ebc8f47 → f3ddb43):**
- Settings page went from stub → full implementation (theme toggle, shortcuts, about)
- Scene editor got template picker dropdown for "Add Entity" (was a no-op before)
- Scene save properly serializes Map→Array
- Game preview got onboarding flow, combat screens, particles, HUD
- 4 critical blockers fixed in one commit (cc91ea1)
- App.css expanded by ~276 lines (button system, utility classes, mobile improvements)

This is real progress. The review below reflects the *current* state and pushes toward the next level.

---

## 🎨 Overall Design Direction

**Current Style:** Dark studio theme (Slate 900/800 backgrounds) with purple (#6366f1) primary accent and AI-specific violet (#8b5cf6) branding. Inter for body, JetBrains Mono for code. Rounded corners (4–16px). Glass-effect overlays. Gradient hero section with floating orbs.

**Recommended Direction:** Continue refining the "creative studio" feel. The palette is solid — focus on:
1. **Consistency enforcement** — many small drifts from the design system in page-specific CSS
2. **AI as texture, not accent** — the purple glow should feel ambient, not just on badges
3. **Denser, more professional editor layout** — look at VS Code / Figma for inspiration

**Brand Personality:** "A creative partner that happens to be AI." Not robotic, not flashy. Think: Figma meets a game engine, with an AI co-pilot that's always one ⌘K away.

---

## ✨ What Looks Great

1. **Dashboard Hero Section** — The gradient hero with floating orbs, badge, and clear CTAs is visually striking and communicates the AI-first value prop immediately. The background-clip text gradient on the h1 is a nice touch.

2. **Command Palette** — Well-implemented: categories, keyboard navigation, smooth animations, proper focus management. The `cmd-palette-in` animation feels polished. Footer with navigation hints is thoughtful.

3. **Design System Foundation (theme.css)** — The token system is comprehensive: spacing scale, typography scale, radii, z-index layers, status colors, game-specific canvas tokens. The light mode override via `prefers-color-scheme` is forward-thinking.

4. **Onboarding Tour** — 4-step, clear progress dots, version-gated (won't re-show unnecessarily), skip option. Much better than a wall of text.

5. **Game Preview Overlays** — Start/pause/game-over/victory screens with distinct visual identities per state. The `pulse-glow` animation on the start button is delightful. `shake-in` on game over adds personality.

6. **Settings Page** — Now a real page with theme toggle (light/dark/system), keyboard shortcuts reference, and about section. Clean layout with setting rows.

7. **Responsive Mobile Sidebar** — Bottom navigation bar pattern on mobile with icon-only items. Hides header/footer elements intelligently. Smart use of `position: fixed; bottom: 0`.

8. **Toast System** — Proper provider pattern, dismissible, typed (success/error).

---

## 🐛 What Needs Improvement

### 1. **CSS Architecture: 10,000+ Lines of Scattered Styles**
- **Location:** `apps/web/src/` — 23 CSS files totaling ~10,343 lines
- **Problem:** Styles are split across dozens of files with heavy duplication. `App.css` alone is 51KB. `.action-btn` is defined in both `App.css` and `game-preview.css` with conflicting styles. `.project-actions` appears 3 times with different layouts. `.error-state` styles are scattered across 4 files.
- **Solution:** 
  1. Extract shared component styles into `components/` CSS files: `button.css`, `card.css`, `form.css`, `dialog.css`, `empty-state.css`
  2. Each page CSS should only contain layout and page-specific overrides
  3. Delete the massive utility section at the bottom of `App.css` and use the design tokens directly
  ```css
  /* components/button.css — single source of truth */
  .btn { /* base styles */ }
  .btn-primary { /* variant */ }
  .btn-sm, .btn-lg { /* sizes */ }
  ```

### 2. **Scene Editor: Visual Hierarchy is Flat**
- **Location:** `apps/web/src/scene-editor.css`
- **Problem:** The header, tool options, AI bar, and main canvas all use the same `var(--surface)` background. There's no clear visual layering — everything reads as one flat gray mass. The three-panel layout (assets | canvas | inspector) needs stronger visual separation.
- **Solution:** Use background elevation to create depth hierarchy:
  ```css
  .scene-editor-header { background: var(--surface); border-bottom: 2px solid var(--border-strong); }
  .tool-options { background: var(--surface-alt); border-bottom: 1px solid var(--border); }
  .asset-browser { background: var(--bg); border-right: 2px solid var(--border-strong); }
  .inspector-panel { background: var(--bg); border-left: 2px solid var(--border-strong); }
  .canvas-container { background: var(--canvas-bg); /* darkest — draws focus */ }
  ```

### 3. **No Loading Skeletons — Spinner-Only Loading States**
- **Location:** `DashboardPage.tsx:70`, `SceneEditorPage.tsx`, `GamePreviewPage.tsx`
- **Problem:** Loading states show a generic spinner and "Loading..." text. This is a flash of unstyled content that breaks the polished feel. For a creative tool, this is especially jarring — users expect to see the shape of what's coming.
- **Solution:** Add skeleton components that match the layout:
  ```tsx
  // components/Skeleton.tsx
  export function DashboardSkeleton() {
    return (
      <div className="dashboard-page">
        <div className="dashboard-hero skeleton-hero" />
        <div className="dashboard-section">
          <div className="skeleton-line skeleton-line--title" />
          <div className="action-grid">
            {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        </div>
      </div>
    );
  }
  ```
  ```css
  .skeleton-card {
    height: 140px;
    background: linear-gradient(90deg, var(--surface-alt) 25%, var(--surface) 50%, var(--surface-alt) 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
    border-radius: var(--radius-lg);
  }
  @keyframes skeleton-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  ```

### 4. **AI Command Page Lacks Rich Output Formatting**
- **Location:** `apps/web/src/pages/AICommandPage.tsx`, `apps/web/src/ai-command.css`
- **Problem:** AI responses appear as plain text in chat bubbles. For a game dev platform, AI will generate code, scene descriptions, entity configs — all of which need syntax highlighting, diff views, and actionable "Apply" buttons.
- **Solution:** 
  1. Add markdown rendering to AI responses (code blocks with syntax highlighting)
  2. Add "Apply to Project" buttons on code suggestions
  3. Show a diff view when AI modifies existing files
  ```tsx
  // Inside AI message rendering:
  {message.role === 'assistant' && (
    <div className="ai-message-content">
      <ReactMarkdown 
        components={{ 
          code: ({children, className}) => (
            <CodeBlock language={className?.replace('language-', '')}>
              {children}
            </CodeBlock>
          )
        }}
      >
        {message.content}
      </ReactMarkdown>
      <div className="ai-message-actions">
        <button className="btn btn-sm btn-primary">Apply Code</button>
        <button className="btn btn-sm btn-ghost">Copy</button>
      </div>
    </div>
  )}
  ```

### 5. **Empty States Could Drive More Action**
- **Location:** `DashboardPage.tsx:117-127` (projects empty state), scene editor inspector placeholder
- **Problem:** The empty state says "No projects yet" and offers one CTA. For a first-time user landing here after onboarding, this is a dead end emotionally. The scene editor's "Select an entity" placeholder is passive.
- **Solution:** Make empty states into conversion opportunities:
  ```tsx
  // Dashboard empty state — show 3 quick-start templates
  <div className="projects-empty">
    <h3>No projects yet — let's fix that</h3>
    <p>Start from scratch or pick a template:</p>
    <div className="quickstart-grid">
      {templates.slice(0, 3).map(t => (
        <TemplateCard key={t.id} template={t} onSelect={handleCreate} />
      ))}
    </div>
    <Link to="/create-project" className="cta-button">
      Or start from scratch →
    </Link>
  </div>
  ```

### 6. **Accessibility: Missing ARIA Labels and Focus Patterns**
- **Location:** Throughout — `AppLayout.tsx`, `CommandPalette.tsx`, `SceneEditorPage.tsx`
- **Problem:** 
  - Template picker dropdown has no `role="menu"` or `aria-expanded`
  - Canvas interactions are invisible to screen readers
  - Color contrast issues: `--text-muted: #7c8ca0` on `--bg: #0f172a` is ~4.2:1 (passes AA for large text only, fails for normal text at AA which needs 4.5:1)
  - No skip-to-content link
  - No `aria-live` regions for dynamic content (AI responses, build status)
- **Solution:**
  ```css
  /* Fix: darken muted text slightly for AA compliance */
  --text-muted: #8896a8; /* ~4.8:1 on #0f172a */
  ```
  ```tsx
  // AppLayout.tsx — add skip link
  <a href="#main-content" className="sr-only skip-link">Skip to main content</a>
  ```
  ```css
  .skip-link:focus {
    position: fixed;
    top: 0;
    left: 0;
    width: auto;
    height: auto;
    padding: 8px 16px;
    background: var(--accent);
    color: white;
    z-index: 9999;
    clip: auto;
    margin: 0;
  }
  ```

### 7. **Sidebar Navigation Doesn't Show Hierarchy Clearly**
- **Location:** `AppLayout.tsx:89-127`
- **Problem:** When in a project context, the sidebar adds a "Project" section with 5 items. But the relationship between global nav (Dashboard, Create, Open, Examples, Settings) and project nav is flat — just a thin separator. Users can't tell at a glance which "world" they're in.
- **Solution:** Add a project context indicator and collapse global nav when in a project:
  ```tsx
  {isInProjectContext && currentProject ? (
    <>
      <div className="sidebar-project-context">
        <span className="project-context-dot" />
        <span className="project-context-name">{currentProject.name}</span>
      </div>
      <div className="sidebar-section-title">Project Tools</div>
      {projectNavItems.map(...)}
      <div className="sidebar-section-title" />
      <Link to="/" className="nav-item nav-item--back">
        <ArrowLeft size={18} />
        <span>All Projects</span>
      </Link>
    </>
  ) : (
    sidebarItems.map(...)
  )}
  ```
  ```css
  .sidebar-project-context {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--ai-gradient);
    margin: 8px;
    border-radius: var(--radius-md);
    color: white;
    font-weight: 600;
    font-size: 13px;
  }
  .project-context-dot {
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: pulse-dot 2s infinite;
  }
  ```

### 8. **No Keyboard Shortcuts in Scene Editor**
- **Location:** `SceneEditorPage.tsx`
- **Problem:** The scene editor has no keyboard shortcuts. Users must click Save, click zoom buttons, click tools. Every professional editor supports Delete (remove entity), Ctrl+D (duplicate), Ctrl+Z (undo), Space+drag (pan). The scene editor has none of these.
- **Solution:** Add a `useEffect` for global keyboard handling:
  ```tsx
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEntityId) handleDeleteEntity(selectedEntityId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedEntityId) handleDuplicateEntity(selectedEntityId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveScene();
      }
      if (e.key === 'v') setToolMode('select');
      if (e.key === 'g') setToolMode('move');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedEntityId, scene]);
  ```

---

## 📐 Layout Recommendations

### Navigation
- **Sidebar width:** 240px is good. Consider adding a collapse toggle (→ 64px icon-only) for editor pages where horizontal space matters.
- **Breadcrumbs:** Add breadcrumbs inside project pages: `ClawGame > My Game > Scene Editor` — helps orientation when deep in a project.
- **Mobile bottom nav:** Current implementation is good. Consider adding a "More..." overflow for secondary items.

### Main Content Area
- **Dashboard:** The hero → actions → projects → tips flow is solid. Consider a "Recent Activity" or "Continue where you left off" card at the top for returning users.
- **Scene Editor:** Three-panel layout (280px | flex | 320px) is the right pattern. Needs stronger panel borders and a drag-to-resize handle between panels.

### Panels/Sidebars
- **Property Inspector:** Currently uses a 2-column grid (`80px 1fr`). Consider grouping properties into collapsible sections (Transform, Sprite, Physics, AI) like Unity/Godot.
- **Asset Browser:** The 64px grid is good for browsing. Add a list view toggle and a "recently used" section at the top.

---

## 🎭 Visual Elements

### Colors
The current palette is strong. Recommended refinements:
```css
/* Refined palette — fix contrast + add depth tokens */
--accent: #6366f1;           /* keep — strong brand identity */
--accent-hover: #4f46e5;     /* keep */
--accent-light: rgba(99, 102, 241, 0.12);

--ai-primary: #8b5cf6;       /* keep — distinct from accent */
--ai-glow: rgba(139, 92, 246, 0.2);  /* reduce from 0.3 — subtler */

--text-muted: #8896a8;       /* FIX: was #7c8ca0, now passes WCAG AA on dark bg */

/* NEW: Elevation tokens for panel depth */
--elevation-0: var(--bg);              /* #0f172a — canvas/workspace */
--elevation-1: var(--surface);         /* #1e293b — panels */
--elevation-2: var(--surface-alt);     /* #334155 — nested panels */
--elevation-3: var(--card);            /* #1e293b — cards/popovers */
```

### Typography
Current choices are excellent. No changes needed:
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
```
Inter is the right choice — clean, professional, excellent at small sizes. JetBrains Mono for code is perfect.

### Spacing
Already well-defined. One addition:
```css
/* Add container max-widths */
--container-sm: 640px;
--container-md: 900px;
--container-lg: 1200px;
--container-xl: 1440px;
```

---

## 🔍 Competitive Research

| Platform | What They Do Well | What We Can Learn |
|----------|-------------------|-------------------|
| **Unity** | Inspector panel with collapsible sections, undo/redo history, drag-to-resize panels, customizable layout | Property inspector needs collapsible groups; need undo/redo stack |
| **Godot 4** | Node-based scene tree, signal system, built-in docs, node-specific property editors | Scene hierarchy tree (currently missing); entity type icons |
| **Construct 3** | Event sheet visual scripting, behavior system, instant preview, no-install web-native | Behavior library pattern; instant-play button; we already match web-native |
| **GDevelop** | Low floor / high ceiling, event-based without code, extension store, one-click export | Extension/marketplace potential; guided project wizard |
| **Rosebud AI** | Natural language → game, AI-first from day one, chat-based creation | Our strongest competitor in the AI-first space. We need richer AI output formatting (code blocks, previews) |
| **PlayCanvas** | Real-time collaboration, WebGL performance, asset pipeline, inspector | Real-time entity property editing in scene view (we have this — strengthen it) |

**Key Insights:**
1. **All serious editors have undo/redo** — ClawGame is missing this entirely. This is table stakes for a creative tool.
2. **Scene hierarchy tree is universal** — Unity, Godot, Construct all show a tree of entities. ClawGame shows a flat list in the inspector. This needs to be a first-class sidebar panel.
3. **AI-first is our differentiator** — Rosebud is the closest competitor, but their output is game-only (play output). Our advantage is showing and editing the *code* that AI generates. Lean into that.
4. **Visual scripting could be a killer feature** — If we combine AI code generation with a node-based visual editor (like Unreal Blueprints), we become the only tool that bridges "describe it in English" ↔ "see it as nodes" ↔ "edit the code."

**Features to Consider:**
- **Undo/Redo stack** — Critical. Without it, any mistake means manual recovery. Implement command pattern.
- **Scene hierarchy tree panel** — Tree view of entities with parent-child relationships, drag-reorder, visibility toggles, lock toggles.
- **AI code diff view** — When AI modifies code, show a VS Code-style diff with accept/reject per chunk.
- **Behavior library** — Pre-built components (platformer movement, enemy AI, collectible) that users can attach via dropdown.
- **Project templates gallery** — Expand from "Create Project" form to a visual gallery of starter games.

---

## 📋 Priority Fixes

### 🔴 High Priority
1. **Undo/Redo system** — Without this, the scene editor feels fragile. Every click is permanent. Implement a simple command stack with `Ctrl+Z` / `Ctrl+Shift+Z`.
2. **Scene hierarchy tree** — The flat entity list in the inspector is the single biggest UX gap vs. every competitor. Add a collapsible tree panel on the left (replacing or alongside the asset browser).
3. **Keyboard shortcuts in editor** — Delete, duplicate, save, undo. Without these, the editor feels like a toy.
4. **AI response formatting** — Markdown rendering + code syntax highlighting + "Apply" button. The AI command page is the core of the platform — it can't show plain text.

### 🟡 Medium Priority
5. **Skeleton loading states** — Replace spinners with skeleton layouts. First impression matters.
6. **CSS consolidation** — Extract shared styles, reduce duplication. The current 10K+ lines are becoming unmanageable.
7. **Sidebar project context** — Clearer visual indication of "which project am I in?" with a context card.
8. **Accessibility audit** — Fix contrast, add skip link, add ARIA labels to interactive elements.
9. **Drag-to-resize panels** — In the scene editor, let users drag the borders between asset browser, canvas, and inspector.

### 🟢 Low Priority
10. **List/grid view toggle for asset browser**
11. **Entity type icons in hierarchy** (player → ▶️, enemy → 👾, platform → ▬)
12. **Animated transitions between pages** (slide/fade)
13. **Customizable editor layout** (save/restore panel positions)

---

## 💡 Creative Ideas

### Innovations to Consider

1. **"AI Scene Builder" Mode** — A dedicated mode where the scene canvas becomes a chat interface. User types "add 5 platforms leading to a door, with enemies on platforms 2 and 4" and watches entities appear in real-time with a typing-like animation. This would be *unlike anything* in competing tools.

2. **Ghost Preview** — Show a translucent "ghost" preview of what AI is about to generate before it's applied. Like how Figma shows a ghost preview when placing components. This builds trust in AI outputs.

3. **Timeline/History Panel** — A visual timeline of all AI interactions and edits. "2:03pm — Added player entity via AI", "2:05pm — Manually adjusted platform positions", "2:08pm — AI generated enemy patrol script". Each entry is clickable to roll back to that state.

4. **Component Marketplace (AI-Generated)** — Users can browse AI-generated components: "Platformer Controller", "RPG Dialogue System", "Tower Defense AI". Click to add, then customize. Each has a star rating from the community.

5. **Split-Screen "Teach Me" Mode** — Left side: the editor. Right side: an AI tutor that watches what you're doing and offers contextual tips. "I see you added a player entity — want me to add arrow-key movement?" Non-intrusive, dismissable.

### AI-Specific UX Recommendations

**How AI Commands Should Be Presented:**
- The ⌘K command palette is the right entry point. Keep it.
- Add **contextual AI suggestions** as a subtle bar above the canvas: "I notice you have a player but no ground — add platforms?"
- AI actions should show a **3-stage progress**: thinking (animated dots) → generating (progress bar with file names) → done (preview + apply button)

**How to Show AI Progress/Thinking:**
```tsx
// Current: just a spinner
// Better: show what AI is doing
<div className="ai-progress">
  <div className="ai-progress-step ai-progress-step--active">
    <span className="ai-progress-icon">🤔</span>
    <span>Analyzing your game structure...</span>
  </div>
  <div className="ai-progress-step">
    <span className="ai-progress-icon">⚡</span>
    <span>Generating platformer controller</span>
  </div>
  <div className="ai-progress-step">
    <span className="ai-progress-icon">🎮</span>
    <span>Adding to scene</span>
  </div>
</div>
```

**How to Handle AI-Generated Content:**
- Always show a **preview diff** before applying
- Add "Why did you do this?" button on AI changes (educational + builds trust)
- Track AI-generated vs. human-edited code with visual markers (subtle glow)
- "Regenerate" button that keeps the same prompt but produces a new variation

---

## 📊 UI/UX Score

| Area | Previous (ebc8f47) | Current (f3ddb43) | Target | Key Gap |
|------|--------------------|--------------------|--------|---------|
| Visual Design | C+ | B | A | Scene editor depth/hierarchy; CSS consolidation |
| User Experience | C | B- | A | Undo/redo; scene hierarchy tree; keyboard shortcuts |
| Accessibility | C- | C+ | A | Contrast fix; ARIA labels; skip link; screen reader support |
| AI-Native UX | C+ | B | A+ | Rich AI output formatting; contextual suggestions; progress stages |
| Innovation | B- | B | A+ | AI scene builder; ghost preview; teach-me mode |
| Code Quality | C | C+ | A | 10K+ lines scattered CSS; needs component extraction |
| Onboarding | B- | B+ | A | Tour is good; needs interactive first-project walkthrough |

**Overall: B- → solid progress, clear path forward.**

The biggest unlock isn't a single feature — it's **undo/redo + scene hierarchy + AI output formatting**. These three together transform ClawGame from "impressive demo" to "usable tool." The visual design and brand identity are already strong. The AI integration pattern (command palette + FAB + contextual bar) is the right architecture — now it needs depth of execution.