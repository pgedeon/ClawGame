/**
 * Template integration tests — headless Engine tick harness.
 *
 * GOAL: prove each shipped template scene (apps/web CreateProjectPage templates)
 * is loadable through the canonical SceneLoader path and tickable through the
 * engine core (Engine + systems), so future refactors cannot silently break
 * scene loading.
 *
 * Headless strategy:
 * - Engine constructed WITHOUT canvas → RenderSystem.update() no-ops (its ctx is
 *   null) and InputSystem never binds DOM listeners. This is the injectable
 *   seam: omitting `canvas` IS the null-renderer adapter.
 * - Fixed-dt stepping uses Engine.tick(deltaTime) which shares the exact system
 *   update order with the rAF-driven gameLoop (both call private updateScene),
 *   so what these tests exercise is what the browser loop runs.
 *
 * Canonical data: templateScenes (extracted verbatim from CreateProjectPage) —
 * the same JSON written to scenes/main-scene.json when a user creates a project.
 * Template entities ship WITHOUT the runtime `type` field; the harness infers it
 * deterministically from components (see inferEntityType) purely to satisfy
 * SerializableScene typing. toRuntimeEntity tolerates absence at runtime.
 */

import { describe, it, expect } from 'vitest';
import { SceneLoader } from './SceneLoader';
import type { SceneLoadResult } from './SceneLoader';
import { Engine } from './Engine';
import type { Entity, EntityType, Scene, SerializableScene } from './types';
import { templateScenes } from '../../../apps/web/src/templates/templateScenes';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const FIXED_DT = 1 / 60;
const TICK_FRAMES = 120;

/** Collectible-ish collision types used across templates. */
const COLLECTIBLE_TYPES = new Set(['collectible', 'item', 'powerup', 'treasure']);

/**
 * Infer SerializableEntity.type from template components.
 * Templates ship without `type`; this mirrors how components determine role.
 */
function inferEntityType(entityId: string, components: Record<string, unknown>): EntityType {
  if (components.playerInput) return 'player';
  if (components.ai) return 'enemy';
  if (components.npc) return 'npc';
  const collisionType = (components.collision as { type?: string } | undefined)?.type;
  if (collisionType && COLLECTIBLE_TYPES.has(collisionType)) return 'collectible';
  if (components.platform || entityId.startsWith('platform')) return 'platform';
  return 'obstacle';
}

interface Harness {
  engine: Engine;
  scene: Scene;
  loadResult: SceneLoadResult;
  sourceEntityCount: number;
}

/**
 * Load one shipped template scene into a fresh headless Engine via SceneLoader
 * (the single canonical loading path shared by editor preview, play, export).
 */
async function loadTemplate(key: keyof typeof templateScenes): Promise<Harness> {
  const template = templateScenes[key];
  const serializable: SerializableScene = {
    name: template.name,
    entities: template.entities.map((e) => ({
      id: e.id,
      name: e.id,
      type: inferEntityType(e.id, e.components),
      transform: e.transform,
      components: e.components,
    })),
  };

  const loader = new SceneLoader({ emitEvents: false });
  // No canvas option → headless: RenderSystem no-ops, InputSystem unbound.
  const engine = new Engine({ width: WORLD_WIDTH, height: WORLD_HEIGHT });
  const loadResult = await loader.loadIntoEngine(serializable, engine);
  return { engine, scene: engine.getScene()!, loadResult, sourceEntityCount: template.entities.length };
}

/** Tick the engine N frames with fixed dt; rethrows any system crash. */
function tickFrames(engine: Engine, frames: number): void {
  for (let i = 0; i < frames; i++) {
    engine.tick(FIXED_DT);
  }
}

function entities(scene: Scene): Entity[] {
  return Array.from(scene.entities.values());
}

/** Guards against NaN/Infinity poisoning of transforms and velocities. */
function expectAllNumericStateFinite(scene: Scene): void {
  for (const entity of entities(scene)) {
    const { x, y, rotation } = entity.transform;
    expect(Number.isFinite(x), `${entity.id}.transform.x finite`).toBe(true);
    expect(Number.isFinite(y), `${entity.id}.transform.y finite`).toBe(true);
    expect(Number.isFinite(rotation ?? 0), `${entity.id}.transform.rotation finite`).toBe(true);

    const movement = entity.components.get('movement') as { vx: number; vy: number } | undefined;
    if (movement) {
      expect(Number.isFinite(movement.vx), `${entity.id}.movement.vx finite`).toBe(true);
      expect(Number.isFinite(movement.vy), `${entity.id}.movement.vy finite`).toBe(true);
    }
  }
}

