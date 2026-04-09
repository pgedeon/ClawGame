/**
 * @clawgame/web - Undo/Redo hook using command pattern
 * Provides an undo/redo stack for any state with snapshot-based history.
 *
 * Usage:
 *   const { state, push, undo, redo, canUndo, canRedo } = useUndoRedo(initialState);
 *   push(newState); // records the change
 *   undo();         // reverts to previous state
 *   redo();         // re-applies the reverted change
 */

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50; // Cap to prevent memory bloat

export interface UndoRedoState<T> {
  state: T;
  push: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historySize: number;
  currentIndex: number;
}

export function useUndoRedo<T>(initialState: T): UndoRedoState<T> {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const push = useCallback((newState: T) => {
    setHistory(prev => {
      // Trim any future states (discard redo stack when new action is taken)
      const trimmed = prev.slice(0, index + 1);
      const next = [...trimmed, newState];
      // Cap history length
      if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY);
      }
      return next;
    });
    setIndex(prev => {
      const next = prev + 1;
      return next >= MAX_HISTORY ? MAX_HISTORY - 1 : next;
    });
  }, [index]);

  const undo = useCallback(() => {
    setIndex(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex(prev => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  return {
    state,
    push,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    historySize: history.length,
    currentIndex: index,
  };
}
