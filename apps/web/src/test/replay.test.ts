import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReplayPlayer, ReplayRecorder, type ReplayData } from '../rpg/replay';

describe('ReplayRecorder', () => {
  let now = 0;

  beforeEach(() => {
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deduplicates unchanged input frames and records periodic snapshots', () => {
    const recorder = new ReplayRecorder('project-1');

    recorder.start();
    recorder.recordInput(['a']);
    now = 100;
    recorder.recordInput(['a']);
    now = 1200;
    recorder.recordSnapshot([{ id: 'player', transform: { x: 10, y: 20 } }], { score: 50, health: 80 });
    now = 1600;
    const replay = recorder.stop();

    expect(replay.inputs).toHaveLength(1);
    expect(replay.inputs[0].keys).toEqual(['a']);
    expect(replay.snapshots).toHaveLength(1);
    expect(replay.snapshots[0].entities).toEqual([{ id: 'player', x: 10, y: 20 }]);
    expect(replay.meta.durationMs).toBe(1600);
  });
});

describe('ReplayPlayer', () => {
  const replayData: ReplayData = {
    meta: {
      recordedAt: '2026-04-11T00:00:00.000Z',
      durationMs: 3000,
      frameCount: 3,
      projectId: 'project-1',
      gameVersion: '0.20.0',
    },
    tickMs: 16,
    inputs: [
      { t: 0, keys: ['d'] },
      { t: 1200, keys: ['space'] },
      { t: 2000, keys: [] },
    ],
    snapshots: [
      { t: 1000, entities: [{ id: 'player', x: 50, y: 50 }], stats: { score: 10 } },
      { t: 2500, entities: [{ id: 'player', x: 90, y: 75 }], stats: { score: 25 } },
    ],
  };

  it('plays, pauses, seeks, and resets over replay frames', () => {
    const player = new ReplayPlayer(replayData);

    player.play();
    expect(player.tick(600)?.keys).toEqual(['d']);
    expect(player.progress).toBeGreaterThan(0);

    player.pause();
    expect(player.tick(600)?.keys).toEqual(['d']);

    player.seekTo(0.5);
    expect(player.getInputsAt(1500)?.keys).toEqual(['space']);
    expect(player.getSnapshotAt(2400)?.stats.score).toBe(25);

    player.reset();
    expect(player.progress).toBe(0);
    expect(player.isPlaying).toBe(false);
  });
});
