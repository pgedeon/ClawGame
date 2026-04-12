import type { PreviewRuntimeSelection } from './PreviewRuntime';
import {
  runLegacyCanvasPreviewSession,
  type LegacyCanvasPreviewSessionOptions,
} from './legacyCanvasSession';
import { preparePhaserPreviewSession } from './phaserPreviewSession';

export type PreviewRuntimeSessionOptions = LegacyCanvasPreviewSessionOptions;

function combineCleanups(cleanups: Array<(() => void) | void>): (() => void) | void {
  const activeCleanups = cleanups.filter((cleanup): cleanup is () => void => typeof cleanup === 'function');
  if (activeCleanups.length === 0) {
    return undefined;
  }

  return () => {
    for (const cleanup of activeCleanups.reverse()) {
      cleanup();
    }
  };
}

export function runPreviewRuntimeSession(
  selection: PreviewRuntimeSelection,
  options: PreviewRuntimeSessionOptions,
): (() => void) | void {
  const cleanups: Array<(() => void) | void> = [];

  if (selection.requested.kind === 'phaser4') {
    const phaserPreparation = preparePhaserPreviewSession(selection, options);
    cleanups.push(phaserPreparation.cleanup);
  }

  switch (selection.active.kind) {
    case 'legacy-canvas':
      cleanups.push(runLegacyCanvasPreviewSession(options));
      break;
    case 'phaser4':
      cleanups.push(runLegacyCanvasPreviewSession(options));
      break;
    default:
      cleanups.push(runLegacyCanvasPreviewSession(options));
      break;
  }

  return combineCleanups(cleanups);
}
