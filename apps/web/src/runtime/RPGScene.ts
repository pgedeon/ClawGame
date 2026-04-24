/**
 * RPGScene — Full game logic for the Eclipse of Runes RPG
 * Phaser 4 scene with WASD movement, enemy AI, combat, NPC dialogue,
 * rune collection, items, health/mana, and quest tracking.
 */
import { Scene, GameObjects, Physics, Input } from 'phaser';
import { ClawgamePhaserScene } from '../../../../packages/phaser-runtime/src';
import type { PhaserPreviewBootstrap } from '../../../../packages/phaser-runtime/src/types';

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
  body?: Physics.Arcade.Body;
  alive: boolean;
  // Enemy AI state
  aiState?: 'idle' | 'patrol' | 'chase' | 'attack' | 'retreat';
  aiTimer?: number;
  patrolOrigin?: { x: number; y: number };
  patrolTarget?: { x: number; y: number };
  lastAttackTime?: number;
  // NPC state
  dialogueTreeId?: string;
  interacted?: boolean;
}

interface PlayerState {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  score: number;
  runes: string[];
  items: { id: string; name: string; description: string; type: string; value: number }[];
  damage: number;
  speed: number;
  attackCooldown: number;
  lastAttackTime: number;
  invulnTimer: number;
  activeQuests: { id: string; name: string; objectives: { id: string; type: string; targetId: string; current: number; required: number }[] }[];
}

interface DialogueState {
  active: boolean;
  treeId: string;
  currentLineId: string;
  speaker: string;
  portrait: string;
  text: string;
  choices: { text: string; next: string | null; effect?: any }[];
}

export class RPGScene extends ClawgamePhaserScene {
  // Player
  private playerSprite!: GameObjects.Rectangle;
  private playerBody!: Physics.Arcade.Body;
  private playerState: PlayerState = {
    hp: 100, maxHp: 100, mana: 100, maxMana: 100, score: 0,
    runes: [], items: [], damage: 15, speed: 250,
    attackCooldown: 400, lastAttackTime: 0, invulnTimer: 0,
    activeQuests: [],
  };

  // Input
  private cursors!: { W: Input.Keyboard.Key; A: Input.Keyboard.Key; S: Input.Keyboard.Key; D: Input.Keyboard.Key; J: Input.Keyboard.Key; E: Input.Keyboard.Key; SPACE: Input.Keyboard.Key; K: Input.Keyboard.Key; };
  private wasd!: { W: Input.Keyboard.Key; A: Input.Keyboard.Key; S: Input.Keyboard.Key; D: Input.Keyboard.Key; };

  // Entities
  private entities: Map<string, RPGEntity> = new Map();
  private enemyGroup!: Physics.Arcade.StaticGroup;
  private collectibleGroup!: Phaser.GameObjects.Group;
  private wallGroup!: Physics.Arcade.StaticGroup;
  private npcSprites: Map<string, GameObjects.Rectangle> = new Map();

  // Dialogue
  private dialogue: DialogueState = { active: false, treeId: '', currentLineId: '', speaker: '', portrait: '', text: '', choices: [] };
  private dialogueTrees: Map<string, any> = new Map();
  private dialogueContainer!: GameObjects.Container;
  private dialogueBg!: GameObjects.Rectangle;
  private dialogueText!: GameObjects.Text;
  private dialogueChoiceTexts: GameObjects.Text[] = [];
  private dialoguePortrait!: GameObjects.Text;

  // UI
  private hpBar!: GameObjects.Rectangle;
  private hpBarBg!: GameObjects.Rectangle;
  private manaBar!: GameObjects.Rectangle;
  private manaBarBg!: GameObjects.Rectangle;
  private scoreText!: GameObjects.Text;
  private runeDisplay!: GameObjects.Text;
  private questText!: GameObjects.Text;
  private messageText!: GameObjects.Text;
  private messageTimer: number = 0;

  // Combat visuals
  private attackArc!: GameObjects.Arc;
  private damageNumbers: { text: GameObjects.Text; vy: number; life: number }[] = [];

  // Quest data from scene
  private questDefs: any[] = [];
  private killCounts: Map<string, number> = new Map();

  // Raw scene data
  private rawSceneData: any;

  constructor() { super('rpg'); }