/**
 * World-bounds containment for DYNAMIC bodies: MovementSystem clamps
 * movement-havers, PhysicsSystem clamps bodies with movement or physics.
 * Static scenery (walls, signs, goal flag at x=870) legitimately keeps its
 * shipped position and is never repositioned by the engine.
 */
function expectDynamicBodiesWithinWorldBounds(scene: Scene): void {
  for (const entity of entities(scene)) {
    const dynamic = entity.components.has('movement') || entity.components.has('physics');
    if (!dynamic) continue;
    expect(entity.transform.x).toBeGreaterThanOrEqual(0);
    expect(entity.transform.x).toBeLessThanOrEqual(WORLD_WIDTH);
    expect(entity.transform.y).toBeGreaterThanOrEqual(0);
    expect(entity.transform.y).toBeLessThanOrEqual(WORLD_HEIGHT);
  }
}

function getPosition(scene: Scene, entityId: string): { x: number; y: number } {
  const entity = scene.entities.get(entityId);
  if (!entity) throw new Error(`entity not found: ${entityId}`);
  return { x: entity.transform.x, y: entity.transform.y };
}

// ─────────────────────────── Platformer ───────────────────────────

describe('template integration: platformer (headless Engine tick harness)', () => {
  it('loads all 12 entities through SceneLoader with no missing assets (protects scene JSON → runtime conversion)', async () => {
    const h = await loadTemplate('platformer');
    expect(h.loadResult.entityCount).toBe(h.sourceEntityCount);
    expect(h.loadResult.missingAssets).toEqual([]);
    expect(h.scene.entities.size).toBe(12);
  });

  it('ticks 120 frames at fixed dt without any system throwing (protects full system pipeline on real template data)', async () => {
    const h = await loadTemplate('platformer');
    expect(() => tickFrames(h.engine, TICK_FRAMES)).not.toThrow();
  });

  it('keeps entity count stable over 120 ticks (protects against unintended despawns; no projectiles here)', async () => {
    const h = await loadTemplate('platformer');
    tickFrames(h.engine, TICK_FRAMES);
    expect(h.scene.entities.size).toBe(h.sourceEntityCount);
  });

  it('keeps every transform and velocity finite after 120 ticks (protects against NaN drift)', async () => {
    const h = await loadTemplate('platformer');
    tickFrames(h.engine, TICK_FRAMES);
    expectAllNumericStateFinite(h.scene);
  });

  it('keeps every dynamic body inside world bounds after 120 ticks (protects clamp behavior)', async () => {
    const h = await loadTemplate('platformer');
    tickFrames(h.engine, TICK_FRAMES);
    expectDynamicBodiesWithinWorldBounds(h.scene);
  });

  // DOCUMENTED FINDING (not forced): the platformer template stores gravity on
  // the MOVEMENT component (movement.gravity: 900), but engine PhysicsSystem
  // only applies gravity from the PHYSICS component (physics.gravity). Under
  // the pure engine loop the player therefore does not fall — shipped game
  // scripts implement gravity themselves. Aligning the two is a product
  // decision, deliberately not patched here.

  it('leaves the idle player exactly at spawn (documents that template gravity sits on movement.gravity, which engine PhysicsSystem ignores)', async () => {
    const h = await loadTemplate('platformer');
    tickFrames(h.engine, TICK_FRAMES);
    expect(getPosition(h.scene, 'player-1')).toEqual({ x: 100, y: 350 });

    // Static scenery must not move either: coins and goal keep shipped positions.
    expect(getPosition(h.scene, 'coin-1')).toEqual({ x: 300, y: 330 });
    expect(getPosition(h.scene, 'goal-flag')).toEqual({ x: 870, y: 360 });
  });
});

// ─────────────────────────── Top-Down Action ───────────────────────────

