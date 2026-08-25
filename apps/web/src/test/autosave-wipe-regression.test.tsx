/**
 * Regression tests for the CRITICAL scene-editor autosave wipe bug
 * (docs/qa/known_issues.md, found 2026-08-25 session-19 UNIT 2 check 3).
 *
 * The bug: SceneEditorPage wired `useAutosave(scene, data => api.writeFile(...,
 * JSON.stringify(data)))` against the RAW editor scene. The editor scene stores
 * entities in a JS Map and `JSON.stringify(map)` emits `{}` — so every autosave
 * wiped `scenes/main-scene.json` to `{"entities":{}}` (silent project data loss).
 *
 * The fix under test:
 * 1. autosave saveFn serializes via `serializeEditorScene` (Map → entity array)
 * 2. saves are skipped until the first real edit (no null→loaded write-back)
 * 3. a never-loaded (null) scene is never saved
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entity, Scene } from '@clawgame/engine';
import { useAutosave } from '../components/scene-editor/useAutosave';
import {
  createDefaultEditorScene,
  deserializeEditorScene,
  serializeEditorScene,
} from '../utils/sceneEditorScene';

/** Mirror of the FIXED SceneEditorPage autosave saveFn wiring (serialization part). */
function buildAutosaveSaveFn(writes: string[]) {
  return async (data: unknown) => {
    if (!data) return;
    writes.push(serializeEditorScene(data as Scene));
  };
}

function makeLoadedScene(): Scene {
  return deserializeEditorScene({
    name: 'Main Scene',
    entities: [
      {
        id: 'player-1',
        type: 'player',
        transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
        components: {
          playerInput: true,
          movement: { vx: 0, vy: 0, speed: 200 },
          sprite: { width: 32, height: 48, color: '#3b82f6' },
        },
      },
      {
        id: 'platform-1',
        type: 'obstacle',
        transform: { x: 200, y: 420, rotation: 0, scaleX: 1, scaleY: 1 },
        components: {
          collision: { width: 120, height: 24, type: 'wall' },
        },
      },
    ],
  });
}

describe('scene editor autosave wipe regression', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('documents the old bug: raw JSON.stringify of the editor scene emits entities as {}', () => {
    const scene = createDefaultEditorScene();
    expect(scene.entities).toBeInstanceOf(Map);
    const rawStringified = JSON.parse(JSON.stringify(scene));
    // This is exactly what the old autosave wrote to disk.
    expect(rawStringified.entities).toEqual({});
  });

  it('autosave output contains the serialized entities ARRAY with full entity data (not {})', async () => {
    const scene = makeLoadedScene();
    const writes: string[] = [];

    renderHook(() =>
      useAutosave(scene, buildAutosaveSaveFn(writes), 30000, 2000, true),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100); // past the 2s debounce
    });

    expect(writes).toHaveLength(1);
    const parsed = JSON.parse(writes[0]);
    expect(Array.isArray(parsed.entities)).toBe(true);
    expect(parsed.entities).toHaveLength(2);
    expect(parsed.entities.map((e: { id: string }) => e.id)).toEqual(['player-1', 'platform-1']);
    expect(parsed.entities[0].components.playerInput).toBe(true);
    expect(parsed.entities[1].components.collision.type).toBe('wall');
    // Byte-for-byte identical to the manual Save button path.
    expect(parsed).toEqual(JSON.parse(serializeEditorScene(scene)));
  });

  it('autosave output round-trips through deserializeEditorScene (reload keeps every entity)', async () => {
    const scene = makeLoadedScene();
    const writes: string[] = [];

    renderHook(() =>
      useAutosave(scene, buildAutosaveSaveFn(writes), 30000, 2000, true),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    const reloaded = deserializeEditorScene(JSON.parse(writes[0]));
    expect(reloaded.entities.size).toBe(2);
    expect(reloaded.entities.get('player-1')?.type).toBe('player');
    expect(reloaded.entities.get('platform-1')?.type).toBe('obstacle');
  });

  it('does not save before the first real edit (loaded baseline is not dirty)', async () => {
    const loaded = makeLoadedScene(); // identity baseline set by loadProject
    const writes: string[] = [];
    let currentScene: Scene | null = loaded;
    let enabled = false; // page computes: scene !== null && scene !== baseline

    renderHook(() =>
      useAutosave(currentScene, buildAutosaveSaveFn(writes), 30000, 2000, enabled),
    );

    // Past debounce AND several 30s intervals — nothing may be written.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(95000);
    });
    expect(writes).toHaveLength(0);
  });

  it('never saves a never-loaded (null) scene even when armed', async () => {
    const writes: string[] = [];
    let currentScene: Scene | null = null;
    let enabled = true;

    renderHook(() =>
      useAutosave(currentScene, buildAutosaveSaveFn(writes), 30000, 2000, enabled),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(95000);
    });
    expect(writes).toHaveLength(0);
  });

  it('saves after the first real edit, with the latest edited data', async () => {
    const loaded = makeLoadedScene();
    const writes: string[] = [];
    let currentScene: Scene | null = loaded;
    let enabled = false;

    const { rerender } = renderHook(() =>
      useAutosave(currentScene, buildAutosaveSaveFn(writes), 30000, 2000, enabled),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(32000);
    });
    expect(writes).toHaveLength(0);

    // User adds an entity in the editor → new scene object identity (as all
    // SceneEditorPage mutation handlers do) → page arms autosave.
    const template = Array.from(loaded.entities.values())[0] as Entity;
    const added: Entity = { ...template, id: 'coin-1', name: 'Coin' };
    currentScene = {
      ...loaded,
      entities: new Map(loaded.entities).set(added.id, added),
    };
    enabled = true;
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100); // one debounced write
    });

    expect(writes).toHaveLength(1);
    const parsed = JSON.parse(writes[0]);
    expect(Array.isArray(parsed.entities)).toBe(true);
    expect(parsed.entities.map((e: { id: string }) => e.id)).toContain('coin-1');
    expect(parsed.entities).toHaveLength(3);

    // Further idle intervals after that edit must not duplicate-spam new payloads
    // beyond idempotent re-writes of the SAME content.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    for (const w of writes) {
      expect(JSON.parse(w)).toEqual(parsed);
    }
  });
});
