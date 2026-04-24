import type { MutableRefObject } from 'react';
import {
  runLegacyCanvasPreviewSession,
  type LegacyCanvasPreviewSessionOptions,
} from './legacyCanvasSession';
import {
  preparePhaserPreviewSession,
  runPhaserPreviewSession,
} from './phaserPreviewSession';
import type { PhaserRuntimeError } from '../../../../packages/phaser-runtime/src';

export type PreviewRuntimeSelection = string;

export interface PreviewRuntimeSessionOptions extends LegacyCanvasPreviewSessionOptions {
  runtimeHostRef: MutableRefObject<HTMLDivElement | null>;
  onRuntimeError?: (error: PhaserRuntimeError) => void;
}

function combineCleanups(cleanups: Array<(() => void) | void>): (() => void) | void {
  const activeCleanups = cleanups.filter((c): c is () => void => typeof c === 'function');
  if (activeCleanups.length === 0) return undefined;
  return () => { for (const c of activeCleanups.reverse()) c(); };
}

export function runPreviewRuntimeSession(
  selection: PreviewRuntimeSelection,
  options: PreviewRuntimeSessionOptions,
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
        options.onRuntimeError,
      );
      cleanups.push(session.destroy);
    }
  } else {
    cleanups.push(runLegacyCanvasPreviewSession(options));
  }

  return combineCleanups(cleanups);
}

export type { PreviewRuntimeDescriptor } from './previewRuntimeConfig';
