/**
 * First-run recipe recognition in the mock AI service (onboarding slice 2).
 *
 * Recipe commands must short-circuit to a template-aware scene-JSON change
 * against the project's actual scenes/main-scene.json; non-recipe commands
 * keep the legacy generic mock behavior. Runs against the temp PROJECTS_DIR
 * provided by src/test/setup.ts.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aiService } from './aiService';

const PROJECTS_DIR = process.env.PROJECTS_DIR!;
const PLATFORMER_PROJECT = 'recipe-platformer';
const TOPDOWN_PROJECT = 'recipe-topdown';
const EMPTY_PROJECT = 'recipe-empty';

// Minimal fixtures mirroring apps/web templateScenes.ts entity shapes
// (only the entities each recipe touches + enough scene structure to be
// realistic). Kept inline so API tests never import web-app modules.
const PLATFORMER_SCENE = {
  name: 'Main Scene',
  physics: { gravity: { x: 0, y: 900 } },
  entities: [
    {
      id: 'player-1',
      transform: { x: 100, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        playerInput: true,
        movement: { vx: 0, vy: 0, speed: 200, jumpSpeed: 450 },
        sprite: { width: 32, height: 48, color: '#3b82f6' },
        physics: { type: 'dynamic', gravity: 900, friction: 0.1, restitution: 0 },
        collision: { width: 32, height: 48, type: 'player' },
      },
    },
    {
      id: 'platform-ground',
      transform: { x: 400, y: 480, scaleX: 12, scaleY: 1, rotation: 0 },
      components: {
        platform: true,
        sprite: { width: 80, height: 32, color: '#64748b' },
        collision: { width: 960, height: 32, type: 'solid' },
      },
    },
    {
      id: 'platform-moving',
      transform: { x: 380, y: 160, scaleX: 2, scaleY: 1, rotation: 0 },
      components: {
        platform: true,
        movingPlatform: { axis: 'x', range: 120, speed: 80 },
        sprite: { width: 96, height: 20, color: '#f59e0b' },
        collision: { width: 96, height: 20, type: 'solid' },
      },
    },
  ],
};

const TOPDOWN_SCENE = {
  name: 'Main Scene',
  entities: [
    {
      id: 'player-1',
      transform: { x: 400, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        playerInput: true,
        movement: { vx: 0, vy: 0, speed: 250 },
        sprite: { width: 32, height: 32, color: '#10b981' },
        collision: { width: 32, height: 32, type: 'player' },
      },
    },
    {
      id: 'enemy-1',
      transform: { x: 600, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
      components: {
        ai: { type: 'chase', speed: 100, detectionRange: 250, targetEntity: 'player-1' },
        movement: { vx: 0, vy: 0, speed: 100 },
        sprite: { width: 28, height: 28, color: '#ef4444' },
        collision: { width: 28, height: 28, type: 'enemy' },
      },
    },
  ],
};

async function seedProject(projectId: string, scene: unknown) {
  await mkdir(join(PROJECTS_DIR, projectId, 'scenes'), { recursive: true });
  await writeFile(
    join(PROJECTS_DIR, projectId, 'scenes', 'main-scene.json'),
    JSON.stringify(scene, null, 2),
  );
}

beforeAll(async () => {
  await seedProject(PLATFORMER_PROJECT, PLATFORMER_SCENE);
  await seedProject(TOPDOWN_PROJECT, TOPDOWN_SCENE);
  await mkdir(join(PROJECTS_DIR, EMPTY_PROJECT), { recursive: true });
});

function parseChange(response: { changes?: Array<{ newContent?: string }> }) {
  expect(response.changes).toHaveLength(1);
  const change = response.changes![0];
  expect(change.newContent).toBeTruthy();
  return JSON.parse(change.newContent!);
}

describe('aiService first-run recipes', () => {
  it('platformer-move-platform repositions platform-moving', async () => {
    const res = await aiService.processCommand({
      projectId: PLATFORMER_PROJECT,
      command: 'Move the orange platform further right',
    });
    expect(res.type).toBe('change');
    expect(res.changes?.[0].path).toBe('scenes/main-scene.json');
    const scene = parseChange(res);
    const moving = scene.entities.find((e: any) => e.id === 'platform-moving');
    expect(moving.transform.x).toBe(640);
    // Original untouched in oldContent
    const original = JSON.parse(res.changes![0].oldContent!);
    expect(original.entities.find((e: any) => e.id === 'platform-moving').transform.x).toBe(380);
  });

  it('platformer-widen-ground extends sprite and collision width together', async () => {
    const res = await aiService.processCommand({
      projectId: PLATFORMER_PROJECT,
      command: 'Widen the ground platform across the level',
    });
    const scene = parseChange(res);
    const ground = scene.entities.find((e: any) => e.id === 'platform-ground');
    expect(ground.components.sprite.width).toBe(100);
    expect(ground.components.collision.width).toBe(1200);
  });

  it('platformer-raise-gravity bumps scene physics gravity y', async () => {
    const res = await aiService.processCommand({
      projectId: PLATFORMER_PROJECT,
      command: 'Make gravity stronger so jumps feel snappier',
    });
    const scene = parseChange(res);
    expect(scene.physics.gravity.y).toBe(1400);
  });

  it('topdown-angry-enemy raises enemy-1 chase speed', async () => {
    const res = await aiService.processCommand({
      projectId: TOPDOWN_PROJECT,
      command: 'Make the nearest enemy angry so it chases faster',
    });
    const scene = parseChange(res);
    expect(scene.entities.find((e: any) => e.id === 'enemy-1').components.ai.speed).toBe(170);
  });

  it('topdown-add-pillar inserts the verified solid pillar', async () => {
    const res = await aiService.processCommand({
      projectId: TOPDOWN_PROJECT,
      command: 'Add a stone pillar in the middle of the room',
    });
    const scene = parseChange(res);
    const pillar = scene.entities.find((e: any) => e.id === 'wall-pillar-3');
    expect(pillar).toBeDefined();
    expect(pillar.components.collision).toMatchObject({ width: 48, height: 96, type: 'solid' });
    expect(pillar.transform).toMatchObject({ x: 480, y: 300 });
  });

  it('topdown-speed-ring inserts a trigger-zone entity near spawn', async () => {
    const res = await aiService.processCommand({
      projectId: TOPDOWN_PROJECT,
      command: 'Add a speed boost ring near my spawn point',
    });
    const scene = parseChange(res);
    const ring = scene.entities.find((e: any) => e.id === 'trigger-speed-ring');
    expect(ring).toBeDefined();
    expect(ring.components.collision).toMatchObject({ type: 'trigger' });
    // Honest copy: deferred behavior is surfaced in summary/content.
    expect(res.changes![0].summary).toContain('deferred');
  });

  it('is idempotent for add-entity recipes (no duplicate entities)', async () => {
    const command = 'Add a stone pillar in the middle of the room';
    await aiService.processCommand({ projectId: TOPDOWN_PROJECT, command });
    const res2 = await aiService.processCommand({ projectId: TOPDOWN_PROJECT, command });
    const scene = parseChange(res2);
    const pillars = scene.entities.filter((e: any) => e.id === 'wall-pillar-3');
    expect(pillars).toHaveLength(1);
  });

  it('falls back to the generic mock path when the project has no scene file', async () => {
    const res = await aiService.processCommand({
      projectId: EMPTY_PROJECT,
      command: 'Move the orange platform further right',
    });
    // Legacy generic change response (scripts/player.ts), not a broken promise.
    expect(res.changes?.[0].path).toBe('scripts/player.ts');
  });

  it('non-recipe commands keep the legacy generic mock behavior', async () => {
    const res = await aiService.processCommand({
      projectId: PLATFORMER_PROJECT,
      command: 'add player movement',
    });
    expect(res.changes?.[0].path).toBe('scripts/player.ts');
  });
});
