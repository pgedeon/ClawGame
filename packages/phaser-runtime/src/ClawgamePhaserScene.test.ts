import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  Scene: class MockScene {},
  GameObjects: {},
  Input: {
    Keyboard: {
      KeyCodes: { W: 87, A: 65, S: 83, D: 68, SPACE: 32, UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39 },
    },
  },
}));

import { ClawgamePhaserScene } from './ClawgamePhaserScene';
import type { PhaserPreviewBootstrap, PhaserRuntimeErrorReporter } from './types';

function createBootstrap(overrides: Partial<PhaserPreviewBootstrap> = {}): PhaserPreviewBootstrap {
  return {
    sceneKey: 'preview',
    sceneName: 'Preview',
    backgroundColor: '#000000',
    bounds: { width: 320, height: 240 },
    assets: [],
    entities: [],
    metadata: { entityCount: 0, assetCount: 0 },
    ...overrides,
  };
}

describe('ClawgamePhaserScene error visibility', () => {
  it('reports broken entity creation instead of swallowing it', () => {
    const reporter: PhaserRuntimeErrorReporter = { reportError: vi.fn() };
    const scene = new ClawgamePhaserScene({ reporter });
    scene.setBootstrap(createBootstrap({
      entities: [
        {
          id: 'broken',
          type: 'player',
          x: 10,
          y: 20,
          width: 32,
          height: 32,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          body: { kind: 'none', width: 32, height: 32 },
        },
      ],
    }));

    Object.assign(scene, {
      add: {
        rectangle: vi.fn(() => {
          throw new Error('cannot create rectangle');
        }),
      },
      cameras: { main: { setBackgroundColor: vi.fn() } },
      physics: { world: { setBounds: vi.fn() } },
    });

    scene.create();

    expect(scene.getErrors()).toHaveLength(1);
    expect(scene.getErrors()[0]).toMatchObject({
      phase: 'entity-creation',
      context: { entityId: 'broken', entityType: 'player' },
    });
    expect(reporter.reportError).toHaveBeenCalledWith(
      'entity-creation',
      expect.any(Error),
      { entityId: 'broken', entityType: 'player' },
    );
  });

  it('reports failed asset loads', () => {
    const reporter: PhaserRuntimeErrorReporter = { reportError: vi.fn() };
    const scene = new ClawgamePhaserScene({ reporter });
    let loadErrorHandler: ((file: { key: string; url: string; type: string }) => void) | undefined;
    const load = {
      on: vi.fn((_event: string, handler: typeof loadErrorHandler) => {
        loadErrorHandler = handler;
        return load;
      }),
      image: vi.fn(),
      spritesheet: vi.fn(),
      atlas: vi.fn(),
    };

    Object.assign(scene, { load });
    scene.setBootstrap(createBootstrap({
      assets: [
        {
          key: 'asset:missing.png',
          assetRef: 'missing.png',
          kind: 'image',
          loadUrl: './missing.png',
          width: 32,
          height: 32,
        },
      ],
      metadata: { entityCount: 0, assetCount: 1 },
    }));

    scene.preload();
    loadErrorHandler?.({ key: 'asset:missing.png', url: './missing.png', type: 'image' });

    expect(load.image).toHaveBeenCalledWith('asset:missing.png', './missing.png');
    expect(scene.getErrors()[0]).toMatchObject({
      phase: 'asset-load',
      context: {
        key: 'asset:missing.png',
        url: './missing.png',
        type: 'image',
        assetRef: 'missing.png',
      },
    });
    expect(reporter.reportError).toHaveBeenCalledWith(
      'asset-load',
      expect.any(Error),
      expect.objectContaining({ key: 'asset:missing.png' }),
    );
  });
});

// ───────────────────── Generic gameplay wiring ─────────────────────

interface BodyMock {
  setVelocity: ReturnType<typeof vi.fn>;
  setVelocityX: ReturnType<typeof vi.fn>;
  setVelocityY: ReturnType<typeof vi.fn>;
  setSize: ReturnType<typeof vi.fn>;
  setCollideWorldBounds: ReturnType<typeof vi.fn>;
  setImmovable: ReturnType<typeof vi.fn>;
  setAllowGravity: ReturnType<typeof vi.fn>;
  onFloor: ReturnType<typeof vi.fn>;
  blocked: { down: boolean };
}

