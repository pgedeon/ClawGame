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
  private hudWave!: GameObjects.Text;
  private hudCore!: GameObjects.Text;
  private hudScore!: GameObjects.Text;
  private hudMana!: GameObjects.Text;
  private coreHealthBar!: GameObjects.Rectangle;
  private coreHealthBarBg!: GameObjects.Rectangle;
  private _score = 0;
  private _mana = 100;
  private _maxMana = 100;
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

    // ─── Background ───
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    bg.setDepth(-10);

    // Subtle grid pattern
    const gridGfx = this.add.graphics();
    gridGfx.setDepth(-9);
    gridGfx.lineStyle(1, 0x2a2a4e, 0.3);
    for (let gx = 0; gx <= width; gx += 40) {
      gridGfx.moveTo(gx, 0); gridGfx.lineTo(gx, height);
    }
    for (let gy = 0; gy <= height; gy += 40) {
      gridGfx.moveTo(0, gy); gridGfx.lineTo(width, gy);
    }
    gridGfx.strokePath();

    // ─── Path ───
    this.pathGraphics = this.add.graphics();
    this.drawPath(waypoints);

    // ─── Core visual ───
    const coreEntity = this.bootstrap.entities.find(e => e.type === 'player' || e.type === 'core');
    if (coreEntity) {
      // Pulsing glow around core
      const coreGlow = this.add.circle(coreEntity.x, coreEntity.y, 40, 0x8b4513, 0.15);
      coreGlow.setDepth(1);
      this.tweens.add({
        targets: coreGlow,
        scale: { from: 1, to: 1.3 },
        alpha: { from: 0.15, to: 0.05 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      // Core label
      this.add.text(coreEntity.x, coreEntity.y - 35, '☕ CORE', {
        fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(15);
    }

    // ─── HUD ───
    this.hudWave = this.add.text(12, 12, 'Wave: 0', {
      fontSize: '14px', color: '#e2e8f0', fontFamily: 'monospace', fontStyle: 'bold',
    }).setDepth(30);

    this.hudCore = this.add.text(12, 32, 'Core: 100', {
      fontSize: '14px', color: '#22c55e', fontFamily: 'monospace', fontStyle: 'bold',
    }).setDepth(30);

    this.hudScore = this.add.text(width - 12, 12, 'Score: 0', {
      fontSize: '14px', color: '#fbbf24', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(30);

    this.hudMana = this.add.text(width - 12, 32, 'Mana: 100', {
      fontSize: '14px', color: '#60a5fa', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(30);

    // Core health bar background
    this.coreHealthBarBg = this.add.rectangle(width / 2, 8, 200, 8, 0x1e293b);
    this.coreHealthBarBg.setDepth(31);
    this.coreHealthBar = this.add.rectangle(width / 2 - 100, 8, 200, 6, 0x22c55e);
    this.coreHealthBar.setOrigin(0, 0.5).setDepth(32);

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

    // ─── Update HUD ───
    this.updateHUD();

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

    // Score tracking
    if (result.enemiesDefeated) {
      this._score += result.enemiesDefeated * 10;
      this._mana = Math.min(this._maxMana, this._mana + 5);
    }
    // Screen shake on core damage
    if (result.coreDamaged) {
      this.cameras.main.shake(100, 0.005);
    }

    this.syncEntities();
    this.syncProjectiles();
    this.syncTowers();
    this.drawHealthBars();
    this.onStateUpdate?.(this.tdState, this.towers);
  }

  private healthBarGfx?: GameObjects.Graphics;

  private drawHealthBars(): void {
    if (!this.healthBarGfx) {
      this.healthBarGfx = this.add.graphics();
      this.healthBarGfx.setDepth(12);
    }
    this.healthBarGfx.clear();
    for (const [, r] of this.renderEntityMap) {
      const pct = (r as any).hpPct as number | undefined;
      const barW = (r as any).barWidth as number | undefined;
      const barY = (r as any).barY as number | undefined;
      if (pct === undefined || barW === undefined || barY === undefined) continue;
      const x = r.x - barW / 2;
      // Background
      this.healthBarGfx.fillStyle(0x000000, 0.5);
      this.healthBarGfx.fillRect(x - 1, barY - 1, barW + 2, 5);
      // Health
      const color = pct > 0.6 ? 0x22c55e : pct > 0.3 ? 0xfbbf24 : 0xef4444;
      this.healthBarGfx.fillStyle(color, 1);
      this.healthBarGfx.fillRect(x, barY, barW * pct, 3);
    }
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

  private updateHUD(): void {
    if (!this.tdState) return;
    const wave = this.tdState.waveIndex || 0;
    const core = this.tdState.coreHealth || 0;
    const maxCore = this.tdState.maxCoreHealth || 100;

    this.hudWave?.setText(`Wave: ${wave}`);
    this.hudCore?.setText(`Core: ${core}`);
    this.hudScore?.setText(`Score: ${this._score}`);
    this.hudMana?.setText(`Mana: ${this._mana}`);

    // Core health color
    const corePct = core / maxCore;
    const coreColor = corePct > 0.6 ? '#22c55e' : corePct > 0.3 ? '#fbbf24' : '#ef4444';
    this.hudCore?.setColor(coreColor);

    // Core health bar
    if (this.coreHealthBar) {
      this.coreHealthBar.width = Math.max(0, 200 * corePct);
      this.coreHealthBar.setFillStyle(corePct > 0.6 ? 0x22c55e : corePct > 0.3 ? 0xfbbf24 : 0xef4444);
    }
  }

  private drawPath(waypoints: Waypoint[]): void {
    if (waypoints.length < 2) return;
    // Outer dark border
    this.pathGraphics.lineStyle(28, 0x3d2b1f, 0.5);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    this.pathGraphics.strokePath();
    // Coffee-colored path
    this.pathGraphics.lineStyle(22, 0x6b4226, 0.7);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    this.pathGraphics.strokePath();
    // Inner highlight
    this.pathGraphics.lineStyle(16, 0x8b6342, 0.4);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    this.pathGraphics.strokePath();
    // Dashed center line
    this.pathGraphics.lineStyle(2, 0xc4a67a, 0.3);
    for (let i = 0; i < waypoints.length - 1; i++) {
      const dx = waypoints[i + 1].x - waypoints[i].x;
      const dy = waypoints[i + 1].y - waypoints[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.floor(dist / 20);
      for (let s = 0; s < steps; s += 2) {
        const t1 = s / steps;
        const t2 = Math.min((s + 1) / steps, 1);
        this.pathGraphics.beginPath();
        this.pathGraphics.moveTo(waypoints[i].x + dx * t1, waypoints[i].y + dy * t1);
        this.pathGraphics.lineTo(waypoints[i].x + dx * t2, waypoints[i].y + dy * t2);
        this.pathGraphics.strokePath();
      }
    }
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
      // Health bar above enemy
      const hpPct = entity.health / entity.maxHealth;
      const barWidth = Math.max(20, (entity.width || 24));
      const barY = r.y - r.radius - 8;
      // We'll draw health bars using the graphics object approach — store on the circle
      (r as any).hpPct = hpPct;
      (r as any).barWidth = barWidth;
      (r as any).barY = barY;
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
        base.setStrokeStyle(2, 0x000000, 0.3);
        const range = this.add.circle(0, 0, tower.range, 0xffffff, 0.03);
        range.setStrokeStyle(0.5, 0xffffff, 0.1);
        // Tower level indicator (stars)
        const levelText = this.add.text(0, -2, '★'.repeat(tower.upgradeLevel || 0), {
          fontSize: '8px', color: '#fbbf24', fontFamily: 'monospace',
        }).setOrigin(0.5);
        c.add([range, base, levelText]);
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
