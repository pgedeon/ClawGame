/**
 * Replay System Tests
 * Tests for ReplayRecorder and ReplayPlayer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplayRecorder, ReplayPlayer, serializeReplay, deserializeReplay, type ReplayData } from '../rpg/replay';

describe('ReplayRecorder', () => {
  let recorder: ReplayRecorder;

  beforeEach(() => {
    recorder = new ReplayRecorder('test-project', 16);
    // Mock performance.now for deterministic tests
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      time += 16;
      return time;
    });
  });

  it('starts recording', () => {
    recorder.start();
    expect(recorder.isRecording).toBe(true);
  });

  it('stops recording and returns data', () => {
    recorder.start();
    const data = recorder.stop();
    expect(data.meta.projectId).toBe('test-project');
    expect(data.tickMs).toBe(16);
    expect(data.inputs).toEqual([]);
    expect(data.snapshots).toEqual([]);
  });

  it('is not recording after stop', () => {
    recorder.start();
    recorder.stop();
    expect(recorder.isRecording).toBe(false);
  });

  it('records input changes', () => {
    recorder.start();
    recorder.recordInput(['ArrowLeft']);
    recorder.recordInput(['ArrowLeft', 'Space']);
    recorder.recordInput(['ArrowLeft', 'Space']); // duplicate — should be skipped
    const data = recorder.stop();
    expect(data.inputs.length).toBe(2);
    expect(data.inputs[0].keys).toEqual(['ArrowLeft']);
    expect(data.inputs[1].keys).toEqual(['ArrowLeft', 'Space']);
  });

  it('skips duplicate input frames', () => {
    recorder.start();
    recorder.recordInput(['A']);
    recorder.recordInput(['A']);
    recorder.recordInput(['A']);
    const data = recorder.stop();
    expect(data.inputs.length).toBe(1);
  });

  it('records click positions', () => {
    recorder.start();
    recorder.recordInput([], { x: 100, y: 200 });
    recorder.recordInput([], { x: 150, y: 200 });
    const data = recorder.stop();
    expect(data.inputs.length).toBe(2);
    expect(data.inputs[0].click).toEqual({ x: 100, y: 200 });
    expect(data.inputs[1].click).toEqual({ x: 150, y: 200 });
  });

  it('does not record when not recording', () => {
    recorder.recordInput(['A']);
    const data = recorder.stop();
    expect(data.inputs.length).toBe(0);
  });
});

describe('ReplayPlayer', () => {
  function makeTestReplay(durationMs = 5000): ReplayData {
    return {
      meta: {
        recordedAt: '2026-01-01T00:00:00Z',
        durationMs,
        frameCount: 3,
        projectId: 'test',
        gameVersion: '0.20.0',
      },
      tickMs: 16,
      inputs: [
        { t: 0, keys: ['ArrowRight'] },
        { t: 1000, keys: ['ArrowRight', 'Space'] },
        { t: 2500, keys: [] },
      ],
      snapshots: [
        { t: 0, entities: [], stats: { health: 100 } },
        { t: 1000, entities: [], stats: { health: 80 } },
        { t: 3000, entities: [], stats: { health: 50 } },
      ],
    };
  }

  let player: ReplayPlayer;

  beforeEach(() => {
    player = new ReplayPlayer(makeTestReplay());
  });

  it('has correct duration', () => {
    expect(player.durationMs).toBe(5000);
  });

  it('starts at time 0', () => {
    expect(player.currentTimeMs).toBe(0);
  });

  it('starts paused', () => {
    expect(player.isPlaying).toBe(false);
  });

  it('play/pause toggles playing state', () => {
    player.play();
    expect(player.isPlaying).toBe(true);
    player.pause();
    expect(player.isPlaying).toBe(false);
  });

  it('getInputsAt returns correct frame', () => {
    expect(player.getInputsAt(0)?.keys).toEqual(['ArrowRight']);
    expect(player.getInputsAt(500)?.keys).toEqual(['ArrowRight']);
    expect(player.getInputsAt(1000)?.keys).toEqual(['ArrowRight', 'Space']);
    expect(player.getInputsAt(2000)?.keys).toEqual(['ArrowRight', 'Space']);
    expect(player.getInputsAt(2500)?.keys).toEqual([]);
    expect(player.getInputsAt(4000)?.keys).toEqual([]);
    // Beyond last input but still returns last known state
    // (null only when no inputs exist before t)
    expect(player.getInputsAt(6000)?.keys).toEqual([]);
  });

  it('getSnapshotAt returns nearest snapshot', () => {
    expect(player.getSnapshotAt(0)?.stats.health).toBe(100);
    expect(player.getSnapshotAt(500)?.stats.health).toBe(100);
    expect(player.getSnapshotAt(1500)?.stats.health).toBe(80);
    expect(player.getSnapshotAt(3500)?.stats.health).toBe(50);
  });

  it('getSnapshotBeforeOrAt returns latest snapshot at or before time', () => {
    expect(player.getSnapshotBeforeOrAt(0)?.stats.health).toBe(100);
    expect(player.getSnapshotBeforeOrAt(999)?.stats.health).toBe(100);
    expect(player.getSnapshotBeforeOrAt(1000)?.stats.health).toBe(80);
    expect(player.getSnapshotBeforeOrAt(2999)?.stats.health).toBe(80);
    expect(player.getSnapshotBeforeOrAt(3000)?.stats.health).toBe(50);
  });

  it('tick advances time when playing', () => {
    player.play();
    player.tick(500);
    expect(player.currentTimeMs).toBe(500);
    player.tick(500);
    expect(player.currentTimeMs).toBe(1000);
  });

  it('tick does not advance when paused', () => {
    player.tick(500);
    expect(player.currentTimeMs).toBe(0);
  });

  it('tick returns null at end of replay', () => {
    player.play();
    player.tick(4000);
    expect(player.currentTimeMs).toBe(4000);
    expect(player.isPlaying).toBe(true);
    player.tick(2000); // total 6000 > 5000 duration
    expect(player.isPlaying).toBe(false);
  });

  it('seekTo sets progress correctly', () => {
    player.seekTo(0.5);
    expect(player.currentTimeMs).toBe(2500);
    expect(player.progress).toBe(0.5);
  });

  it('seekTo clamps to [0, 1]', () => {
    player.seekTo(-1);
    expect(player.currentTimeMs).toBe(0);
    player.seekTo(2);
    expect(player.currentTimeMs).toBe(5000);
  });

  it('seekToTime sets absolute time', () => {
    player.seekToTime(2000);
    expect(player.currentTimeMs).toBe(2000);
  });

  it('seekToTime clamps to valid range', () => {
    player.seekToTime(-100);
    expect(player.currentTimeMs).toBe(0);
    player.seekToTime(99999);
    expect(player.currentTimeMs).toBe(5000);
    expect(player.isPlaying).toBe(false); // at end
  });

  it('step advances even while paused', () => {
    const frame = player.step(1000);
    expect(player.currentTimeMs).toBe(1000);
    expect(frame?.keys).toEqual(['ArrowRight', 'Space']);
  });

  it('step backwards works', () => {
    player.seekToTime(3000);
    player.step(-1000);
    expect(player.currentTimeMs).toBe(2000);
  });

  it('setSpeed clamps to [0.25, 4]', () => {
    player.setSpeed(0.1);
    expect(player.currentSpeed).toBe(0.25);
    player.setSpeed(10);
    expect(player.currentSpeed).toBe(4);
    player.setSpeed(2);
    expect(player.currentSpeed).toBe(2);
  });

  it('reset restores initial state', () => {
    player.play();
    player.setSpeed(2);
    player.seekTo(0.8);
    player.reset();
    expect(player.currentTimeMs).toBe(0);
    expect(player.isPlaying).toBe(false);
    expect(player.currentSpeed).toBe(1);
  });

  it('tick respects speed multiplier', () => {
    player.play();
    player.setSpeed(2);
    player.tick(500);
    expect(player.currentTimeMs).toBe(1000);
  });
});

describe('Replay serialization', () => {
  it('serializes and deserializes replay data', () => {
    const original: ReplayData = {
      meta: {
        recordedAt: '2026-01-01T00:00:00Z',
        durationMs: 5000,
        frameCount: 2,
        projectId: 'test',
        gameVersion: '0.20.0',
      },
      tickMs: 16,
      inputs: [
        { t: 0, keys: ['A'] },
        { t: 100, keys: ['B'] },
      ],
      snapshots: [
        { t: 0, entities: [], stats: { score: 0 } },
      ],
    };

    const json = serializeReplay(original);
    expect(typeof json).toBe('string');

    const restored = deserializeReplay(json);
    expect(restored.meta.projectId).toBe('test');
    expect(restored.meta.durationMs).toBe(5000);
    expect(restored.inputs.length).toBe(2);
    expect(restored.inputs[0].keys).toEqual(['A']);
    expect(restored.snapshots.length).toBe(1);
  });
});
