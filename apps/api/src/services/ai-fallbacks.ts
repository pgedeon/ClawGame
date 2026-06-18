/**
 * @clawgame/api - AI Fallback Response Generators
 *
 * Extracted from realAIService.ts for maintainability.
 * These functions generate useful code snippets when the live AI is unavailable.
 */

import type { AICommandResponse } from './ai-types';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Local fallback (generates genuinely useful code) ──

export function generateFallbackResponse(command: string, projectContext: any): AICommandResponse {
  const lower = command.toLowerCase();
  const id = generateId();
  const project = projectContext.project || {};

  // Genre-aware fallback generation
  if (project.genre === 'strategy' && (lower.includes('tower') || lower.includes('defense'))) {
    return fallbackTowerDefense(command, id, projectContext);
  }

  // Detect intent and generate relevant code
  if (lower.includes('player') && (lower.includes('move') || lower.includes('control') || lower.includes('input'))) {
    return fallbackPlayerMovement(command, id, projectContext);
  }
  if (lower.includes('enemy') || lower.includes('ai')) {
    return fallbackEnemyAI(command, id, projectContext);
  }
  if (lower.includes('collect') || lower.includes('coin') || lower.includes('pickup') || lower.includes('item')) {
    return fallbackCollectible(command, id, projectContext);
  }
  if (lower.includes('platform') || lower.includes('ground') || lower.includes('level')) {
    return fallbackPlatform(command, id, projectContext);
  }
  if (lower.includes('jump') || lower.includes('double jump')) {
    return fallbackJump(command, id, projectContext);
  }
  if (lower.includes('shoot') || lower.includes('projectile') || lower.includes('bullet')) {
    return fallbackProjectile(command, id, projectContext);
  }
  if (lower.includes('health') || lower.includes('damage') || lower.includes('combat')) {
    return fallbackHealthSystem(command, id, projectContext);
  }
  if (lower.includes('scene') || lower.includes('level') || lower.includes('create')) {
    return fallbackSceneSetup(command, id, projectContext);
  }

  // Generic fallback
  return fallbackGeneric(command, id, projectContext);
}

