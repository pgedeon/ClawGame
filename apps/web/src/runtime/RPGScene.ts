/**
 * RPGScene — Full game logic for the Eclipse of Runes RPG
 * Phaser 4 scene with WASD movement, enemy AI, combat, NPC dialogue,
 * rune collection, items, health/mana, and quest tracking.
 * Works WITHOUT Arcade Physics (manual velocity/collision management).
 */
import { Scene, GameObjects } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import type { PhaserPreviewBootstrap } from '../../../../packages/phaser-runtime/src/types';
import { Math as PhaserMath, Input as PhaserInput } from 'phaser';

interface RPGEntity {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  components: Record<string, any>;
  sprite?: GameObjects.Rectangle;
  vx: number;
  vy: number;
  alive: boolean;
  // Enemy AI
  aiState: 'idle' | 'patrol' | 'chase' | 'attack';
  aiTimer: number;
  patrolOrigin: { x: number; y: number };
  patrolTarget: { x: number; y: number };
  lastAttackTime: number;
  // NPC
  dialogueTreeId?: string;
}

interface PlayerState {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  score: number;
  runes: string[];
  items: { id: string; name: string; type: string }[];
  damage: number;
  speed: number;
  attackCooldown: number;
  lastAttackTime: number;
  invulnTimer: number;
  activeQuests: { id: string; name: string; objectives: { id: string; type: string; targetId: string; current: number; required: number }[] }[];
}

interface DamageNumber {
  text: GameObjects.Text;
  vy: number;
  life: number;
}

export class RPGScene extends ClawgamePhaserScene {
  // Player
  private playerSprite!: GameObjects.Rectangle;
  private playerVx = 0;
  private playerVy = 0;
  private playerState: PlayerState = {
    hp: 100, maxHp: 100, mana: 100, maxMana: 100, score: 0,
    runes: [], items: [], damage: 15, speed: 250,
    attackCooldown: 400, lastAttackTime: 0, invulnTimer: 0,
    activeQuests: [],
  };

  // Input
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  // Entities
  private entities: Map<string, RPGEntity> = new Map();
  private walls: { x: number; y: number; w: number; h: number }[] = [];

  // Dialogue
  private dialogueActive = false;
  private dialogueTreeId = '';
  private dialogueLineId = '';
  private dialogueContainer: GameObjects.Container | null = null;

  // Dialogue tree data from scene JSON
  private dialogueTrees: Map<string, any> = new Map();
  private questDefs: any[] = [];
  private killCounts: Map<string, number> = new Map();

  // UI
  private hpBar!: GameObjects.Rectangle;
  private hpBarBg!: GameObjects.Rectangle;
  private manaBar!: GameObjects.Rectangle;
  private scoreText!: GameObjects.Text;
  private runeDisplay!: GameObjects.Text;
  private questText!: GameObjects.Text;
  private messageText!: GameObjects.Text;
  private messageTimer = 0;

  // Combat FX
  private attackArc!: GameObjects.Arc;
  private damageNumbers: DamageNumber[] = [];

  // World
  private worldWidth = 800;
  private worldHeight = 600;
  private rawSceneData: any;

  constructor() { super('rpg'); }

