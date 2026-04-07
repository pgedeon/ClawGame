# UI/UX Review Feedback

**Last Review:** 2026-04-07 12:05 UTC
**Reviewed Version:** 1251cca (Milestone 2 - File workspace with backend file API)
**Status:** needs-improvement

---

## 🎯 Alignment with Goal

The current UI/UX is functional but **feels like a generic admin dashboard**, not an AI-first game development platform. The core problem: users do not sense that AI is the foundation — it's presented as a side feature in a separate page (`/project/:projectId/ai`).

To make ClawGame the best AI-first game dev platform, the UI must:
1. **Make AI the default interaction model** — not a separate page, but woven into every workflow
2. **Reduce cognitive load** for non-technical users while not blocking experts
3. **Provide immediate visual feedback** — game development is visual; the UI must feel alive and creative

Right now the experience is: "here's a file tree, here's a text editor, oh and there's an AI page if you want it." The right experience should be: "what do you want to build? Let me help you."

---

## 🎨 Overall Design Direction

**Current Style:** Generic dark-mode admin panel — clean but undifferentiated. Resembles VS Code's sidebar with a React Router shell. Functional, zero personality, forgettable.

**Recommended Direction:** "Creative Workshop" — a studio feel where the platform feels like a creative partner. Think *Figma* meets *Replit* meets *Notion AI*. The sidebar should be narrow and contextual. The main area is content-first, with AI as a floating/persistent companion.

**Brand Personality:** Friendly, competent, creative. Not corporate (no "Enterprise Dashboard" vibes). Should feel like working with a talented friend who happens to know everything about game development.

**Key Shift: From Admin Panel to Creative Canvas**
- Current: sidebar → content area (static hierarchy)
- Target: canvas-first with contextual panels (AI, assets, code as layers you toggle)

---

## ✨ What Looks Great

1. **Consistent theme variables** (`theme.css`) — clean CSS custom properties, easy to tweak, dark-mode-ready via `prefers-color-scheme`. Good foundation for future theming.
2. **Loading and error states** — every page handles `loading`, `error`, and `empty` states. This is often overlooked by early-stage teams.
3. **Typing indicator animation** in AI Command — small detail but adds life. The triple-dot bounce is well-executed.
4. **File tree lazy-loading** — expand-on-demand with `📂`/`📁` toggle. Good UX for large projects.
5. **Unsaved changes badge** — orange "Unsaved" indicator in `CodeEditor.tsx:53` is visible and meaningful.
6. **CSS variable naming consistency** — `theme.css` uses a coherent naming convention (`--primary-color`, `--bg-color`, `--text-muted`). Much better than the fragmented approach noted in some codebases.

---

## 🐛 What Needs Improvement

### 1. **No Visual Hierarchy on Dashboard**
- **Location:** `apps/web/src/pages/DashboardPage.tsx:65-82`
- **Problem:** All "Quick Actions" cards are equal size and visual weight. The most important action ("New Project") is not visually elevated above "Examples."
- **Solution:** Make "New Project" a primary CTA — larger, different background, positioned first. Secondary actions are smaller/dimmer.
- **Code:**
```css
/* apps/web/src/App.css — add after .action-grid */
.action-card.primary {
  grid-column: span 2;
  background: var(--primary-color);
  color: white;
}
.action-card.primary:hover {
  background: var(--primary-hover);
}
.action-card.primary .action-description {
  color: rgba(255, 255, 255, 0.85);
}
```
```tsx
// apps/web/src/pages/DashboardPage.tsx — update first card
{quickActionLinks.map((action, index) => (
  <Link
    key={action.to}
    to={action.to}
    className={`action-card ${index === 0 ? 'primary' : ''}`}
  >
```

### 2. **AI Command Page Is Isolated**
- **Location:** `apps/web/src/pages/AICommandPage.tsx:1-346`
- **Problem:** AI is buried on its own route (`/project/:id/ai`). Users must navigate away from the editor to "talk to AI." This destroys context and flow. In an AI-first platform, AI should be accessible *everywhere*, ideally as a floating panel or command palette.
- **Solution:** Convert AI from a page to a **global command palette** (Cmd+K) + **floating chat widget** accessible from any page. Keep the existing page for "long conversation" mode, but primary interaction should be overlay-based.
- **Implementation note:** Use `react-hotkeys-hook` or native `keydown` listener for `Cmd+K` / `Ctrl+K`. Overlay is a `position: fixed` modal with a chat input + streaming response.