function createGameObjectMock(x: number, y: number): { sprite: Record<string, unknown>; body: BodyMock } {
  const body: BodyMock = {
    setVelocity: vi.fn(),
    setVelocityX: vi.fn(),
    setVelocityY: vi.fn(),
    setSize: vi.fn(),
    setCollideWorldBounds: vi.fn(),
    setImmovable: vi.fn(),
    setAllowGravity: vi.fn(),
    onFloor: vi.fn(() => false),
    blocked: { down: false },
  };
  return {
    body,
    sprite: {
      x,
      y,
      body,
      setRotation: vi.fn(),
      setScale: vi.fn(),
      setOrigin: vi.fn(),
      setDisplaySize: vi.fn(),
    },
  };
}

function createGameplayBootstrap(): PhaserPreviewBootstrap {
  return createBootstrap({
    physics: { gravity: { x: 0, y: 900 } },
    entities: [
      {
        id: 'player-1', type: 'player', x: 100, y: 350, width: 32, height: 48,
        rotation: 0, scaleX: 1, scaleY: 1, playerInput: true,
        movement: { speed: 200, jumpSpeed: 450 },
        body: { kind: 'dynamic', width: 32, height: 48 },
      },
      {
        id: 'platform-ground', type: 'obstacle', x: 400, y: 480, width: 960, height: 32,
        rotation: 0, scaleX: 1, scaleY: 1,
        body: { kind: 'static', width: 960, height: 32 },
      },
      {
        id: 'coin-1', type: 'collectible', x: 300, y: 330, width: 20, height: 20,
        rotation: 0, scaleX: 1, scaleY: 1,
        body: { kind: 'sensor', width: 20, height: 20 },
      },
      {
        id: 'enemy-1', type: 'enemy', x: 200, y: 100, width: 28, height: 28,
        rotation: 0, scaleX: 1, scaleY: 1,
        ai: { type: 'chase', speed: 100, targetEntity: 'player-1' },
        body: { kind: 'dynamic', width: 28, height: 28 },
      },
    ],
    metadata: { entityCount: 4, assetCount: 0 },
  });
}

interface SceneHarness {
  scene: InstanceType<typeof ClawgamePhaserScene>;
  objects: Map<string, ReturnType<typeof createGameObjectMock>>;
  collider: ReturnType<typeof vi.fn>;
  addKey: ReturnType<typeof vi.fn>;
  keyStates: Record<number, { isDown: boolean }>;
  cursorKeys: { left: { isDown: boolean }; right: { isDown: boolean }; up: { isDown: boolean }; down: { isDown: boolean } };
}

function createSceneHarness(options: { gameplay?: boolean }): SceneHarness {
  const scene = new ClawgamePhaserScene({ gameplay: options.gameplay });
  scene.setBootstrap(createGameplayBootstrap());

  const objects = new Map<string, ReturnType<typeof createGameObjectMock>>();
  for (const entity of (scene as unknown as { bootstrap: PhaserPreviewBootstrap }).bootstrap.entities) {
    objects.set(entity.id, createGameObjectMock(entity.x, entity.y));
  }

  const collider = vi.fn();
  const keyStates: Record<number, { isDown: boolean }> = {};
  for (const code of [87, 65, 83, 68, 32]) keyStates[code] = { isDown: false };
  const addKey = vi.fn((code: number) => keyStates[code]);
  const cursorKeys = {
    left: { isDown: false }, right: { isDown: false },
    up: { isDown: false }, down: { isDown: false },
  };

  Object.assign(scene, {
    add: {
      rectangle: vi.fn((_x: number, _y: number) => {
        // Return the pre-built mock for the next entity in creation order.
        const entry = objects.get(
          ((scene as unknown as { bootstrap: PhaserPreviewBootstrap }).bootstrap.entities)
            .map((e) => e.id)
            .find((id) => !((scene as unknown as { entitySprites: Map<string, unknown> }).entitySprites).has(id)),
        );
        return entry?.sprite ?? createGameObjectMock(0, 0).sprite;
      }),
      image: vi.fn(),
    },
    cameras: { main: { setBackgroundColor: vi.fn(), setBounds: vi.fn(), setScroll: vi.fn(), setZoom: vi.fn() } },
    physics: {
      world: { setBounds: vi.fn(), gravity: { x: 0, y: 0 } },
      add: { existing: vi.fn(), collider },
    },
    input: { keyboard: { createCursorKeys: vi.fn(() => cursorKeys), addKey } },
  });

  return { scene, objects, collider, addKey, keyStates, cursorKeys };
}