  create(): void {
    // Don't call super.create() — we handle everything ourselves
    if (!this.bootstrap) return;

    this.rawSceneData = (this.bootstrap as any)._rawSceneData || {};
    this.worldWidth = this.bootstrap.bounds?.width ?? 800;
    this.worldHeight = this.bootstrap.bounds?.height ?? 600;

    // Camera
    this.cameras?.main?.setBackgroundColor(this.bootstrap.backgroundColor || '#1a1a2e');

    // Load scene data
    if (this.rawSceneData.dialogueTrees) {
      for (const tree of this.rawSceneData.dialogueTrees) {
        this.dialogueTrees.set(tree.id, tree);
      }
    }
    this.questDefs = this.rawSceneData.quests || [];

    // Setup keyboard
    const kb = this.input.keyboard;
    if (kb) {
      for (const k of ['W', 'A', 'S', 'D', 'J', 'E', 'K', 'SPACE', 'ENTER', 'ONE', 'TWO', 'THREE', 'FOUR']) {
        this.keys[k] = kb.addKey(k);
      }
    }

    // Create all entities
    for (const entity of this.bootstrap.entities) {
      try {
        this.createEntity(entity);
      } catch (e) {
        console.warn('RPG entity failed:', entity.id, e);
      }
    }

    // UI
    this.createUI();

    // Attack arc
    this.attackArc = this.add.circle(0, 0, 48, 0xffffff, 0.2);
    this.attackArc.setStrokeStyle(2, 0xffffff, 0.5);
    this.attackArc.setVisible(false);
    this.attackArc.setDepth(15);

    this.showMessage('WASD move | J attack | E interact | K potion', 5000);
  }

  update(time: number, delta: number): void {
    if (!this.playerSprite || this.playerState.hp <= 0) return;
    const dt = delta / 1000;

    // Dialogue mode
    if (this.dialogueActive) {
      this.handleDialogueInput();
      return;
    }

    // ─── Player movement ───
    this.playerVx = 0;
    this.playerVy = 0;
    if (this.keys.A?.isDown) this.playerVx = -1;
    if (this.keys.D?.isDown) this.playerVx = 1;
    if (this.keys.W?.isDown) this.playerVy = -1;
    if (this.keys.S?.isDown) this.playerVy = 1;

    // Normalize diagonal
    const len = Math.sqrt(this.playerVx * this.playerVx + this.playerVy * this.playerVy);
    if (len > 0) {
      this.playerVx = (this.playerVx / len) * this.playerState.speed * dt;
      this.playerVy = (this.playerVy / len) * this.playerState.speed * dt;
    }

    // Move and collide with walls
    let nx = this.playerSprite.x + this.playerVx;
    let ny = this.playerSprite.y + this.playerVy;
    nx = PhaserMath.Clamp(nx, 16, this.worldWidth - 16);
    ny = PhaserMath.Clamp(ny, 16, this.worldHeight - 16);

    // Simple wall collision
    for (const w of this.walls) {
      if (this.rectOverlap(nx - 14, ny - 14, 28, 28, w.x - w.w / 2, w.y - w.h / 2, w.w, w.h)) {
        // Push back
        if (this.rectOverlap(nx - 14, this.playerSprite.y - 14, 28, 28, w.x - w.w / 2, w.y - w.h / 2, w.w, w.h)) {
          nx = this.playerSprite.x; // X blocked
        }
        if (this.rectOverlap(this.playerSprite.x - 14, ny - 14, 28, 28, w.x - w.w / 2, w.y - w.h / 2, w.w, w.h)) {
          ny = this.playerSprite.y; // Y blocked
        }
      }
    }
    this.playerSprite.setPosition(nx, ny);

    // ─── Attack (J) ───
    if (PhaserInput.Keyboard.JustDown(this.keys.J)) {
      this.performAttack(time);
    }

    // ─── Interact (E) ───
    if (PhaserInput.Keyboard.JustDown(this.keys.E)) {
      this.tryInteract();
    }

    // ─── Use potion (K) ───
    if (PhaserInput.Keyboard.JustDown(this.keys.K)) {
      this.usePotion();
    }

    // ─── Invuln flash ───
    if (this.playerState.invulnTimer > 0) {
      this.playerState.invulnTimer -= delta;
      this.playerSprite.setAlpha(Math.sin(time * 0.02) > 0 ? 1 : 0.3);
    } else {
      this.playerSprite.setAlpha(1);
    }

    // ─── Update enemies ───
    this.updateEnemies(time, delta);

    // ─── Update collectible overlaps ───
    this.checkCollectibleOverlaps();

    // ─── Attack arc fade ───
    if (this.attackArc.visible && time - this.playerState.lastAttackTime > 200) {
      this.attackArc.setVisible(false);
    }

    // ─── Damage numbers ───
    this.updateDamageNumbers(delta);

    // ─── Message timer ───
    if (this.messageTimer > 0) {
      this.messageTimer -= delta;
      if (this.messageTimer <= 0 && this.messageText) this.messageText.setVisible(false);
    }

    // ─── UI ───
    this.updateUI();
  }

