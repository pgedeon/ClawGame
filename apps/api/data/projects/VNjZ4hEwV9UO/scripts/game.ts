import { Engine, Scene, Entity, Transform, Sprite } from "@clawgame/engine";

export class SimplePuzzleGame {
  private engine: Engine;
  private scene: Scene;
  private score: number = 0;
  
  constructor() {
    this.engine = new Engine("game-canvas", 800, 600);
    this.scene = new Scene("main-scene");
    this.initializeGame();
  }
  
  private initializeGame() {
    // Create player entity
    const player = new Entity("player", {
      transform: new Transform(400, 300),
      sprite: new Sprite("player-sprite")
    });
    
    this.scene.addEntity(player);
    this.engine.setScene(this.scene);
  }
  
  public start() {
    this.engine.start();
  }
  
  public stop() {
    this.engine.stop();
  }
}