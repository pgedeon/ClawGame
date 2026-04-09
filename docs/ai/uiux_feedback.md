# UI/UX Review Feedback

**Last Review:** 2026-04-09 16:06 UTC
**Reviewed Version:** b3fbc53 (v0.15.0)
**Reviewer:** UI/UX Design Agent
**Status:** on-track

---

## 🎯 Alignment with Goal

ClawGame is positioning itself as an **AI-first, browser-based game development platform** — a space currently dominated by Rosebud AI (prompt-to-game) and traditional web editors (Construct 3, GDevelop). The current codebase has solid foundations: a well-structured design system (`theme.css`), clear routing architecture, and AI-centric features (Command Palette, AI FAB, AI Command chat, Scene Editor AI bar). The direction is right, but there are gaps between "has AI features" and "feels AI-native." This review focuses on closing that gap.

---

## 🎨 Overall Design Direction

**Current Style:** Dark studio theme (Slate-900 palette) with Indigo accents. Clean, professional, game-engine-adjacent. Inter + JetBrains Mono typography. Well-organized CSS custom properties.

**Recommended Direction:** Evolve from "game engine in a browser" toward **"AI creative partner."** The UI should feel less like Unity Web and more like Cursor/Figma — where AI assistance is ambient, always-visible, and deeply integrated into every workflow.

**Brand Personality:** Confident, magical yet approachable. Think "your creative partner has superpowers" not "here's another dev tool."

---

## ✨ What Looks Great

1. **Design system in `theme.css`** — Single source of truth with full token coverage (colors, spacing, typography, shadows, z-index, radius, transitions). This is excellent and rare in early-stage projects. The dual dark/light mode is properly implemented.

2. **Command Palette** — `⌘K` pattern with backdrop blur, slide-in animation, proper keyboard navigation. This is the right pattern for an AI-first tool.

3. **AI FAB (Floating Action Button)** — Persistent AI entry point across all pages. Good pattern for keeping AI accessible.

4. **Route architecture** — Clean nesting with lazy-loaded pages, alias routes (`play` → `preview`, `code_editor` → `editor`), proper loading states. The `Outlet`-based project context is well structured.

5. **Error handling** — Dashboard has proper error state with retry button, not just a spinner. `ErrorBoundary` wraps the entire app.

6. **Template cards with selection** — Nice visual feedback on the Create Project page (`selected::before` checkmark, hover lift effect).

7. **Accessibility foundations** — Skip links, `prefers-reduced-motion` respect, `focus-visible` outlines, ARIA labels on sidebar navigation, semantic roles.

8. **Scene Editor decomposition** — Well-structured into `AssetBrowserPanel`, `SceneCanvas`, `PropertyInspector`, `SceneEditorAIBar`. This is the right component architecture for a complex editor.

---

## 🐛 What Needs Improvement

### 1. **Hero Section Feels Generic**

- **Location:** `apps/web/src/pages/DashboardPage.tsx:95-120`
- **Problem:** "Build Games with AI" hero with orb decorations looks like every SaaS landing page. For an AI-first game dev platform, the hero should *demo* the magic, not describe it.
- **Solution:** Replace static orbs with a live mini-game preview or an animated code→game transformation. Even a simple typing animation that shows "Make a space shooter" → code appears → game runs would be 10x more compelling.
- **Priority:** Medium

### 2. **AI Command Page is Chat-Only**

- **Location:** `apps/web/src/pages/AICommandPage.tsx`
- **Problem:** The AI interaction is a traditional chat interface (user message → assistant response). This doesn't leverage the fact that we're in a *game editor*. The AI should be contextual — aware of what entity is selected, what scene is open, what the user is looking at.
- **Solution:** 
  - Add context chips above the input showing what the AI knows (e.g., "Scene: Level 1 | Selected: Player | 12 entities")
  - Show inline code previews *inside* the chat with "Apply" buttons (partially done with `CodeDiffView`, but needs more prominence)
  - Add quick-action chips: "Add enemy", "Fix collision", "Balance difficulty"
- **Priority:** High

### 3. **No Visual Onboarding Flow**

