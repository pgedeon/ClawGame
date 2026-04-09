# UI/UX Review Feedback

**Last Review:** 2026-04-09 13:37 UTC
**Reviewed Version:** ba9157f
**Status:** on-track

---

## 🎯 Alignment with Goal

ClawGame's UI is heading in the right direction for an AI-first game dev platform. The dark studio theme, command palette, AI FAB, and onboarding tour all signal "AI-native tool" clearly. The biggest gap is **AI prominence in the core workflow** — the AI Command page feels like a separate chat room rather than an integrated co-pilot. To be the *best* AI-first platform, AI needs to be ambient and ever-present, not a tab you navigate to.

---

## 🎨 Overall Design Direction

**Current Style:** Dark studio theme (Slate-900 palette) with purple/violet AI accents. Professional, IDE-like. Good foundation.

**Recommended Direction:** Lean harder into the "creative studio" vibe. Less IDE, more Figma-meets-Unity. Warmer gradients, more personality in micro-copy, and AI should feel like a collaborator, not a feature.

**Brand Personality:** Smart, fast, slightly playful. Think: "the game dev tool that actually gets you." Not corporate, not toy-like.

---

## ✨ What Looks Great

1. **Theme system (`theme.css`)** — Comprehensive, well-organized CSS custom properties. Dark + light mode support. Spacing scale, typography scale, z-index layers all defined. This is genuinely solid.

2. **Command Palette (`CommandPalette.tsx`)** — ⌘K everywhere, fuzzy search, keyboard navigation, categorized results. This is a killer feature and it's well-executed.

3. **Onboarding tour** — Modal with dots, slide-up animation, clear CTA. Good first-time experience.

4. **Project context indicator** — The gradient pill with green dot in sidebar is a nice touch. Subtle but effective.

5. **Skip link + accessibility focus states** — Skip to content link, `focus-visible` rings, reduced-motion media query. Better than most indie tools.

6. **Lazy-loaded routes** — Code splitting for heavy pages (Scene Editor, Asset Studio, etc.). Smart performance choice.

7. **Dashboard hero section** — "Build Games with AI" with orbs and gradient badge. Sets the tone immediately.

---

## 🐛 What Needs Improvement

### 1. **AI Command page is a chat island, not a co-pilot**
   - Location: `AICommandPage.tsx` (578 lines!)
   - Problem: AI is a separate page you navigate to, breaking flow. Users must context-switch between code/scene and AI.
   - Solution: Introduce an AI side-panel that slides in from the right (like GitHub Copilot Chat). Keep it accessible from any page via the existing FAB. The chat UI should float *over* the workspace, not replace it.

### 2. **No visual preview thumbnails for projects**
   - Location: `DashboardPage.tsx` — project cards
   - Problem: Project cards show text only (name, genre, status). No thumbnail/screenshot. Games are visual — the dashboard should *look* like a game library.
   - Solution: Add a thumbnail/screenshot to each project card. Generate a canvas snapshot on save. Store as base64 or small PNG.
   ```tsx
   // In project card, add:
   <div className="project-card-thumbnail">
     {project.thumbnail ? (
       <img src={project.thumbnail} alt={project.name} />
     ) : (
       <div className="project-card-placeholder">
         <Gamepad2 size={32} />
       </div>
     )}
   </div>
   ```

### 3. **Scene Editor toolbar z-index issue (partially fixed)**
   - Location: `SceneEditorPage.tsx` — commit 47a93cf patched z-index
   - Problem: Dropdowns still may clip in nested panels. The toolbar z-index approach is fragile.
   - Solution: Use a dedicated `--z-toolbar: 150` in the z-index layer stack, and use portals for dropdown popovers.

### 4. **`AICommandPage.tsx` is 578 lines — needs decomposition**
   - Location: `apps/web/src/pages/AICommandPage.tsx`
   - Problem: Monolithic component mixing chat UI, API calls, state management, and change-application logic.
   - Solution: Extract into `AIChatPanel`, `AIMessageBubble`, `AICodeChangeCard`, `useAICommand` hook. Follow the same decomposition pattern used for `GamePreviewPage` (refactor in 89d452a).

### 5. **No empty/placeholder states for sub-pages**
   - Location: `EditorPage.tsx`, `SceneEditorPage.tsx`
   - Problem: When a new project has no code or no entities, the editor areas may look broken rather than intentionally empty.
   - Solution: Add guided empty states with AI prompts:
   ```tsx
   <div className="editor-empty-state">
     <Bot size={48} />
     <h3>No code yet</h3>
     <p>Ask AI to generate your first game script</p>
     <button onClick={() => openAI()}>Generate with AI</button>
   </div>
   ```

### 6. **Mobile experience is an afterthought**
   - Location: `game-hub.css` has one `@media (max-width: 768px)` block
   - Problem: Game dev on mobile isn't primary, but the dashboard and project browsing should work on tablets. Currently, the sidebar collapses poorly and touch targets are small.
   - Solution: Add a collapsible sidebar with hamburger toggle. Ensure minimum 44px touch targets on nav items.

### 7. **No loading skeletons on data-fetch pages**
   - Location: `DashboardPage.tsx`, `OpenProjectPage.tsx`
   - Problem: Shows a spinner + "Loading..." text. A `Skeleton.tsx` component exists but isn't used consistently.
   - Solution: Replace spinners with content-shaped skeletons (card shapes for projects, text lines for lists).

---

## 📐 Layout Recommendations

### Navigation
- **Sidebar (240px)**: Good width. Consider a collapsed mode (64px, icon-only) for editor pages where screen real estate matters. Toggle with `⌘B`.
- **Breadcrumb**: Add breadcrumb below header in project pages: `Projects > MyGame > Scene Editor`. Helps orientation.
- **AI always reachable**: The FAB is good. Make it pulse subtly when AI has a suggestion (e.g., after a save or error).

