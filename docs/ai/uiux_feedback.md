# UI/UX Review Feedback

**Last Review:** 2026-04-10 00:26 UTC
**Reviewed Version:** 71d15e9
**Status:** on-track

---

## 🎯 Alignment with Goal

The platform has a solid structural foundation — routing, layout, lazy loading, error boundaries, accessibility basics, and a clear project → editor → AI workflow. The AI-first identity comes through in the hero section, command palette, AIFAB, and AI Command page. The pieces are here; the gap is polish and cohesion.

---

## ✨ What Looks Great

1. **Architecture is solid** — Code-split lazy routes, proper error boundaries, skip links, skeleton loaders. This is rare in early-stage projects and will pay off.
2. **AI FAB (floating assistant)** — Persistent AI chat bubble across all pages is the right pattern. Shows connection status, prompt recipes, context-aware. This is genuinely differentiated.
3. **Dashboard hero section** — "Build Games with AI" with the orb visuals and ⌘K callout sets the tone immediately.
4. **Scene editor decomposition** — Splitting into AssetBrowserPanel / SceneCanvas / PropertyInspector / AIBar is the right IDE-like layout.
5. **Onboarding + Command Palette** — First-time users get a tour AND ⌘K access. Smart.

---

## 🐛 What Needs Improvement

### 1. **Scene editor toolbar feels like separate islands**

- **Location:** `SceneEditorPage.tsx` — toolbar buttons (Save, Undo, ZoomIn, ZoomOut, Plus) are laid out but there's no visual grouping or contextual panel switching
- **Problem:** Users need to discover which panel does what. The asset browser, canvas, and property inspector should feel like one integrated workspace, not three boxes.
- **Solution:** Add a top toolbar with mode tabs (Select / Place / Pan) that clearly indicates which tool is active. Use a shared background for the entire editor frame (not individual card backgrounds per panel). Add a thin resize handle between panels.

### 2. **AI Command page has no visual differentiation from a chatbot**

- **Location:** `AICommandPage.tsx`
- **Problem:** It reads like a generic chat interface. For an AI-first game platform, the AI page should feel like a *command center* — showing context (what project, what files), available actions, and inline previews of generated assets/code.
- **Solution:**
  - Add a left sidebar showing current file tree (or at minimum, the active file context)
  - Show code diffs inline (the `CodeDiffView` component exists but verify it renders prominently, not buried)
  - Add action chips above the input: "Generate", "Explain", "Fix", "Refactor" — quick-intent selectors
  - Consider a split view: chat on left, live preview/code on right

### 3. **Dashboard project cards lack visual richness**

- **Location:** `DashboardPage.tsx` — `.project-card` components
- **Problem:** Cards show name, status, genre, art style, and date — but no thumbnail or visual preview. For a game dev platform, this is a missed opportunity.
- **Solution:**
  - Generate/store a thumbnail screenshot of the game preview (canvas snapshot) on save
  - Show the thumbnail as a card header image (like Notion or Figma project cards)
  - Add a subtle hover animation (slight scale + shadow lift)
  ```css
  .project-card {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .project-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
  ```

### 4. **Mobile/responsive is likely broken**

- **Location:** `AppLayout.tsx` sidebar is always visible
- **Problem:** The sidebar has no collapse/hamburger toggle. On mobile, the sidebar will eat screen space or overflow.
- **Solution:** Add a mobile breakpoint (<768px) that hides the sidebar behind a hamburger menu. The AIFAB should also reposition to not overlap content.

### 5. **No dark/light theme toggle visible**

- **Problem:** The CSS variables suggest dark theme only. Users may want light mode, especially on laptops in bright environments.
- **Solution:** Add a theme toggle in the sidebar footer. Use CSS custom properties with `[data-theme="light"]` overrides. Start with dark-only is fine, but the toggle signals maturity.

---

## 📐 Layout Recommendations

### Navigation
- Sidebar is good. Add collapse to icon-only mode (48px wide) for power users who want more canvas space.
- Add breadcrumbs in the main content area: `Projects > MyGame > Scene Editor` for orientation.

### Scene Editor
- Adopt the classic 3-panel game editor layout: left = hierarchy/assets, center = canvas, right = properties.
- Add a bottom panel bar (collapsible) for console/AI output — similar to VS Code's terminal panel.

### AI Interactions
- The AIFAB and the full AI Command page overlap in purpose. Consider: FAB for quick questions, AI Command page for deep generation sessions. Make this distinction clear with different UI treatments.

---

## 🎭 Visual Elements