describe('ClawgamePhaserScene generic gameplay', () => {
  it('wires static-vs-dynamic colliders when gameplay is enabled (sensors excluded)', () => {
    const h = createSceneHarness({ gameplay: true });
    h.scene.create();

    expect(h.collider).toHaveBeenCalledTimes(1);
    const [staticArg, dynamicArg] = h.collider.mock.calls[0];
    expect(staticArg).toHaveLength(1); // platform-ground only
    expect(dynamicArg).toHaveLength(2); // player-1 + enemy-1
    expect(h.addKey).toHaveBeenCalledTimes(5);
    expect(h.scene.getErrors()).toEqual([]);
  });

  it('does not wire colliders or keyboard bindings by default', () => {
    const h = createSceneHarness({});
    h.scene.create();

    expect(h.collider).not.toHaveBeenCalled();
    expect(h.addKey).not.toHaveBeenCalled();
  });

  it('drives chase enemies toward their ai.targetEntity at ai.speed', () => {
    const h = createSceneHarness({ gameplay: true });
    h.scene.create();

    h.scene.update(0, 16);

    const enemyBody = h.objects.get('enemy-1')!.body;
    // enemy at (200,100) chases player at (100,350): direction (-100,250)/dist * speed 100
    const dist = Math.hypot(100 - 200, 350 - 100);
    expect(enemyBody.setVelocity).toHaveBeenCalledWith(
      ((100 - 200) / dist) * 100,
      ((350 - 100) / dist) * 100,
    );
  });

  it('runs platformer control: horizontal velocity from keys, jump on floor with Space', () => {
    const h = createSceneHarness({ gameplay: true });
    h.scene.create();

    h.cursorKeys.right.isDown = true;
    h.keyStates[32].isDown = true; // SPACE
    const playerBody = h.objects.get('player-1')!.body;
    playerBody.onFloor.mockReturnValue(true);

    h.scene.update(0, 16);

    expect(playerBody.setVelocityX).toHaveBeenCalledWith(200);
    expect(playerBody.setVelocityY).toHaveBeenCalledWith(-450);
  });

  it('ignores jump input while airborne', () => {
    const h = createSceneHarness({ gameplay: true });
    h.scene.create();

    h.keyStates[32].isDown = true;
    const playerBody = h.objects.get('player-1')!.body;
    playerBody.onFloor.mockReturnValue(false);

    h.scene.update(0, 16);

    expect(playerBody.setVelocityY).not.toHaveBeenCalledWith(-450);
  });

  it('uses 4-directional velocity for players without jumpSpeed (topdown mode)', () => {
    const h = createSceneHarness({ gameplay: true });
    h.scene.create();

    // Swap the controlled player to a topdown-style movement config.
    const sceneAny = h.scene as unknown as {
      bootstrap: PhaserPreviewBootstrap;
      playerEntityId: string | null;
    };
    sceneAny.bootstrap.entities[0].movement = { speed: 250 };

    h.cursorKeys.up.isDown = true;
    h.cursorKeys.left.isDown = true;

    h.scene.update(0, 16);

    const playerBody = h.objects.get('player-1')!.body;
    const expected = 250 * Math.SQRT1_2;
    expect(playerBody.setVelocity).toHaveBeenCalledWith(-expected, -expected);
  });

  it('maps W/S to vertical movement in topdown mode (WASD parity with arrows)', () => {
    const h = createSceneHarness({ gameplay: true });
    h.scene.create();

    const sceneAny = h.scene as unknown as {
      bootstrap: PhaserPreviewBootstrap;
      playerEntityId: string | null;
    };
    sceneAny.bootstrap.entities[0].movement = { speed: 250 };

    h.keyStates[87].isDown = true; // W
    h.keyStates[68].isDown = true; // D

    h.scene.update(0, 16);

    const playerBody = h.objects.get('player-1')!.body;
    const expected = 250 * Math.SQRT1_2;
    expect(playerBody.setVelocity).toHaveBeenCalledWith(expected, -expected);
  });

  it('disables gameplay and reports one error instead of spamming per-frame failures', () => {
    const h = createSceneHarness({ gameplay: true });
    h.scene.create();

    // Force a per-frame failure after setup succeeded.
    (h.scene as unknown as { updatePlayerControl: () => void }).updatePlayerControl = () => {
      throw new Error('control exploded');
    };
    const sceneAny = h.scene as unknown as { update: (t: number, d: number) => void };

    expect(() => sceneAny.update(0, 16)).not.toThrow();
    expect(() => sceneAny.update(16, 16)).not.toThrow();
    expect(h.scene.getErrors().filter((e) => e.phase === 'gameplay-update')).toHaveLength(1);
  });
});
