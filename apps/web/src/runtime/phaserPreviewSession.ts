import type { PreviewRuntimeSelection } from './PreviewRuntime';
import type { LegacyCanvasPreviewSessionOptions } from './legacyCanvasSession';
import {
  buildPhaserPreviewBootstrap,
  type PhaserPreviewBootstrap,
} from '../../../../packages/phaser-runtime/src';

export interface PhaserPreviewPreparation {
  bootstrap: PhaserPreviewBootstrap;
  cleanup: () => void;
}

export function preparePhaserPreviewSession(
  selection: PreviewRuntimeSelection,
  options: LegacyCanvasPreviewSessionOptions,
): PhaserPreviewPreparation {
  const bootstrap = buildPhaserPreviewBootstrap(options.activeScene);
  const runtimeHost = options.runtimeHostRef.current;

  if (runtimeHost) {
    runtimeHost.dataset.previewRuntimeRequested = selection.requested.kind;
    runtimeHost.dataset.previewRuntimePrepared = 'phaser4';
    runtimeHost.dataset.previewRuntimePreparedEntities = String(bootstrap.metadata.entityCount);
    runtimeHost.dataset.previewRuntimePreparedAssets = String(bootstrap.metadata.assetCount);
    runtimeHost.dataset.previewRuntimeFallback = selection.fellBack ? 'true' : 'false';
  }

  return {
    bootstrap,
    cleanup: () => {
      if (!runtimeHost) return;
      delete runtimeHost.dataset.previewRuntimeRequested;
      delete runtimeHost.dataset.previewRuntimePrepared;
      delete runtimeHost.dataset.previewRuntimePreparedEntities;
      delete runtimeHost.dataset.previewRuntimePreparedAssets;
      delete runtimeHost.dataset.previewRuntimeFallback;
    },
  };
}
