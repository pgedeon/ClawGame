import type { MutableRefObject } from 'react';
import {
  preparePhaserPreviewSession,
  runPhaserPreviewSession,
} from './phaserPreviewSession';
import type { PhaserRuntimeError } from '../../../../packages/phaser-runtime/src';
import type { PhaserSessionHandle } from './phaserPreviewSession';
import type { PreviewRuntimeSessionOptions } from './sessionTypes';

export type PreviewRuntimeSelection = string;

export interface PreviewRuntimeSessionCallbacks {
  onRuntimeError?: (error: PhaserRuntimeError) => void;
  onPhaserSession?: (handle: PhaserSessionHandle) => void;
}

function combineCleanups(cleanups: Array<(() => void) | void>): (() => void) | void {
  const activeCleanups = cleanups.filter((c): c is () => void => typeof c === 'function');
  if (activeCleanups.length === 0) return undefined;
  return () => { for (const c of activeCleanups.reverse()) c(); };
}

export function runPreviewRuntimeSession(
  selection: PreviewRuntimeSelection,
  options: PreviewRuntimeSessionOptions,
  callbacks?: PreviewRuntimeSessionCallbacks,
): (() => void) | void {
  const cleanups: Array<(() => void) | void> = [];

  if (selection === 'phaser4') {
    const preparation = preparePhaserPreviewSession(selection, options);
    cleanups.push(preparation.cleanup);
    const hostEl = options.runtimeHostRef?.current;
    if (hostEl) {
      const session = runPhaserPreviewSession(
        hostEl,
        preparation.bootstrap,
        preparation.genre,
        callbacks?.onRuntimeError,
      );
      cleanups.push(session.destroy);
      callbacks?.onPhaserSession?.(session);
    }
  }

  return combineCleanups(cleanups);
}
