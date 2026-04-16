import { Game, AUTO, Scale, Scene } from 'phaser';
import { ClawgamePhaserScene } from './ClawgamePhaserScene';
import { buildPhaserPreviewBootstrap } from './buildPreviewBootstrap';
import type { CanonicalSceneLike, PhaserPreviewBootstrap } from './types';

export interface PhaserRuntimeDescriptor {
  kind: 'phaser4';
  label: string;
  shortLabel: string;
  description: string;
  experimental: boolean;
  available: boolean;
}

export const PHASER4_RUNTIME_DESCRIPTOR: PhaserRuntimeDescriptor = {
  kind: 'phaser4',
  label: 'Phaser 4 Runtime',
  shortLabel: 'Phaser 4',
  description: 'Phaser 4 runtime backend for game preview and export.',
  experimental: false,
  available: true,
};

type SceneFactory = () => ClawgamePhaserScene;

/**
 * Creates a minimal placeholder scene that auto-replaces itself
 * with the real scene once Phaser systems are ready.
 */
export class PlaceholderScene extends Scene {
  private realScene: ClawgamePhaserScene;
  private bootstrap: PhaserPreviewBootstrap;

  constructor(realScene: ClawgamePhaserScene, bootstrap: PhaserPreviewBootstrap) {
    super({ key: bootstrap.sceneKey ?? 'clawgame-phaser-preview' });
    this.realScene = realScene;
    this.bootstrap = bootstrap;
  }

  init(): void {
    // Copy Phaser systems to the real scene instance
    const systems = [
      'sys', 'game', 'cameras', 'add', 'make', 'physics',
      'input', 'time', 'anims', 'load', 'events', 'children',
      'scene', 'displayList', 'updateList',
    ];
    for (const s of systems) {
      try { (this.realScene as any)[s] = (this as any)[s]; } catch {}
    }
    // Set bootstrap
    if (typeof this.realScene.init === 'function') {
      this.realScene.init({ bootstrap: this.bootstrap });
    } else {
      this.realScene.setBootstrap(this.bootstrap);
    }
  }

  preload(): void {
    if (typeof this.realScene.preload === 'function') {
      this.realScene.preload();
    }
  }

  create(): void {
    this.realScene.create();
  }

  update(time: number, delta: number): void {
    this.realScene.update(time, delta);
  }
}

export class ClawgamePhaserRuntime {
  readonly kind = PHASER4_RUNTIME_DESCRIPTOR.kind;
  readonly descriptor = PHASER4_RUNTIME_DESCRIPTOR;

  private game: Game | null = null;
  private scene: ClawgamePhaserScene | null = null;
  private sceneFactory: SceneFactory | null = null;

  setSceneFactory(factory: SceneFactory): void {
    this.sceneFactory = factory;
  }

  createScene(): ClawgamePhaserScene {
    if (this.sceneFactory) return this.sceneFactory();
    return new ClawgamePhaserScene();
  }

  createPreviewBootstrap(scene: CanonicalSceneLike): PhaserPreviewBootstrap {
    return buildPhaserPreviewBootstrap(scene);
  }

  mount(
    parent: HTMLElement,
    bootstrap: PhaserPreviewBootstrap,
    opts?: { width?: number; height?: number },
  ): Game | null {
    const width = opts?.width ?? bootstrap.bounds?.width ?? 800;
    const height = opts?.height ?? bootstrap.bounds?.height ?? 600;

    const sceneInstance = this.createScene();
    const placeholder = new PlaceholderScene(sceneInstance, bootstrap);

    this.game = new Game({
      type: AUTO,
      width,
      height,
      parent,
      backgroundColor: bootstrap.backgroundColor ?? '#0f172a',
      scene: [placeholder],
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
      },
      input: { keyboard: true, mouse: true, touch: true },
    });

    this.scene = sceneInstance;
    return this.game;
  }

  unmount(): void {
    this.destroy();
  }

  getGame(): Game | null {
    return this.game;
  }

  getScene(): ClawgamePhaserScene | null {
    return this.scene;
  }

  destroy(): void {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    this.scene = null;
  }
}
