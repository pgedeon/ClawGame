/**
 * Activation funnel event log — onboarding design §4 (storage-only).
 *
 * Principles: no telemetry server, no network egress, no accounts, no PII.
 * Props are limited to ids/enums/counters — never prompt text, project names,
 * file contents, keys, or IPs. Slice 2 wires the chip-funnel events
 * (ai_suggestion_shown / ai_prompt_submitted / edit_applied); the remaining
 * funnel events land with slice 3.
 *
 * Storage: localStorage ring buffer (cap 500, drop oldest). Every access is
 * try/catch-wrapped — unavailable storage degrades to a silent no-op.
 */

export type ActivationEventProps = Record<string, string | number | boolean | undefined>;

export interface ActivationEvent {
  /** ISO8601 timestamp. */
  ts: string;
  /** Event name from the §4 schema (snake_case). */
  name: string;
  props?: ActivationEventProps;
}

export const ACTIVATION_EVENTS_STORAGE_KEY = 'clawgame.events.v1';
const MAX_EVENTS = 500;

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void };

function getDefaultStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

/** Read all events, oldest first. Degrades to [] on any error. */
export function getEvents(storage?: StorageLike): ActivationEvent[] {
  const s = storage ?? getDefaultStorage();
  try {
    const raw = s?.getItem(ACTIVATION_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isActivationEvent);
  } catch {
    return [];
  }
}

function isActivationEvent(value: unknown): value is ActivationEvent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.ts === 'string' && typeof v.name === 'string' && v.name.length > 0;
}

/**
 * Fire-and-forget event append. Never throws; drops oldest beyond the cap.
 * Only id/enum/counter props belong here — callers must not pass free text.
 */
export function trackEvent(name: string, props?: ActivationEventProps, storage?: StorageLike): void {
  const s = storage ?? getDefaultStorage();
  if (!s) return;
  try {
    const event: ActivationEvent = { ts: new Date().toISOString(), name };
    if (props) {
      // Drop undefined values so the log stays JSON-clean for export.
      const cleaned: ActivationEventProps = {};
      for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) cleaned[k] = v;
      }
      if (Object.keys(cleaned).length > 0) event.props = cleaned;
    }
    const next = [...getEvents(s), event].slice(-MAX_EVENTS);
    s.setItem(ACTIVATION_EVENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full/unavailable — instrumentation must never break the flow.
  }
}

/** Remove all events. Best-effort, never throws. */
export function clearEvents(storage?: StorageLike): void {
  const s = storage ?? getDefaultStorage();
  if (!s?.removeItem) return;
  try {
    s.removeItem(ACTIVATION_EVENTS_STORAGE_KEY);
  } catch {
    // best-effort
  }
}

/** Pretty-printed log for the Settings "Copy event log" action (slice 3 UI). */
export function exportEvents(storage?: StorageLike): string {
  return JSON.stringify(getEvents(storage), null, 2);
}

export interface FunnelSnapshot {
  totalEvents: number;
  /** Event name → occurrence count. */
  counts: Record<string, number>;
  /** True when at least one play_started carried editsApplied ≥ 1. */
  activated: boolean;
  /** First landing_viewed timestamp, when present. */
  firstSeenAt?: string;
}

/**
 * Derived funnel view over the raw log. Activation per design §1:
 * first `play_started` with `editsApplied >= 1`.
 */
export function getFunnelSnapshot(storage?: StorageLike): FunnelSnapshot {
  const events = getEvents(storage);
  const counts: Record<string, number> = {};
  let activated = false;
  let firstSeenAt: string | undefined;
  for (const e of events) {
    counts[e.name] = (counts[e.name] ?? 0) + 1;
    if (!firstSeenAt) firstSeenAt = e.ts;
    if (e.name === 'play_started' && typeof e.props?.editsApplied === 'number' && e.props.editsApplied >= 1) {
      activated = true;
    }
  }
  return { totalEvents: events.length, counts, activated, firstSeenAt };
}
