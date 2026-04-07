import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Home,
  PlusCircle,
  FolderOpen,
  BookOpen,
  FileCode,
  Bot,
  Palette,
  Play,
  Settings,
  Sparkles,
  Wrench,
  Layers,
  Keyboard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import '../command-palette.css';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  category: 'navigation' | 'ai' | 'action';
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

export function CommandPalette({ isOpen, onClose, projectId }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: Command[] = [
    // Navigation
    { id: 'nav.home', label: 'Go to Dashboard', icon: Home, category: 'navigation', action: () => navigate('/') },
    { id: 'nav.create', label: 'Create New Project', icon: PlusCircle, category: 'navigation', action: () => navigate('/create-project') },
    { id: 'nav.open', label: 'Open Project', icon: FolderOpen, category: 'navigation', action: () => navigate('/open-project') },
    { id: 'nav.examples', label: 'Browse Examples', icon: BookOpen, category: 'navigation', action: () => navigate('/examples') },
    { id: 'nav.settings', label: 'Settings', icon: Settings, category: 'navigation', action: () => navigate('/settings') },
    // Project-specific
    ...(projectId
      ? [
          { id: 'proj.editor', label: 'Code Editor', icon: FileCode, category: 'navigation' as const, action: () => navigate(`/project/${projectId}/editor`) },
          { id: 'proj.scene', label: 'Scene Editor', icon: Layers, category: 'navigation' as const, action: () => navigate(`/project/${projectId}/scene-editor`) },
          { id: 'proj.preview', label: 'Game Preview', shortcut: 'P', icon: Play, category: 'navigation' as const, action: () => navigate(`/project/${projectId}/preview`) },
          { id: 'proj.assets', label: 'Asset Studio', icon: Palette, category: 'navigation' as const, action: () => navigate(`/project/${projectId}/assets`) },
          // AI
          { id: 'ai.generate', label: 'AI: Generate Code', icon: Bot, category: 'ai' as const, action: () => navigate(`/project/${projectId}/ai`) },
          { id: 'ai.fix', label: 'AI: Fix Bugs', icon: Wrench, category: 'ai' as const, action: () => navigate(`/project/${projectId}/ai`) },
          { id: 'ai.sprite', label: 'AI: Generate Sprite', icon: Sparkles, category: 'ai' as const, action: () => navigate(`/project/${projectId}/assets`) },
          { id: 'ai.scene', label: 'AI: Build Scene', icon: Layers, category: 'ai' as const, action: () => navigate(`/project/${projectId}/scene-editor`) },
        ]
      : []),
  ];

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
    }
  }, [isOpen]);

  const executeSelected = useCallback(() => {
    if (filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      onClose();
    }
  }, [filtered, selectedIndex, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        executeSelected();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  const categories = ['navigation', 'ai', 'action'] as const;
  const categoryLabels: Record<string, string> = {
    navigation: 'Navigate',
    ai: 'AI Commands',
    action: 'Actions',
  };

  return (
    <div className="cmd-overlay" onClick={onClose} role="dialog" aria-label="Command Palette">
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrapper">
          <Search size={18} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <kbd className="cmd-esc">Esc</kbd>
        </div>

        <div className="cmd-results">
          {filtered.length === 0 && (
            <div className="cmd-empty">No commands found</div>
          )}
          {categories.map(cat => {
            const items = filtered.filter(c => c.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="cmd-group">
                <div className="cmd-group-label">{categoryLabels[cat]}</div>
                {items.map(cmd => {
                  const globalIndex = filtered.indexOf(cmd);
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      className={`cmd-item ${globalIndex === selectedIndex ? 'cmd-item--active' : ''}`}
                      onClick={() => { cmd.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <Icon size={16} className="cmd-item-icon" />
                      <span className="cmd-item-label">{cmd.label}</span>
                      {cmd.shortcut && <kbd className="cmd-shortcut">{cmd.shortcut}</kbd>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="cmd-footer">
          <span><Keyboard size={14} /> ↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Global keyboard shortcut hook — Ctrl/Cmd+K to toggle the palette.
 */
export function useCommandPaletteToggle() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}
