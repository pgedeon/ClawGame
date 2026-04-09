import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type CreateProjectInput } from '../api/client';
import { FolderPlus, ArrowLeft, Sparkles, Gamepad2, Target, MessageSquare } from 'lucide-react';
import { logger } from '../utils/logger';
import './create-project.css';

interface GameTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  genre: string;
  defaultScene: any;
  defaultScript?: string;
}

const templates: GameTemplate[] = [
  {
    id: 'platformer',
    name: 'Platformer',
    description: 'Jump between platforms, collect coins, avoid enemies',
    icon: <Gamepad2 size={32} />,
    genre: 'action',
    defaultScene: {
      name: 'Main Scene',
      entities: [
        {
          id: 'player-1',
          transform: { x: 100, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            playerInput: true,
            movement: { vx: 0, vy: 0, speed: 200, jumpSpeed: 450, gravity: 900 },
            sprite: { width: 32, height: 48, color: '#3b82f6' },
            physics: { type: 'dynamic', friction: 0.1, restitution: 0 },
            collision: { width: 32, height: 48, type: 'player' }
          }
        },
        {
          id: 'platform-ground',
          transform: { x: 400, y: 480, scaleX: 12, scaleY: 1, rotation: 0 },
          components: {
            platform: true,
            sprite: { width: 80, height: 32, color: '#64748b' },
            collision: { width: 960, height: 32, type: 'solid' }
          }
        },
        {
          id: 'platform-mid-1',
          transform: { x: 280, y: 370, scaleX: 3, scaleY: 1, rotation: 0 },
          components: {
            platform: true,
            sprite: { width: 120, height: 24, color: '#78716c' },
            collision: { width: 120, height: 24, type: 'solid' }
          }
        },
        {
          id: 'platform-mid-2',
          transform: { x: 520, y: 310, scaleX: 3, scaleY: 1, rotation: 0 },
          components: {
            platform: true,
            sprite: { width: 120, height: 24, color: '#78716c' },
            collision: { width: 120, height: 24, type: 'solid' }
          }
        },
        {
          id: 'platform-high',
          transform: { x: 700, y: 220, scaleX: 2, scaleY: 1, rotation: 0 },
          components: {
            platform: true,
            sprite: { width: 100, height: 20, color: '#a8a29e' },
            collision: { width: 100, height: 20, type: 'solid' }
          }
        },
        {
          id: 'platform-moving',
          transform: { x: 380, y: 160, scaleX: 2, scaleY: 1, rotation: 0 },
          components: {
            platform: true,
            movingPlatform: { axis: 'x', range: 120, speed: 80 },
            sprite: { width: 96, height: 20, color: '#f59e0b' },
            collision: { width: 96, height: 20, type: 'solid' }
          }
        },
        {
          id: 'platform-end',
          transform: { x: 850, y: 400, scaleX: 3, scaleY: 1, rotation: 0 },
          components: {
            platform: true,
            sprite: { width: 120, height: 24, color: '#78716c' },
            collision: { width: 120, height: 24, type: 'solid' }
          }
        },
        {
          id: 'coin-1',
          transform: { x: 300, y: 330, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 20, height: 20, type: 'collectible', value: 10 },
            sprite: { width: 20, height: 20, color: '#fbbf24' }
          }
        },
        {
          id: 'coin-2',
          transform: { x: 540, y: 270, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 20, height: 20, type: 'collectible', value: 10 },
            sprite: { width: 20, height: 20, color: '#fbbf24' }
          }
        },
        {
          id: 'coin-3',
          transform: { x: 720, y: 180, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 20, height: 20, type: 'collectible', value: 10 },
            sprite: { width: 20, height: 20, color: '#fbbf24' }
          }
        },
        {
          id: 'enemy-1',
          transform: { x: 550, y: 448, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            ai: { type: 'patrol', speed: 80, range: 150, direction: 1 },
            sprite: { width: 32, height: 32, color: '#ef4444' },
            collision: { width: 32, height: 32, type: 'enemy' }
          }
        },
        {
          id: 'goal-flag',
          transform: { x: 870, y: 360, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 32, height: 48, type: 'goal' },
            sprite: { width: 32, height: 48, color: '#22c55e' }
          }
        }
      ]
    },
    defaultScript: [
      '// Platformer Game Script',
      'const GRAVITY = 900;',
      'const JUMP_SPEED = 450;',
      'const MOVE_SPEED = 200;',
      'let score = 0;',
      'let gameWon = false;',
      '',
      'export function update(deltaTime: number, entities: Map<string, any>, keys: Set<string>) {',
      '  const player = entities.get("player-1");',
      '  if (!player || gameWon) return;',
      '  const dt = deltaTime / 1000;',
      '',
      '  // Horizontal movement',
      '  if (keys.has("ArrowLeft") || keys.has("a")) player.vx = -MOVE_SPEED;',
      '  else if (keys.has("ArrowRight") || keys.has("d")) player.vx = MOVE_SPEED;',
      '  else player.vx *= 0.85;',
      '',
      '  // Jump',
      '  if ((keys.has("ArrowUp") || keys.has("w") || keys.has(" ")) && player.onGround) {',
      '    player.vy = -JUMP_SPEED;',
      '    player.onGround = false;',
      '  }',
      '',
      '  // Gravity',
      '  player.vy += GRAVITY * dt;',
      '  player.x += player.vx * dt;',
      '  player.y += player.vy * dt;',
      '',
      '  // Platform collision (AABB top-only landing)',
      '  player.onGround = false;',
      '  for (const [id, e] of entities) {',
      '    if (!id.startsWith("platform")) continue;',
      '    const hw = (e.collision?.width ?? e.sprite?.width ?? 80) / 2;',
      '    const hh = (e.collision?.height ?? e.sprite?.height ?? 24) / 2;',
      '    if (player.vy >= 0 &&',
      '        player.x > e.x - hw && player.x < e.x + hw &&',
      '        player.y + 24 >= e.y - hh && player.y + 24 <= e.y - hh + 16) {',
      '      player.y = e.y - hh - 24;',
      '      player.vy = 0;',
      '      player.onGround = true;',
      '    }',
      '  }',
      '',
      '  // Moving platform',
      '  const mp = entities.get("platform-moving");',
      '  if (mp?.movingPlatform) {',
      '    mp.x += mp.movingPlatform.speed * mp.movingPlatform.direction * dt;',
      '    if (Math.abs(mp.x - 380) > mp.movingPlatform.range) {',
      '      mp.movingPlatform.direction *= -1;',
      '    }',
      '  }',
      '',
      '  // Coin collection',
      '  for (const [id, e] of entities) {',
      '    if (!id.startsWith("coin")) continue;',
      '    if (Math.abs(player.x - e.x) < 20 && Math.abs(player.y - e.y) < 30) {',
      '      score += (e.collision?.value ?? 10);',
      '      entities.delete(id);',
      '    }',
      '  }',
      '',
      '  // Enemy patrol & collision',
      '  const enemy = entities.get("enemy-1");',
      '  if (enemy) {',
      '    enemy.x += enemy.ai.speed * enemy.ai.direction * dt;',
      '    if (Math.abs(enemy.x - 550) > enemy.ai.range) enemy.ai.direction *= -1;',
      '    if (Math.abs(player.x - enemy.x) < 28 && Math.abs(player.y - enemy.y) < 40) {',
      '      if (player.vy > 0 && player.y < enemy.y) {',
      '        entities.delete("enemy-1"); player.vy = -300; // stomp',
      '      } else {',
      '        player.x = 100; player.y = 350; player.vx = 0; player.vy = 0; // respawn',
      '      }',
      '    }',
      '  }',
      '',
      '  // Goal check',
      '  const goal = entities.get("goal-flag");',
      '  if (goal && Math.abs(player.x - goal.x) < 24 && Math.abs(player.y - goal.y) < 48) {',
      '    gameWon = true;',
      '    console.log("Level complete! Score:", score);',
      '  }',
      '',
      '  // Fall off screen',
      '  if (player.y > 600) { player.x = 100; player.y = 350; player.vy = 0; }',
      '}',
      '',
      'export function getHUD() {',
      '  return { score, gameWon };',
      '}',
    ].join('\n'),
  },
  {
    id: 'topdown',
    name: 'Top-Down Action',
    description: 'Move freely, fight enemies, collect items',
    icon: <Target size={32} />,
    genre: 'action',
    defaultScene: {
      name: 'Main Scene',
      entities: [
        {
          id: 'player-1',
          transform: { x: 400, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            playerInput: true,
            movement: { vx: 0, vy: 0, speed: 250 },
            sprite: { width: 32, height: 32, color: '#10b981' },
            collision: { width: 32, height: 32, type: 'player' }
          }
        },
        {
          id: 'wall-top',
          transform: { x: 400, y: 60, scaleX: 10, scaleY: 1, rotation: 0 },
          components: {
            sprite: { width: 80, height: 32, color: '#57534e' },
            collision: { width: 800, height: 32, type: 'solid' }
          }
        },
        {
          id: 'wall-bottom',
          transform: { x: 400, y: 580, scaleX: 10, scaleY: 1, rotation: 0 },
          components: {
            sprite: { width: 80, height: 32, color: '#57534e' },
            collision: { width: 800, height: 32, type: 'solid' }
          }
        },
        {
          id: 'wall-left',
          transform: { x: 60, y: 320, scaleX: 1, scaleY: 8, rotation: 0 },
          components: {
            sprite: { width: 32, height: 80, color: '#57534e' },
            collision: { width: 32, height: 640, type: 'solid' }
          }
        },
        {
          id: 'wall-right',
          transform: { x: 740, y: 320, scaleX: 1, scaleY: 8, rotation: 0 },
          components: {
            sprite: { width: 32, height: 80, color: '#57534e' },
            collision: { width: 32, height: 640, type: 'solid' }
          }
        },
        {
          id: 'wall-pillar-1',
          transform: { x: 300, y: 250, scaleX: 1, scaleY: 2, rotation: 0 },
          components: {
            sprite: { width: 48, height: 48, color: '#78716c' },
            collision: { width: 48, height: 96, type: 'solid' }
          }
        },
        {
          id: 'wall-pillar-2',
          transform: { x: 540, y: 420, scaleX: 2, scaleY: 1, rotation: 0 },
          components: {
            sprite: { width: 48, height: 48, color: '#78716c' },
            collision: { width: 96, height: 48, type: 'solid' }
          }
        },
        {
          id: 'wall-divider',
          transform: { x: 400, y: 160, scaleX: 3, scaleY: 1, rotation: 0 },
          components: {
            sprite: { width: 80, height: 24, color: '#57534e' },
            collision: { width: 240, height: 24, type: 'solid' }
          }
        },
        {
          id: 'enemy-1',
          transform: { x: 600, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            ai: { type: 'chase', speed: 100, detectionRange: 250 },
            sprite: { width: 28, height: 28, color: '#ef4444' },
            collision: { width: 28, height: 28, type: 'enemy' }
          }
        },
        {
          id: 'enemy-2',
          transform: { x: 200, y: 450, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            ai: { type: 'chase', speed: 90, detectionRange: 200 },
            sprite: { width: 28, height: 28, color: '#ef4444' },
            collision: { width: 28, height: 28, type: 'enemy' }
          }
        },
        {
          id: 'enemy-3',
          transform: { x: 650, y: 480, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            ai: { type: 'chase', speed: 110, detectionRange: 280 },
            sprite: { width: 28, height: 28, color: '#dc2626' },
            collision: { width: 28, height: 28, type: 'enemy' }
          }
        },
        {
          id: 'enemy-4',
          transform: { x: 150, y: 150, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            ai: { type: 'chase', speed: 70, detectionRange: 180 },
            sprite: { width: 28, height: 28, color: '#b91c1c' },
            collision: { width: 28, height: 28, type: 'enemy' }
          }
        },
        {
          id: 'powerup-1',
          transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 24, height: 24, type: 'powerup', powerupType: 'speed' },
            sprite: { width: 24, height: 24, color: '#8b5cf6' }
          }
        },
        {
          id: 'treasure-chest',
          transform: { x: 680, y: 130, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 36, height: 28, type: 'treasure', value: 100 },
            sprite: { width: 36, height: 28, color: '#d97706' }
          }
        }
      ]
    },
    defaultScript: [
      '// Top-Down Action Game Script',
      'const DETECTION_RANGE = 250;',
      'let score = 0;',
      'let poweredUp = false;',
      'let powerUpTimer = 0;',
      'let health = 3;',
      '',
      'export function update(deltaTime: number, entities: Map<string, any>, keys: Set<string>) {',
      '  const player = entities.get("player-1");',
      '  if (!player || health <= 0) return;',
      '  const dt = deltaTime / 1000;',
      '  const speed = poweredUp ? 400 : 250;',
      '',
      '  // Player movement',
      '  let dx = 0, dy = 0;',
      '  if (keys.has("ArrowUp") || keys.has("w")) dy = -1;',
      '  if (keys.has("ArrowDown") || keys.has("s")) dy = 1;',
      '  if (keys.has("ArrowLeft") || keys.has("a")) dx = -1;',
      '  if (keys.has("ArrowRight") || keys.has("d")) dx = 1;',
      '  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }',
      '',
      '  const nx = player.x + dx * speed * dt;',
      '  const ny = player.y + dy * speed * dt;',
      '',
      '  // Wall collision',
      '  let blockedX = false, blockedY = false;',
      '  for (const [id, e] of entities) {',
      '    if (!id.startsWith("wall")) continue;',
      '    const hw = (e.collision?.width ?? 48) / 2 + 16;',
      '    const hh = (e.collision?.height ?? 48) / 2 + 16;',
      '    if (Math.abs(nx - e.x) < hw && Math.abs(player.y - e.y) < hh) blockedX = true;',
      '    if (Math.abs(player.x - e.x) < hw && Math.abs(ny - e.y) < hh) blockedY = true;',
      '  }',
      '  if (!blockedX) player.x = nx;',
      '  if (!blockedY) player.y = ny;',
      '',
      '  // Power-up timer',
      '  if (poweredUp) {',
      '    powerUpTimer -= dt;',
      '    if (powerUpTimer <= 0) poweredUp = false;',
      '  }',
      '',
      '  // Item pickups',
      '  for (const [id, e] of [...entities]) {',
      '    if (id === "powerup-1" && Math.abs(player.x - e.x) < 24 && Math.abs(player.y - e.y) < 24) {',
      '      poweredUp = true; powerUpTimer = 5; entities.delete(id);',
      '    }',
      '    if (id === "treasure-chest" && Math.abs(player.x - e.x) < 28 && Math.abs(player.y - e.y) < 28) {',
      '      score += (e.collision?.value ?? 100); entities.delete(id);',
      '    }',
      '  }',
      '',
      '  // Enemy AI: chase when player is near',
      '  for (const [id, e] of entities) {',
      '    if (!id.startsWith("enemy")) continue;',
      '    const dist = Math.hypot(player.x - e.x, player.y - e.y);',
      '    const eSpeed = (e.ai?.speed ?? 100);',
      '    if (dist < DETECTION_RANGE) {',
      '      const angle = Math.atan2(player.y - e.y, player.x - e.x);',
      '      let enx = e.x + Math.cos(angle) * eSpeed * dt;',
      '      let eny = e.y + Math.sin(angle) * eSpeed * dt;',
      '      // Enemies also collide with walls',
      '      let eBlocked = false;',
      '      for (const [wid, w] of entities) {',
      '        if (!wid.startsWith("wall")) continue;',
      '        const hw = (w.collision?.width ?? 48) / 2 + 14;',
      '        const hh = (w.collision?.height ?? 48) / 2 + 14;',
      '        if (Math.abs(enx - w.x) < hw && Math.abs(eny - w.y) < hh) { eBlocked = true; break; }',
      '      }',
      '      if (!eBlocked) { e.x = enx; e.y = eny; }',
      '    }',
      '    // Player-enemy collision',
      '    if (dist < 26) {',
      '      if (poweredUp) { entities.delete(id); score += 50; }',
      '      else { health--; player.x = 400; player.y = 350; if (health <= 0) console.log("Game Over!"); }',
      '    }',
      '  }',
      '}',
      '',
      'export function getHUD() {',
      '  return { score, health, poweredUp };',
      '}',
    ].join('\n'),
  },
  {
    id: 'dialogue',
    name: 'Dialogue Adventure',
    description: 'Explore, talk to characters, solve quests',
    icon: <MessageSquare size={32} />,
    genre: 'adventure',
    defaultScene: {
      name: 'Main Scene',
      entities: [
        {
          id: 'player-1',
          transform: { x: 400, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            playerInput: true,
            movement: { vx: 0, vy: 0, speed: 150 },
            sprite: { width: 32, height: 48, color: '#f59e0b' },
            collision: { width: 32, height: 48, type: 'player' }
          }
        },
        {
          id: 'npc-shopkeeper',
          transform: { x: 250, y: 280, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            npc: true,
            dialogue: {
              id: 'shop',
              messages: [
                "Welcome to my shop, adventurer!",
                "I have potions, scrolls, and rare trinkets.",
                "But everything costs gold... and you look broke."
              ]
            },
            sprite: { width: 32, height: 48, color: '#ec4899' },
            collision: { width: 32, height: 48, type: 'npc' }
          }
        },
        {
          id: 'npc-questgiver',
          transform: { x: 550, y: 220, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            npc: true,
            dialogue: {
              id: 'quest',
              messages: [
                "Hero! The ancient door to the east has been sealed for centuries.",
                "Legend says a golden key lies hidden near the old signpost.",
                "Find the key, open the door, and glory shall be yours!"
              ]
            },
            sprite: { width: 32, height: 48, color: '#8b5cf6' },
            collision: { width: 32, height: 48, type: 'npc' }
          }
        },
        {
          id: 'npc-stranger',
          transform: { x: 180, y: 480, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            npc: true,
            dialogue: {
              id: 'stranger',
              messages: [
                "...",
                "You shouldn't be here. Turn back.",
                "...or don't. I don't care either way."
              ]
            },
            sprite: { width: 32, height: 48, color: '#1e293b' },
            collision: { width: 32, height: 48, type: 'npc' }
          }
        },
        {
          id: 'sign-village',
          transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            interactable: true,
            text: "Welcome to the Village of Whispering Oaks. Beware the sealed door to the east.",
            sprite: { width: 64, height: 48, color: '#78716c' },
            collision: { width: 64, height: 48, type: 'sign' }
          }
        },
        {
          id: 'sign-hint',
          transform: { x: 620, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            interactable: true,
            text: "The key glimmers where the shadows grow long. Look near the old sign.",
            sprite: { width: 64, height: 48, color: '#78716c' },
            collision: { width: 64, height: 48, type: 'sign' }
          }
        },
        {
          id: 'locked-door',
          transform: { x: 720, y: 320, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            interactable: true,
            locked: true,
            requiresItem: 'key-golden',
            text: "A massive ancient door. It's locked tight. You need a key.",
            sprite: { width: 48, height: 64, color: '#92400e' },
            collision: { width: 48, height: 64, type: 'door' }
          }
        },
        {
          id: 'key-golden',
          transform: { x: 440, y: 320, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 16, height: 16, type: 'item', itemId: 'key-golden' },
            sprite: { width: 16, height: 16, color: '#fbbf24' }
          }
        }
      ]
    },
    defaultScript: [
      '// Dialogue Adventure Game Script',
      'const INTERACT_RANGE = 60;',
      'let inventory: string[] = [];',
      'let activeDialogue: string[] | null = null;',
      'let dialogueIndex = 0;',
      'let dialogueText = "";',
      'let questComplete = false;',
      '',
      'export function update(deltaTime: number, entities: Map<string, any>, keys: Set<string>, justPressed: Set<string>) {',
      '  const player = entities.get("player-1");',
      '  if (!player) return;',
      '  const dt = deltaTime / 1000;',
      '  const speed = 150;',
      '',
      '  // If dialogue is showing, only allow advancing/closing',
      '  if (activeDialogue) {',
      '    if (justPressed.has("e") || justPressed.has("Enter")) {',
      '      dialogueIndex++;',
      '      if (dialogueIndex >= activeDialogue.length) {',
      '        activeDialogue = null; dialogueText = ""; dialogueIndex = 0;',
      '      } else {',
      '        dialogueText = activeDialogue[dialogueIndex];',
      '      }',
      '    }',
      '    return;',
      '  }',
      '',
      '  // Player movement',
      '  let dx = 0, dy = 0;',
      '  if (keys.has("ArrowUp") || keys.has("w")) dy = -1;',
      '  if (keys.has("ArrowDown") || keys.has("s")) dy = 1;',
      '  if (keys.has("ArrowLeft") || keys.has("a")) dx = -1;',
      '  if (keys.has("ArrowRight") || keys.has("d")) dx = 1;',
      '  if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }',
      '  player.x += dx * speed * dt;',
      '  player.y += dy * speed * dt;',
      '',
      '  // NPC collision (block movement)',
      '  for (const [id, e] of entities) {',
      '    if (!id.startsWith("npc")) continue;',
      '    if (Math.abs(player.x - e.x) < 28 && Math.abs(player.y - e.y) < 40) {',
      '      player.x -= dx * speed * dt; player.y -= dy * speed * dt;',
      '    }',
      '  }',
      '',
      '  // Interact (E key)',
      '  if (justPressed.has("e")) {',
      '    // Check NPCs',
      '    for (const [id, e] of entities) {',
      '      if (!id.startsWith("npc") || !e.dialogue) continue;',
      '      if (Math.abs(player.x - e.x) < INTERACT_RANGE && Math.abs(player.y - e.y) < INTERACT_RANGE) {',
      '        activeDialogue = e.dialogue.messages;',
      '        dialogueIndex = 0;',
      '        dialogueText = activeDialogue[0];',
      '        return;',
      '      }',
      '    }',
      '    // Check signs',
      '    for (const [id, e] of entities) {',
      '      if (!id.startsWith("sign")) continue;',
      '      if (Math.abs(player.x - e.x) < INTERACT_RANGE && Math.abs(player.y - e.y) < INTERACT_RANGE) {',
      '        activeDialogue = [e.text ?? ""];',
      '        dialogueIndex = 0;',
      '        dialogueText = activeDialogue[0];',
      '        return;',
      '      }',
      '    }',
      '    // Check locked door',
      '    const door = entities.get("locked-door");',
      '    if (door && Math.abs(player.x - door.x) < INTERACT_RANGE && Math.abs(player.y - door.y) < INTERACT_RANGE) {',
      '      if (inventory.includes("key-golden")) {',
      '        door.locked = false; door.sprite.color = "#22c55e";',
      '        activeDialogue = ["The golden key fits! The ancient door swings open..."];',
      '        dialogueIndex = 0; dialogueText = activeDialogue[0]; questComplete = true;',
      '      } else {',
      '        activeDialogue = [door.text ?? "It\\\'s locked."];',
      '        dialogueIndex = 0; dialogueText = activeDialogue[0];',
      '      }',
      '    }',
      '  }',
      '',
      '  // Key pickup',
      '  const key = entities.get("key-golden");',
      '  if (key && Math.abs(player.x - key.x) < 24 && Math.abs(player.y - key.y) < 24) {',
      '    inventory.push("key-golden");',
      '    entities.delete("key-golden");',
      '    dialogueText = "You found the Golden Key!";',
      '    activeDialogue = [dialogueText]; dialogueIndex = 0;',
      '  }',
      '}',
      '',
      'export function getHUD() {',
      '  return { inventory, dialogueText, questComplete };',
      '}',
    ].join('\n'),
  }
];

