# UI/UX Review Feedback

**Last Review:** 2026-04-07 16:50 UTC
**Reviewed Version:** v0.3.2 (commit c0a58ce - Milestone 4 complete with command palette)
**Status:** on-track ⬆️ (improving from previous "needs-improvement")

---

## 🎯 Alignment with Goal

**Goal:** "The best web-based AI-first game development platform"

**Current Assessment:** The platform has made significant progress since the last review. The command palette (Cmd+K) is now implemented, providing AI-first access across all contexts. The design system is mature with proper dark/light mode, accessibility tokens, and consistent spacing. However, the **AI-first differentiator is still undercommunicated visually** - users don't immediately understand that AI is the core workflow, not a sidebar feature.

**Key Achievement:** Command palette + AIFAB provide dual access paths to AI, making it more discoverable. The floating AI button appears contextually in project pages, which is excellent.

**Remaining Gap:** The visual branding doesn't scream "AI-first" - it looks like a traditional game editor with some AI features. We need stronger visual cues (branding, onboarding, and AI-specific UI patterns) to communicate this is an AI-native platform.

---

## 🎨 Overall Design Direction

**Current Style:** Clean, modern SaaS aesthetic with blue (#3b82f6) as primary accent and purple (#8b5cf6) for AI branding. Light/dark mode support with good contrast ratios. Professional but generic.

**Recommended Direction:** 
- **Visual Language:** Shift from "generic game editor" to "AI-powered creative platform"
- **Brand Personality:** Intelligent, empowering, magical - not just functional
- **Key Differentiator:** AI should feel like a creative partner, not a tool

**Action:** Consider an AI-themed gradient hero in the dashboard, animated AI-related microinteractions, and stronger purple accent usage to signal AI-first branding.

---

## ✨ What Looks Great

1. **Design System (theme.css)** - Well-structured with semantic tokens, proper dark/light mode, accessible color ratios. Excellent foundation.
   
2. **Command Palette Integration** - Cmd+K triggers AI commands globally from any page. This is exactly what an AI-first platform should have - AI everywhere, not siloed.

3. **AIFAB (Floating AI Button)** - Contextually visible in project pages only. Shows proper UX thinking: don't clutter dashboard, make AI available where it's needed.

4. **Code Editor Integration** - CodeMirror editor with proper syntax highlighting, line numbers, and keyboard shortcuts. Professional-grade editing experience.

5. **File Tree Component** - Collapsible tree structure with proper icons and selection states. Good feedback on hover and active states.

6. **Toast Notifications** - Non-intrusive feedback system for user actions. Positioned correctly and auto-dismissing.

---

## 🐛 What Needs Improvement

### 1. **AI Branding Undercommunicated**

**Location:** `apps/web/src/theme.css:AI branding section`
**Problem:** Purple (#8b5cf6) exists but is only used in AIFAB. The overall platform still feels blue-first, not AI-first. New users won't immediately understand this is an AI-native platform.

**Solution:** Increase purple presence in key UI elements:
- Dashboard hero section with AI-themed gradient
- Primary CTAs use purple for AI-related actions
- Subtle purple glow effects on AI interactions
- Consider an animated AI logo or mascot

**Code:**
```css
/* Enhanced AI branding */
:root {
  /* Make AI branding more prominent */
  --ai-gradient: linear-gradient(135deg, #8b5cf6, #ec4899, #3b82f6);
  --ai-glow: rgba(139, 92, 246, 0.15);
  --ai-glow-strong: rgba(139, 92, 246, 0.3);
}

/* Apply AI branding to hero sections */
.dashboard-hero {
  background: var(--ai-gradient);
  color: white;
}

/* AI-themed CTA buttons */
.btn-ai-primary {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  box-shadow: 0 4px 12px var(--ai-glow-strong);
}
```

---

### 2. **Missing First-Time User Onboarding**

**Location:** `apps/web/src/pages/DashboardPage.tsx` (no onboarding component)
**Problem:** First-time users land on the dashboard with projects grid and CTAs, but no explanation of what makes ClawGame special. No walkthrough, no "try AI" demo, no value proposition.

**Solution:** Add a progressive onboarding overlay for new users:
- **Step 1:** Welcome modal explaining AI-first approach
- **Step 2:** Demo: "Ask AI to create a platformer" (real demo, not mock)
- **Step 3:** Highlight key features with interactive tour
- **Step 4:** Invite to first project creation

**Code:**
```tsx
// apps/web/src/components/OnboardingTour.tsx (new)
import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('clawgame:tour-seen');
    if (!hasSeenTour) setIsVisible(true);
  }, []);

  const steps = [
    {
      title: "Welcome to ClawGame",
      content: "Unlike traditional game engines, ClawGame is AI-first. Just describe what you want to build, and we'll handle the code.",
      highlight: null
    },
    {
      title: "Try the Command Palette",
      content: "Press Cmd+K (or Ctrl+K) anywhere to ask AI for help. Try it now!",
      highlight: ".command-palette-trigger"
    },
    {
      title: "Create Your First Game",
      content: "Ready? Let's create your first project with AI assistance.",
      highlight: ".btn-create-project"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setIsVisible(false);
      localStorage.setItem('clawgame:tour-seen', 'true');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <button 
          className="onboarding-close"
          onClick={() => setIsVisible(false)}
        >
          <X size={16} />
        </button>
        
        <div className="onboarding-icon">
          <Sparkles size={32} color="#8b5cf6" />
        </div>
        
        <h2>{steps[step].title}</h2>
        <p>{steps[step].content}</p>
        
        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <div 
              key={i}
              className={`progress-dot ${i <= step ? 'active' : ''}`}
            />
          ))}
        </div>
        
        <button className="onboarding-btn-primary" onClick={handleNext}>
          {step < steps.length - 1 ? 'Next' : "Let's Go!"}
        </button>
        
        <button 
          className="onboarding-btn-secondary"
          onClick={() => setIsVisible(false)}
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}
```

```css
/* apps/web/src/onboarding.css */
.onboarding-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  backdrop-filter: blur(4px);
}

.onboarding-card {
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 420px;
  box-shadow: var(--shadow-xl);
  position: relative;
}

.onboarding-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

.onboarding-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.onboarding-card h2 {
  margin: 0 0 1rem;
  text-align: center;
  color: var(--fg);
}

.onboarding-card p {
  margin: 0 0 2rem;
  text-align: center;
  color: var(--fg-secondary);
  line-height: 1.6;
}

.onboarding-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 1.5rem;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
}

.progress-dot.active {
  background: var(--ai-primary);
  box-shadow: 0 0 8px var(--ai-glow);
}

.onboarding-btn-primary {
  width: 100%;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 0.75rem;
}

.onboarding-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--ai-glow-strong);
}

.onboarding-btn-secondary {
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  color: var(--text-muted);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.onboarding-btn-secondary:hover {
  background: var(--hover-bg);
  color: var(--fg-secondary);
}
```

---

### 3. **AI Command Page Feels Siloed**

**Location:** `apps/web/src/pages/AICommandPage.tsx`
**Problem:** Dedicated AI command page exists but feels disconnected from main workflow. Users don't know when to use this vs command palette vs AIFAB. The UI doesn't show integration with other features (code editor, scene editor, assets).

**Solution:** 
1. Make AICommandPage more about "advanced AI workflows" and "saved prompts"
2. Add inline AI suggestions in editor (not just separate page)
3. Show AI context awareness across panels

**Code:**
```tsx
// Enhanced AI Command Page with context awareness
export function AICommandPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [mode, setMode] = useState<'chat' | 'workflows' | 'history'>('chat');

  return (
    <div className="ai-command-page">
      <div className="ai-command-header">
        <h2>AI Assistant</h2>
        <div className="ai-command-tabs">
          <button 
            className={`tab ${mode === 'chat' ? 'active' : ''}`}
            onClick={() => setMode('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={`tab ${mode === 'workflows' ? 'active' : ''}`}
            onClick={() => setMode('workflows')}
          >
            ⚡ Workflows
          </button>
          <button 
            className={`tab ${mode === 'history' ? 'active' : ''}`}
            onClick={() => setMode('history')}
          >
            📜 History
          </button>
        </div>
      </div>

      {mode === 'chat' && (
        <div className="ai-chat-interface">
          <div className="ai-context-badge">
            📁 Context: {projectId ? 'Active Project' : 'Global'}
            <button className="btn-edit-context">Edit</button>
          </div>
          {/* Chat UI */}
        </div>
      )}

      {mode === 'workflows' && (
        <div className="ai-workflows">
          {/* Saved prompts, quick actions, templates */}
        </div>
      )}

      {mode === 'history' && (
        <div className="ai-history">
          {/* Previous conversations, searchable */}
        </div>
      )}
    </div>
  );
}
```

---

### 4. **No AI Progress/Thinking Indicators**

**Location:** `apps/web/src/pages/AICommandPage.tsx`
**Problem:** When AI is processing, users see no visual feedback beyond basic loading state. No "thinking" animation, no progress breakdown, no estimated time. This makes the experience feel unresponsive.

**Solution:** Add AI-specific progress indicators:
- Animated "thinking" pulse with purple glow
- Step-by-step progress breakdown
- Confidence indicators for generated code

**Code:**
```tsx
// AI Thinking Indicator Component
function AIThinkingIndicator({ steps }: { steps: string[] }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Animate through steps
    const interval = setInterval(() => {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }, 1500);
    
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="ai-thinking-indicator">
      <div className="ai-pulse">
        <div className="pulse-ring pulse-1"></div>
        <div className="pulse-ring pulse-2"></div>
        <div className="pulse-center">
          <Sparkles size={24} color="#8b5cf6" />
        </div>
      </div>
      
      <div className="ai-thinking-steps">
        {steps.map((step, i) => (
          <div 
            key={i}
            className={`thinking-step ${i <= currentStep ? 'completed' : ''} ${i === currentStep ? 'active' : ''}`}
          >
            {i <= currentStep ? '✓' : '○'} {step}
          </div>
        ))}
      </div>
    </div>
  );
}
```

```css
/* AI Thinking Indicator Styles */
.ai-thinking-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1.5rem;
}

.ai-pulse {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  border: 2px solid #8b5cf6;
  border-radius: 50%;
  opacity: 0;
}

.pulse-1 {
  animation: pulse 2s ease-out infinite;
}

.pulse-2 {
  animation: pulse 2s ease-out infinite 0.5s;
}

@keyframes pulse {
  0% {
    width: 40px;
    height: 40px;
    opacity: 0.8;
  }
  100% {
    width: 80px;
    height: 80px;
    opacity: 0;
  }
}

.pulse-center {
  z-index: 1;
}

.ai-thinking-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 320px;
}

.thinking-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.9rem;
  transition: all var(--transition-fast);
}

.thinking-step.active {
  color: var(--ai-primary);
  background: var(--ai-glow);
  font-weight: 500;
}

.thinking-step.completed {
  color: var(--success);
}
```

---

### 5. **Missing AI-Generated Content Preview**

**Location:** Various pages (no unified preview component)
**Problem:** When AI generates code/assets, users have to navigate away to see results. No inline preview, no "preview before apply" for code changes, no diff view for modifications.

**Solution:** Add AI content preview system:
- Inline diff view for code changes
- Asset preview panel for generated images
- "Apply" vs "Discard" options for all AI suggestions

---

## 📐 Layout Recommendations

### Navigation

**Current:** Sidebar with Dashboard, Settings. Project pages have editor, scene-editor, AI command, assets, preview.

**Issues:**
1. No clear distinction between "app-level" and "project-level" navigation
2. AI features scattered across multiple pages
3. No breadcrumbs or project switcher in deep pages

**Recommendations:**

1. **Split Sidebar into Sections:**
```tsx
<div className="sidebar-nav">
  {/* App-level nav */}
  <div className="nav-section">
    <div className="nav-section-label">Platform</div>
    <nav>
      <Link to="/" className="nav-item">
        <Home size={20} />
        <span>Dashboard</span>
      </Link>
      <Link to="/examples" className="nav-item">
        <BookOpen size={20} />
        <span>Examples</span>
      </Link>
      <Link to="/settings" className="nav-item">
        <Settings size={20} />
        <span>Settings</span>
      </Link>
    </nav>
  </div>

  {/* Project-level nav (only show when in project context) */}
  {currentProject && (
    <div className="nav-section">
      <div className="nav-section-label">
        {currentProject.name}
        <button className="btn-switch-project">←</button>
      </div>
      <nav>
        <Link to={`/project/${projectId}/editor`} className="nav-item">
          <FileCode size={20} />
          <span>Code</span>
        </Link>
        <Link to={`/project/${projectId}/scene-editor`} className="nav-item">
          <Layers size={20} />
          <span>Scenes</span>
        </Link>
        <Link to={`/project/${projectId}/assets`} className="nav-item">
          <Palette size={20} />
          <span>Assets</span>
        </Link>
        <Link to={`/project/${projectId}/preview`} className="nav-item">
          <Play size={20} />
          <span>Preview</span>
        </Link>
      </nav>
    </div>
  )}

  {/* AI tools (always visible, branded differently) */}
  <div className="nav-section ai-section">
    <div className="nav-section-label">
      <Sparkles size={14} color="#8b5cf6" />
      AI Tools
    </div>
    <button 
      className="nav-item ai-trigger"
      onClick={openCommandPalette}
    >
      <Bot size={20} color="#8b5cf6" />
      <span>Ask AI (⌘K)</span>
    </button>
    {currentProject && (
      <Link 
        to={`/project/${projectId}/ai`}
        className="nav-item ai-trigger"
      >
        <Bot size={20} color="#8b5cf6" />
        <span>AI Assistant</span>
      </Link>
    )}
  </div>
</div>
```

2. **Add Breadcrumbs for Deep Pages:**
```tsx
function Breadcrumbs({ projectId, currentView }: BreadcrumbsProps) {
  return (
    <div className="breadcrumbs">
      <Link to="/">Projects</Link>
      {projectId && (
        <>
          <span className="separator">/</span>
          <span>Project</span>
          <span className="separator">/</span>
          <span className="current">{currentView}</span>
        </>
      )}
    </div>
  );
}
```

---

### Main Content Area

**Current:** Simple container with page-specific layouts. No consistent header across pages.

**Issues:**
1. No page header pattern (some pages have titles, some don't)
2. No global search or notifications
3. Inconsistent action button placement

**Recommendations:**

1. **Standardize Page Header:**
```tsx
function PageHeader({ 
  title, 
  subtitle, 
  actions, 
  breadcrumbs 
}: PageHeaderProps) {
  return (
    <header className="page-header">
      {breadcrumbs && <Breadcrumbs {...breadcrumbs} />}
      <div className="page-header-content">
        <div className="page-title-section">
          <h1>{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div className="page-header-actions">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
```

```css
.page-header {
  border-bottom: 1px solid var(--border);
  padding: 1.5rem 2rem;
  background: var(--card);
}

.page-header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.page-title-section h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
  color: var(--fg);
}

.page-subtitle {
  margin: 0;
  color: var(--fg-secondary);
  font-size: 0.95rem;
}

.page-header-actions {
  display: flex;
  gap: 0.75rem;
}
```

2. **Add Global Actions Bar:**
```tsx
function GlobalActionsBar() {
  return (
    <div className="global-actions-bar">
      <button className="btn-icon" title="Notifications">
        <Bell size={18} />
      </button>
      <button className="btn-icon" title="Help">
        <HelpCircle size={18} />
      </button>
      <div className="action-separator"></div>
      <button 
        className="btn-icon ai-trigger"
        onClick={openCommandPalette}
        title="Ask AI (⌘K)"
      >
        <Bot size={18} color="#8b5cf6" />
      </button>
    </div>
  );
}
```

---

### Panels/Sidebars

**Current:** File tree in code editor, no resizable panels, fixed width.

**Issues:**
1. No panel resizing or collapsing
2. Can't customize workspace layout
3. No tab system for multiple files

**Recommendations:**

1. **Implement Resizable Panels:**
```tsx
function ResizablePanel({ 
  children, 
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = 600,
  side = 'left'
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);

  return (
    <div 
      className={`resizable-panel panel-${side}`}
      style={{ width: `${width}px` }}
    >
      <div className="panel-content">
        {children}
      </div>
      <div 
        className={`resize-handle handle-${side}`}
        onMouseDown={() => setIsResizing(true)}
      />
      {isResizing && <ResizeOverlay />}
    </div>
  );
}
```

2. **Add Tab System for File Editor:**
```tsx
function FileTabs({ 
  files, 
  activeFile, 
  onSelect, 
  onClose 
}: FileTabsProps) {
  return (
    <div className="file-tabs">
      {files.map(file => (
        <button
          key={file.path}
          className={`file-tab ${file.path === activeFile ? 'active' : ''}`}
          onClick={() => onSelect(file.path)}
        >
          <File size={14} />
          <span>{file.name}</span>
          <button 
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose(file.path);
            }}
          >
            <X size={12} />
          </button>
        </button>
      ))}
    </div>
  );
}
```

```css
.file-tabs {
  display: flex;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
}

.file-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-right: 1px solid var(--border);
  color: var(--fg-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.file-tab.active {
  background: var(--card);
  color: var(--fg);
  border-bottom: 2px solid var(--accent);
}

.tab-close {
  display: flex;
  align-items: center;
  padding: 2px;
  margin-left: 0.25rem;
  border-radius: 4px;
  opacity: 0;
}

.file-tab:hover .tab-close {
  opacity: 1;
}
```

---

## 🎭 Visual Elements

### Colors

**Current Palette (theme.css):**
- Primary: #3b82f6 (blue)
- AI Primary: #8b5cf6 (purple)
- Background: #ffffff (light), #0f172a (dark)
- Text: #111827 (light), #f1f5f9 (dark)
- Border: #e5e7eb (light), #334155 (dark)

**Recommended Enhancements:**

```css
:root {
  /* ── Core Brand Colors (stronger AI presence) ── */
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --primary-light: #dbeafe;

  /* ── AI Branding (more prominent) ── */
  --ai-primary: #8b5cf6;
  --ai-primary-hover: #7c3aed;
  --ai-primary-light: #ede9fe;
  --ai-glow: rgba(139, 92, 246, 0.2);
  --ai-glow-strong: rgba(139, 92, 246, 0.4);
  --ai-gradient: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #3b82f6 100%);
  --ai-gradient-subtle: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);

  /* ── Background layers ── */
  --bg: #ffffff;
  --surface: #f9fafb;
  --surface-alt: #f3f4f6;
  --card: #ffffff;
  --card-hover: #f9fafb;
  --hover-bg: #f5f5f5;

  /* ── Text ── */
  --fg: #111827;
  --fg-secondary: #4b5563;
  --text-muted: #9ca3af;
  --text-inverse: #ffffff;

  /* ── Borders ── */
  --border: #e5e7eb;
  --border-strong: #d1d5db;
  --border-subtle: rgba(0, 0, 0, 0.08);

  /* ── Status colours ── */
  --success: #10b981;
  --success-light: #d1fae5;
  --warning: #f59e0b;
  --warning-light: #fef3c7;
  --error: #ef4444;
  --error-light: #fee2e2;
  --info: #3b82f6;
  --info-light: #eff6ff;

  /* ── Semantic AI colors ── */
  --ai-thinking: #a78bfa;
  --ai-processing: #8b5cf6;
  --ai-complete: #6366f1;
  --ai-suggestion: #ec4899;

  /* ── Spacing scale ── */
  --space-0: 0;
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

  /* ── Border radius ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
  --shadow-glow: 0 0 20px var(--ai-glow);

  /* ── Transitions ── */
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
  --transition-slow: 500ms ease;

  /* ── Z-index scale ── */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;

  /* ── Sidebar ── */
  --sidebar-width: 260px;
  --sidebar-collapsed-width: 64px;
}

/* Dark mode enhancements */
@media (prefers-color-scheme: dark) {
  :root {
    --ai-glow: rgba(139, 92, 246, 0.25);
    --ai-glow-strong: rgba(139, 92, 246, 0.5);
    --shadow-glow: 0 0 30px var(--ai-glow-strong);
  }
}
```

---

### Typography

**Current:** System fonts (`--font-sans`, `--font-mono`).

**Recommendations:**

```css
:root {
  /* ── Typography ── */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Fira Code', monospace;
  --font-heading: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-code: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;

  /* Font sizes (modular scale) */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */

  /* Font weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Letter spacing */
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
}
```

---

### Spacing

**Already well-defined in theme.css. No changes needed.**

---

## 🔍 Competitive Research

| Platform | What They Do Well | What We Can Learn |
|----------|------------------|-------------------|
| **Unity** | Professional dark theme, organized inspector panels, powerful hierarchy view, component-based editing | Adopt component inspector pattern for scene editor; add dark mode toggle with professional editor aesthetic |
| **Construct 3** | Visual event system, intuitive drag-and-drop, browser-based with no installation, real-time preview | Focus on web-first experience; make visual scripting approachable; instant preview without build step |
| **GDevelop** | Scene-based workflow, visual scripting with conditions/actions, extensions ecosystem, beginner-friendly | Create AI-powered visual scripting as differentiator; make complex logic accessible through natural language |
| **PlayCanvas** | Real-time collaboration, cloud-based assets, built-in physics engine, professional-grade rendering | Add collaboration features (real-time cursors, comments); cloud asset management; emphasize web performance |
| **Godot** | Lightweight, free/open-source, node-based scene tree, GDScript for coding | Show AI can reduce complexity; keep web version fast and lightweight; offer multiple ways to interact (code + AI) |

**Key Insights:**

1. **Visual Scripting is Expected:** All major engines have visual scripting. Our advantage: AI + Visual Scripting = natural language to visual blocks automatically.

2. **Real-time Preview is Critical:** Users expect to see changes immediately. Our web-first architecture gives us an advantage here.

3. **Component Systems are Standard:** Unity's component model is widely understood. Our scene editor should use similar patterns.

4. **Beginner vs Pro Modes:** Successful engines scale from simple to complex. AI can bridge this gap - beginners use natural language, pros use direct editing.

**Features to Consider:**

- **AI-Generated Visual Scripts** - Convert natural language "when player jumps, play sound" to event blocks automatically
- **Collaborative AI Chat** - Multiple team members can discuss with AI in real-time
- **AI Asset Generation** - Generate sprites, sounds, music on-demand (already in roadmap)
- **Smart Suggestions** - Context-aware AI recommendations in code editor ("consider using a state machine here")
- **Automated Testing** - AI generates test cases for game logic
- **Documentation Auto-Gen** - AI comments code as you work

---

## 📋 Priority Fixes

### High Priority (Next Sprint)

1. **Implement Onboarding Tour** - First-time users need guidance to understand AI-first approach
   - **Why urgent:** Users are dropping off without understanding the value prop
   - **Effort:** 2-3 days (design + build + copy)
   - **Impact:** Directly addresses "AI-first not obvious" feedback

2. **Add AI Progress Indicators** - Show AI thinking state visually
   - **Why urgent:** Current AI processing feels unresponsive
   - **Effort:** 1-2 days (component + integration)
   - **Impact:** Improves perceived responsiveness significantly

3. **Inline AI Suggestions in Code Editor** - Context-aware AI help, not just separate chat page
   - **Why urgent:** Key differentiator - AI should be everywhere, not siloed
   - **Effort:** 3-4 days (CodeMirror integration + API)
   - **Impact:** Makes AI-first claim visible in daily workflows

### Medium Priority (Next 2-3 Sprints)

4. **Split Sidebar into Sections** - Clearer navigation hierarchy
   - **Why important:** Current navigation is confusing (app vs project level)
   - **Effort:** 2-3 days (refactor + styling)
   - **Impact:** Better information architecture

5. **Standardize Page Headers** - Consistent layout across all pages
   - **Why important:** Creates professional, polished feel
   - **Effort:** 2 days (component + migration)
   - **Impact:** Improves visual consistency

6. **Implement Tab System for File Editor** - Multiple open files
   - **Why important:** Standard editor feature, users expect it
   - **Effort:** 2-3 days (component + state management)
   - **Impact:** Better developer experience

7. **Add AI Content Preview** - "Apply before discard" for all AI suggestions
   - **Why important:** Users need confidence before accepting AI changes
   - **Effort:** 3-4 days (diff view + integration)
   - **Impact:** Builds trust in AI features

### Low Priority (Polish / Future)

8. **Resizable Panels** - Customize workspace layout
   - **Why nice to have:** Power user feature, but not critical
   - **Effort:** 3-4 days (drag logic + state)
   - **Impact:** Professional editor feel

9. **Enhanced AI Branding** - Purple gradients, animations, AI-themed hero
   - **Why nice to have:** Visual polish, but functionality first
   - **Effort:** 2-3 days (design + implementation)
   - **Impact:** Stronger brand differentiation

10. **Real-time Collaboration Features** - Multi-user editing, cursors, comments
    - **Why nice to have:** Competitive advantage, but requires backend work
    - **Effort:** 1-2 weeks (WebSocket + UI)
    - **Impact:** Differentiator for team workflows

---

## 💡 Creative Ideas

### Innovations to Consider

**1. AI-Generated Visual Scripting from Natural Language**
- **How it makes us stand out:** No other platform converts "when player jumps, add upward velocity" to visual blocks automatically
- **Implementation:** AI generates JSON representation of event graph, rendered as interactive visual blocks
- **Differentiation:** Combines ease of natural language with visual debugging

**2. "Explain This" Context Menu Everywhere**
- **How it supports AI-first approach:** Select any code/asset/component, right-click → "Explain" → AI explains in plain English
- **Implementation:** Context-aware API that analyzes selected entity's metadata
- **Benefit:** Reduces learning curve, makes engine accessible to non-programmers

**3. AI-Powered Asset Recommendations**
- **How it makes us stand out:** As you build a platformer, AI suggests "you might need a coin sprite" with one-click generation
- **Implementation:** Analyze project patterns, match against asset library, suggest relevant assets
- **Benefit:** Proactive AI assistant, not reactive

**4. "Refactor This" Inline Button**
- **How it supports AI-first approach:** Code editor highlights messy code, suggests AI refactor with one click
- **Implementation:** Code quality heuristics trigger AI suggestions
- **Benefit:** Improves code quality, teaches best practices

**5. AI Tutorial Generator**
- **How it makes us stand out:** "Make a Flappy Bird clone" → AI generates step-by-step tutorial with code samples
- **Implementation:** AI breaks down request into milestones, generates tutorial content
- **Benefit:** Learn by doing, personalized to project

---

### AI-Specific UX Patterns

**1. AI Commands Should Be:**
- **Visible:** Command palette (⌘K) is great, but also add inline button in key contexts
- **Context-Aware:** Show "AI can help with this" badges when AI can add value
- **Confident:** Display confidence scores for AI suggestions (high/medium/low)
- **Reversible:** Always allow "undo AI change" with one click
- **Explainable:** Add "Why?" button to show AI reasoning

**2. Showing AI Progress/Thinking:**
```tsx
// Progress states with visual feedback
const aiStates = {
  analyzing: { icon: '🔍', label: 'Analyzing request...' },
  thinking: { icon: '🧠', label: 'Generating solution...' },
  coding: { icon: '⌨️', label: 'Writing code...' },
  reviewing: { icon: '✓', label: 'Reviewing changes...' },
  complete: { icon: '✨', label: 'Done!' }
};
```

**3. Handling AI-Generated Content:**
- **Preview Mode:** Show diff view with "Apply" / "Discard" buttons
- **Confidence Badges:** Green (high confidence), Yellow (medium), Red (low)
- **Edit Before Apply:** Allow manual tweaks to AI suggestions
- **Version Control:** All AI changes are tracked commits
- **Learn from Edits:** If user modifies AI suggestion, AI learns preference

**4. AI Command Presentation:**
```tsx
// Example: Inline AI suggestion in code editor
function AISuggestionBox({ suggestion, onApply, onDismiss }) {
  return (
    <div className="ai-suggestion">
      <div className="ai-suggestion-header">
        <Sparkles size={16} color="#8b5cf6" />
        <span>AI Suggestion</span>
        <span className="confidence-badge high">High Confidence</span>
      </div>
      <div className="ai-suggestion-content">
        <p>{suggestion.reasoning}</p>
        <pre>{suggestion.codeDiff}</pre>
      </div>
      <div className="ai-suggestion-actions">
        <button className="btn-primary" onClick={onApply}>Apply</button>
        <button className="btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn-ghost" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
```

```css
.ai-suggestion {
  margin: 1rem 0;
  border: 2px solid #8b5cf6;
  border-radius: var(--radius-md);
  background: linear-gradient(to bottom, rgba(139, 92, 246, 0.05), transparent);
  box-shadow: 0 0 16px var(--ai-glow);
}

.ai-suggestion-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ai-primary);
  font-weight: 600;
}

.confidence-badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.confidence-badge.high {
  background: var(--success-light);
  color: var(--success);
}

.confidence-badge.medium {
  background: var(--warning-light);
  color: var(--warning);
}

.confidence-badge.low {
  background: var(--error-light);
  color: var(--error);
}
```

---

## 📊 UI/UX Score

| Area | Current (Apr 2026) | Previous (Apr 7) | Target | Gap | Progress |
|------|-------------------|------------------|--------|-----|----------|
| **Visual Design** | B+ | C | A | Minor | ⬆️ Improved |
| **User Experience** | B- | C- | A | Moderate | ⬆️ Improved |
| **Accessibility** | B | C+ | A | Moderate | ⬆️ Improved |
| **Innovation** | A- | B- | A+ | Minor | ⬆️ Strong |

**Detailed Breakdown:**

**Visual Design (B+ → A):**
- ✅ Design system well-structured with proper tokens
- ✅ Dark/light mode support
- ✅ Consistent spacing and typography
- ⚠️ AI branding needs more visibility
- ⚠️ Some pages lack cohesive styling (onboarding missing)
- 🎯 Target: Stronger AI-themed visual identity

**User Experience (B- → A):**
- ✅ Command palette provides global AI access
- ✅ AIFAB contextual button well-implemented
- ✅ File tree and code editor work well
- ⚠️ No onboarding for first-time users
- ⚠️ Navigation hierarchy unclear (app vs project level)
- ⚠️ No tab system for multiple files
- 🎯 Target: Clearer navigation, onboarding, standard headers

**Accessibility (B → A):**
- ✅ Focus indicators defined in theme.css
- ✅ Color contrast ratios meet WCAG AA
- ✅ Keyboard navigation works (command palette, shortcuts)
- ⚠️ Some interactive elements lack ARIA labels
- ⚠️ No screen reader testing documented
- 🎯 Target: Full ARIA compliance, screen reader support

**Innovation (A- → A+):**
- ✅ AI-first approach is unique differentiator
- ✅ Command palette + AIFAB dual access pattern
- ✅ Web-first architecture enables instant preview
- ✅ Potential for AI-generated visual scripting
- 🎯 Target: AI-native UX patterns that competitors can't replicate

---

## 🎯 Summary

**ClawGame has made excellent progress.** Since the previous review, the platform has implemented command palette (global AI access), better design system structure, and improved component architecture. The foundation is solid.

**The main opportunity now:** Make the AI-first approach **visible and obvious** to new users. Currently, a first-time visitor sees a game editor that happens to have AI features. It should feel like an AI assistant that helps you build games.

**Top 3 Actions:**

1. **Onboarding Tour** - Walk users through "AI-first" value proposition with real demo, not mock. This directly addresses the #1 feedback gap.

2. **Inline AI Suggestions** - Put AI help directly in the code editor (not just a separate page). Show "AI can help with this" contextually. This makes AI-first visible in daily workflows.

3. **AI Progress Indicators** - Show AI thinking visually with animated pulse and step-by-step breakdown. This improves perceived responsiveness and builds trust.

**Progress from last review:**
- Status improved from "needs-improvement" to "on-track" ✅
- Command palette added (key differentiator) ✅
- Design system matured ✅
- Accessibility improved ✅

**Next milestone:** After implementing the top 3 actions, ClawGame will be ready to graduate to "excellent" status. The platform has the technical foundation; now it needs the polish that makes users say "wow, this is different."

---

## 📝 Design Recommendations by Category

### Dashboard
- Add hero section with AI-themed gradient
- "Try AI" demo button (real, not mock)
- Recent AI activity feed
- "Start from prompt" quick action

### Editor
- Inline AI suggestions panel (right side)
- "Explain this" context menu
- AI-generated code with diff view
- Tab system for multiple files
- Keyboard shortcuts sidebar

### Scene Editor
- Component inspector (Unity-style)
- Drag-and-drop with AI assist
- "Generate entity from description" button
- Visual property editor

### AI Command Page
- Split into Chat / Workflows / History tabs
- Context-aware suggestions
- Save prompts as workflows
- Confidence indicators
- One-click apply / dismiss

### Asset Studio
- AI-generated assets with preview
- "Generate similar" button
- Asset tagging by AI
- Bulk generation with variation

---

**Final Assessment:** ClawGame is 75% of the way to "best web-based AI-first game dev platform." The remaining 25% is polish: onboarding, inline AI help, and stronger AI branding. Focus on these, and the platform will stand out in a crowded market.

---

*This review was conducted on 2026-04-07 16:50 UTC by the UI/UX Design Agent. All recommendations are actionable and prioritized by impact.*