describe('template integration: topdown (headless Engine tick harness)', () => {
  it('loads all 14 entities through SceneLoader with no missing assets (protects scene JSON → runtime conversion)', async () => {
    const h = await loadTemplate('topdown');
    expect(h.loadResult.entityCount).toBe(h.sourceEntityCount);
    expect(h.loadResult.missingAssets).toEqual([]);
    expect(h.scene.entities.size).toBe(14);
  });

  it('ticks 120 frames at fixed dt without any system throwing (protects full system pipeline on real template data)', async () => {
    const h = await loadTemplate('topdown');
    expect(() => tickFrames(h.engine, TICK_FRAMES)).not.toThrow();
  });

  it('keeps entity count stable over 120 ticks (protects against unintended despawns)', async () => {
    const h = await loadTemplate('topdown');
    tickFrames(h.engine, TICK_FRAMES);
    expect(h.scene.entities.size).toBe(h.sourceEntityCount);
  });

  it('keeps every transform and velocity finite after 120 ticks (protects against NaN drift)', async () => {
    const h = await loadTemplate('topdown');
    tickFrames(h.engine, TICK_FRAMES);
    expectAllNumericStateFinite(h.scene);
  });

  it('keeps every dynamic body inside world bounds after 120 ticks (protects clamp behavior)', async () => {
    const h = await loadTemplate('topdown');
    tickFrames(h.engine, TICK_FRAMES);
    expectDynamicBodiesWithinWorldBounds(h.scene);
  });

  it('leaves the idle player exactly at spawn (protects zero-input determinism)', async () => {
    const h = await loadTemplate('topdown');
    tickFrames(h.engine, TICK_FRAMES);
    expect(getPosition(h.scene, 'player-1')).toEqual({ x: 400, y: 350 });
  });

  // DOCUMENTED FINDING (not forced): template chase enemies carry `ai` but NO
  // `movement` component, so AISystem patrol/chase (which writes through a
  // MovementComponent) is inert under the pure engine loop. In the shipped game
  // the per-template script drives enemy movement instead. If engine-side chase
  // is ever desired, templates need movement components on enemies — a product
  // decision, deliberately not patched here.

  it('leaves chase enemies stationary (documents that AISystem requires a movement component the template does not ship)', async () => {
    const h = await loadTemplate('topdown');
    tickFrames(h.engine, TICK_FRAMES);
    expect(getPosition(h.scene, 'enemy-1')).toEqual({ x: 600, y: 200 });
    expect(getPosition(h.scene, 'enemy-4')).toEqual({ x: 150, y: 150 });
  });
});

// ─────────────────────────── Dialogue Adventure ───────────────────────────

describe('template integration: dialogue (headless Engine tick harness)', () => {
  it('loads all 8 entities through SceneLoader with no missing assets (protects scene JSON → runtime conversion)', async () => {
    const h = await loadTemplate('dialogue');
    expect(h.loadResult.entityCount).toBe(h.sourceEntityCount);
    expect(h.loadResult.missingAssets).toEqual([]);
    expect(h.scene.entities.size).toBe(8);
  });

  it('ticks 120 frames at fixed dt without any system throwing (protects full system pipeline on real template data)', async () => {
    const h = await loadTemplate('dialogue');
    expect(() => tickFrames(h.engine, TICK_FRAMES)).not.toThrow();
  });

  it('keeps entity count stable over 120 ticks (protects against unintended despawns)', async () => {
    const h = await loadTemplate('dialogue');
    tickFrames(h.engine, TICK_FRAMES);
    expect(h.scene.entities.size).toBe(h.sourceEntityCount);
  });

  it('keeps every transform and velocity finite after 120 ticks (protects against NaN drift)', async () => {
    const h = await loadTemplate('dialogue');
    tickFrames(h.engine, TICK_FRAMES);
    expectAllNumericStateFinite(h.scene);
  });

  it('keeps every dynamic body inside world bounds after 120 ticks (protects clamp behavior)', async () => {
    const h = await loadTemplate('dialogue');
    tickFrames(h.engine, TICK_FRAMES);
    expectDynamicBodiesWithinWorldBounds(h.scene);
  });

  it('leaves the whole scene static without input — NPCs, signs, door, key unmoved (protects zero-input determinism)', async () => {
    const h = await loadTemplate('dialogue');
    tickFrames(h.engine, TICK_FRAMES);
    expect(getPosition(h.scene, 'player-1')).toEqual({ x: 400, y: 400 });
    expect(getPosition(h.scene, 'npc-shopkeeper')).toEqual({ x: 250, y: 280 });
    expect(getPosition(h.scene, 'sign-village')).toEqual({ x: 400, y: 300 });
    expect(getPosition(h.scene, 'locked-door')).toEqual({ x: 720, y: 320 });
    expect(getPosition(h.scene, 'key-golden')).toEqual({ x: 440, y: 320 });
  });
});

// ─────────────────────────── Harness safety ───────────────────────────

describe('template integration: headless Engine safety', () => {
  it('Engine.tick is a safe no-op when no scene is set (protects headless construction without canvas)', () => {
    const engine = new Engine({ width: WORLD_WIDTH, height: WORLD_HEIGHT });
    expect(() => engine.tick(FIXED_DT)).not.toThrow();
    expect(engine.getScene()).toBeNull();
  });
});