export function CreateProjectPage() {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    genre: 'action',
    artStyle: 'pixel',
    description: '',
    runtimeTarget: 'browser',
    renderBackend: 'canvas',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(templates[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Set genre from template if not already set
      const projectInput = {
        ...formData,
        genre: formData.genre || selectedTemplate.genre
      };

      const response = await api.createProject(projectInput);
      
      // Add template-specific files
      try {
        // Default game script from template
        if (selectedTemplate.defaultScript) {
          await api.writeFile(response.id, 'scripts/game.ts', selectedTemplate.defaultScript);
        }

        // Default player script
        await api.writeFile(response.id, 'scripts/player.ts', `// Player controls for ${formData.name}
export function update(deltaTime: number) {
  const speed = 200;
  
  if (keys['ArrowLeft'] || keys['a']) entity.vx = -speed;
  else if (keys['ArrowRight'] || keys['d']) entity.vx = speed;
  else entity.vx *= 0.8;
  
  if (keys['ArrowUp'] || keys['w']) entity.vy = -speed;
  else if (keys['ArrowDown'] || keys['s']) entity.vy = speed;
  else entity.vy *= 0.8;
}

export function render(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = entity.color || '#3b82f6';
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.strokeRect(-16, -16, 32, 32);
}`);

        // Default scene from template
        await api.createDirectory(response.id, 'scenes');
        await api.writeFile(response.id, 'scenes/main-scene.json', JSON.stringify(selectedTemplate.defaultScene, null, 2));
        
        logger.info('Template files added to project', response.id);
      } catch (err) {
        logger.error('Template creation failed:', err);
        // Don't block project creation
      }
      
      navigate(`/project/${response.id}`);
    } catch (err) {
      logger.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof CreateProjectInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const artStyles = [
    { 
      id: 'pixel', 
      name: 'Pixel Art', 
      description: 'Retro 8/16-bit style',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgM0g2WiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+'
    },
    { 
      id: 'vector', 
      name: 'Vector Art', 
      description: 'Clean scalable graphics',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iIzMzMyIvPgo8cGF0aCBkPSJNMTIgM0g4Yy0xIDAtMy0yLTQtNC0xem0tNiAxMGMtMiAwLTMtMi00LTQgNC00IDAtMiAxIDQgMiA0IDQgMCAyIDMgNiAwIDAgMi0xIDItNHptMCAxOGMtMiAwIDMtMi00LTQgNC00IDAgMi0xIDItMSA0em0tMiAxOGMtMiAwIDMtMi00IDQgNCA0IDAgMi0xIDItMSA0eiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+'
    },
    { 
      id: '3d-low', 
      name: 'Low Poly 3D', 
      description: 'Simple 3D models',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0IDAgMjFjMC4xLjcgMSAwLjUgcyAxLjEuNSAwIDEgMCAxIDAtMS41IDEuMS0xIDAgLTEem0tMSAxNWMwIDEuMS41IDAgMC41LTEuMS41LTEgMS0xLjUgMS0xLjUgMS0xLjUgMS0xem0tMSAxOGMtMSAwLjUtMS41IDAtMC41IDEuMS0xLjUgMS0xem0tMSAxOGMtMC45IDEuOS0yLjkgMC45IDIuOSAxLjl6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4='
    },
    { 
      id: 'hand-drawn', 
      name: 'Hand Drawn', 
      description: 'Illustrative style',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgMTIgMTAgMTAgMTFjMC0xIDAtMi0xLTItMiAtMi0yLS0yLTItMi0yLTItSDN6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4='
    },
  ];

  return (
    <div className="create-project-page">
      <header className="page-header">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} className="icon" />
          Back to Dashboard
        </Link>
        <h1>Create New Project</h1>
        <p>Start building your game with ClawGame</p>
      </header>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="project-form">
        <div className="form-section">
          <label className="form-label" htmlFor="name">
            Project Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My Awesome Game"
            required
          />
        </div>

        <div className="form-section">
          <label className="form-label">Choose a Template</label>
          <div className="template-grid">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="template-icon">
                  {template.icon}
                </div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <span className="template-badge">
                    <Sparkles size={12} />
                    AI-Ready
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="genre">
            Genre
          </label>
          <select
            id="genre"
            value={formData.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
            className="form-select"
          >
            <option value="action">Action</option>
            <option value="adventure">Adventure</option>
            <option value="puzzle">Puzzle</option>
            <option value="rpg">RPG</option>
            <option value="strategy">Strategy</option>
            <option value="simulation">Simulation</option>
          </select>
        </div>

        <div className="form-section">
          <label className="form-label">Art Style</label>
          <div className="art-style-grid">
            {artStyles.map((style) => (
              <label
                key={style.id}
                className={`art-style-card ${formData.artStyle === style.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="artStyle"
                  value={style.id}
                  checked={formData.artStyle === style.id}
                  onChange={(e) => handleChange('artStyle', e.target.value)}
                  className="sr-only"
                />
                <div className="art-style-preview">
                  <img src={style.preview} alt={style.name} />
                </div>
                <span className="art-style-name">{style.name}</span>
                <span className="art-style-desc">{style.description}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="description">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe your game idea..."
            rows={3}
          />
        </div>

        <div className="form-actions">
          <Link to="/" className="secondary-button">
            Cancel
          </Link>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : `Create ${selectedTemplate?.name || 'Project'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
