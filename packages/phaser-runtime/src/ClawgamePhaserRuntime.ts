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

    const sceneKey = bootstrap.sceneKey ?? 'clawgame-phaser-preview';
    const sceneInstance = this.createScene();

    // Store bootstrap so the scene can pick it up in init()
    (sceneInstance as any).__clawgame_bootstrap = bootstrap;

    this.game = new Game({
      type: AUTO,
      width,
      height,
      parent,
      backgroundColor: bootstrap.backgroundColor ?? '#0f172a',
      scene: {
        key: sceneKey,
        // Use init to inject bootstrap before create runs
        init: function(this: Phaser.Scene, data: any) {
          sceneInstance['scene'] = this.scene;
          // Copy Phaser's internal systems to our scene
          (sceneInstance as any).sys = this.sys;
          (sceneInstance as any).game = this.game;
          (sceneInstance as any).cameras = this.cameras;
          (sceneInstance as any).add = this.add;
          (sceneInstance as any).make = this.make;
          (sceneInstance as any).physics = this.physics;
          (sceneInstance as any).input = this.input;
          (sceneInstance as any).time = this.time;
          (sceneInstance as any).anims = this.anims;
          (sceneInstance as any).load = this.load;
          (sceneInstance as any).events = this.events;
          (sceneInstance as any).children = this.children;
          // Set bootstrap
          sceneInstance.setBootstrap(data?.bootstrap ?? bootstrap);
        },
        create: function(this: Phaser.Scene) {
          sceneInstance.create();
        },
        update: function(this: Phaser.Scene, time: number, delta: number) {
          sceneInstance.update(time, delta);
        },
      },
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