### Main Content Area
- Dashboard: Solid. The hero → quick actions → projects → tips flow is logical.
- Editor pages: Need a status bar at the bottom (like VS Code) showing: project name, AI status, save state, last error.

### Panels/Sidebars
- Scene Editor's three-panel layout (Assets | Canvas | Properties) is the right call. Ensure panels are resizable with drag handles.
- Consider a "focus mode" that hides all panels for maximum canvas/code visibility.

---

## 🎭 Visual Elements

### Colors
The existing palette is solid. Minor tweaks:
```css
/* Recommended additions */
--ai-gradient-warm: linear-gradient(135deg, #8b5cf6, #ec4899); /* for hero/featured elements */
--surface-glass: rgba(30, 41, 59, 0.7); /* for floating panels with backdrop-filter */
```

### Typography
Current choices (Inter + JetBrains Mono) are excellent. No changes needed.

### Spacing
The `--space-*` scale is good. Consider adding:
```css
--sidebar-width: 240px;
--sidebar-collapsed-width: 64px;
--panel-min-width: 200px;
```

---

## 🔍 Competitive Research

| Platform | What They Do Well | What We Can Learn |
|----------|------------------|-------------------|
| **Rosebud AI** | Describe → playable game in seconds. No-code. Chat-first interface. | Make the AI→playable feedback loop instant. Our AI Command page takes too long to show results. |
| **GDevelop** | Visual event system, one-click preview, extensive example library | Better example browser with instant preview. Our ExamplesPage is static. |
| **Construct 3** | Polished layout panels, drag-and-drop everywhere, property grid UX | Resizable panels with snap positions. Our scene editor panels are fixed-width. |
| **Unity** | Hierarchy + Inspector + Scene view triple-panel. Asset store integration. | The three-panel pattern we already use is proven. Unity's Inspector (property grid) is the gold standard for entity editing. |
| **Ludo.ai** | AI ideation, mechanic suggestions, market research | AI-powered "what should I build next?" suggestions on the dashboard. |

**Key Insights:**
- **Rosebud is the closest competitor in "AI-first" positioning.** Their chat-to-game loop is the benchmark. ClawGame needs to match or beat that immediacy.
- **Visual scripting is table stakes.** Even if we're code-first, a visual representation of game logic (like a node graph) would differentiate us from "just an IDE."
- **Instant preview is the #1 feature users love** across all platforms. Our preview page exists but loading speed matters more than features.

**Features to Consider:**
- **AI Auto-suggest sidebar** — When editing code or scenes, show contextual AI suggestions in a narrow panel. Like Copilot completions but for game patterns.
- **Template gallery with one-click remix** — Instead of "Examples" as a page, make it a gallery where you click a template and immediately get an editable copy.
- **Live collaboration indicators** — Even if single-player for now, show "AI is thinking..." status prominently.

---

## 📋 Priority Fixes

1. **[High Priority]** Decompose `AICommandPage.tsx` into smaller components — it's the core feature and it's unmaintainable at 578 lines
2. **[High Priority]** Add project thumbnails to dashboard cards — games are visual, the dashboard should reflect that
3. **[Medium Priority]** Make AI a slide-over panel instead of a separate page — eliminate context-switching
4. **[Medium Priority]** Add guided empty states to all editor pages — first-time user experience
5. **[Medium Priority]** Use Skeleton component consistently instead of spinners
6. **[Low Priority]** Add breadcrumb navigation in project context
7. **[Low Priority]** Collapsible sidebar with ⌘B toggle for power users

---

## 💡 Creative Ideas

### Innovations to Consider

- **"AI Director Mode"** — A toggle that overlays AI suggestions directly on the scene canvas (ghost entities showing where AI would place things, dotted paths for movement patterns). Makes AI tangible, not abstract.

- **Timeline Scrubber** — A visual timeline at the bottom of the preview page showing the game's state over time. Rewind, scrub forward, click to inspect entity state at that frame. No competitor has this.

- **Diff View for AI Changes** — When AI suggests code changes, show them as a git-style diff with accept/reject per hunk. The "Apply to Project" button is too all-or-nothing.

### AI-Specific UX

- **AI should be presented as a conversation, not a form.** The current AI Command page is close but feels like a support chatbot. Frame it as "your game dev partner" with personality.
- **Show AI thinking process visually** — Use a progress bar or streaming tokens, not a spinner. Users tolerate waiting if they can see progress.
- **AI-generated content should be visually distinct** — Code written by AI should have a subtle purple left-border or background tint so users can always tell what they wrote vs. what AI generated.

---

## 📊 UI/UX Score

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Visual Design | B | A | Add project thumbnails, polish empty states, more personality |
| User Experience | B- | A | AI workflow is disjointed, needs panel-based integration |
| Accessibility | B+ | A | Good foundation — add ARIA live regions for AI responses, ensure screen reader announces AI state changes |
| Innovation | B | A+ | Command palette is great; need AI Director mode, timeline scrubber, visual diff to truly stand out |
| Performance | A- | A | Code splitting done; skeleton loading will close the gap |

---

## Summary

The foundation is genuinely strong. The theme system, command palette, and overall architecture are well-done. The critical path to "best AI-first game dev platform" is:

1. **Make AI ambient** (panel, not page)
2. **Make games visual** (thumbnails, previews, canvas-first)
3. **Make the loop fast** (instant preview, streaming AI, one-click templates)

The bones are here. The next iteration should focus on polish and integration rather than new features.
