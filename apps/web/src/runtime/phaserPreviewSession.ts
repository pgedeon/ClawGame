import type { LegacyCanvasPreviewSessionOptions } from './legacyCanvasSession';
import {
  ClawgamePhaserRuntime,
  buildPhaserPreviewBootstrap,
  consolePhaserRuntimeErrorReporter,
  type PhaserPreviewBootstrap,
  type PhaserRuntimeError,
} from '../../../../packages/phaser-runtime/src';
import { TowerDefenseScene } from './TowerDefenseScene';
import { RPGScene } from './RPGScene';

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
  // Attach raw scene data so genre-specific scenes can read waves/quests/dialogue
  (bootstrap as any)._rawSceneData = sceneData;

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
  onRuntimeError?: (error: PhaserRuntimeError) => void,
): { destroy: () => void } {
  const runtime = new ClawgamePhaserRuntime();
  const errorReporter = {
    reportError(phase: string, error: unknown, context?: Record<string, unknown>) {
      consolePhaserRuntimeErrorReporter.reportError(phase, error, context);
      onRuntimeError?.({ phase, error, ...(context ? { context } : {}) });
    },
  };

  // Pick the right scene class based on genre
  // Note: genre values are 'platformer', 'rpg', 'puzzle', 'tower-defense'
  if (genre === 'tower-defense') {
    runtime.setSceneFactory(() => new TowerDefenseScene());
  } else if (genre === 'rpg') {
    runtime.setSceneFactory(() => new RPGScene());
  }

  runtime.mount(hostElement, bootstrap, { errorReporter });
  return { destroy: () => runtime.destroy() };
}