  init(_opts?: any): void {
    // Reset state
    this.entities.clear();
    this.npcSprites.clear();
    this.dialogueTrees.clear();
    this.killCounts.clear();
    this.playerState = {
      hp: 100, maxHp: 100, mana: 100, maxMana: 100, score: 0,
      runes: [], items: [], damage: 15, speed: 250,
      attackCooldown: 400, lastAttackTime: 0, invulnTimer: 0,
      activeQuests: [],
    };
    this.questDefs = [];
    this.dialogue = { active: false, treeId: '', currentLineId: '', speaker: '', portrait: '', text: '', choices: [] };
    this.damageNumbers = [];
  }

  create(): void {
    super.create();
    if (!this.bootstrap) return;

    // Grab raw scene data
    this.rawSceneData = (this.bootstrap as any)._rawSceneData || {};
    const { width, height } = this.bootstrap.bounds || { width: 800, height: 600 };

    // Load dialogue trees from scene data
    if (this.rawSceneData.dialogueTrees) {
      for (const tree of this.rawSceneData.dialogueTrees) {
        this.dialogueTrees.set(tree.id, tree);
      }
    }

    // Load quest definitions
    if (this.rawSceneData.quests) {
      this.questDefs = this.rawSceneData.quests;
    }

    // Set world bounds
    this.physics.world.setBounds(0, 0, width, height);

    // Create groups
    this.enemyGroup = this.physics.add.staticGroup();
    this.collectibleGroup = this.add.group();
    this.wallGroup = this.physics.add.staticGroup();

    // Create entities from bootstrap
    for (const entity of this.bootstrap.entities) {
      this.createEntity(entity);
    }

    // Setup keyboard
    if (this.input.keyboard) {
      this.wasd = {
        W: this.input.keyboard.addKey('W'),
        A: this.input.keyboard.addKey('A'),
        S: this.input.keyboard.addKey('S'),
        D: this.input.keyboard.addKey('D'),
      };
      this.cursors = {
        ...this.wasd,
        J: this.input.keyboard.addKey('J'),
        E: this.input.keyboard.addKey('E'),
        SPACE: this.input.keyboard.addKey('SPACE'),
        K: this.input.keyboard.addKey('K'),
      };
    }

    // Collisions: player vs enemies
    this.physics.add.overlap(this.playerSprite, this.enemyGroup, (_obj1, _obj2) => {
      this.onPlayerHitEnemy(_obj2 as GameObjects.Rectangle);
    });

    // Collisions: player vs walls
    this.physics.add.collider(this.playerSprite, this.wallGroup);

    // Create UI
    this.createUI(width, height);

    // Create attack arc (hidden by default)
    this.attackArc = this.add.circle(0, 0, 24, 0xffffff, 0.3);
    this.attackArc.setStrokeStyle(2, 0xffffff, 0.6);
    this.attackArc.setVisible(false);
    this.attackArc.setDepth(15);

    // Show welcome message
    this.showMessage('🎮 WASD to move • E interact • J attack • K use potion', 5000);
  }

  update(time: number, delta: number): void {
    if (!this.playerSprite || this.playerState.hp <= 0) return;

    // Dialogue mode: freeze player
    if (this.dialogue.active) {
      this.handleDialogueInput();
      this.playerBody.setVelocity(0, 0);
      return;
    }

    // Player movement
    let vx = 0, vy = 0;
    if (this.wasd.A.isDown) vx -= 1;
    if (this.wasd.D.isDown) vx += 1;
    if (this.wasd.W.isDown) vy -= 1;
    if (this.wasd.S.isDown) vy += 1;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.playerBody.setVelocity(vx * this.playerState.speed, vy * this.playerState.speed);

    // Attack
    if (Phaser.Input.Keyboard.JustDown(this.cursors.J)) {
      this.performAttack(time);
    }

    // Interact (E key)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.E)) {
      this.tryInteract();
    }

