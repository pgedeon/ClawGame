import { GameObjects, Input } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import {
  createTowerDefenseState,
  createTowerDefenseTowerAt,
  updateTowerDefenseFrame,
  validateTowerPlacement,
  upgradeTower,
  getTowerDefenseWaves,
  getMapLayout,
  getMapWaypoints,
  TOWER_CONFIGS,
  MAX_UPGRADE_LEVEL,
  type TowerDefenseState,
  type TowerDefenseTower,
  type TowerDefenseProjectile,
  type TowerDefenseWave,
  type TowerType,
  type Waypoint,
} from '../utils/previewTowerDefense';
import type { PhaserPreviewBootstrap } from '../../../../packages/phaser-runtime/src/types';

export class TowerDefenseScene extends ClawgamePhaserScene {
  private tdState!: TowerDefenseState;
  private tdWaves: TowerDefenseWave[] = [];
  private towers: TowerDefenseTower[] = [];
  private tdProjectiles: TowerDefenseProjectile[] = [];
  private tdEntities: Map<string, any> = new Map();
  private renderEntities: Map<string, GameObjects.Arc> = new Map();
  private projectileSprites: Map<string, GameObjects.Arc> = new Map();
  private towerContainers: Map<string, GameObjects.Container> = new Map();
  private pathGraphics!: GameObjects.Graphics;
  private rangeIndicator!: GameObjects.Arc;
  private _gameOver = false;
  private _victory = false;
  private _selectedTowerId: string | null = null;

  public onGameOver?: () => void;
  public onVictory?: () => void;
  public onStateUpdate?: (state: TowerDefenseState, towers: TowerDefenseTower[]) => void;
  public selectedTower: TowerDefenseTower | null = null;

  constructor() {
    super('tower-defense');
  }

  init(opts: { bootstrap: PhaserPreviewBootstrap; waves?: TowerDefenseWave[] }): void {
    super.setBootstrap(opts.bootstrap);
    this.tdWaves = opts.waves || [];
    this._gameOver = false;
    this._victory = false;
    this.towers = [];
    this.tdProjectiles = [];
    this.tdEntities.clear();
    this.renderEntities.clear();
  }

  create(): void {
    super.create();
    if (!this.bootstrap) return;
    const { width, height } = this.bootstrap.bounds || { width: 800, height: 600 };

    const mapLayout = getMapLayout({ name: this.bootstrap.sceneName });
    const waypoints = getMapWaypoints(mapLayout, width, height);
    this.tdState = createTowerDefenseState(100, mapLayout, width, height);
    this.tdWaves = getTowerDefenseWaves({ name: this.bootstrap.sceneName } as any);

    this.pathGraphics = this.add.graphics();
    this.drawPath(waypoints);

    this.rangeIndicator = this.add.circle(0, 0, 100, 0xffffff, 0.1);
    this.rangeIndicator.setStrokeStyle(1, 0xffffff, 0.3);
    this.rangeIndicator.setVisible(false);

    const core = this.bootstrap.entities.find(e => e.type === 'player' || e.type === 'core');
    if (core) {
      this.tdEntities.set('core-bean', {
        id: 'core-bean', type: 'player',
        width: core.width, height: core.height,
        transform: { x: core.x, y: core.y },
        health: 100, maxHealth: 100,
      });
    }

    this.input.on('pointerdown', (pointer: Input.Pointer) => {
      if (this._gameOver || this._victory) return;
      const clicked = this.findTowerAt(pointer.worldX, pointer.worldY);
      if (clicked) {
        this._selectedTowerId = clicked.id;
        this.selectedTower = clicked;
        this.rangeIndicator.setPosition(clicked.x, clicked.y);
        this.rangeIndicator.setRadius(clicked.range);
        this.rangeIndicator.setVisible(true);
      } else if (this._selectedTowerId) {
        this._selectedTowerId = null;
        this.selectedTower = null;
        this.rangeIndicator.setVisible(false);
      }
    });
  }

  update(time: number, delta: number): void {
    if (!this.bootstrap || this._gameOver || this._victory) return;
    const { width, height } = this.bootstrap.bounds || { width: 800, height: 600 };

    const result = updateTowerDefenseFrame({
      canvasWidth: width, canvasHeight: height,
      currentTime: time, deltaTime: delta,
      entities: this.tdEntities, towers: this.towers,
      projectiles: this.tdProjectiles, state: this.tdState,
      waves: this.tdWaves,
      onEnemyDefeated: (enemy: any) => this.removeRenderEntity(enemy.id),
    });

    if (result.gameOver && !this._gameOver) { this._gameOver = true; this.onGameOver?.(); }
    if (result.victory && !this._victory) { this._victory = true; this.onVictory?.(); }

    this.syncEntities();
    this.syncProjectiles();
    this.syncTowers();
    this.onStateUpdate?.(this.tdState, this.towers);
  }

