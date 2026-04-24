/**
 * @clawgame/web - Keyboard Shortcuts Reference
 */

export interface KeyboardShortcut {
  keys: string;      // e.g. "Ctrl+Z"
  action: string;
  category: 'edit' | 'view' | 'tools' | 'file';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Edit
  { keys: 'Ctrl+Z', action: 'Undo', category: 'edit' },
  { keys: 'Ctrl+Shift+Z', action: 'Redo', category: 'edit' },
  { keys: 'Ctrl+D', action: 'Duplicate selected', category: 'edit' },
  { keys: 'Delete', action: 'Delete selected', category: 'edit' },
  { keys: 'Ctrl+A', action: 'Select all', category: 'edit' },
  { keys: 'Escape', action: 'Deselect / Cancel', category: 'edit' },
  // View
  { keys: 'Ctrl+G', action: 'Toggle grid', category: 'view' },
  { keys: 'Ctrl+Shift+G', action: 'Toggle snapping', category: 'view' },
  { keys: 'Ctrl+Shift+D', action: 'Toggle physics debug', category: 'view' },
  { keys: 'Ctrl+0', action: 'Reset zoom', category: 'view' },
  { keys: 'Ctrl+/-', action: 'Zoom in/out', category: 'view' },
  // Tools
  { keys: 'V', action: 'Select tool', category: 'tools' },
  { keys: 'M', action: 'Move tool', category: 'tools' },
  { keys: 'R', action: 'Rotate tool', category: 'tools' },
  { keys: 'S', action: 'Scale tool', category: 'tools' },
  { keys: 'T', action: 'Tile paint tool', category: 'tools' },
  // File
  { keys: 'Ctrl+S', action: 'Save project', category: 'file' },
  { keys: 'Ctrl+Shift+E', action: 'Export scene', category: 'file' },
  { keys: '?', action: 'Show shortcuts', category: 'file' },
];

export function formatShortcuts(shortcuts?: KeyboardShortcut[]): Record<string, string[]> {
  const list = shortcuts ?? KEYBOARD_SHORTCUTS;
  const grouped: Record<string, string[]> = {};
  for (const s of list) {
    const cat = s.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(`${s.keys} → ${s.action}`);
  }
  return grouped;
}
