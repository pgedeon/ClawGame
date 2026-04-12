export class ClawgamePhaserScene {
  readonly id = 'clawgame-phaser-preview';
  readonly ready = false;

  boot(): never {
    throw new Error('ClawgamePhaserScene is scaffolded but not wired into the preview flow yet.');
  }
}