  placeTower(x: number, y: number, type: TowerType): { success: boolean; reason?: string } {
    if (!this.bootstrap) return { success: false, reason: 'not initialized' };
    const { width, height } = this.bootstrap.bounds || { width: 800, height: 600 };
    const core = this.tdEntities.get('core-bean');
    const corePos = core ? { x: core.transform.x, y: core.transform.y } : null;
    const v = validateTowerPlacement({ x, y, canvasWidth: width, canvasHeight: height, towers: this.towers, mapLayout: this.tdState.mapLayout, corePosition: corePos });
    if (!v.valid) return { success: false, reason: v.reason };
    this.towers.push(createTowerDefenseTowerAt({ x, y }, type, this.time.now));
    return { success: true };
  }

  upgradeSelectedTower(): boolean {
    const t = this.towers.find(t => t.id === this._selectedTowerId);
    if (!t || t.upgradeLevel >= MAX_UPGRADE_LEVEL) return false;
    return upgradeTower(t);
  }

  sellSelectedTower(): TowerDefenseTower | null {
    const idx = this.towers.findIndex(t => t.id === this._selectedTowerId);
    if (idx === -1) return null;
    const t = this.towers.splice(idx, 1)[0];
    this._selectedTowerId = null;
    this.selectedTower = null;
    this.rangeIndicator.setVisible(false);
    return t;
  }

  startNextWave(): void {
    if (this.tdState.waitingForPlayer) this.tdState.waitingForPlayer = false;
  }

  getTDState(): TowerDefenseState { return this.tdState; }
  getTowers(): TowerDefenseTower[] { return this.towers; }
  isGameOver(): boolean { return this._gameOver; }
  isVictory(): boolean { return this._victory; }

  private drawPath(waypoints: Waypoint[]): void {
    if (waypoints.length < 2) return;
    this.pathGraphics.lineStyle(24, 0x6b5b3a, 0.3);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    this.pathGraphics.strokePath();
    this.pathGraphics.lineStyle(20, 0x8b7355, 0.6);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    this.pathGraphics.strokePath();
  }

  private syncEntities(): void {
    const active = new Set<string>();
    for (const [id, entity] of this.tdEntities) {
      active.add(id);
      if (id === 'core-bean') continue;
      let r = this.renderEntities.get(id);
      if (!r) {
        const color = entity.color ? this.parseColor(entity.color) : 0xef4444;
        const radius = Math.max(8, (entity.width || 24) / 2);
        r = this.add.circle(entity.transform.x, entity.transform.y, radius, color);
        r.setDepth(10);
        this.renderEntities.set(id, r);
      }
      r.setPosition(entity.transform.x, entity.transform.y);
    }
    for (const [id] of this.renderEntities) {
      if (!active.has(id)) this.removeRenderEntity(id);
    }
  }

  private syncProjectiles(): void {
    const active = new Set<string>();
    for (const p of this.tdProjectiles) {
      active.add(p.id);
      let s = this.projectileSprites.get(p.id);
      if (!s) {
        s = this.add.circle(p.x, p.y, 4, this.parseColor(p.color || '#ffff00'));
        s.setDepth(20);
        this.projectileSprites.set(p.id, s);
      }
      s.setPosition(p.x, p.y);
    }
    for (const [id, s] of this.projectileSprites) {
      if (!active.has(id)) { s.destroy(); this.projectileSprites.delete(id); }
    }
  }

  private syncTowers(): void {
    const active = new Set(this.towers.map(t => t.id));
    for (const tower of this.towers) {
      let c = this.towerContainers.get(tower.id);
      if (!c) {
        c = this.add.container(tower.x, tower.y);
        c.setDepth(5);
        const cfg = TOWER_CONFIGS[tower.towerType];
        const base = this.add.rectangle(0, 0, 28, 28, this.parseColor(cfg.color));
        base.setOrigin(0.5, 0.5);
        const range = this.add.circle(0, 0, tower.range, 0xffffff, 0.03);
        range.setStrokeStyle(0.5, 0xffffff, 0.1);
        c.add([range, base]);
        this.towerContainers.set(tower.id, c);
      }
      c.setPosition(tower.x, tower.y);
    }
    for (const [id, c] of this.towerContainers) {
      if (!active.has(id)) { c.destroy(); this.towerContainers.delete(id); }
    }
  }

  private removeRenderEntity(id: string): void {
    const r = this.renderEntities.get(id);
    if (r) { r.destroy(); this.renderEntities.delete(id); }
  }

  private findTowerAt(x: number, y: number): TowerDefenseTower | null {
    for (const t of this.towers) if (Math.hypot(x - t.x, y - t.y) < 20) return t;
    return null;
  }

  private parseColor(hex: string): number { return parseInt(hex.replace('#', ''), 16); }
}