  // ─── Entity Creation ───

  protected createEntity(data: any): void {
    const x = data.x ?? data.transform?.x ?? 0;
    const y = data.y ?? data.transform?.y ?? 0;
    const w = data.width ?? data.components?.sprite?.width ?? 32;
    const h = data.height ?? data.components?.sprite?.height ?? 32;
    const colorStr = data.color ?? data.components?.sprite?.color ?? '#ffffff';
    const color = parseInt(colorStr.replace('#', ''), 16);
    const type = data.type || 'unknown';

    if (type === 'player') {
      this.playerSprite = this.add.rectangle(x, y, w, h, color);
      this.playerSprite.setDepth(10);
      const stats = data.components?.stats;
      if (stats) { this.playerState.hp = stats.hp ?? 100; this.playerState.maxHp = stats.maxHp ?? 100; }
      if (data.components?.movement?.speed) this.playerState.speed = data.components.movement.speed;
      return;
    }

    if (type === 'enemy') {
      const sprite = this.add.rectangle(x, y, w, h, color);
      sprite.setDepth(8);
      const entity: RPGEntity = {
        id: data.id, type, x, y, width: w, height: h, color: colorStr,
        components: data.components || {}, sprite, vx: 0, vy: 0, alive: true,
        aiState: 'patrol', aiTimer: 0,
        patrolOrigin: { x, y },
        patrolTarget: this.randTarget(x, y, 120),
        lastAttackTime: 0,
      };
      this.entities.set(data.id, entity);
      // Health bar above enemy
      const hpBg = this.add.rectangle(x, y - h / 2 - 8, w, 4, 0x1e1e2e).setDepth(9);
      const hpFill = this.add.rectangle(x, y - h / 2 - 8, w, 4, 0xef4444).setDepth(9);
      entity.components._hpBg = hpBg;
      entity.components._hpFill = hpFill;
      return;
    }

    if (type === 'npc') {
      const sprite = this.add.rectangle(x, y, w, h, color);
      sprite.setDepth(8);
      const npcData = data.components?.npc || {};
      this.add.text(x, y - 24, npcData.name || 'NPC', {
        fontSize: '11px', color: '#e2e8f0', fontFamily: 'monospace',
        backgroundColor: '#1e293bcc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(12);

      const indicator = this.add.text(x, y - 38, '💬', { fontSize: '14px' }).setOrigin(0.5).setDepth(12);
      this.tweens?.add({ targets: indicator, y: y - 42, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      const entity: RPGEntity = {
        id: data.id, type, x, y, width: w, height: h, color: colorStr,
        components: data.components || {}, sprite, vx: 0, vy: 0, alive: true,
        aiState: 'idle', aiTimer: 0,
        patrolOrigin: { x, y }, patrolTarget: { x, y }, lastAttackTime: 0,
        dialogueTreeId: npcData.dialogueTreeId,
      };
      this.entities.set(data.id, entity);
      return;
    }

    if (type === 'collectible') {
      const sprite = this.add.rectangle(x, y, w, h, color);
      sprite.setDepth(5);
      const glow = this.add.circle(x, y, w * 0.8, color, 0.15).setDepth(4);
      this.tweens?.add({ targets: glow, scaleX: 1.4, scaleY: 1.4, alpha: 0.05, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      const entity: RPGEntity = {
        id: data.id, type, x, y, width: w, height: h, color: colorStr,
        components: data.components || {}, sprite, vx: 0, vy: 0, alive: true,
        aiState: 'idle', aiTimer: 0, patrolOrigin: { x, y }, patrolTarget: { x, y }, lastAttackTime: 0,
      };
      (entity as any)._glow = glow;
      this.entities.set(data.id, entity);
      return;
    }

    if (type === 'item') {
      const sprite = this.add.rectangle(x, y, w || 20, h || 20, color).setDepth(5);
      this.tweens?.add({ targets: sprite, y: y - 6, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      const entity: RPGEntity = {
        id: data.id, type, x, y, width: w || 20, height: h || 20, color: colorStr,
        components: data.components || {}, sprite, vx: 0, vy: 0, alive: true,
        aiState: 'idle', aiTimer: 0, patrolOrigin: { x, y }, patrolTarget: { x, y }, lastAttackTime: 0,
      };
      this.entities.set(data.id, entity);
      return;
    }

    if (type === 'obstacle') {
      this.add.rectangle(x, y, w, h, color).setDepth(3);
      this.walls.push({ x, y, w, h });
      return;
    }
  }

  // ─── Player Actions ───

  private performAttack(time: number): void {
    if (time - this.playerState.lastAttackTime < this.playerState.attackCooldown) return;
    this.playerState.lastAttackTime = time;
    const px = this.playerSprite.x, py = this.playerSprite.y;
    this.attackArc.setPosition(px, py).setVisible(true);

    for (const [id, e] of this.entities) {
      if (e.type !== 'enemy' || !e.alive || !e.sprite) continue;
      if (this.dist(px, py, e.sprite.x, e.sprite.y) < 52) {
        const stats = e.components.stats || {};
        const hp = (stats.hp ?? 30) - this.playerState.damage;
        if (hp <= 0) {
          this.killEnemy(id, e);
        } else {
          stats.hp = hp;
          this.spawnDmgNum(e.sprite.x, e.sprite.y - 20, `-${this.playerState.damage}`, '#fbbf24');
          // Knockback
          const angle = Math.atan2(e.sprite.y - py, e.sprite.x - px);
          e.vx = Math.cos(angle) * 200;
          e.vy = Math.sin(angle) * 200;
          e.aiTimer = 300; // Stun
          // Flash
          e.sprite.setFillStyle(0xffffff);
          this.time.delayedCall(80, () => { if (e.sprite && e.alive) e.sprite.setFillStyle(parseInt((e.color || '#ef4444').replace('#', ''), 16)); });
          // Update HP bar
          this.updateEnemyHpBar(e);
        }
      }
    }
    this.playerState.mana = Math.min(this.playerState.maxMana, this.playerState.mana + 2);
  }

  private killEnemy(id: string, e: RPGEntity): void {
    e.alive = false;
    this.playerState.score += (e.components.stats?.score ?? 10);
    this.spawnDmgNum(e.sprite!.x, e.sprite!.y - 20, '💀', '#ef4444');

    const enemyType = e.components.enemyType || id;
    this.killCounts.set(enemyType, (this.killCounts.get(enemyType) ?? 0) + 1);
    this.updateQuestProgress('kill', enemyType);

    // Remove HP bar
    e.components._hpBg?.destroy();
    e.components._hpFill?.destroy();

    this.tweens?.add({
      targets: e.sprite, scaleX: 0.1, scaleY: 0.1, alpha: 0,
      duration: 300, ease: 'Back.easeIn', onComplete: () => {
        e.sprite?.destroy();
        if (Math.random() < 0.4) this.spawnDrop(e.x, e.y);
      },
    });
  }

  private spawnDrop(x: number, y: number): void {
    const types = ['hp', 'mana', 'gold'];
    const colors = [0x22c55e, 0x3b82f6, 0xfbbf24];
    const i = Math.floor(Math.random() * 3);
    const drop = this.add.circle(x, y, 6, colors[i]).setDepth(6);
    this.tweens?.add({ targets: drop, y: y - 30, alpha: 0, duration: 1500, ease: 'Cubic.easeOut', onComplete: () => drop.destroy() });
    if (types[i] === 'hp') this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 10);
    else if (types[i] === 'mana') this.playerState.mana = Math.min(this.playerState.maxMana, this.playerState.mana + 15);
    else this.playerState.score += 5;
  }

  private tryInteract(): void {
    if (!this.playerSprite) return;
    for (const [, e] of this.entities) {
      if (e.type !== 'npc' || !e.alive || !e.dialogueTreeId) continue;
      if (this.dist(this.playerSprite.x, this.playerSprite.y, e.x, e.y) < 60) {
        this.openDialogue(e.dialogueTreeId);
        return;
      }
    }
  }

  private usePotion(): void {
    const idx = this.playerState.items.findIndex(i => i.type === 'potion' || i.id.includes('potion'));
    if (idx === -1) { this.showMessage('No potions!', 2000); return; }
    const pot = this.playerState.items.splice(idx, 1)[0];
    this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 25);
    this.spawnDmgNum(this.playerSprite.x, this.playerSprite.y - 20, '+25', '#22c55e');
    this.showMessage(`Used ${pot.name}!`, 2000);
  }

  // ─── Enemy AI ───

  private updateEnemies(time: number, delta: number): void {
    const dt = delta / 1000;
    const px = this.playerSprite?.x ?? 0;
    const py = this.playerSprite?.y ?? 0;

    for (const [, e] of this.entities) {
      if (e.type !== 'enemy' || !e.alive || !e.sprite) continue;

      // Apply knockback velocity decay
      if (Math.abs(e.vx) > 1 || Math.abs(e.vy) > 1) {
        e.sprite.x += e.vx * dt;
        e.sprite.y += e.vy * dt;
        e.vx *= 0.9;
        e.vy *= 0.9;
        e.sprite.x = PhaserMath.Clamp(e.sprite.x, 16, this.worldWidth - 16);
        e.sprite.y = PhaserMath.Clamp(e.sprite.y, 16, this.worldHeight - 16);
        continue; // Skip AI during knockback
      }

      // Stun timer
      if (e.aiTimer > 0) { e.aiTimer -= delta; continue; }

      const ex = e.sprite.x, ey = e.sprite.y;
      const distP = this.dist(ex, ey, px, py);
      const aiSpeed = e.components.ai?.speed || e.components.movement?.speed || 80;
      const chaseRange = 180;
      const atkRange = 34;

      // State transitions
      if (distP < atkRange) e.aiState = 'attack';
      else if (distP < chaseRange) e.aiState = 'chase';
      else if (e.aiState === 'chase' || e.aiState === 'attack') e.aiState = 'patrol';

      switch (e.aiState) {
        case 'patrol': {
          const t = e.patrolTarget;
          if (this.dist(ex, ey, t.x, t.y) < 8) {
            e.patrolTarget = this.randTarget(e.patrolOrigin.x, e.patrolOrigin.y, 100);
          } else {
            const a = Math.atan2(t.y - ey, t.x - ex);
            e.sprite.x += Math.cos(a) * aiSpeed * 0.4 * dt;
            e.sprite.y += Math.sin(a) * aiSpeed * 0.4 * dt;
          }
          break;
        }
        case 'chase': {
          const a = Math.atan2(py - ey, px - ex);
          e.sprite.x += Math.cos(a) * aiSpeed * dt;
          e.sprite.y += Math.sin(a) * aiSpeed * dt;
          break;
        }
        case 'attack': {
          if (time - e.lastAttackTime > 1200) {
            e.lastAttackTime = time;
            const dmg = e.components.stats?.damage ?? 10;
            this.playerTakeDamage(dmg);
          }
          break;
        }
      }

      e.sprite.x = PhaserMath.Clamp(e.sprite.x, 16, this.worldWidth - 16);
      e.sprite.y = PhaserMath.Clamp(e.sprite.y, 16, this.worldHeight - 16);

      // Update HP bar position
      this.updateEnemyHpBar(e);
    }
  }

  private updateEnemyHpBar(e: RPGEntity): void {
    const hpFill = e.components._hpFill as GameObjects.Rectangle | undefined;
    const hpBg = e.components._hpBg as GameObjects.Rectangle | undefined;
    if (!hpFill || !hpBg || !e.sprite) return;
    const stats = e.components.stats || {};
    const ratio = (stats.hp ?? 30) / (stats.maxHp ?? 30);
    hpBg.setPosition(e.sprite.x, e.sprite.y - e.height / 2 - 8);
    hpFill.setPosition(e.sprite.x - (e.width * (1 - ratio)) / 2, e.sprite.y - e.height / 2 - 8);
    hpFill.width = e.width * ratio;
  }

  private playerTakeDamage(amount: number): void {
    if (this.playerState.invulnTimer > 0) return;
    this.playerState.hp = Math.max(0, this.playerState.hp - amount);
    this.playerState.invulnTimer = 500;
    this.spawnDmgNum(this.playerSprite.x, this.playerSprite.y - 20, `-${amount}`, '#ef4444');
    if (this.playerState.hp <= 0) {
      this.playerSprite.setFillStyle(0x333333);
      this.showMessage('💀 You have fallen...', 5000);
      this.time.delayedCall(3000, () => this.scene.restart());
    }
  }

  // ─── Collection ───

  private checkCollectibleOverlaps(): void {
    if (!this.playerSprite) return;
    const px = this.playerSprite.x, py = this.playerSprite.y;

    for (const [, e] of this.entities) {
      if (!e.alive || !e.sprite) continue;

      if (e.type === 'collectible') {
        if (this.dist(px, py, e.sprite.x, e.sprite.y) < 28) {
          e.alive = false;
          const c = e.components.collectible || {};
          const cType = c.type || 'gold';
          if (cType === 'rune') {
            this.playerState.runes.push(c.name || c.element || 'rune');
            this.playerState.mana = Math.min(this.playerState.maxMana, this.playerState.mana + (c.value ?? 10));
            this.playerState.score += c.value ?? 25;
            this.showMessage(`✨ ${c.name || 'Rune'}!`, 2000);
          } else if (cType === 'health') {
            this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 20);
          } else {
            this.playerState.score += c.value ?? 10;
          }
          const glow = (e as any)._glow;
          this.tweens?.add({
            targets: glow ? [e.sprite, glow] : [e.sprite],
            scaleX: 2, scaleY: 2, alpha: 0, duration: 300, ease: 'Cubic.easeOut',
            onComplete: () => { e.sprite?.destroy(); glow?.destroy(); },
          });
        }
      }

      if (e.type === 'item') {
        if (this.dist(px, py, e.sprite.x, e.sprite.y) < 28) {
          e.alive = false;
          const item = e.components.itemDrop || {};
          this.playerState.items.push({ id: item.itemId || e.id, name: item.name || 'Item', type: item.type || 'misc' });
          this.showMessage(`🎒 ${item.name || 'Item'}!`, 2500);
          if (item.itemId?.includes('sword')) {
            this.playerState.damage += 10;
            this.showMessage('⚔️ Attack +10!', 2500);
          }
          this.tweens?.add({
            targets: e.sprite, y: e.y - 30, alpha: 0, scaleX: 1.5, scaleY: 1.5,
            duration: 400, ease: 'Back.easeIn', onComplete: () => e.sprite?.destroy(),
          });
        }
      }

      // Contact damage from enemies
      if (e.type === 'enemy' && e.alive) {
        if (this.dist(px, py, e.sprite.x, e.sprite.y) < 24) {
          this.playerTakeDamage(e.components.stats?.damage ?? 5);
        }
      }
    }
  }

  // ─── Dialogue ───

  private openDialogue(treeId: string): void {
    const tree = this.dialogueTrees.get(treeId);
    if (!tree) return;
    this.dialogueActive = true;
    this.dialogueTreeId = treeId;
    this.showLine(tree, tree.startLineId || 'greeting');
  }

  private showLine(tree: any, lineId: string): void {
    const line = tree.lines[lineId];
    if (!line) { this.closeDialogue(); return; }
    this.dialogueLineId = lineId;

    const choices = line.choices || [];
    if (choices.length === 0) choices.push({ text: '(Close)', next: null });
    if (line.effect) this.applyEffect(line.effect);

    this.destroyDialogueUI();
    this.dialogueContainer = this.add.container(this.worldWidth / 2, this.worldHeight - 100).setDepth(100);

    const bg = this.add.rectangle(0, 0, this.worldWidth - 40, 20 + choices.length * 20 + 60, 0x0f172a, 0.95);
    bg.setStrokeStyle(2, 0x334155);
    this.dialogueContainer.add(bg);

    this.dialogueContainer.add(this.add.text(-this.worldWidth / 2 + 50, -40, line.portrait || '', { fontSize: '28px' }));
    this.dialogueContainer.add(this.add.text(-this.worldWidth / 2 + 90, -45, line.speaker || '', { fontSize: '14px', color: '#a78bfa', fontFamily: 'monospace', fontStyle: 'bold' }));
    this.dialogueContainer.add(this.add.text(-this.worldWidth / 2 + 90, -20, line.text || '', { fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace', wordWrap: { width: this.worldWidth - 200 } }));

    choices.forEach((ch: any, i: number) => {
      const t = this.add.text(-this.worldWidth / 2 + 90, 20 + i * 20, `[${i + 1}] ${ch.text}`, { fontSize: '12px', color: '#60a5fa', fontFamily: 'monospace' });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.pickChoice(choices, i));
      this.dialogueContainer!.add(t);
    });
  }

  private handleDialogueInput(): void {
    const tree = this.dialogueTrees.get(this.dialogueTreeId);
    if (!tree) return;
    const line = tree.lines[this.dialogueLineId];
    if (!line) return;
    const choices = line.choices || [{ text: 'Close', next: null }];

    for (let i = 0; i < Math.min(choices.length, 4); i++) {
      const keyName = ['', 'ONE', 'TWO', 'THREE', 'FOUR'][i + 1];
      if (PhaserInput.Keyboard.JustDown(this.keys[keyName])) { this.pickChoice(choices, i); return; }
    }
    if (choices.length <= 2 && (PhaserInput.Keyboard.JustDown(this.keys.SPACE) || PhaserInput.Keyboard.JustDown(this.keys.ENTER))) {
      this.pickChoice(choices, 0);
    }
  }

  private pickChoice(choices: any[], idx: number): void {
    const ch = choices[idx];
    if (!ch || ch.next === null || ch.next === undefined) { this.closeDialogue(); return; }
    if (ch.effect) this.applyEffect(ch.effect);
    const tree = this.dialogueTrees.get(this.dialogueTreeId);
    if (tree) this.showLine(tree, ch.next);
  }

  private applyEffect(effect: any): void {
    if (!effect) return;
    if (effect.type === 'startQuest') {
      const q = this.questDefs.find((q: any) => q.id === effect.payload?.questId);
      if (q) {
        this.playerState.activeQuests.push({
          id: q.id, name: q.name,
          objectives: q.objectives.map((o: any) => ({ id: o.id, type: o.type, targetId: o.targetId, current: 0, required: o.requiredCount })),
        });
        this.showMessage(`📜 Quest: ${q.name}`, 3000);
      }
    }
    if (effect.type === 'heal') {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + (effect.payload?.amount ?? 25));
      this.showMessage(`💚 +${effect.payload?.amount ?? 25} HP`, 2000);
    }
  }

  private closeDialogue(): void { this.dialogueActive = false; this.destroyDialogueUI(); }
  private destroyDialogueUI(): void { this.dialogueContainer?.destroy(true); this.dialogueContainer = null; }

  // ─── Quest ───

  private updateQuestProgress(type: string, targetId: string): void {
    for (const q of this.playerState.activeQuests) {
      for (const o of q.objectives) {
        if (o.type === type && o.targetId === targetId) {
          o.current++;
          if (o.current >= o.required) this.showMessage(`✅ ${q.name}`, 3000);
          if (q.objectives.every(o => o.current >= o.required)) {
            this.playerState.score += 100;
            this.showMessage(`🎉 Quest done: ${q.name}! +100`, 4000);
          }
        }
      }
    }
  }

  // ─── UI ───

  private createUI(): void {
    const barW = 140, barH = 12, ux = 14, uy = 14;
    this.hpBarBg = this.add.rectangle(ux + barW / 2, uy, barW, barH, 0x1e1e2e).setOrigin(0.5).setDepth(50).setScrollFactor(0);
    this.hpBar = this.add.rectangle(ux + barW / 2, uy, barW, barH, 0x22c55e).setOrigin(0.5).setDepth(51).setScrollFactor(0);
    this.manaBar = this.add.rectangle(ux + barW / 2, uy + 18, barW, barH, 0x1e1e2e).setOrigin(0.5).setDepth(50).setScrollFactor(0);
    this.add.rectangle(ux + barW / 2, uy + 18, barW, barH, 0x1e1e2e).setOrigin(0.5).setDepth(50).setScrollFactor(0);
    this.manaBar = this.add.rectangle(ux + barW / 2, uy + 18, barW, barH, 0x3b82f6).setOrigin(0.5).setDepth(51).setScrollFactor(0);
    this.scoreText = this.add.text(ux, uy + 34, 'Score: 0', { fontSize: '12px', color: '#fbbf24', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.runeDisplay = this.add.text(ux, uy + 50, 'Runes: none', { fontSize: '11px', color: '#a78bfa', fontFamily: 'monospace' }).setDepth(50).setScrollFactor(0);
    this.questText = this.add.text(this.worldWidth - 14, uy + 14, '', { fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', align: 'right' }).setOrigin(1, 0).setDepth(50).setScrollFactor(0);
    this.messageText = this.add.text(this.worldWidth / 2, this.worldHeight - 30, '', { fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace', backgroundColor: '#0f172acc', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(60).setScrollFactor(0).setVisible(false);
  }

  private updateUI(): void {
    const hpR = this.playerState.hp / this.playerState.maxHp;
    const manaR = this.playerState.mana / this.playerState.maxMana;
    this.hpBar.width = 140 * hpR;
    this.hpBar.fillColor = hpR > 0.5 ? 0x22c55e : hpR > 0.25 ? 0xfbbf24 : 0xef4444;
    this.manaBar.width = 140 * manaR;
    this.scoreText.setText(`Score: ${this.playerState.score}`);
    this.runeDisplay.setText(`Runes: ${this.playerState.runes.length ? this.playerState.runes.join(', ') : 'none'}`);
    if (this.playerState.activeQuests.length) {
      this.questText.setText(this.playerState.activeQuests.map(q => {
        const o = q.objectives[0];
        return `📜 ${q.name}: ${o.current}/${o.required}`;
      }).join('\n'));
    }
  }

  // ─── Helpers ───

  private showMessage(text: string, dur: number): void {
    if (!this.messageText) return;
    this.messageText.setText(text).setVisible(true);
    this.messageTimer = dur;
  }

  private spawnDmgNum(x: number, y: number, val: string, color: string): void {
    const t = this.add.text(x, y, val, { fontSize: '14px', color, fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setDepth(60);
    this.damageNumbers.push({ text: t, vy: -60, life: 800 });
  }

  private updateDamageNumbers(delta: number): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.life -= delta;
      d.text.y += d.vy * (delta / 1000);
      d.text.alpha = Math.max(0, d.life / 800);
      if (d.life <= 0) { d.text.destroy(); this.damageNumbers.splice(i, 1); }
    }
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  private randTarget(ox: number, oy: number, range: number): { x: number; y: number } {
    return {
      x: PhaserMath.Clamp(ox + (Math.random() - 0.5) * range * 2, 20, this.worldWidth - 20),
      y: PhaserMath.Clamp(oy + (Math.random() - 0.5) * range * 2, 20, this.worldHeight - 20),
    };
  }

  private rectOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
}
