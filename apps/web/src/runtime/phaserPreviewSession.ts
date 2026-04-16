import type { LegacyCanvasPreviewSessionOptions } from './legacyCanvasSession';
import {
  ClawgamePhaserRuntime,
  buildPhaserPreviewBootstrap,
  type PhaserPreviewBootstrap,
} from '../../../../packages/phaser-runtime/src';
import { TowerDefenseScene } from './TowerDefenseScene';

export interface PhaserPreviewPreparation {
  bootstrap: PhaserPreviewBootstrap;
  genre: string;
  cleanup: () => void;
}

export function preparePhaserPreviewSession(
  _selection: string,
  options: LegacyCanvasPreviewSessionOptions,
): PhaserPreviewPreparation {
  const sceneData = options.activeScene?.current ?? options.activeScene;
  const bootstrap = buildPhaserPreviewBootstrap(sceneData || { entities: [], name: 'empty' });

  return {
    bootstrap,
    genre: options.projectGenre || 'platformer',
    cleanup: () => {},
  };
}

export function runPhaserPreviewSession(
  hostElement: HTMLDivElement,
  bootstrap: PhaserPreviewBootstrap,
  genre?: string,
): { destroy: () => void } {
  const runtime = new ClawgamePhaserRuntime();

  // Pick the right scene class based on genre
  if (genre === 'td') {
    runtime.setSceneFactory(() => new TowerDefenseScene());
  }

  runtime.mount(hostElement, bootstrap);
  return { destroy: () => runtime.destroy() };
}