export function fallbackTowerDefense(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Tower Defense Mechanics',
    content: `## Tower Defense System\n\nBased on your **Strategy** genre project, I've generated tower defense mechanics with grid placement, enemy waves, and gold system.\n\n\`\`\`typescript
// scripts/tower-defense.ts
import { Entity, System } from '../engine';

export interface TowerDefenseGame {
grid: number[][];
gold: number;
lives: number;
wave: number;
enemies: Enemy[];
towers: Tower[];
}

export interface Enemy {
id: string;
x: number;
y: number;
path: { x: number; y: number }[];
pathIndex: number;
health: number;
damage: number;
}

export interface Tower {
id: string;
x: number;
y: number;
range: number;
damage: number;
fireRate: number;
lastFire: number;
cost: number;
}

export class TowerDefenseSystem extends System {
private game: TowerDefenseGame;
private path: { x: number; y: number }[] = [
  { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 },
  { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
  { x: 5, y: 2 }, { x: 5, y: 1 }
];

constructor() {
  this.game = {
    grid: Array(8).fill(null).map(() => Array(6).fill(null)),
    gold: 100,
    lives: 20,
    wave: 1,
    enemies: [],
    towers: [],
  };
}

placeTower(gridX: number, gridY: number, towerType: 'basic' | 'sniper' | 'rapid'): boolean {
  const costs = { basic: 50, sniper: 100, rapid: 75 };
  const cost = costs[towerType];

  if (this.game.gold < cost) return false;
  if (this.game.grid[gridY][gridX] !== null) return false;

  this.game.gold -= cost;
  this.game.grid[gridY][gridX] = towerType;
  this.game.towers.push({
    id: \`tower-\${Date.now()}\`,
    x: gridX * 80 + 40,
    y: gridY * 80 + 40,
    range: towerType === 'sniper' ? 250 : towerType === 'rapid' ? 100 : 150,
    damage: towerType === 'sniper' ? 25 : towerType === 'rapid' ? 5 : 15,
    fireRate: towerType === 'rapid' ? 200 : 1000,
    lastFire: 0,
    cost,
  });
  return true;
}

spawnEnemy() {
  const enemy: Enemy = {
    id: \`enemy-\${Date.now()}\`,
    x: this.path[0].x * 80 + 40,
    y: this.path[0].y * 80 + 40,
    path: [...this.path],
    pathIndex: 0,
    health: 50 + this.game.wave * 10,
    damage: 10 + this.game.wave * 2,
  };
  this.game.enemies.push(enemy);
}

onUpdate(dt: number) {
  const now = Date.now();

  // Spawn enemies based on wave
  if (Math.random() < 0.02 * this.game.wave) {
    this.spawnEnemy();
  }

  // Update enemies
  for (const enemy of this.game.enemies) {
    if (enemy.health <= 0) continue;

    // Move along path
    const target = enemy.path[enemy.pathIndex + 1];
    if (target) {
      const dx = target.x * 80 + 40 - enemy.x;
      const dy = target.y * 80 + 40 - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        enemy.pathIndex++;
      } else {
        enemy.x += (dx / dist) * 100 * dt;
        enemy.y += (dy / dist) * 100 * dt;
      }
    } else {
      // Enemy reached end
      this.game.lives -= enemy.damage;
      enemy.health = 0;
    }
  }

  // Towers shoot enemies
  for (const tower of this.game.towers) {
    if (now - tower.lastFire < tower.fireRate) continue;

    for (const enemy of this.game.enemies) {
      if (enemy.health <= 0) continue;
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      if (dx * dx + dy * dy < tower.range * tower.range) {
        enemy.health -= tower.damage;
        tower.lastFire = now;
        break;
      }
    }
  }

  // Cleanup dead enemies
  this.game.enemies = this.game.enemies.filter(e => e.health > 0);

  // Check for wave completion
  if (this.game.enemies.length === 0 && Math.random() < 0.01) {
    this.game.wave++;
    this.game.gold += 50 + this.game.wave * 10;
  }
}
}
\`\`\`\n\n**Features:**\n- ✅ Grid-based tower placement\n- ✅ Enemy path following\n- ✅ Wave progression system\n- ✅ Gold economy\n- ✅ Tower types with different stats\n- ✅ Range-based targeting`,
    changes: [{
      path: 'scripts/tower-defense.ts',
      newContent: `// scripts/tower-defense.ts
import { Entity, System } from '../engine';

export interface TowerDefenseGame {
grid: number[][];
gold: number;
lives: number;
wave: number;
enemies: Enemy[];
towers: Tower[];
}

export interface Enemy {
id: string;
x: number;
y: number;
path: { x: number; y: number }[];
pathIndex: number;
health: number;
damage: number;
}

export interface Tower {
id: string;
x: number;
y: number;
range: number;
damage: number;
fireRate: number;
lastFire: number;
cost: number;
}

export class TowerDefenseSystem extends System {
private game: TowerDefenseGame;
private path: { x: number; y: number }[] = [
  { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 },
  { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
  { x: 5, y: 2 }, { x: 5, y: 1 }
];

constructor() {
  this.game = {
    grid: Array(8).fill(null).map(() => Array(6).fill(null)),
    gold: 100,
    lives: 20,
    wave: 1,
    enemies: [],
    towers: [],
  };
}

placeTower(gridX: number, gridY: number, towerType: 'basic' | 'sniper' | 'rapid'): boolean {
  const costs = { basic: 50, sniper: 100, rapid: 75 };
  const cost = costs[towerType];

  if (this.game.gold < cost) return false;
  if (this.game.grid[gridY][gridX] !== null) return false;

  this.game.gold -= cost;
  this.game.grid[gridY][gridX] = towerType;
  this.game.towers.push({
    id: \`tower-\${Date.now()}\`,
    x: gridX * 80 + 40,
    y: gridY * 80 + 40,
    range: towerType === 'sniper' ? 250 : towerType === 'rapid' ? 100 : 150,
    damage: towerType === 'sniper' ? 25 : towerType === 'rapid' ? 5 : 15,
    fireRate: towerType === 'rapid' ? 200 : 1000,
    lastFire: 0,
    cost,
  });
  return true;
}

spawnEnemy() {
  const enemy: Enemy = {
    id: \`enemy-\${Date.now()}\`,
    x: this.path[0].x * 80 + 40,
    y: this.path[0].y * 80 + 40,
    path: [...this.path],
    pathIndex: 0,
    health: 50 + this.game.wave * 10,
    damage: 10 + this.game.wave * 2,
  };
  this.game.enemies.push(enemy);
}

onUpdate(dt: number) {
  const now = Date.now();
  if (Math.random() < 0.02 * this.game.wave) {
    this.spawnEnemy();
  }
  for (const enemy of this.game.enemies) {
    if (enemy.health <= 0) continue;
    const target = enemy.path[enemy.pathIndex + 1];
    if (target) {
      const dx = target.x * 80 + 40 - enemy.x;
      const dy = target.y * 80 + 40 - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        enemy.pathIndex++;
      } else {
        enemy.x += (dx / dist) * 100 * dt;
        enemy.y += (dy / dist) * 100 * dt;
      }
    } else {
      this.game.lives -= enemy.damage;
      enemy.health = 0;
    }
  }
  for (const tower of this.game.towers) {
    if (now - tower.lastFire < tower.fireRate) continue;
    for (const enemy of this.game.enemies) {
      if (enemy.health <= 0) continue;
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      if (dx * dx + dy * dy < tower.range * tower.range) {
        enemy.health -= tower.damage;
        tower.lastFire = now;
        break;
      }
    }
  }
  this.game.enemies = this.game.enemies.filter(e => e.health > 0);
  if (this.game.enemies.length === 0 && Math.random() < 0.01) {
    this.game.wave++;
    this.game.gold += 50 + this.game.wave * 10;
  }
}
}`,
      summary: 'Tower defense system with grid placement, enemy waves, gold economy',
      confidence: 0.9,
    }],
    nextSteps: ['Create scene editor UI for tower placement', 'Add enemy sprite assets', 'Implement tower upgrade system', 'Add wave countdown timer'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackPlayerMovement(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Player Movement System',
    content: `## Player Movement System\n\nI've generated a complete player movement controller for your game. This includes WASD/Arrow key controls with smooth acceleration.\n\n\`\`\`typescript\n// scripts/player.ts\nimport { Entity, System } from '../engine';\n\nexport class PlayerInputSystem extends System {\n  private keys: Set<string> = new Set();\n  private speed = 300;\n  private jumpForce = -500;\n  private gravity = 1200;\n  private velocityY = 0;\n  private grounded = false;\n\n  onStart() {\n    window.addEventListener('keydown', (e) => this.keys.add(e.key));\n    window.addEventListener('keyup', (e) => this.keys.delete(e.key));\n  }\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n\n    const transform = player.getComponent('transform');\n    if (!transform) return;\n\n    // Horizontal movement\n    let moveX = 0;\n    if (this.keys.has('ArrowLeft') || this.keys.has('a')) moveX -= 1;\n    if (this.keys.has('ArrowRight') || this.keys.has('d')) moveX += 1;\n    transform.x += moveX * this.speed * dt;\n\n    // Jumping\n    if ((this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has(' ')) && this.grounded) {\n      this.velocityY = this.jumpForce;\n      this.grounded = false;\n    }\n\n    // Gravity\n    this.velocityY += this.gravity * dt;\n    transform.y += this.velocityY * dt;\n\n    // Ground collision (simple)\n    if (transform.y >= 400) {\n      transform.y = 400;\n      this.velocityY = 0;\n      this.grounded = true;\n    }\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ WASD + Arrow key movement\n- ✅ Jump with W / Up / Space\n- ✅ Gravity simulation\n- ✅ Ground collision\n\n**To use:** Add this to your game systems and attach a \`playerInput\` component to your player entity.`,
    changes: [{
      path: 'scripts/player.ts',
      newContent: `// scripts/player.ts\nimport { Entity, System } from '../engine';\n\nexport class PlayerInputSystem extends System {\n  private keys: Set<string> = new Set();\n  private speed = 300;\n  private jumpForce = -500;\n  private gravity = 1200;\n  private velocityY = 0;\n  private grounded = false;\n\n  onStart() {\n    window.addEventListener('keydown', (e) => this.keys.add(e.key));\n    window.addEventListener('keyup', (e) => this.keys.delete(e.key));\n  }\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n    const transform = player.getComponent('transform');\n    if (!transform) return;\n    let moveX = 0;\n    if (this.keys.has('ArrowLeft') || this.keys.has('a')) moveX -= 1;\n    if (this.keys.has('ArrowRight') || this.keys.has('d')) moveX += 1;\n    transform.x += moveX * this.speed * dt;\n    if ((this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has(' ')) && this.grounded) {\n      this.velocityY = this.jumpForce;\n      this.grounded = false;\n    }\n    this.velocityY += this.gravity * dt;\n    transform.y += this.velocityY * dt;\n    if (transform.y >= 400) {\n      transform.y = 400;\n      this.velocityY = 0;\n      this.grounded = true;\n    }\n  }\n}`,
      summary: 'Player movement system with WASD + jump',
      confidence: 0.9,
    }],
    nextSteps: ['Add system to your game loop', 'Attach playerInput component to player entity', 'Adjust speed/jumpForce for your game feel'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackEnemyAI(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Enemy AI Patrol System',
    content: `## Enemy AI Patrol System\n\nGenerated a basic enemy AI that patrols back and forth. Perfect for platformer enemies.\n\n\`\`\`typescript\n// scripts/enemy-ai.ts\nimport { Entity, System } from '../engine';\n\nexport class EnemyAISystem extends System {\n  private patrolRange = 200;\n  private speed = 100;\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const enemies = entities.filter(e => e.hasComponent('ai'));\n    \n    for (const enemy of enemies) {\n      const transform = enemy.getComponent('transform');\n      const ai = enemy.getComponent('ai');\n      if (!transform || !ai) continue;\n\n      // Initialize patrol data\n      if (!ai.startX) ai.startX = transform.x;\n      if (!ai.direction) ai.direction = 1;\n\n      // Move in current direction\n      transform.x += ai.direction * this.speed * dt;\n\n      // Reverse at patrol boundaries\n      if (transform.x > ai.startX + this.patrolRange) {\n        ai.direction = -1;\n      } else if (transform.x < ai.startX - this.patrolRange) {\n        ai.direction = 1;\n      }\n    }\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ Patrol back and forth\n- ✅ Configurable range and speed\n- ✅ Works with any entity that has an 'ai' component`,
    changes: [{
      path: 'scripts/enemy-ai.ts',
      newContent: `// scripts/enemy-ai.ts\nimport { Entity, System } from '../engine';\n\nexport class EnemyAISystem extends System {\n  private patrolRange = 200;\n  private speed = 100;\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const enemies = entities.filter(e => e.hasComponent('ai'));\n    for (const enemy of enemies) {\n      const transform = enemy.getComponent('transform');\n      const ai = enemy.getComponent('ai');\n      if (!transform || !ai) continue;\n      if (!ai.startX) ai.startX = transform.x;\n      if (!ai.direction) ai.direction = 1;\n      transform.x += ai.direction * this.speed * dt;\n      if (transform.x > ai.startX + this.patrolRange) ai.direction = -1;\n      else if (transform.x < ai.startX - this.patrolRange) ai.direction = 1;\n    }\n  }\n}`,
      summary: 'Enemy AI patrol system',
      confidence: 0.85,
    }],
    nextSteps: ['Add system to game loop', 'Attach ai component to enemy entities', 'Adjust patrolRange and speed'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackCollectible(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Collectible System',
    content: `## Collectible System\n\nCreated a collectible system for items like coins, gems, health potions, and more.\n\n\`\`\`typescript\n// scripts/collectible.ts\nimport { Entity, System } from '../engine';\n\nexport interface Collectible {\n  type: 'coin' | 'gem' | 'health' | 'rune';\n  value: number;\n  healAmount?: number;\n}\n\nexport class CollectibleSystem extends System {\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n\n    const playerTransform = player.getComponent('transform');\n    const collectibles = entities.filter(e => e.hasComponent('collectible'));\n\n    for (const collectible of collectibles) {\n      const col = collectible.getComponent('collectible');\n      const transform = collectible.getComponent('transform');\n      if (!col || !transform) continue;\n\n      const dx = playerTransform.x - transform.x;\n      const dy = playerTransform.y - transform.y;\n      const distance = Math.sqrt(dx * dx + dy * dy);\n\n      if (distance < 50) {\n        // Collect it!\n        if (col.type === 'health') {\n          // Heal player\n          const health = player.getComponent('health');\n          if (health) {\n            health.hp = Math.min(health.maxHp, health.hp + (col.healAmount || 30));\n          }\n        } else {\n          // Add to score/inventory\n          const score = player.getComponent('score');\n          if (score) {\n            score.value += col.value;\n          }\n        }\n\n        // Remove collectible\n        entities.delete(collectible.id);\n      }\n    }\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ Multiple collectible types\n- ✅ Collision detection\n- ✅ Health restoration\n- ✅ Score tracking`,
    changes: [{
      path: 'scripts/collectible.ts',
      newContent: `// scripts/collectible.ts\nimport { Entity, System } from '../engine';\n\nexport interface Collectible {\n  type: 'coin' | 'gem' | 'health' | 'rune';\n  value: number;\n  healAmount?: number;\n}\n\nexport class CollectibleSystem extends System {\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n    const playerTransform = player.getComponent('transform');\n    const collectibles = entities.filter(e => e.hasComponent('collectible'));\n    for (const collectible of collectibles) {\n      const col = collectible.getComponent('collectible');\n      const transform = collectible.getComponent('transform');\n      if (!col || !transform) continue;\n      const dx = playerTransform.x - transform.x;\n      const dy = playerTransform.y - transform.y;\n      const distance = Math.sqrt(dx * dx + dy * dy);\n      if (distance < 50) {\n        if (col.type === 'health') {\n          const health = player.getComponent('health');\n          if (health) {\n            health.hp = Math.min(health.maxHp, health.hp + (col.healAmount || 30));\n          }\n        } else {\n          const score = player.getComponent('score');\n          if (score) {\n            score.value += col.value;\n          }\n        }\n        entities.delete(collectible.id);\n      }\n    }\n  }\n}`,
      summary: 'Collectible system with multiple types',
      confidence: 0.85,
    }],
    nextSteps: ['Add system to game loop', 'Create collectible entities with component data', 'Add visual feedback on collect'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackPlatform(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Platform System',
    content: `## Platform/Collision System\n\nCreated a simple platform system for platformer games.\n\n\`\`\`typescript\n// scripts/platform.ts\nimport { Entity, System } from '../engine';\n\nexport class PlatformCollisionSystem extends System {\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n\n    const transform = player.getComponent('transform');\n    const velocity = player.getComponent('velocity');\n    if (!transform || !velocity) return;\n\n    const platforms = entities.filter(e => e.hasComponent('platform'));\n    let grounded = false;\n\n    for (const platform of platforms) {\n      const pt = platform.getComponent('transform');\n      const dims = platform.getComponent('dimensions');\n      if (!pt || !dims) continue;\n\n      // AABB collision check\n      const playerLeft = transform.x - 16;\n      const playerRight = transform.x + 16;\n      const playerBottom = transform.y + 24;\n\n      const platLeft = pt.x - dims.width / 2;\n      const platRight = pt.x + dims.width / 2;\n      const platTop = pt.y - dims.height / 2;\n      const platBottom = pt.y + dims.height / 2;\n\n      // Check if player is above and falling\n      if (playerBottom >= platTop && playerBottom <= platTop + 20 &&\n          playerRight > platLeft && playerLeft < platRight &&\n          velocity.vy > 0) {\n        transform.y = platTop - 24;\n        velocity.vy = 0;\n        grounded = true;\n      }\n    }\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ Platform collision\n- ✅ One-way platforms\n- ✅ Landing detection`,
    changes: [{
      path: 'scripts/platform.ts',
      newContent: `// scripts/platform.ts\nimport { Entity, System } from '../engine';\n\nexport class PlatformCollisionSystem extends System {\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n    const transform = player.getComponent('transform');\n    const velocity = player.getComponent('velocity');\n    if (!transform || !velocity) return;\n    const platforms = entities.filter(e => e.hasComponent('platform'));\n    let grounded = false;\n    for (const platform of platforms) {\n      const pt = platform.getComponent('transform');\n      const dims = platform.getComponent('dimensions');\n      if (!pt || !dims) continue;\n      const playerLeft = transform.x - 16;\n      const playerRight = transform.x + 16;\n      const playerBottom = transform.y + 24;\n      const platLeft = pt.x - dims.width / 2;\n      const platRight = pt.x + dims.width / 2;\n      const platTop = pt.y - dims.height / 2;\n      const platBottom = pt.y + dims.height / 2;\n      if (playerBottom >= platTop && playerBottom <= platTop + 20 && playerRight > platLeft && playerLeft < platRight && velocity.vy > 0) {\n        transform.y = platTop - 24;\n        velocity.vy = 0;\n        grounded = true;\n      }\n    }\n  }\n}`,
      summary: 'Platform collision system',
      confidence: 0.85,
    }],
    nextSteps: ['Add system to game loop', 'Create platform entities with dimensions', 'Adjust collision margins'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackJump(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Jump System',
    content: `## Jump System\n\nAdded a configurable jump system with double jump support.\n\n\`\`\`typescript\n// scripts/jump.ts\nimport { Entity, System } from '../engine';\n\nexport class JumpSystem extends System {\n  private jumpForce = -500;\n  private gravity = 1200;\n  private maxJumps = 2;\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n\n    const transform = player.getComponent('transform');\n    const velocity = player.getComponent('velocity');\n    const jump = player.getComponent('jump');\n    if (!transform || !velocity || !jump) return;\n\n    // Apply gravity\n    velocity.vy += this.gravity * dt;\n    transform.y += velocity.vy * dt;\n\n    // Ground check\n    if (transform.y >= 400) {\n      transform.y = 400;\n      velocity.vy = 0;\n      jump.jumpsRemaining = this.maxJumps;\n    }\n  }\n\n  handleJump(player: Entity) {\n    const jump = player.getComponent('jump');\n    const velocity = player.getComponent('velocity');\n    if (!jump || !velocity || jump.jumpsRemaining <= 0) return;\n\n    velocity.vy = this.jumpForce;\n    jump.jumpsRemaining--;\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ Configurable jump force\n- ✅ Double jump\n- ✅ Ground detection`,
    changes: [{
      path: 'scripts/jump.ts',
      newContent: `// scripts/jump.ts\nimport { Entity, System } from '../engine';\n\nexport class JumpSystem extends System {\n  private jumpForce = -500;\n  private gravity = 1200;\n  private maxJumps = 2;\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n    const transform = player.getComponent('transform');\n    const velocity = player.getComponent('velocity');\n    const jump = player.getComponent('jump');\n    if (!transform || !velocity || !jump) return;\n    velocity.vy += this.gravity * dt;\n    transform.y += velocity.vy * dt;\n    if (transform.y >= 400) {\n      transform.y = 400;\n      velocity.vy = 0;\n      jump.jumpsRemaining = this.maxJumps;\n    }\n  }\n\n  handleJump(player: Entity) {\n    const jump = player.getComponent('jump');\n    const velocity = player.getComponent('velocity');\n    if (!jump || !velocity || jump.jumpsRemaining <= 0) return;\n    velocity.vy = this.jumpForce;\n    jump.jumpsRemaining--;\n  }\n}`,
      summary: 'Jump system with double jump',
      confidence: 0.85,
    }],
    nextSteps: ['Add system to game loop', 'Call handleJump on spacebar', 'Adjust jump force'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackProjectile(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Projectile System',
    content: `## Projectile/Shooting System\n\nCreated a projectile system for ranged attacks and shooting mechanics.\n\n\`\`\`typescript\n// scripts/projectile.ts\nimport { Entity, System } from '../engine';\n\nexport interface Projectile {\n  speed: number;\n  damage: number;\n  lifetime: number;\n  createdAt: number;\n}\n\nexport class ProjectileSystem extends System {\n  private projectiles = new Map<string, Entity>();\n\n  spawnProjectile(x: number, y: number, vx: number, vy: number, damage: number) {\n    const id = \`proj-\${Date.now()}\`;\n    const entity = new Entity(id);\n\n    entity.setComponent('transform', { x, y });\n    entity.setComponent('velocity', { vx, vy });\n    entity.setComponent('projectile', {\n      speed: 500,\n      damage,\n      lifetime: 3000,\n      createdAt: Date.now(),\n    });\n\n    this.projectiles.set(id, entity);\n    return entity;\n  }\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const now = Date.now();\n\n    for (const [id, proj] of this.projectiles) {\n      const transform = proj.getComponent('transform');\n      const vel = proj.getComponent('velocity');\n      const projectile = proj.getComponent('projectile');\n\n      if (!transform || !vel || !projectile) continue;\n\n      // Move projectile\n      transform.x += vel.vx * dt;\n      transform.y += vel.vy * dt;\n\n      // Check lifetime\n      if (now - projectile.createdAt > projectile.lifetime) {\n        this.projectiles.delete(id);\n        continue;\n      }\n\n      // Collision with enemies\n      const enemies = entities.filter(e => e.hasComponent('ai'));\n      for (const enemy of enemies) {\n        const enemyTransform = enemy.getComponent('transform');\n        if (!enemyTransform) continue;\n\n        const dx = transform.x - enemyTransform.x;\n        const dy = transform.y - enemyTransform.y;\n        const dist = Math.sqrt(dx * dx + dy * dy);\n\n        if (dist < 32) {\n          // Hit!\n          const health = enemy.getComponent('health');\n          if (health) {\n            health.hp -= projectile.damage;\n          }\n\n          this.projectiles.delete(id);\n          break;\n        }\n      }\n    }\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ Fast projectile movement\n- ✅ Enemy collision\n- ✅ Auto-cleanup on timeout`,
    changes: [{
      path: 'scripts/projectile.ts',
      newContent: `// scripts/projectile.ts\nimport { Entity, System } from '../engine';\n\nexport interface Projectile {\n  speed: number;\n  damage: number;\n  lifetime: number;\n  createdAt: number;\n}\n\nexport class ProjectileSystem extends System {\n  private projectiles = new Map<string, Entity>();\n\n  spawnProjectile(x: number, y: number, vx: number, vy: number, damage: number) {\n    const id = \`proj-\${Date.now()}\`;\n    const entity = new Entity(id);\n    entity.setComponent('transform', { x, y });\n    entity.setComponent('velocity', { vx, vy });\n    entity.setComponent('projectile', {\n      speed: 500,\n      damage,\n      lifetime: 3000,\n      createdAt: Date.now(),\n    });\n    this.projectiles.set(id, entity);\n    return entity;\n  }\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const now = Date.now();\n    for (const [id, proj] of this.projectiles) {\n      const transform = proj.getComponent('transform');\n      const vel = proj.getComponent('velocity');\n      const projectile = proj.getComponent('projectile');\n      if (!transform || !vel || !projectile) continue;\n      transform.x += vel.vx * dt;\n      transform.y += vel.vy * dt;\n      if (now - projectile.createdAt > projectile.lifetime) {\n        this.projectiles.delete(id);\n        continue;\n      }\n      const enemies = entities.filter(e => e.hasComponent('ai'));\n      for (const enemy of enemies) {\n        const enemyTransform = enemy.getComponent('transform');\n        if (!enemyTransform) continue;\n        const dx = transform.x - enemyTransform.x;\n        const dy = transform.y - enemyTransform.y;\n        const dist = Math.sqrt(dx * dx + dy * dy);\n        if (dist < 32) {\n          const health = enemy.getComponent('health');\n          if (health) {\n            health.hp -= projectile.damage;\n          }\n          this.projectiles.delete(id);\n          break;\n        }\n      }\n    }\n  }\n}`,
      summary: 'Projectile/shooting system',
      confidence: 0.85,
    }],
    nextSteps: ['Add system to game loop', 'Call spawnProjectile on shooting', 'Add projectile sprite'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackHealthSystem(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Health & Combat System',
    content: `## Health & Combat System\n\nCreated a health system with damage, healing, and death mechanics.\n\n\`\`\`typescript\n// scripts/health.ts\nimport { Entity, System } from '../engine';\n\nexport interface Health {\n  hp: number;\n  maxHp: number;\n  invincible: number;\n}\n\nexport class HealthSystem extends System {\n  onUpdate(dt: number, entities: Entity[]) {\n    for (const entity of entities) {\n      const health = entity.getComponent('health');\n      if (!health) continue;\n\n      // Handle invincibility frames\n      if (health.invincible > 0) {\n        health.invincible -= dt * 1000;\n      }\n\n      // Check for death\n      if (health.hp <= 0) {\n        this.handleDeath(entity);\n      }\n    }\n  }\n\n  takeDamage(entity: Entity, amount: number) {\n    const health = entity.getComponent('health');\n    if (!health || health.invincible > 0) return;\n\n    health.hp -= amount;\n    health.invincible = 500; // 500ms invincibility\n\n    if (health.hp <= 0) {\n      this.handleDeath(entity);\n    }\n  }\n\n  heal(entity: Entity, amount: number) {\n    const health = entity.getComponent('health');\n    if (!health) return;\n\n    health.hp = Math.min(health.maxHp, health.hp + amount);\n  }\n\nexport function handleDeath(entity: Entity) {\n    // Remove entity or play death animation\n    if (entity.hasComponent('playerInput')) {\n      // Game over\n      console.log('Player died!');\n    } else {\n      // Remove enemy\n      // entities.delete(entity.id);\n    }\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ Health points\n- ✅ Damage & healing\n- ✅ Invincibility frames\n- ✅ Death handling`,
    changes: [{
      path: 'scripts/health.ts',
      newContent: `// scripts/health.ts\nimport { Entity, System } from '../engine';\n\nexport interface Health {\n  hp: number;\n  maxHp: number;\n  invincible: number;\n}\n\nexport class HealthSystem extends System {\n  onUpdate(dt: number, entities: Entity[]) {\n    for (const entity of entities) {\n      const health = entity.getComponent('health');\n      if (!health) continue;\n      if (health.invincible > 0) {\n        health.invincible -= dt * 1000;\n      }\n      if (health.hp <= 0) {\n        this.handleDeath(entity);\n      }\n    }\n  }\n\n  takeDamage(entity: Entity, amount: number) {\n    const health = entity.getComponent('health');\n    if (!health || health.invincible > 0) return;\n    health.hp -= amount;\n    health.invincible = 500;\n    if (health.hp <= 0) {\n      this.handleDeath(entity);\n    }\n  }\n\n  heal(entity: Entity, amount: number) {\n    const health = entity.getComponent('health');\n    if (!health) return;\n    health.hp = Math.min(health.maxHp, health.hp + amount);\n  }\n\nexport function handleDeath(entity: Entity) {\n    if (entity.hasComponent('playerInput')) {\n      console.log('Player died!');\n    } else {\n      // entities.delete(entity.id);\n    }\n  }\n}`,
      summary: 'Health & combat system',
      confidence: 0.85,
    }],
    nextSteps: ['Add system to game loop', 'Call takeDamage on collision', 'Add death animations'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackSceneSetup(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'change',
    title: 'Scene Setup',
    content: `## Scene Setup\n\nCreated a default scene with player, enemies, and collectibles.\n\n\`\`\`json\n{\n  "name": "main-scene",\n  "entities": [\n    {\n      "id": "player",\n      "type": "player",\n      "transform": { "x": 400, "y": 300, "scaleX": 1, "scaleY": 1, "rotation": 0 },\n      "components": {\n        "playerInput": true,\n        "movement": { "speed": 200 },\n        "health": { "hp": 100, "maxHp": 100 },\n        "sprite": { "width": 32, "height": 32, "color": "#3b82f6" }\n      }\n    },\n    {\n      "id": "enemy-1",\n      "type": "enemy",\n      "transform": { "x": 200, "y": 300, "scaleX": 1, "scaleY": 1, "rotation": 0 },\n      "components": {\n        "ai": { "speed": 50, "type": "patrol" },\n        "health": { "hp": 30, "maxHp": 30 },\n        "sprite": { "width": 32, "height": 32, "color": "#ef4444" }\n      }\n    },\n    {\n      "id": "coin-1",\n      "type": "collectible",\n      "transform": { "x": 300, "y": 250, "scaleX": 1, "scaleY": 1, "rotation": 0 },\n      "components": {\n        "collectible": { "type": "coin", "value": 10 },\n        "sprite": { "width": 16, "height": 16, "color": "#f59e0b" }\n      }\n    }\n  ]\n}\n\`\`\`\n\n**Features:**\n- ✅ Player entity\n- ✅ Enemy with AI\n- ✅ Collectible coin`,
    changes: [{
      path: 'scenes/main-scene.json',
      newContent: `{\n  "name": "main-scene",\n  "entities": [\n    {\n      "id": "player",\n      "type": "player",\n      "transform": { "x": 400, "y": 300, "scaleX": 1, "scaleY": 1, "rotation": 0 },\n      "components": {\n        "playerInput": true,\n        "movement": { "speed": 200 },\n        "health": { "hp": 100, "maxHp": 100 },\n        "sprite": { "width": 32, "height": 32, "color": "#3b82f6" }\n      }\n    },\n    {\n      "id": "enemy-1",\n      "type": "enemy",\n      "transform": { "x": 200, "y": 300, "scaleX": 1, "scaleY": 1, "rotation": 0 },\n      "components": {\n        "ai": { "speed": 50, "type": "patrol" },\n        "health": { "hp": 30, "maxHp": 30 },\n        "sprite": { "width": 32, "height": 32, "color": "#ef4444" }\n      }\n    },\n    {\n      "id": "coin-1",\n      "type": "collectible",\n      "transform": { "x": 300, "y": 250, "scaleX": 1, "scaleY": 1, "rotation": 0 },\n      "components": {\n        "collectible": { "type": "coin", "value": 10 },\n        "sprite": { "width": 16, "height": 16, "color": "#f59e0b" }\n      }\n    }\n  ]\n}`,
      summary: 'Default scene with player, enemy, collectible',
      confidence: 0.9,
    }],
    nextSteps: ['Open Scene Editor to see entities', 'Add more entities as needed', 'Save scene'],
    riskLevel: 'low',
    fromFallback: true,
  };
}

export function fallbackGeneric(command: string, id: string, ctx: any): AICommandResponse {
  return {
    id,
    type: 'explanation',
    title: 'AI Command Received',
    content: `I received your command: "${command}"\n\nI'm ready to help with your ClawGame project!\n\n**Supported AI Actions:**\n• Explain code and systems\n• Create and modify game features\n• Fix bugs and errors\n• Analyze code quality\n• Generate assets (coming soon)\n• Optimize performance\n\n**Current Project:**\n• Genre: ${ctx.project?.genre || 'unknown'}\n• Files: ${ctx.tree.length} items\n• Selected: ${ctx.selectedFiles.join(', ') || 'None'}\n\n🎯 **AI service integration available with USE_REAL_AI=1!**`,
    riskLevel: 'low',
    fromFallback: true,
  };
}

// ── Helpers ──


