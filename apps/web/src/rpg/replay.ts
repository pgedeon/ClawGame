/**
 * @clawgame/web - Replay Recorder & Player
 * Deterministic replay capture for game preview sessions.
 * Part of M14: Playtest Lab + Publishing.
 *
 * Records input events and periodic state snapshots.
 * Replays them deterministically using fixed time steps.
 */

import type {
  PreviewReplayEntitySnapshot,
  PreviewReplayRuntimeSnapshot,
} from '../utils/previewReplayState';

/* ─── Types ─── */

export interface InputFrame {
  /** Monotonic time offset in ms from recording start */
  t: number;
  /** Key state bitmap: keys currently held */
  keys: string[];
  /** Optional: mouse/click position */
  click?: { x: number; y: number };
}

export interface StateSnapshot {
  /** Monotonic time offset in ms */
  t: number;
  /** Serialized runtime entity state */
  entities: PreviewReplayEntitySnapshot[];
  /** Player score, health, mana, etc. */
  stats: Record<string, number>;
  /** Preview-runtime state needed for seek/restore */
  runtime?: PreviewReplayRuntimeSnapshot;
}

export interface ReplayData {
  /** Recording metadata */
  meta: {
    recordedAt: string;
    durationMs: number;
    frameCount: number;
    projectId: string;
    gameVersion: string;
  };
  /** Fixed timestep used during recording (ms) */
  tickMs: number;
  /** Input frames */
  inputs: InputFrame[];
  /** Periodic state snapshots for verification (every ~1s) */
  snapshots: StateSnapshot[];
}

/* ─── Replay Recorder ─── */

export class ReplayRecorder {
  private startTime = 0;
  private inputs: InputFrame[] = [];
  private snapshots: StateSnapshot[] = [];
  private lastSnapshotT = 0;
  private projectId: string;
  private tickMs: number;
  private recording = false;

  constructor(projectId: string, tickMs = 16) {
    this.projectId = projectId;
    this.tickMs = tickMs;
  }

  start(): void {
    this.startTime = performance.now();
    this.inputs = [];
    this.snapshots = [];
    this.lastSnapshotT = 0;
    this.recording = true;
  }

  get isRecording(): boolean {
    return this.recording;
  }

  /** Record current input state at this frame */
  recordInput(keys: string[], click?: { x: number; y: number }): void {
    if (!this.recording) return;
    const t = performance.now() - this.startTime;
    // Only record if keys changed from last frame
    const last = this.inputs[this.inputs.length - 1];
    const keysChanged = !last || JSON.stringify(last.keys) !== JSON.stringify(keys);
    const clickChanged = click && (!last?.click || last.click.x !== click.x || last.click.y !== click.y);
    if (keysChanged || clickChanged) {
      this.inputs.push({ t, keys: [...keys], ...(click ? { click } : {}) });
    }
  }

  /** Record a periodic state snapshot */
  recordSnapshot(snapshot: Omit<StateSnapshot, 't'>): void {
    if (!this.recording) return;
    const t = performance.now() - this.startTime;
    // Snapshot every ~1000ms
    if (t - this.lastSnapshotT < 1000) return;
    this.lastSnapshotT = t;
    this.snapshots.push({
      t,
      entities: snapshot.entities.map((entity) => ({
        ...entity,
        transform: { ...entity.transform },
        ...(entity.patrolOrigin ? { patrolOrigin: { ...entity.patrolOrigin } } : {}),
        ...(entity.components ? { components: JSON.parse(JSON.stringify(entity.components)) } : {}),
      })),
      stats: { ...snapshot.stats },
      ...(snapshot.runtime ? { runtime: JSON.parse(JSON.stringify(snapshot.runtime)) } : {}),
    });
  }

