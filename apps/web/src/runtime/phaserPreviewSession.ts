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
import { CosmicDriftScene } from './CosmicDriftScene';
import { NeonLabyrinthScene } from './NeonLabyrinthScene';
import type { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';

export interface PhaserPreviewPreparation {
  bootstrap: PhaserPreviewBootstrap;
  genre: string;
  cleanup: () => void;
}

export interface TDOverlayState {
  enabled: boolean;
  selectedTowerType?: string;
  feedback?: { kind: string; message: string };
  wave?: number;
  core?: number;
  mana?: number;
}

export function preparePhaserPreviewSession(
  _selection: string,
  options: LegacyCanvasPreviewSessionOptions,
): PhaserPreviewPreparation {
  const sceneData = options.activeScene?.current ?? options.activeScene;
  const bootstrap = buildPhaserPreviewBootstrap(sceneData || { entities: [], name: 'empty' });
  (bootstrap as any)._rawSceneData = sceneData;

  return {
    bootstrap,
    genre: options.projectGenre || 'platformer',
    cleanup: () => {},
  };
}

export interface PhaserSessionHandle {
  destroy: () => void;
  getScene: () => ClawgamePhaserScene | null;
  selectTowerType: (type: string) => void;
  startNextWave: () => void;
  upgradeSelectedTower: () => void;
  sellSelectedTower: () => void;
  onTDStateChange?: (state: TDOverlayState) => void;
}

export function runPhaserPreviewSession(
  hostElement: HTMLDivElement,
  bootstrap: PhaserPreviewBootstrap,
  genre?: string,
  onRuntimeError?: (error: PhaserRuntimeError) => void,
): PhaserSessionHandle {
  const runtime = new ClawgamePhaserRuntime();
  const errorReporter = {
    reportError(phase: string, error: unknown, context?: Record<string, unknown>) {
      consolePhaserRuntimeErrorReporter.reportError(phase, error, context);
      onRuntimeError?.({ phase, error, ...(context ? { context } : {}) });
    },
  };

  let sceneInstance: ClawgamePhaserScene | null = null;
  let tdStateCallback: ((state: TDOverlayState) => void) | undefined;

  const handle: PhaserSessionHandle = {
    destroy: () => runtime.destroy(),
    getScene: () => sceneInstance,
    selectTowerType: (type: string) => {
      const scene = sceneInstance as TowerDefenseScene | null;
      if (scene) scene.setSelectedTowerType(type);
    },
    startNextWave: () => {
      const scene = sceneInstance as TowerDefenseScene | null;
      if (scene) scene.startNextWave();
    },
    upgradeSelectedTower: () => {
      const scene = sceneInstance as TowerDefenseScene | null;
      if (scene) scene.upgradeSelectedTower();
    },
    sellSelectedTower: () => {
      const scene = sceneInstance as TowerDefenseScene | null;
      if (scene) scene.sellSelectedTower();
    },
    get onTDStateChange() { return tdStateCallback; },
    set onTDStateChange(cb) { tdStateCallback = cb; },
  };

  if (genre === 'tower-defense') {
    const tdScene = new TowerDefenseScene();
    sceneInstance = tdScene;
    // Wire up periodic state sync
    tdScene.setStateSyncCallback((state) => {
      tdStateCallback?.(state);
    });
    runtime.setSceneFactory(() => tdScene);
  } else if (genre === 'rpg') {
    const rpgScene = new RPGScene();
    sceneInstance = rpgScene;
    runtime.setSceneFactory(() => rpgScene);
  } else if (genre === 'shooter') {
    const driftScene = new CosmicDriftScene();
    sceneInstance = driftScene;
    runtime.setSceneFactory(() => driftScene);
  } else if (genre === 'puzzle') {
    const mazeScene = new NeonLabyrinthScene();
    sceneInstance = mazeScene;
    runtime.setSceneFactory(() => mazeScene);
  }

  runtime.mount(hostElement, bootstrap, { errorReporter });
  return handle;
}
