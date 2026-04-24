/**
 * @clawgame/engine - Undo/Redo history for scene edits
 */

export interface HistoryEntry<T> {
  id: string;
  label: string;
  before: T;
  after: T;
  timestamp: number;
}

export interface HistoryStack<T> {
  past: HistoryEntry<T>[];
  present: T;
  future: HistoryEntry<T>[];
}

export function createHistoryStack<T>(initial: T): HistoryStack<T> {
  return { past: [], present: initial, future: [] };
}

export function pushHistory<T>(stack: HistoryStack<T>, label: string, next: T): HistoryStack<T> {
  return {
    past: [...stack.past, { id: `h-${Date.now()}`, label, before: stack.present, after: next, timestamp: Date.now() }],
    present: next,
    future: [],
  };
}

export function undo<T>(stack: HistoryStack<T>): HistoryStack<T> | null {
  if (stack.past.length === 0) return null;
  const entry = stack.past[stack.past.length - 1];
  return {
    past: stack.past.slice(0, -1),
    present: entry.before,
    future: [entry, ...stack.future],
  };
}

export function redo<T>(stack: HistoryStack<T>): HistoryStack<T> | null {
  if (stack.future.length === 0) return null;
  const entry = stack.future[0];
  return {
    past: [...stack.past, entry],
    present: entry.after,
    future: stack.future.slice(1),
  };
}

export function canUndo<T>(stack: HistoryStack<T>): boolean {
  return stack.past.length > 0;
}

export function canRedo<T>(stack: HistoryStack<T>): boolean {
  return stack.future.length > 0;
}