  stop(): ReplayData {
    this.recording = false;
    const durationMs = performance.now() - this.startTime;
    return {
      meta: {
        recordedAt: new Date().toISOString(),
        durationMs: Math.round(durationMs),
        frameCount: this.inputs.length,
        projectId: this.projectId,
        gameVersion: '0.20.0',
      },
      tickMs: this.tickMs,
      inputs: [...this.inputs],
      snapshots: [...this.snapshots],
    };
  }
}

/* ─── Replay Player ─── */

export class ReplayPlayer {
  private data: ReplayData;
  private currentTime = 0;
  private playing = false;
  private inputIndex = 0;
  private speed = 1;

  constructor(data: ReplayData) {
    this.data = data;
  }

  get durationMs(): number {
    return this.data.meta.durationMs;
  }

  get currentTimeMs(): number {
    return this.currentTime;
  }

  get progress(): number {
    return this.data.meta.durationMs > 0
      ? Math.min(1, this.currentTime / this.data.meta.durationMs)
      : 0;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get currentSpeed(): number {
    return this.speed;
  }

  get tickMs(): number {
    return this.data.tickMs;
  }

  /** Get the input state at a given time offset */
  getInputsAt(t: number): InputFrame | null {
    // Find the last input frame before or at time t
    let frame: InputFrame | null = null;
    for (let i = 0; i < this.data.inputs.length; i++) {
      if (this.data.inputs[i].t <= t) {
        frame = this.data.inputs[i];
      } else {
        break;
      }
    }
    return frame;
  }

  /** Get the nearest state snapshot to a given time */
  getSnapshotAt(t: number): StateSnapshot | null {
    let nearest: StateSnapshot | null = null;
    let minDist = Infinity;
    for (const snap of this.data.snapshots) {
      const dist = Math.abs(snap.t - t);
      if (dist < minDist) {
        minDist = dist;
        nearest = snap;
      }
    }
    return nearest;
  }

  /** Get the latest state snapshot at or before a given time */
  getSnapshotBeforeOrAt(t: number): StateSnapshot | null {
    let snapshot: StateSnapshot | null = null;
    for (const candidate of this.data.snapshots) {
      if (candidate.t > t) break;
      snapshot = candidate;
    }
    return snapshot;
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(4, speed));
  }

  seekTo(progress: number): InputFrame | null {
    this.currentTime = Math.max(0, Math.min(1, progress)) * this.data.meta.durationMs;
    this.inputIndex = 0;
    return this.getInputsAt(this.currentTime);
  }

  seekToTime(timeMs: number): InputFrame | null {
    const clamped = Math.max(0, Math.min(this.data.meta.durationMs, timeMs));
    this.currentTime = clamped;
    this.inputIndex = 0;
    if (this.currentTime >= this.data.meta.durationMs) {
      this.playing = false;
    }
    return this.getInputsAt(this.currentTime);
  }

  /** Advance replay by deltaMs. Returns current input state or null if ended. */
  tick(deltaMs: number): InputFrame | null {
    if (!this.playing) return this.getInputsAt(this.currentTime);
    this.currentTime += deltaMs * this.speed;
    if (this.currentTime >= this.data.meta.durationMs) {
      this.playing = false;
      this.currentTime = this.data.meta.durationMs;
      return null;
    }
    return this.getInputsAt(this.currentTime);
  }

  /** Advance replay even while paused. Negative values step backwards. */
  step(deltaMs: number): InputFrame | null {
    const nextTime = this.currentTime + deltaMs;
    return this.seekToTime(nextTime);
  }

  reset(): void {
    this.currentTime = 0;
    this.inputIndex = 0;
    this.playing = false;
    this.speed = 1;
  }
}

/* ─── Serialization helpers ─── */

export function serializeReplay(data: ReplayData): string {
  return JSON.stringify(data);
}

export function deserializeReplay(json: string): ReplayData {
  return JSON.parse(json) as ReplayData;
}

export function downloadReplay(data: ReplayData, filename?: string): void {
  const blob = new Blob([serializeReplay(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `replay-${data.meta.projectId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
