import type { PreviewRuntimeSessionOptions } from './sessionTypes';
import {
  ClawgamePhaserRuntime,
  ClawgamePhaserScene,
  buildPhaserPreviewBootstrap,
  consolePhaserRuntimeErrorReporter,
  type PhaserPreviewBootstrap,
  type PhaserRuntimeError,
} from '@clawgame/phaser-runtime';
import { TowerDefenseScene } from './TowerDefenseScene';
import { RPGScene } from './RPGScene';
import { CosmicDriftScene } from './CosmicDriftScene';
import { NeonLabyrinthScene } from './NeonLabyrinthScene';

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
  options: PreviewRuntimeSessionOptions,
): PhaserPreviewPreparation {
  const sceneRef = options.activeScene as any;
  const sceneData = sceneRef?.current ?? sceneRef;
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
  } else {
    // No dedicated genre scene (action/adventure/platformer/topdown/default…):
    // run the generic bootstrap-driven scene with gameplay wiring enabled
    // (arcade colliders + keyboard control + chase AI).
    const baseScene = new ClawgamePhaserScene({ gameplay: true });
    sceneInstance = baseScene;
    runtime.setSceneFactory(() => baseScene);
  }

  runtime.mount(hostElement, bootstrap, { errorReporter });
  return handle;
}
