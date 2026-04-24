import { GameObjects, Input, Math as PhaserMath, Input as PhaserInput } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import type { TDOverlayState } from './phaserPreviewSession';
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
  private renderEntityMap: Map<string, GameObjects.Arc> = new Map();
  private projectileMap: Map<string, GameObjects.Arc> = new Map();
  private towerContainers: Map<string, GameObjects.Container> = new Map();
  private enemyGroup!: GameObjects.Group;
  private projectileGroup!: GameObjects.Group;
  private towerGroup!: GameObjects.Group;
  private pathGraphics!: GameObjects.Graphics;
  private rangeIndicator!: GameObjects.Arc;
  private _gameOver = false;
  private _victory = false;
  private _selectedTowerId: string | null = null;
  private cursor!: GameObjects.Arc;
  private cursorLabel!: GameObjects.Text;
  private cursorSpeed: number = 300;
  private selectedTowerType: TowerType = 'basic';
  private wasd!: { W: Input.Keyboard.Key; A: Input.Keyboard.Key; S: Input.Keyboard.Key; D: Input.Keyboard.Key; };
  private tKey!: Input.Keyboard.Key;
  private uKey!: Input.Keyboard.Key;
  private nKey!: Input.Keyboard.Key;
  private oneKey!: Input.Keyboard.Key;
  private twoKey!: Input.Keyboard.Key;
  private threeKey!: Input.Keyboard.Key;
  private fourKey!: Input.Keyboard.Key;

  public onGameOver?: () => void;
  public onVictory?: () => void;
  public onStateUpdate?: (state: TowerDefenseState, towers: TowerDefenseTower[]) => void;
  public selectedTower: TowerDefenseTower | null = null;

  constructor() {
    super('tower-defense');
  }

  init(opts?: { bootstrap?: PhaserPreviewBootstrap; waves?: TowerDefenseWave[] }): void {
    // Phaser calls init() before preload/create; we may receive data from scene.start()
    // or from the runtime host via setBootstrap. Grab waves from either path.
    if (opts?.bootstrap) super.setBootstrap(opts.bootstrap);
    const rawWaves = opts?.waves || (this.bootstrap as any)?._rawSceneData?.waves || [];
    this.tdWaves = rawWaves;
    this._gameOver = false;
    this._victory = false;
    this.towers = [];
    this.tdProjectiles = [];
    this.tdEntities.clear();
    this.renderEntityMap.clear();
  }

  create(): void {
    super.create();
    if (!this.bootstrap) return;
    const { width, height } = this.bootstrap.bounds || { width: 800, height: 600 };

    // Create Phaser groups for lifecycle management
    this.enemyGroup = this.add.group({ runChildUpdate: false });
    this.projectileGroup = this.add.group({ runChildUpdate: false });
    this.towerGroup = this.add.group({ runChildUpdate: false });

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

    // ─── Keyboard Input ───
    if (this.input.keyboard) {
      this.wasd = {
        W: this.input.keyboard.addKey('W'),
        A: this.input.keyboard.addKey('A'),
        S: this.input.keyboard.addKey('S'),
        D: this.input.keyboard.addKey('D'),
      };
      this.tKey = this.input.keyboard.addKey('T');
      this.uKey = this.input.keyboard.addKey('U');
      this.nKey = this.input.keyboard.addKey('N');
      this.oneKey = this.input.keyboard.addKey('ONE');
      this.twoKey = this.input.keyboard.addKey('TWO');
      this.threeKey = this.input.keyboard.addKey('THREE');
      this.fourKey = this.input.keyboard.addKey('FOUR');
    }

    // ─── Cursor (player crosshair) ───
    this.cursor = this.add.circle(width / 2, height * 0.7, 14, 0xffffff, 0.3);
    this.cursor.setStrokeStyle(2, 0xffffff, 0.8);
    this.cursor.setDepth(25);
    this.cursorSpeed = 300;
    this.selectedTowerType = 'basic';

    // Cursor label
    this.cursorLabel = this.add.text(width / 2, height * 0.7 + 24, 'T: Place Tower', {
      fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(25);

    this.input.on('pointerdown', (pointer: Input.Pointer) => {
      if (this._gameOver || this._victory) return;
      // Move cursor to click position
      this.cursor.setPosition(pointer.worldX, pointer.worldY);
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

  private _lastSyncTime = 0;

  update(time: number, delta: number): void {
    if (!this.bootstrap || this._gameOver || this._victory) return;
    const { width, height } = this.bootstrap.bounds || { width: 800, height: 600 };

    // ─── Cursor movement (WASD) ───
    if (this.wasd && this.cursor) {
      let cx = 0, cy = 0;
      if (this.wasd.A.isDown) cx -= 1;
      if (this.wasd.D.isDown) cx += 1;
      if (this.wasd.W.isDown) cy -= 1;
      if (this.wasd.S.isDown) cy += 1;
      if (cx !== 0 || cy !== 0) {
        const len = Math.sqrt(cx * cx + cy * cy);
        this.cursor.x += (cx / len) * this.cursorSpeed * (delta / 1000);
        this.cursor.y += (cy / len) * this.cursorSpeed * (delta / 1000);
      }
      this.cursor.x = PhaserMath.Clamp(this.cursor.x, 10, width - 10);
      this.cursor.y = PhaserMath.Clamp(this.cursor.y, 10, height - 10);
      this.cursorLabel.setPosition(this.cursor.x, this.cursor.y + 24);
    }

    // ─── Keyboard tower placement (T) ───
    if (this.tKey && PhaserInput.Keyboard.JustDown(this.tKey)) {
      const result = this.placeTower(this.cursor.x, this.cursor.y, this.selectedTowerType);
      if (result.success) {
        // Show brief feedback
        this.cursor.setStrokeStyle(2, 0x22c55e, 1);
        this.time.delayedCall(200, () => this.cursor.setStrokeStyle(2, 0xffffff, 0.8));
      }
    }

    // ─── Tower type selection (1-4) ───
    const towerTypes: TowerType[] = ['basic', 'cannon', 'frost', 'lightning'];
    if (this.oneKey && PhaserInput.Keyboard.JustDown(this.oneKey)) this.selectedTowerType = towerTypes[0];
    if (this.twoKey && PhaserInput.Keyboard.JustDown(this.twoKey)) this.selectedTowerType = towerTypes[1];
    if (this.threeKey && PhaserInput.Keyboard.JustDown(this.threeKey)) this.selectedTowerType = towerTypes[2];
    if (this.fourKey && PhaserInput.Keyboard.JustDown(this.fourKey)) this.selectedTowerType = towerTypes[3];

    // Update cursor label
    if (this.cursorLabel) {
      const idx = towerTypes.indexOf(this.selectedTowerType);
      this.cursorLabel.setText(`[${idx + 1}] ${this.selectedTowerType} • T: Place`);
    }

    // ─── Upgrade selected tower (U) ───
    if (this.uKey && PhaserInput.Keyboard.JustDown(this.uKey) && this._selectedTowerId) {
      this.upgradeSelectedTower();
    }

    // ─── Next wave (N) ───
    if (this.nKey && PhaserInput.Keyboard.JustDown(this.nKey)) {
      this.startNextWave();
    }

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



  sellSelectedTower(): TowerDefenseTower | null {
    const idx = this.towers.findIndex(t => t.id === this._selectedTowerId);
    if (idx === -1) return null;
    const t = this.towers.splice(idx, 1)[0];
    this._selectedTowerId = null;
    this.selectedTower = null;
    this.rangeIndicator.setVisible(false);
    return t;
  }

  getTDState(): TowerDefenseState { return this.tdState; }
  getTowers(): TowerDefenseTower[] { return this.towers; }
  isGameOver(): boolean { return this._gameOver; }
  isVictory(): boolean { return this._victory; }

  /** Called by the session handle to change the selected tower type from React UI */
  setSelectedTowerType(type: string): void {
    this.selectedTowerType = type as TowerType;
  }

  /** State sync callback for the session bridge */
  private _stateSyncCb?: (state: TDOverlayState) => void;
  setStateSyncCallback(cb: (state: TDOverlayState) => void): void {
    this._stateSyncCb = cb;
  }

  /** Push current state to React */
  private syncToReact(): void {
    if (!this._stateSyncCb) return;
    this._stateSyncCb({
      enabled: true,
      selectedTowerType: this.selectedTowerType,
      wave: this.tdState?.waveIndex,
      core: this.tdState?.coreHealth,
      mana: undefined,
      feedback: undefined,
    });
  }

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
      let r = this.renderEntityMap.get(id);
      if (!r) {
        // Try to recycle a dead member from the group
        const dead = this.enemyGroup.getFirstDead(false) as GameObjects.Arc | null;
        if (dead) {
          dead.setActive(true).setVisible(true);
          const color = entity.color ? this.parseColor(entity.color) : 0xef4444;
          dead.setFillStyle(color);
          const radius = Math.max(8, (entity.width || 24) / 2);
          dead.setRadius(radius);
          dead.setPosition(entity.transform.x, entity.transform.y);
          r = dead;
        } else {
          const color = entity.color ? this.parseColor(entity.color) : 0xef4444;
          const radius = Math.max(8, (entity.width || 24) / 2);
          r = this.add.circle(entity.transform.x, entity.transform.y, radius, color);
          r.setDepth(10);
          this.enemyGroup.add(r);
        }
        this.renderEntityMap.set(id, r);
      }
      r.setPosition(entity.transform.x, entity.transform.y);
    }
    for (const [id] of this.renderEntityMap) {
      if (!active.has(id)) this.removeRenderEntity(id);
    }
  }

  private syncProjectiles(): void {
    const active = new Set<string>();
    for (const p of this.tdProjectiles) {
      active.add(p.id);
      let s = this.projectileMap.get(p.id);
      if (!s) {
        // Try to recycle a dead member from the group
        const dead = this.projectileGroup.getFirstDead(false) as GameObjects.Arc | null;
        if (dead) {
          dead.setActive(true).setVisible(true);
          dead.setFillStyle(this.parseColor(p.color || '#ffff00'));
          dead.setPosition(p.x, p.y);
          s = dead;
        } else {
          s = this.add.circle(p.x, p.y, 4, this.parseColor(p.color || '#ffff00'));
          s.setDepth(20);
          this.projectileGroup.add(s);
        }
        this.projectileMap.set(p.id, s);
      }
      s.setPosition(p.x, p.y);
    }
    for (const [id, s] of this.projectileMap) {
      if (!active.has(id)) {
        // Kill (deactivate) instead of destroy for recycling
        this.projectileGroup.kill(s);
        this.projectileMap.delete(id);
      }
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
        this.towerGroup.add(c);
      }
      c.setPosition(tower.x, tower.y);
    }
    for (const [id, c] of this.towerContainers) {
      if (!active.has(id)) {
        this.towerGroup.kill(c);
        c.destroy();
        this.towerContainers.delete(id);
      }
    }
  }

  private removeRenderEntity(id: string): void {
    const r = this.renderEntityMap.get(id);
    if (r) {
      // Kill (deactivate) for recycling instead of destroying
      this.enemyGroup.kill(r);
      this.renderEntityMap.delete(id);
    }
  }

  private findTowerAt(x: number, y: number): TowerDefenseTower | null {
    for (const t of this.towers) if (Math.hypot(x - t.x, y - t.y) < 20) return t;
    return null;
  }

  private parseColor(hex: string): number { return parseInt(hex.replace('#', ''), 16); }

  private placeTower(x: number, y: number, type: TowerType): { success: boolean; reason?: string } {
    if (!this.bootstrap || !this.tdState) return { success: false, reason: 'no state' };
    const { width, height } = this.bootstrap.bounds || { width: 800, height: 600 };
    const cost = TOWER_CONFIGS[type]?.cost ?? 30;
    // Tower placement allowed (cost tracked externally)
    const core = this.tdEntities.get('core-bean');
    const corePos = core ? { x: core.transform.x, y: core.transform.y } : null;
    const valid = validateTowerPlacement({
      x, y, canvasWidth: width, canvasHeight: height,
      towers: this.towers, mapLayout: this.tdState.mapLayout, corePosition: corePos,
    });
    if (!valid.valid) return { success: false, reason: valid.reason || 'invalid' };
    const tower = createTowerDefenseTowerAt({ x, y }, type, this.time.now);
    this.towers.push(tower);
    // Cost tracked externally
    return { success: true };
  }

  upgradeSelectedTower(): void {
    if (!this.selectedTower) return;
    const ok = upgradeTower(this.selectedTower);
    if (ok && this.rangeIndicator) {
      this.rangeIndicator.setRadius(this.selectedTower.range);
    }
  }

  startNextWave(): void {
    if (!this.tdState) return;
    if (this.tdState.waitingForPlayer) this.tdState.waitingForPlayer = false;
    this.tdState.waveTimer = 0;
  }
}