### Recommended Color Refinements
```css
/* Current primary (#6366f1 indigo) is good — keep it */
/* Add a game-dev accent color for "run/play" actions */
--accent-play: #22c55e;      /* green for preview/play */
--accent-danger: #ef4444;    /* red for destructive */
--accent-ai: #8b5cf6;        /* purple for AI features — already used, nice */

/* Surface hierarchy (ensure clear layering) */
--surface-base: #0f172a;     /* deepest bg */
--surface-raised: #1e293b;   /* cards, panels */
--surface-overlay: #334155;  /* dropdowns, popovers */
```

### Typography
```css
/* Inter is the right choice — clean and professional */
/* Add size scale for consistency */
--text-xs: 0.75rem;    /* badges, meta */
--text-sm: 0.875rem;   /* secondary text */
--text-base: 1rem;     /* body */
--text-lg: 1.125rem;   /* section titles */
--text-xl: 1.5rem;     /* page titles */
--text-2xl: 2rem;      /* hero headings */
```

---

## 🔍 Competitive Research

| Platform | What They Do Well | What We Can Learn |
|----------|------------------|-------------------|
| **Rosebud AI** | Chat-to-game: describe → playable prototype. Screenshot button for visual bug reports. | Visual context in AI chat (screenshots of canvas state). One-shot "make it work" UX. |
| **Ludo.ai** | AI game ideation: generates concepts, art, mechanics before code. | Pre-code creative phase. "Game concept generator" before project creation. |
| **Construct 3** | Event-sheet visual scripting, instant preview, zero setup. | Instant gratification — preview should load in <1s. Visual scripting overlay option. |
| **GDevelop** | One-click publish, mobile-friendly editor, community templates. | Publishing flow simplicity. Template gallery as first-class citizen. |
| **Unity/Godot** | Inspector panel, scene hierarchy, asset pipeline. | We're already mimicking this in Scene Editor — keep going. Property inspector with undo history is table stakes. |

**Key Insights:**
- Rosebud's biggest win is *speed from idea to playable*. ClawGame's AI Command + Preview pipeline can match this if the latency is low enough.
- Visual context matters — Rosebud lets users screenshot their game state and send to AI. Our AIFAB should capture canvas state automatically when opened from Scene Editor.
- GDevelop's publish-in-one-click is a killer feature for indie devs.

**Features to Consider:**
- **Canvas screenshot → AI context** — When AIFAB opens in scene editor, auto-attach a canvas snapshot to the AI context. Rosebud does this manually; we can do it automatically.
- **Template gallery with one-click clone** — Examples page exists but should feel like "pick a starter, customize, ship"
- **Live collaborative preview URL** — Share a link to the running game preview

---

## 📋 Priority Fixes

1. **[High]** Scene editor panel integration — unifies the core product experience. Without it, the editor feels like 3 disconnected boxes.
2. **[High]** AI Command page needs visual context (file tree, active file) — this is the AI-first differentiator. Without context display, it's just a chatbot.
3. **[Medium]** Dashboard project thumbnails — visual richness matters for a game platform. Blank cards feel unfinished.
4. **[Medium]** Mobile responsive sidebar — basic usability on tablets/phones.
5. **[Low]** Dark/light theme toggle — polish item, signals maturity.

---

## 💡 Creative Ideas

**Innovations to Consider:**
- **"What would you like to build?" as the only landing page element** — Replace the dashboard for first-time users with a single prompt input (like ChatGPT's homepage). "A platformer with cats in space" → instant project creation with AI scaffolding.
- **Canvas-aware AI** — The AIFAB should know what entity is selected, what's on screen, and what the user was just doing. Auto-inject this context so users can say "make this blue" instead of "change entity player-1 sprite color to blue".
- **Timeline/history scrubber** — Since git integration exists, add a visual timeline (like Figma's version history) where users can scrub through AI-generated changes and revert to any point.

**AI-Specific UX:**
- Show AI confidence level on generated code (the `ConfidenceBadge` in CodeDiffView — verify it's prominent)
- Add "Accept / Reject / Modify" actions inline with AI-generated code changes
- Streaming responses with typewriter effect for AI text, but *instant* rendering for code diffs
- "Explain this" button on any entity in the scene editor → opens AIFAB with context pre-filled

---

## 📊 UI/UX Score

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Visual Design | B | A | Needs project thumbnails, panel cohesion, micro-animations |
| User Experience | B | A | Scene editor integration, AI context display, first-run flow |
| Accessibility | B+ | A | Skip links ✓, contrast ✓, focus states ✓. Add ARIA live regions for AI responses |
| Innovation | B+ | A | AIFAB + command palette are great. Canvas-aware AI and chat-to-project would push to A |