    // Use potion (K key)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.K)) {
      this.usePotion();
    }

    // Quest tracker (J key handled in separate quest UI)

    // Update invulnerability
    if (this.playerState.invulnTimer > 0) {
      this.playerState.invulnTimer -= delta;
      // Flash effect
      this.playerSprite.setAlpha(Math.sin(time * 0.02) > 0 ? 1 : 0.3);
    } else {
      this.playerSprite.setAlpha(1);
    }

    // Update enemies
    this.updateEnemies(time, delta);

    // Update attack arc visibility
    if (this.attackArc.visible && time - this.playerState.lastAttackTime > 200) {
      this.attackArc.setVisible(false);
    }

    // Update damage numbers
    this.updateDamageNumbers(delta);

    // Update message timer
    if (this.messageTimer > 0) {
      this.messageTimer -= delta;
      if (this.messageTimer <= 0 && this.messageText) {
        this.messageText.setVisible(false);
      }
    }

    // Update UI
    this.updateUI();
  }

  // ─── Entity Creation ───

  protected createEntity(data: any): void {
    const x = data.x ?? data.transform?.x ?? 0;
    const y = data.y ?? data.transform?.y ?? 0;
    const w = data.width ?? data.components?.sprite?.width ?? 32;
    const h = data.height ?? data.components?.sprite?.height ?? 32;
    const color = this.parseColor(data.color ?? data.components?.sprite?.color ?? '#ffffff');
    const type = data.type || 'unknown';

    if (type === 'player') {
      this.playerSprite = this.add.rectangle(x, y, w, h, color);
      this.playerSprite.setDepth(10);
      this.physics.add.existing(this.playerSprite);
      this.playerBody = this.playerSprite.body as Physics.Arcade.Body;
      this.playerBody.setCollideWorldBounds(true);
      this.playerBody.setSize(w, h);

      // Apply stats from scene data
      const stats = data.components?.stats;
      if (stats) {
        this.playerState.hp = stats.hp ?? 100;
        this.playerState.maxHp = stats.maxHp ?? 100;
      }
      const movement = data.components?.movement;
      if (movement?.speed) this.playerState.speed = movement.speed;

      return;
    }

    if (type === 'enemy') {
      const sprite = this.add.rectangle(x, y, w, h, color);
      sprite.setDepth(8);
      this.physics.add.existing(sprite);
      const body = sprite.body as Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setSize(w, h);

      const aiData = data.components?.ai || {};
      const entity: RPGEntity = {
        id: data.id, type, x, y, width: w, height: h,
        color: data.components?.sprite?.color || '#ef4444',
        components: data.components || {},
        sprite, body, alive: true,
        aiState: 'patrol',
        aiTimer: 0,
        patrolOrigin: { x, y },
        patrolTarget: this.randomPatrolTarget(x, y),
        lastAttackTime: 0,
      };

      this.entities.set(data.id, entity);
      this.enemyGroup.add(sprite, true);
      return;
    }

    if (type === 'npc') {
      const sprite = this.add.rectangle(x, y, w, h, color);
      sprite.setDepth(8);
      // Add name label above NPC
      const npcData = data.components?.npc || {};
      const nameText = this.add.text(x, y - 24, npcData.name || 'NPC', {
        fontSize: '11px', color: '#e2e8f0', fontFamily: 'monospace',
        backgroundColor: '#1e293bcc', padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(12);

      // Interaction indicator
      const indicator = this.add.text(x, y - 38, '💬', { fontSize: '14px' })
        .setOrigin(0.5).setDepth(12);

      this.npcSprites.set(data.id, sprite);

      const entity: RPGEntity = {
        id: data.id, type, x, y, width: w, height: h, color: data.components?.sprite?.color || '#a78bfa',
        components: data.components || {},
        sprite, alive: true,
        dialogueTreeId: npcData.dialogueTreeId,
      };
      this.entities.set(data.id, entity);

      // Float animation for indicator
      this.tweens?.add({
        targets: indicator, y: y - 42, duration: 800,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      return;
    }

    if (type === 'collectible') {
      const collectData = data.components?.collectible || {};
      const sprite = this.add.rectangle(x, y, w, h, color);
      sprite.setDepth(5);

      // Glow effect
      const glow = this.add.circle(x, y, w * 0.8, color, 0.15);
      glow.setDepth(4);
      this.tweens?.add({
        targets: glow, scaleX: 1.4, scaleY: 1.4, alpha: 0.05,
        duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      const entity: RPGEntity = {
        id: data.id, type, x, y, width: w, height: h,
        color: data.components?.sprite?.color || '#fbbf24',
        components: data.components || {},
        sprite, alive: true,
      };
      this.entities.set(data.id, entity);

      // Overlap detection with player
      this.physics.add.existing(sprite);
      const body = sprite.body as Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setSize(w, h);
      this.physics.add.overlap(this.playerSprite, sprite, () => {
        this.onCollectItem(entity, glow);
      });
      return;
    }

    if (type === 'item') {
      const itemData = data.components?.itemDrop || {};
      const sprite = this.add.rectangle(x, y, w ?? 20, h ?? 20, color);
      sprite.setDepth(5);
      // Float animation
      this.tweens?.add({
        targets: sprite, y: y - 6, duration: 1200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      const entity: RPGEntity = {
        id: data.id, type, x, y, width: w ?? 20, height: h ?? 20,
        color: data.components?.sprite?.color || '#fbbf24',
        components: data.components || {},
        sprite, alive: true,
      };
      this.entities.set(data.id, entity);

      this.physics.add.existing(sprite);
      const body = sprite.body as Physics.Arcade.Body;
      body.setAllowGravity(false);
      this.physics.add.overlap(this.playerSprite, sprite, () => {
        this.onPickupItem(entity);
      });
      return;
    }

    if (type === 'obstacle') {
      const sprite = this.add.rectangle(x, y, w, h, color);
      sprite.setDepth(3);
      this.physics.add.existing(sprite, true); // static
      this.wallGroup.add(sprite);
      return;
    }
  }

  // ─── Player Actions ───

  private performAttack(time: number): void {
    if (time - this.playerState.lastAttackTime < this.playerState.attackCooldown) return;
    this.playerState.lastAttackTime = time;

    const px = this.playerSprite.x;
    const py = this.playerSprite.y;

    // Show attack arc
    this.attackArc.setPosition(px, py);
    this.attackArc.setVisible(true);

    // Check for enemies in range
    const attackRange = 48;
    for (const [id, entity] of this.entities) {
      if (entity.type !== 'enemy' || !entity.alive || !entity.sprite) continue;
      const dist = Phaser.Math.Distance.Between(px, py, entity.sprite.x, entity.sprite.y);
      if (dist < attackRange) {
        const stats = entity.components.stats || {};
        const enemyHp = stats.hp ?? 30;
        const newHp = enemyHp - this.playerState.damage;

        if (newHp <= 0) {
          this.killEnemy(id, entity);
        } else {
          stats.hp = newHp;
          this.spawnDamageNumber(entity.sprite.x, entity.sprite.y - 20, this.playerState.damage, '#fbbf24');
          // Knockback
          const angle = Phaser.Math.Angle.Between(px, py, entity.sprite.x, entity.sprite.y);
          if (entity.body) {
            entity.body.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
          }
          // Flash red
          entity.sprite.setFillStyle(0xffffff);
          this.time.delayedCall(80, () => {
            if (entity.sprite && entity.alive) entity.sprite.setFillStyle(this.parseColor(entity.color));
          });
        }
      }
    }

    // Mana regen on attack
    this.playerState.mana = Math.min(this.playerState.maxMana, this.playerState.mana + 2);
  }

  private killEnemy(id: string, entity: RPGEntity): void {
    entity.alive = false;
    const enemyType = entity.components.enemyType || entity.id;
    const score = entity.components.stats?.score ?? 10;
    this.playerState.score += score;
    this.spawnDamageNumber(entity.sprite!.x, entity.sprite!.y - 20, '💀', '#ef4444');

    // Track kill for quests
    const current = this.killCounts.get(enemyType) ?? 0;
    this.killCounts.set(enemyType, current + 1);

    // Update quest progress
    this.updateQuestProgress('kill', enemyType);

    // Death animation
    this.tweens?.add({
      targets: entity.sprite, scaleX: 0.1, scaleY: 0.1, alpha: 0,
      duration: 300, ease: 'Back.easeIn', onComplete: () => {
        entity.sprite?.destroy();
        // Drop item sometimes
        if (Math.random() < 0.3) {
          this.spawnDrop(entity.x, entity.y);
        }
      },
    });

    // Remove from physics
    if (entity.body) {
      this.enemyGroup.remove(entity.sprite!);
    }
  }

  private spawnDrop(x: number, y: number): void {
    const colors = ['#22c55e', '#3b82f6', '#fbbf24'];
    const types = ['health', 'mana', 'gold'];
    const idx = Math.floor(Math.random() * 3);
    const drop = this.add.circle(x, y, 6, this.parseColor(colors[idx]));
    drop.setDepth(6);
    this.tweens?.add({
      targets: drop, y: y - 30, alpha: 0, duration: 1500,
      ease: 'Cubic.easeOut', onComplete: () => drop.destroy(),
    });
    // Give instant reward
    if (types[idx] === 'health') this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 10);
    if (types[idx] === 'mana') this.playerState.mana = Math.min(this.playerState.maxMana, this.playerState.mana + 15);
    if (types[idx] === 'gold') this.playerState.score += 5;
  }

  private tryInteract(): void {
    const px = this.playerSprite.x;
    const py = this.playerSprite.y;

    for (const [id, entity] of this.entities) {
      if (entity.type !== 'npc' || !entity.alive) continue;
      const dist = Phaser.Math.Distance.Between(px, py, entity.x, entity.y);
      if (dist < 60) {
        this.openDialogue(entity);
        return;
      }
    }
  }

  private usePotion(): void {
    const potionIdx = this.playerState.items.findIndex(i => i.type === 'potion' || i.id.includes('potion'));
    if (potionIdx === -1) {
      this.showMessage('No potions in inventory!', 2000);
      return;
    }
    const potion = this.playerState.items.splice(potionIdx, 1)[0];
    this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 25);
    this.spawnDamageNumber(this.playerSprite.x, this.playerSprite.y - 20, '+25', '#22c55e');
    this.showMessage(`Used ${potion.name}! HP restored.`, 2000);
  }

  // ─── Enemy AI ───

  private updateEnemies(time: number, delta: number): void {
    for (const [id, entity] of this.entities) {
      if (entity.type !== 'enemy' || !entity.alive || !entity.sprite || !entity.body) continue;

      const ex = entity.sprite.x;
      const ey = entity.sprite.y;
      const px = this.playerSprite.x;
      const py = this.playerSprite.y;
      const distToPlayer = Phaser.Math.Distance.Between(ex, ey, px, py);

      const aiType = entity.components.ai?.type || 'patrol';
      const aiSpeed = entity.components.ai?.speed || entity.components.movement?.speed || 80;
      const chaseRange = 200;
      const attackRange = 36;
      const attackCooldown = 1200;

      // State machine
      if (distToPlayer < chaseRange && aiType !== 'idle') {
        entity.aiState = 'chase';
      } else if (entity.aiState === 'chase' && distToPlayer > chaseRange * 1.5) {
        entity.aiState = 'patrol';
      }

      switch (entity.aiState) {
        case 'patrol': {
          const target = entity.patrolTarget!;
          const distToTarget = Phaser.Math.Distance.Between(ex, ey, target.x, target.y);
          if (distToTarget < 10) {
            entity.patrolTarget = this.randomPatrolTarget(entity.patrolOrigin!.x, entity.patrolOrigin!.y, 120);
          } else {
            const angle = Phaser.Math.Angle.Between(ex, ey, target.x, target.y);
            entity.body!.setVelocity(Math.cos(angle) * aiSpeed * 0.5, Math.sin(angle) * aiSpeed * 0.5);
          }
          break;
        }

        case 'chase': {
          if (distToPlayer < attackRange) {
            entity.aiState = 'attack';
          } else {
            const angle = Phaser.Math.Angle.Between(ex, ey, px, py);
            entity.body!.setVelocity(Math.cos(angle) * aiSpeed, Math.sin(angle) * aiSpeed);
          }
          break;
        }

        case 'attack': {
          entity.body!.setVelocity(0, 0);
          if (time - (entity.lastAttackTime ?? 0) > attackCooldown) {
            entity.lastAttackTime = time;
            const dmg = entity.components.stats?.damage ?? 10;
            this.playerTakeDamage(dmg);
          }
          if (distToPlayer > attackRange * 1.5) {
            entity.aiState = 'chase';
          }
          break;
        }

        case 'idle':
        default:
          entity.body!.setVelocity(0, 0);
          break;
      }

      // Keep enemies in bounds
      entity.sprite.x = Phaser.Math.Clamp(entity.sprite.x, 16, (this.bootstrap?.bounds?.width ?? 800) - 16);
      entity.sprite.y = Phaser.Math.Clamp(entity.sprite.y, 16, (this.bootstrap?.bounds?.height ?? 600) - 16);
    }
  }

  private playerTakeDamage(amount: number): void {
    if (this.playerState.invulnTimer > 0) return;
    this.playerState.hp = Math.max(0, this.playerState.hp - amount);
    this.playerState.invulnTimer = 500;
    this.spawnDamageNumber(this.playerSprite.x, this.playerSprite.y - 20, `-${amount}`, '#ef4444');

    if (this.playerState.hp <= 0) {
      this.playerDeath();
    }
  }

  private onPlayerHitEnemy(enemySprite: GameObjects.Rectangle): void {
    // Contact damage (throttled by invulnerability)
    for (const [, entity] of this.entities) {
      if (entity.sprite === enemySprite && entity.alive) {
        const dmg = entity.components.stats?.damage ?? 5;
        this.playerTakeDamage(dmg);
        break;
      }
    }
  }

  private playerDeath(): void {
    this.playerSprite.setFillStyle(0x333333);
    this.showMessage('💀 You have fallen! The darkness claims another soul...', 5000);
    // Restart after delay
    this.time.delayedCall(3000, () => {
      this.scene.restart();
    });
  }

  // ─── Collection & Items ───

  private onCollectItem(entity: RPGEntity, glow: GameObjects.Arc): void {
    if (!entity.alive) return;
    entity.alive = false;
    const collectData = entity.components.collectible || {};
    const collectType = collectData.type || 'gold';

    if (collectType === 'rune') {
      this.playerState.runes.push(collectData.name || collectData.element || 'rune');
      this.playerState.mana = Math.min(this.playerState.maxMana, this.playerState.mana + (collectData.value ?? 10));
      this.playerState.score += collectData.value ?? 25;
      this.showMessage(`✨ Collected ${collectData.name || 'Rune'}!`, 2000);
    } else if (collectType === 'health') {
      this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + 20);
      this.showMessage('❤️ Health restored!', 1500);
    } else if (collectType === 'gold') {
      this.playerState.score += collectData.value ?? 10;
    }

    // Collect animation
    this.tweens?.add({
      targets: [entity.sprite, glow], scaleX: 2, scaleY: 2, alpha: 0,
      duration: 300, ease: 'Cubic.easeOut', onComplete: () => {
        entity.sprite?.destroy();
        glow.destroy();
      },
    });
  }

  private onPickupItem(entity: RPGEntity): void {
    if (!entity.alive) return;
    entity.alive = false;
    const itemData = entity.components.itemDrop || {};
    this.playerState.items.push({
      id: itemData.itemId || entity.id,
      name: itemData.name || 'Unknown Item',
      description: itemData.description || '',
      type: itemData.type || 'misc',
      value: itemData.value || 0,
    });
    this.showMessage(`🎒 Found ${itemData.name || 'item'}!`, 2500);

    // Items might increase stats
    if (itemData.itemId?.includes('sword')) {
      this.playerState.damage += 10;
      this.showMessage('⚔️ Attack power increased!', 2500);
    }

    this.tweens?.add({
      targets: entity.sprite, y: entity.y - 30, alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 400, ease: 'Back.easeIn', onComplete: () => entity.sprite?.destroy(),
    });
  }

  // ─── Dialogue System ───

  private openDialogue(entity: RPGEntity): void {
    const treeId = entity.dialogueTreeId;
    if (!treeId) return;
    const tree = this.dialogueTrees.get(treeId);
    if (!tree) return;

    this.dialogue.active = true;
    this.dialogue.treeId = treeId;
    this.dialogue.currentLineId = tree.startLineId || 'greeting';
    this.showDialogueLine(tree, this.dialogue.currentLineId);
  }

  private showDialogueLine(tree: any, lineId: string): void {
    const line = tree.lines[lineId];
    if (!line) { this.closeDialogue(); return; }

    this.dialogue.currentLineId = lineId;
    this.dialogue.speaker = line.speaker || '';
    this.dialogue.portrait = line.portrait || '';
    this.dialogue.text = line.text || '';
    this.dialogue.choices = line.choices || [];

    if (!line.choices || line.choices.length === 0) {
      // Terminal line — add "Close" choice
      this.dialogue.choices = [{ text: '(Close)', next: null }];
      // Apply effect if present
      if (line.effect) this.applyDialogueEffect(line.effect);
    }

    this.renderDialogue();
  }

  private renderDialogue(): void {
    // Remove old dialogue UI
    this.destroyDialogueUI();

    const width = this.bootstrap?.bounds?.width ?? 800;
    const height = this.bootstrap?.bounds?.height ?? 600;

    this.dialogueContainer = this.add.container(width / 2, height - 100);
    this.dialogueContainer.setDepth(100);

    this.dialogueBg = this.add.rectangle(0, 0, width - 40, 140, 0x0f172a, 0.95);
    this.dialogueBg.setStrokeStyle(2, 0x334155);
    this.dialogueContainer.add(this.dialogueBg);

    // Portrait
    this.dialoguePortrait = this.add.text(-width / 2 + 50, -40, this.dialogue.portrait, {
      fontSize: '32px',
    });
    this.dialogueContainer.add(this.dialoguePortrait);

    // Speaker name
    const speakerText = this.add.text(-width / 2 + 90, -45, this.dialogue.speaker, {
      fontSize: '14px', color: '#a78bfa', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.dialogueContainer.add(speakerText);

    // Dialogue text
    this.dialogueText = this.add.text(-width / 2 + 90, -20, this.dialogue.text, {
      fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace', wordWrap: { width: width - 180 },
    });
    this.dialogueContainer.add(this.dialogueText);

    // Choices
    this.dialogueChoiceTexts = [];
    this.dialogue.choices.forEach((choice, idx) => {
      const ct = this.add.text(-width / 2 + 90, 25 + idx * 20, `[${idx + 1}] ${choice.text}`, {
        fontSize: '12px', color: '#60a5fa', fontFamily: 'monospace',
      });
      ct.setInteractive({ useHandCursor: true });
      ct.on('pointerdown', () => this.selectDialogueChoice(idx));
      this.dialogueContainer.add(ct);
      this.dialogueChoiceTexts.push(ct);
    });
  }

  private handleDialogueInput(): void {
    for (let i = 0; i < this.dialogue.choices.length; i++) {
      const key = String(i + 1);
      if (this.input.keyboard && Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(key))) {
        this.selectDialogueChoice(i);
        return;
      }
    }
    // Space/Enter advances to choice 1 if only one option
    if (this.dialogue.choices.length === 1) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.SPACE) || Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey('ENTER'))) {
        this.selectDialogueChoice(0);
      }
    }
  }

  private selectDialogueChoice(idx: number): void {
    const choice = this.dialogue.choices[idx];
    if (!choice) return;

    if (choice.next === null || choice.next === undefined) {
      this.closeDialogue();
      return;
    }

    // Apply effect if present
    if (choice.effect) this.applyDialogueEffect(choice.effect);

    const tree = this.dialogueTrees.get(this.dialogue.treeId);
    if (tree) this.showDialogueLine(tree, choice.next);
  }

  private applyDialogueEffect(effect: any): void {
    if (!effect) return;
    switch (effect.type) {
      case 'startQuest': {
        const questId = effect.payload?.questId;
        const questDef = this.questDefs.find(q => q.id === questId);
        if (questDef) {
          this.playerState.activeQuests.push({
            id: questDef.id,
            name: questDef.name,
            objectives: questDef.objectives.map((o: any) => ({
              id: o.id, type: o.type, targetId: o.targetId, current: 0, required: o.requiredCount,
            })),
          });
          this.showMessage(`📜 Quest started: ${questDef.name}`, 3000);
        }
        break;
      }
      case 'heal':
        this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + (effect.payload?.amount ?? 25));
        this.showMessage(`💚 Healed for ${effect.payload?.amount ?? 25} HP!`, 2000);
        break;
    }
  }

  private closeDialogue(): void {
    this.dialogue.active = false;
    this.destroyDialogueUI();
  }

  private destroyDialogueUI(): void {
    if (this.dialogueContainer) {
      this.dialogueContainer.destroy(true);
      this.dialogueContainer = null as any;
    }
    this.dialogueChoiceTexts = [];
  }

  // ─── Quest Tracking ───

  private updateQuestProgress(type: string, targetId: string): void {
    for (const quest of this.playerState.activeQuests) {
      for (const obj of quest.objectives) {
        if (obj.type === type && obj.targetId === targetId) {
          obj.current++;
          if (obj.current >= obj.required) {
            this.showMessage(`✅ Objective complete: ${quest.name}`, 3000);
            // Check if all objectives done
            if (quest.objectives.every(o => o.current >= o.required)) {
              this.playerState.score += 100;
              this.showMessage(`🎉 Quest complete: ${quest.name}! +100 score`, 4000);
            }
          }
        }
      }
    }
  }

  // ─── UI ───

  private createUI(width: number, height: number): void {
    const barWidth = 140;
    const barHeight = 12;
    const uiX = 14;
    const uiY = 14;

    // HP bar
    this.hpBarBg = this.add.rectangle(uiX + barWidth / 2, uiY, barWidth, barHeight, 0x1e1e2e);
    this.hpBarBg.setOrigin(0.5).setDepth(50).setScrollFactor(0);
    this.hpBar = this.add.rectangle(uiX + barWidth / 2, uiY, barWidth, barHeight, 0x22c55e);
    this.hpBar.setOrigin(0.5).setDepth(51).setScrollFactor(0);

    // Mana bar
    this.manaBarBg = this.add.rectangle(uiX + barWidth / 2, uiY + 18, barWidth, barHeight, 0x1e1e2e);
    this.manaBarBg.setOrigin(0.5).setDepth(50).setScrollFactor(0);
    this.manaBar = this.add.rectangle(uiX + barWidth / 2, uiY + 18, barWidth, barHeight, 0x3b82f6);
    this.manaBar.setOrigin(0.5).setDepth(51).setScrollFactor(0);

    // Score
    this.scoreText = this.add.text(uiX, uiY + 34, 'Score: 0', {
      fontSize: '12px', color: '#fbbf24', fontFamily: 'monospace',
    }).setDepth(50).setScrollFactor(0);

    // Runes
    this.runeDisplay = this.add.text(uiX, uiY + 50, 'Runes: none', {
      fontSize: '11px', color: '#a78bfa', fontFamily: 'monospace',
    }).setDepth(50).setScrollFactor(0);

    // Quest tracker
    this.questText = this.add.text(width - 14, uiY + 14, '', {
      fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', align: 'right',
    }).setOrigin(1, 0).setDepth(50).setScrollFactor(0);

    // Message
    this.messageText = this.add.text(width / 2, height - 30, '', {
      fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace',
      backgroundColor: '#0f172acc', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0).setVisible(false);
  }

  private updateUI(): void {
    const hpRatio = this.playerState.hp / this.playerState.maxHp;
    const manaRatio = this.playerState.mana / this.playerState.maxMana;

    this.hpBar.width = 140 * hpRatio;
    this.hpBar.fillColor = hpRatio > 0.5 ? 0x22c55e : hpRatio > 0.25 ? 0xfbbf24 : 0xef4444;

    this.manaBar.width = 140 * manaRatio;

    this.scoreText.setText(`Score: ${this.playerState.score}`);
    this.runeDisplay.setText(`Runes: ${this.playerState.runes.length > 0 ? this.playerState.runes.join(', ') : 'none'}`);

    // Quest tracker
    if (this.playerState.activeQuests.length > 0) {
      const lines = this.playerState.activeQuests.map(q => {
        const obj = q.objectives[0];
        return `📜 ${q.name}: ${obj.current}/${obj.required}`;
      });
      this.questText.setText(lines.join('\n'));
    }
  }

  // ─── Helpers ───

  private showMessage(text: string, duration: number): void {
    if (!this.messageText) return;
    this.messageText.setText(text).setVisible(true);
    this.messageTimer = duration;
  }

  private spawnDamageNumber(x: number, y: number, value: string | number, color: string): void {
    const text = this.add.text(x, y, String(value), {
      fontSize: '14px', color, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60);
    this.damageNumbers.push({ text, vy: -60, life: 800 });
  }

  private updateDamageNumbers(delta: number): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= delta;
      dn.text.y += dn.vy * (delta / 1000);
      dn.text.alpha = Math.max(0, dn.life / 800);
      if (dn.life <= 0) {
        dn.text.destroy();
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  private randomPatrolTarget(ox: number, oy: number, range: number = 100): { x: number; y: number } {
    const w = this.bootstrap?.bounds?.width ?? 800;
    const h = this.bootstrap?.bounds?.height ?? 600;
    return {
      x: Phaser.Math.Clamp(ox + (Math.random() - 0.5) * range * 2, 20, w - 20),
      y: Phaser.Math.Clamp(oy + (Math.random() - 0.5) * range * 2, 20, h - 20),
    };
  }

  private parseColor(hex: string): number { return parseInt((hex || '#ffffff').replace('#', ''), 16); }
}
