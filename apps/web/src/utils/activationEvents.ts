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
 *
 * Event schema (design §4, onboarding + share/publish):
 * - landing_viewed, template_launched — landing/launch (slices 1b/2)
 * - ai_suggestion_shown, ai_prompt_submitted, edit_applied — chip funnel (slice 2)
 * - play_started {editsApplied} — activation gate
 * - share_created {hostedId} — creator shares a link (share slice 3)
 * - game_remixed {hostedId, projectId} — recipient forks a copy (share slice 3)
 *
 * Recipient play/remix AGGREGATE counts are the one server-side exception
 * (CEO ruling #4): bare integers in the hosted meta file, zero PII — they do
 * NOT flow through this log. The Settings "Local diagnostics" section reads
 * them per known token via GET /api/share/:token/stats (readout only).
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
/** A/B readiness (design §4): 50/50 variant assigned + persisted at first touch. */
export const AB_VARIANT_STORAGE_KEY = 'clawgame.ab-variant';
const MAX_EVENTS = 500;

export type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void };

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

/** Pretty-printed log for the Settings "Copy event log" action. */
export function exportEvents(storage?: StorageLike): string {
  return JSON.stringify(getEvents(storage), null, 2);
}

// ─── A/B variant assignment (design §4) ───

export type AbVariant = 'a' | 'b';

function isAbVariant(value: unknown): value is AbVariant {
  return value === 'a' || value === 'b';
}

/** Read-only peek: current variant without assigning one. Undefined when unset. */
export function peekAbVariant(storage?: StorageLike): AbVariant | undefined {
  const s = storage ?? getDefaultStorage();
  try {
    return isAbVariant(s?.getItem(AB_VARIANT_STORAGE_KEY)) ? (s!.getItem(AB_VARIANT_STORAGE_KEY) as AbVariant) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Assign + persist the A/B variant (50/50) on first touch; stable afterwards.
 * Never throws — storage failure still returns the assigned variant.
 */
export function getAbVariant(storage?: StorageLike): AbVariant {
  const s = storage ?? getDefaultStorage();
  try {
    const existing = s?.getItem(AB_VARIANT_STORAGE_KEY);
    if (isAbVariant(existing)) return existing;
  } catch {
    // fall through to assignment below
  }
  const variant: AbVariant = Math.random() < 0.5 ? 'a' : 'b';
  try {
    s?.setItem(AB_VARIANT_STORAGE_KEY, variant);
  } catch {
    // Storage unavailable — in-memory answer only; may re-roll next session.
  }
  return variant;
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

// ─── Play-start tracking (design §4 `play_started`) ───

/**
 * Records a `play_started` for a project with derived props:
 * - `editsApplied`: number of prior `edit_applied` events for THIS project
 *   (attribution via the `projectId` prop recorded at apply time);
 * - `isFirstForProject`: true when no prior `play_started` exists for it.
 * Activation itself stays derived (`getFunnelSnapshot`), never stored here.
 */
export function trackPlayStarted(projectId: string, storage?: StorageLike): void {
  const events = getEvents(storage);
  const sameProject = (e: ActivationEvent): boolean => e.props?.projectId === projectId;
  trackEvent(
    'play_started',
    {
      projectId,
      editsApplied: events.filter((e) => e.name === 'edit_applied' && sameProject(e)).length,
      isFirstForProject: !events.some((e) => e.name === 'play_started' && sameProject(e)),
    },
    storage,
  );
}

// ─── Console accessor (design §4: `window.__clawgameEvents`, qa tooling) ───

declare global {
  interface Window {
    /** qa console accessor — installed by installClawgameEventsAccessor(). */
    __clawgameEvents?: unknown;
  }
}

export interface ClawgameEventsAccessor {
  /** All stored events, oldest first. */
  events: () => ActivationEvent[];
  /** Derived funnel snapshot (counts + activation). */
  snapshot: () => FunnelSnapshot;
  /** Pretty JSON of the full log (same text the Settings copy button writes). */
  export: () => string;
  /** Append an event (qa helper; keep props to ids/enums/counters). */
  track: (name: string, props?: ActivationEventProps) => void;
  /** Wipe the log. */
  clear: () => void;
  /** Current A/B variant (assigns one on first call). */
  abVariant: () => AbVariant;
}

/**
 * Installs the qa console accessor once per page load. Safe to call multiple
 * times and in non-browser environments (no-op without `window`).
 */
export function installClawgameEventsAccessor(target?: { __clawgameEvents?: unknown }): void {
  if (typeof window === 'undefined') return;
  const host = target ?? window;
  if (host.__clawgameEvents) return;
  host.__clawgameEvents = Object.freeze({
    events: () => getEvents(),
    snapshot: () => getFunnelSnapshot(),
    export: () => exportEvents(),
    track: (name: string, props?: ActivationEventProps) => trackEvent(name, props),
    clear: () => clearEvents(),
    abVariant: () => getAbVariant(),
  } satisfies ClawgameEventsAccessor);
}