- **Location:** `OnboardingTour` component exists but needs review
- **Problem:** First-time users land on a dashboard with multiple options. The path from "I have a game idea" to "I'm playing my game" isn't visually guided.
- **Solution:** Add a prominent "Start with AI" card that opens a focused AI-first creation flow: describe your game → AI generates scaffolding → you're in the editor. Make this the primary CTA, not "New Project" which implies you know what you're doing.
- **Priority:** High

### 4. **Sidebar Lacks Project Context Switching**

- **Location:** `apps/web/src/components/AppLayout.tsx`
- **Problem:** When in a project, the sidebar shows project nav items but no way to switch projects without going back to dashboard. Multi-project users will navigate in circles.
- **Solution:** Add a project dropdown/switcher at the top of the sidebar (similar to VS Code's workspace switcher). Shows current project name, click to see recent projects.
- **Priority:** Medium

### 5. **CSS Files Are Fragmented**

- **Location:** 15+ standalone CSS files in `apps/web/src/`
- **Problem:** Styles are spread across `ai-studio.css`, `ai-thinking.css`, `command-palette.css`, `game-hub.css`, `file-tree.css`, `skeleton.css`, `onboarding.css`, `error-boundary.css`, `accessibility.css`, `welcome-modal.css`, `scene-editor-ai.css`, `git-center.css`, plus page-specific CSS. This leads to inconsistent patterns and potential style conflicts.
- **Solution:** Consolidate into fewer CSS modules or adopt CSS Modules (`.module.css`) / Tailwind to prevent class name collisions. At minimum, move shared patterns into `theme.css` as utility classes.
- **Priority:** Low (tech debt, not blocking)

### 6. **Scene Editor AI Bar Should Be More Prominent**

- **Location:** `apps/web/src/components/scene-editor/SceneEditorAIBar.tsx`
- **Problem:** The AI bar in the scene editor risks being a small text input tucked away. In an AI-first platform, AI should feel like a co-pilot, not a search bar.
- **Solution:** Give the AI bar a distinct visual treatment — gradient border, subtle glow animation, and suggested prompts that change based on context (e.g., if an entity is selected: "Add patrol behavior", "Change sprite color").
- **Priority:** Medium

---

## 📐 Layout Recommendations

### Navigation
- The sidebar width (240px) is good. Keep it.
- Add a **breadcrumb** at the top of the main content area: `Dashboard > My Game > Scene Editor` for orientation.
- Consider **collapsible sidebar sections** — Code Editor, Scene Editor, and AI Command could be grouped under "Development" while Assets and Export are under "Publishing."

### Main Content Area
- The main area should have a **consistent page shell**: title bar with actions, then content. Currently some pages have `page-header` and others don't.
- Add a **global AI status indicator** in the top-right corner (like Cursor's AI status) — shows connection state, model, and enables quick access to AI features from anywhere.

### Panels/Sidebars
- Scene Editor panel layout (Asset Browser | Canvas | Properties) is correct — this is the standard game editor triptych. 
- Property Inspector should show **AI-suggested values** (e.g., "Common speed for platformer player: 200-400") with a click-to-apply pattern.

---

## 🎭 Visual Elements

### Colors
The current palette is solid. Minor refinements:

```css
/* Current is good. One addition: */
--ai-shimmer: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.08), transparent);
/* Use for loading states to reinforce AI branding */
```

### Typography
Current choices (Inter + JetBrains Mono) are perfect. No changes needed.

### Spacing
Current scale is well-defined. Consider one addition:
```css
--space-section: 80px;  /* For major page sections (hero → quick actions → projects) */
```

---

## 🔍 Competitive Research

| Platform | What They Do Well | What We Can Learn |
|----------|------------------|-------------------|
| **Rosebud AI** | Prompt-to-game in seconds, instant preview, asset generation (sprites, NPCs), one-click deploy | Make the "describe → play" loop faster and more magical. Their UX is centered entirely around the prompt. |
| **Construct 3** | Event sheet visual scripting, behavior library, polished editor layout | Our AI Command should feel as visual and approachable as Construct's event sheets — not just a text chat. |
| **GDevelop** | Ready-made behaviors, one-click effects, mobile-friendly editor, community sharing | Pre-built AI templates ("Add platformer movement") with visual previews, not just text descriptions. |
| **Unity** | Inspector panel, scene hierarchy, component system | We have this in Scene Editor — keep refining toward Unity-level polish. |
| **Ludo.ai** | AI-powered game research, concept art, game design docs | AI doesn't just generate code — it helps with game design, balance, and ideation. Add an "AI Game Designer" mode. |
| **Cursor / Windsurf** | Ambient AI integration, inline edits, Cmd+K for everything, context-aware suggestions | This is the gold standard for AI-native UX. Our Command Palette + AI FAB is the right start. |

### Key Insights
1. **Rosebud AI is the direct competitor** — they do prompt-to-game in browser. We differentiate by offering deeper control (code editor, scene editor) plus AI, not just AI alone.
2. **The "vibe coding" trend** (Rosebud, Bolt, Lovable) shows users want to *describe and iterate*, not configure. Our AI Command should support multi-turn refinement: "make it faster" → "now add enemies" → "make it harder."
3. **Visual feedback during AI generation** matters enormously. Users need to see *something* happening while AI works — skeleton screens, progress steps, or partial renders.

### Features to Consider
- **Live AI preview** — As AI generates code, show the game preview updating in real-time (streaming preview)
- **AI-generated asset gallery** — Type "space ship" → get 4 sprite options → click to use
- **One-click game templates** with AI customization — "Start with Platformer template" → "AI, change the theme to underwater"
- **Collaborative AI history** — Show a timeline of AI changes with rollback (partially done via Git Center, but should be more visual)

---

## 📋 Priority Fixes

1. **[High]** AI Command needs contextual awareness (what scene, what entity, what code is open) — this is the #1 thing that separates "AI chatbot" from "AI co-pilot"
2. **[High]** "Start with AI" first-time flow — the hero CTA should immediately engage users in AI-powered creation, not send them to a form
3. **[Medium]** Scene Editor AI bar visual prominence — gradient/glow treatment, contextual prompt suggestions
4. **[Medium]** Project switcher in sidebar — reduce navigation friction for multi-project users
5. **[Medium]** Breadcrumb navigation — orientation aid for nested project routes
6. **[Low]** CSS consolidation — reduce fragmentation across 15+ files
7. **[Low]** Hero section interactive demo — replace static orbs with live preview

---

## 💡 Creative Ideas

### Innovations to Consider

- **"Game Diff" view** — When AI suggests changes, show a split-screen before/after of the *game itself* (not just the code). "See what your game looks like with this change" is incredibly powerful.
- **AI entity sculpting** — In the Scene Editor, select an entity and type "make it bounce" or "add glow effect." The AI modifies the entity live. This is our "Figma auto-layout" moment.
- **Playtest with AI** — Let the AI play your game and give feedback: "This level is too hard at the start," "The jump feels floaty," "Players might miss this platform." 

### AI-Specific UX

- **AI commands should be multimodal** — Users should be able to sketch a rough level layout and have AI turn it into a scene. Or record a gameplay clip and say "make the enemies like this."
- **Streaming AI output** — When AI generates code or assets, stream the results progressively with a shimmer/skeleton effect. Never show a blank loading state.
- **Confidence indicators** — Already partially implemented (`ConfidenceBadge`). Expand to show "AI is confident" vs "AI is guessing — you may want to verify" with appropriate visual treatments.
- **Undo as first-class citizen** — Every AI action should be instantly reversible with a prominent "Undo AI change" button (not buried in git history).

---

## 📊 UI/UX Score

| Area | Current | Target | Notes |
|------|---------|--------|-------|
| Visual Design | B+ | A | Design system is strong. Needs more "wow" moments and AI-specific visual language. |
| User Experience | B | A | Solid basics. Needs AI-native workflows (not bolted-on chat). |
| Accessibility | B+ | A | Great foundations (skip links, reduced motion, focus). Needs more ARIA work on interactive editors. |
| Innovation | B- | A+ | Good features but feels like "game engine + AI chat." Should feel like "AI that builds games." |
| Competitive Position | B | A | Rosebud is ahead on prompt-to-game simplicity. We win on depth. Need to communicate that better. |

### Overall Assessment: **B (on-track, strong foundations, needs AI-native evolution)**

The platform has excellent bones — the design system, component architecture, and feature set are all solid. The key gap is between "a game editor that has AI features" and "an AI-first game creation experience." Closing that gap means making AI ambient (not a separate page), contextual (aware of what you're doing), and visual (show, don't tell).

---

*Next review: After next major feature milestone or in 1 week, whichever comes first.*