### 3. **Code Editor Is a Plain Textarea**
- **Location:** `apps/web/src/components/CodeEditor.tsx:85-95`
- **Problem:** A bare `<textarea>` with a monospace font. No syntax highlighting, no line numbers, no indentation guides, no minimap. For game devs (who are often experienced programmers), this is a deal-breaker. It signals "this is a toy."
- **Solution:** Integrate **Monaco Editor** (VS Code's editor engine) or **CodeMirror 6**. Both support TypeScript/JavaScript syntax highlighting out of the box.
- **Code (CodeMirror 6 example):**
```ts
// Install: pnpm add @codemirror/basic-setup @codemirror/lang-javascript @codemirror/theme-one-dark
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

// Replace textarea with:
const editorRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!editorRef.current) return;
  const view = new EditorView({
    doc: content,
    extensions: [basicSetup, javascript(), oneDark],
    parent: editorRef.current,
    onUpdate: (update) => {
      if (update.docChanged) {
        setContent(update.state.doc.toString());
        setHasChanges(true);
      }
    },
  });
  return () => view.destroy();
}, []);
```

### 4. **Sidebar Navigation Uses Emoji Icons**
- **Location:** `apps/web/src/constants/sidebar.ts:4-12`
- **Problem:** `📊`, `⚙️`, `🤖`, `🎨` are not icons — they are emoji. They render differently across OS/browsers, have no hover states, no consistent sizing, and feel amateurish.
- **Solution:** Use a proper icon library: **Lucide React** (lightweight, clean, widely used) or **Heroicons**. Replace all emoji with SVG icons.
- **Code:**
```ts
// apps/web/src/constants/sidebar.ts
import { Home, Settings, FileCode, Bot, Palette } from 'lucide-react';

export const sidebarItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/settings', label: 'Settings', icon: Settings },
];

// In AppLayout.tsx, render as component:
{dynamicSidebarItems.map((item) => {
  const Icon = item.icon;
  return (
    <Link ...>
      <Icon className="nav-icon" size={20} />
```
```css
/* App.css — update icon styles */
.nav-icon {
  margin-right: 0.75rem;
  color: currentColor;
}
```

### 5. **No Keyboard Shortcuts**
- **Location:** Throughout
- **Problem:** Game devs are power users. They expect: `Ctrl/Cmd+S` (save), `Ctrl/Cmd+K` (command palette), `Ctrl/Cmd+F` (find in files), `Ctrl/Cmd+P` (quick file open). None of these exist.
- **Solution:** Add a global keyboard shortcut handler. Start with `Ctrl/Cmd+S` for file save in editor context.

### 6. **Error States Are Visually Weak**
- **Location:** `apps/web/src/pages/DashboardPage.tsx:54-64`, `apps/web/src/App.css:142-145`
- **Problem:** Error messages are plain text with `#d32f2f` color. No icon, no suggested fix, no visual affordance that something went wrong. For non-technical users, `"Failed to load projects"` is frightening and unhelpful.
- **Solution:** Use a proper error component with icon, message, and retry action.
- **Code:**
```tsx
// apps/web/src/components/ErrorState.tsx (new file)
import React from 'react';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="error-retry-btn">
          Try Again
        </button>
      )}
    </div>
  );
}
```
```css
/* apps/web/src/App.css — add */
.error-state {
  text-align: center;
  padding: 3rem 2rem;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  max-width: 500px;
  margin: 2rem auto;
}
.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.error-state h3 {
  color: var(--text-color);
  margin-bottom: 0.5rem;
}
.error-state p {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}
.error-retry-btn {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}
```

### 7. **Create Project Form Is Generic**
- **Location:** `apps/web/src/pages/CreateProjectPage.tsx`
- **Problem:** The "art style" selection uses radio buttons stacked vertically (`radio-group` class). This is a waste of screen real estate and makes it hard to compare options. For a visual medium (game art), users need **visual previews**, not text labels like "Pixel Art" or "Vector Art".
- **Solution:** Replace radio buttons with card-based visual selectors showing thumbnail previews of each art style.
- **Code:**
```tsx
// apps/web/src/pages/CreateProjectPage.tsx — replace radio-group
<div className="art-style-grid">
  {artStyles.map((style) => (
    <label
      key={style.id}
      className={`art-style-card ${formData.artStyle === style.id ? 'selected' : ''}`}
    >
      <input
        type="radio"
        name="artStyle"
        value={style.id}
        checked={formData.artStyle === style.id}
        onChange={(e) => handleChange('artStyle', e.target.value)}
        className="sr-only"
      />
      <div className="art-style-preview" style={{
        background: getStylePreview(style.id)
      }} />
      <span className="art-style-name">{style.name}</span>
      <span className="art-style-desc">{style.description}</span>
    </label>
  ))}
</div>
```
```css
/* apps/web/src/App.css — add */
.art-style-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}
.art-style-card {
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}
.art-style-card.selected {
  border-color: var(--primary-color);
  background: var(--primary-light);
}
.art-style-preview {
  width: 100%;
  height: 80px;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  background: var(--surface-alt);
}
.art-style-name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}
.art-style-desc {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 8. **No Project Thumbnail / Visual Preview on Cards**
- **Location:** `apps/web/src/pages/DashboardPage.tsx:107-130`
- **Problem:** Project cards are text-only: name, genre, status, date. Game development is visual — a card with no screenshot or color-coded genre indicator feels like a bug tracker, not a game studio.
- **Solution:** Add a colored header band or auto-generated thumbnail to each project card. The color can be derived from `genre` or `artStyle`.

### 9. **Asset Studio Uses Inline SVG Data URIs**
- **Location:** `apps/web/src/pages/AssetStudioPage.tsx:20-30`
- **Problem:** The mock assets use base64-encoded SVG data URIs that do not render as recognizable game assets. This is fine for a demo, but the "preview" section shows a broken-looking icon, undermining trust. Use proper placeholder images instead.
- **Solution:** Replace with CSS-generated placeholders or use a service like `https://placehold.co/200x200?text=Sprite`.

### 10. **No Responsive Design**
- **Location:** Global
- **Problem:** The entire layout assumes a desktop screen. The sidebar is `240px` fixed width (`App.css:11`), file workspace sidebar is `300px` (`file-workspace.css:72`). On tablet or narrow laptop screens, this eats most of viewport. There are zero media queries.
- **Solution:** Add responsive breakpoints. At minimum:
```css
/* apps/web/src/App.css — add at end */
@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  .main-content {
    padding: 1rem;
  }
}
```

### 11. **CSS Variable Naming Inconsistency Between Files**
- **Location:** `apps/web/src/theme.css` vs `apps/web/src/App.css`
- **Problem:** `theme.css` defines `--primary-color`, `--bg-color`, `--text-color`, but `App.css` uses `--accent`, `--bg`, `--fg`, `--card`, `--border`. The current code accidentally works because the file using `--accent` references a variable that doesn't exist, but the browser gracefully falls through to defaults. This is brittle and will break with theming changes.
- **Solution:** Standardize on a single naming convention. Adopt `theme.css` variables everywhere and remove orphans.
```css
/* apps/web/src/theme.css — updated canonical palette */
:root {
  /* Core palette */
  --accent: #0077be;
  --accent-hover: #005a87;
  --accent-light: #e3f2fd;
  --bg: #ffffff;
  --card: #f8f8f8;
  --card-hover: #f0f0f0;
  --fg: #1a1a1a;
  --border: #e0e0e0;
  --text-muted: #666666;

  /* Status colors */
  --success: #4caf50;
  --warning: #ff9800;
  --error: #f44336;

  /* Editor */
  --editor-bg: #fafafa;
  --editor-text: #1a1a1a;
}
```
Then remove orphaned variable refs in `App.css` and `index.css` that assume `--accent` is defined.

### 12. **No Empty-State Illustration or Guidance in Editor**
- **Location:** `apps/web/src/pages/EditorPage.tsx:43-48`
- **Problem:** When no file is selected, user sees "No file selected / Select a file from the tree to start editing." It is correct but cold. A first-time user may not understand they should click the left sidebar.
- **Solution:** Add a gentle illustration or icon, plus a hint with a keyboard shortcut (`Press Ctrl+P to quick-open files`).

---

## 📐 Layout Recommendations

### Navigation (Sidebar)
- **Current:** 240px fixed, logo at top, nav items below, project nav injected dynamically.
- **Recommended:** Shrink to **64px collapsed** + **260px expanded** toggle pattern (like VS Code or Slack). This gives more room for the main content area.
- Add a **"Quick Actions" button** at the bottom of the sidebar that opens the AI command palette.

### Main Content Area
- **Current:** Full-width flex container with page-level padding.
- **Recommended:** Add a **toolbar** at the top of the main area (not the page header) for contextual actions: Save, Build, Play, Export. This moves actions closer to where work happens.

### Panels/Sidebars
- **FileTree sidebar (300px):** Good width. Add a **collapse button** (`«`) for users who want full-screen code view.
- **Asset Studio sidebar (350px):** Reasonable but consider making it collapsible too.
- **AI Chat panel:** Currently full-page. Convert to a **320px floating panel** overlay on the right side when activated, so users can see AI responses while still viewing their code/assets.

---

## 🎭 Visual Elements

### Colors

The current palette is acceptable for light mode but lacks depth. Recommended refined palette:

```css
/* apps/web/src/theme.css — refined palette */
:root {
  /* Primary (game-dev friendly blue) */
  --accent: #3b82f6;           /* Tailwind blue-500 */
  --accent-hover: #2563eb;     /* Tailwind blue-600 */
  --accent-light: #dbeafe;     /* Tailwind blue-100 */

  /* Background layering */
  --bg: #ffffff;
  --surface: #f9fafb;          /* subtle card bg */
  --surface-alt: #f3f4f6;
  --card: #ffffff;
  --card-hover: #f9fafb;

  /* Text hierarchy */
  --fg: #111827;               /* gray-900 */
  --fg-secondary: #4b5563;     /* gray-600 */
  --text-muted: #9ca3af;       /* gray-400 */

  /* Borders */
  --border: #e5e7eb;           /* gray-200 */
  --border-strong: #d1d5db;    /* gray-300 */

  /* Status */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Editor */
  --editor-bg: #f9fafb;
  --editor-text: #111827;
  --editor-gutter: #e5e7eb;
  --editor-selection: #dbeafe;
}

@media (prefers-color-scheme: dark) {
  :root {
    --accent: #60a5fa;
    --accent-hover: #3b82f6;
    --accent-light: #1e3a5f;
    --bg: #0f172a;             /* slate-900 */
    --surface: #1e293b;        /* slate-800 */
    --surface-alt: #334155;
    --card: #1e293b;
    --card-hover: #334155;
    --fg: #f1f5f9;
    --fg-secondary: #94a3b8;
    --text-muted: #64748b;
    --border: #334155;
    --border-strong: #475569;
    --editor-bg: #0f172a;
    --editor-text: #f1f5f9;
    --editor-gutter: #1e293b;
    --editor-selection: #1e3a5f;
  }
}
```

### Typography

```css
/* apps/web/src/index.css — add font stack */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}

body {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
}

code, pre, .editor-textarea, .prompt-text {
  font-family: var(--font-mono);
}
```

### Spacing

```css
/* apps/web/src/theme.css — add spacing scale */
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

---

## 🔍 Competitive Research

| Platform | What They Do Well | What We Can Learn |
|----------|------------------|-------------------|
| **Unity Editor** | Context-sensitive inspector, scene view + hierarchy split, visual drag-and-drop | Panels that adapt to what you select; we should show AI context when a file is selected |
| **Godot** | Clean 4-panel layout (scene, viewport, inspector, filesystem), intuitive for 2D | A clear spatial organization; our current sidebar is too flat |
| **Construct 3** | Event-sheet visual scripting (no code needed), drag-and-drop behaviors | Non-coders need a visual way to express logic. Our AI Command should feel like this: "when player jumps, play sound" — natural language → event sheet |
| **GDevelop** | Visual event editor with conditions/actions, preview mode | The "preview button" should be in main toolbar, not buried. One-click play is critical |
| **Replit** | AI as a sidebar companion (Ghostwriter), always available, context-aware | This is the closest model. AI panel slides in/out; it has file context. We should mirror this |
| **Figma** | Comment threads anchored to elements, collaborative real-time | When AI suggests a code change, show it as an in-line comment/diff preview, not just text in a chat |
| **Cursor / Bolt.new** | AI edits code directly with diff preview, user approves/rejects | This is exactly what our AI Command changes API does (changes[]). But UI should show a **diff view** (green/red lines) with accept/reject buttons |

**Key Insights:**
1. **AI should be everywhere, not a page.** Both Cursor and Replit keep AI as a persistent companion. Our separate `/ai` page breaks flow.
2. **Visual feedback > text descriptions.** When AI proposes changes, show diff inline (like GitHub PR review), not just a list of file paths.
3. **One-click actions.** "Build", "Play", "Export" should be always-visible toolbar buttons, not secondary buttons.
4. **Progressive disclosure.** Beginners see simple controls; experts can expand panels for advanced features. Our current UI exposes everything equally.

**Features to Consider:**
- **Command Palette (Cmd+K)** — Universal search + AI prompts. Standard in every modern dev tool.
- **Diff preview for AI changes** — Show green/red diff before accepting.
- **Collapsible sidebar panels** — File tree, AI chat, asset browser should all toggle.
- **Floating "Generate" button** — In Asset Studio, a prominent button to start AI generation.

---

## 📋 Priority Fixes

| # | Priority | Issue | Impact |
|---|----------|-------|--------|
| 1 | **High** | Replace `<textarea>` with Monaco/CodeMirror editor | Core credibility issue — game devs expect a real code editor |
| 2 | **High** | Standardize CSS variable naming (`theme.css` vs `App.css`) | Broken theming prevents consistent dark mode and maintainability |
| 3 | **High** | Add keyboard shortcuts (`Ctrl+S`, `Ctrl+K`) | Power user frustration; table stakes for dev tools |
| 4 | **Medium** | Replace emoji icons with Lucide/Heroicons | Professional polish; cross-platform rendering |
| 5 | **Medium** | Add responsive breakpoints (768px, 1024px) | Tablet/narrow laptop usability |
| 6 | **Medium** | Visual art-style selector on Create Project | Conversion improvement for project creation flow |
| 7 | **Medium** | Convert AI page to floating/command palette overlay | AI-first UX — makes AI accessible from any context |
| 8 | **Low** | Add error component with icon + retry | Polish; reduces user anxiety on errors |
| 9 | **Low** | Project card thumbnails/visual indicators | Delight factor; game projects should look like games |
| 10 | **Low** | Collapsible sidebar panels | Nice-to-have for power users |

---

## 💡 Creative Ideas

### 1. **AI Command Palette (Cmd+K)**
Instead of navigating to `/project/:id/ai`, users press `Cmd+K` and type naturally: "add player movement" or "fix collision bug." The AI responds in a floating panel, and approved changes are applied inline. This is how Cursor works — it's the gold standard for AI-first dev UX.

**How it supports AI-first:** AI becomes the default interaction, not an afterthought.

### 2. **Inline Diff Preview for AI Changes**
When AI proposes changes (via `changes[]` array in the API response), show a side-by-side or inline diff (Git-style: red lines removed, green lines added) with "Accept All" / "Reject All" / "Accept File" buttons. This builds trust — users can see exactly what AI will change.

### 3. **"Play" Button in Top Toolbar**
Add a prominent green "▶ Play" button in editor toolbar (next to Build/Export). When clicked, open a side-by-side preview pane or a popup iframe running the game. Seeing the game *run* is the ultimate feedback loop.

### 4. **Contextual AI Suggestions**
When a user has `src/player.ts` open, the AI chat placeholder should say: "Ask me about this file" instead of a generic greeting. Inject the current file path into the AI context automatically.

### 5. **Welcome Tour / Onboarding**
First-time users see a 3-step interactive tour:
1. "Create a project with AI" → prompts them to try the command palette
2. "See your files" → highlights the file tree
3. "Play your game" → shows the Play button

This converts passive visitors into active builders.

### 6. **AI-Specific UX Patterns**

| Pattern | How |
|---------|-----|
| **Show AI "thinking"** | Streaming tokens in chat + a "generating..." spinner. Already partially done with typing indicator, but should show streaming text. |
| **Explain uncertainty** | The API already returns `riskLevel` and `confidence`. Surface these: "I'm 85% confident this change is safe" with a visual confidence bar. |
| **Undo AI changes** | When AI applies changes, add an "Undo" button (or rely on Git-like versioning). Trust is built by making reverting easy. |
| **Template prompts** | Instead of generic "Quick Prompts" buttons, show prompts *relevant to* the current file. If `player.ts` is open: "Add double jump," "Fix gravity." |

---

## 📊 UI/UX Score

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| **Visual Design** | C- | A | Colors are inconsistent; emoji icons; no visual hierarchy on cards; no typography system |
| **User Experience** | D+ | A | AI is isolated; no keyboard shortcuts; no diff preview; no command palette; bare textarea |
| **Accessibility** | D | A | No focus indicators on interactive elements; no ARIA labels; no screen reader support; missing contrast testing |
| **Innovation** | C | A | Functional but conventional; AI is not differentiated from a chatbot in a page; no AI-native patterns |

### Summary
The foundation is solid: routing works, API integration is real, components are structured well, and the CSS variables are thoughtfully organized. But the **AI-first promise is not reflected in the UI**. AI lives on its own page, the editor is a textarea, and navigation uses emoji. These are fixable, and the fixes are high-impact.

**Immediate next actions (this sprint):**
1. Replace textarea with CodeMirror/Monaco → one-day task, massive credibility gain
2. Standardize CSS variables → half-day task, unlocks dark mode properly
3. Replace emoji with Lucide icons → half-day task, visual polish
4. Add Cmd+K command palette stub → 1-day task, foundational for AI-first UX
5. Build diff preview component for AI changes → 2-day task, core trust builder

---

*This file is auto-generated by the UI/UX Agent cron job. Next review: ~2 hours.*
