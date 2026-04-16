import { Game, AUTO, Scale } from 'phaser';
import { PhaserSceneEditor } from './PhaserSceneEditor';

export class SceneEditorRuntime {
  private game: Game | null = null;
  private scene: PhaserSceneEditor | null = null;

  mount(parent: HTMLElement): void {
    if (this.game) this.destroy();
    this.scene = new PhaserSceneEditor();
    this.game = new Game({
      type: AUTO,
      width: parent.clientWidth,
      height: parent.clientHeight,
      parent,
      backgroundColor: '#09111f',
      scene: [this.scene],
      physics: { default: 'arcade', arcade: { debug: false } },
      scale: { mode: Scale.RESIZE, autoCenter: Scale.CENTER_BOTH },
      input: { keyboard: true, mouse: true, touch: true },
      audio: { noAudio: true } as any,
    });
  }

  getScene(): PhaserSceneEditor | null { return this.scene; }

  resize(w: number, h: number): void { this.game?.scale.resize(w, h); }

  destroy(): void {
    if (this.game) { this.game.destroy(true); this.game = null; }
    this.scene = null;
  }
}
