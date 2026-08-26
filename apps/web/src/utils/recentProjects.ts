/**
 * Recent projects index — localStorage-backed list powering the landing
 * page "Continue building" strip (onboarding design §3.3/§3.4).
 *
 * Pattern reference: runtime/previewRuntimeConfig.ts (StorageLike injection,
 * try/catch everywhere — localStorage unavailable must never throw).
 */

export interface RecentProjectEntry {
  id: string;
  name: string;
  templateId?: string;
  createdAt: string;
  lastOpenedAt: string;
  /** True once any successful file write happened after creation. */
  edited?: boolean;
  /** Per-project first-run guidance dismissal flag (slice 2). */
  dismissedGuidance?: boolean;
  /** Capability token this project was forked from (share slice 2 remix lineage). */
  remixedFrom?: string;
}

export const RECENT_PROJECTS_STORAGE_KEY = 'clawgame.recent-projects.v1';

const MAX_ENTRIES = 20;

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void };

function getDefaultStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function normalizeEntry(value: unknown): RecentProjectEntry | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || !v.id) return null;
  if (typeof v.name !== 'string') return null;
  return {
    id: v.id,
    name: v.name,
    templateId: typeof v.templateId === 'string' ? v.templateId : undefined,
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date(0).toISOString(),
    lastOpenedAt: typeof v.lastOpenedAt === 'string' ? v.lastOpenedAt : new Date(0).toISOString(),
    edited: typeof v.edited === 'boolean' ? v.edited : undefined,
    dismissedGuidance: typeof v.dismissedGuidance === 'boolean' ? v.dismissedGuidance : undefined,
    remixedFrom: typeof v.remixedFrom === 'string' ? v.remixedFrom : undefined,
  };
}

/** Read the index, newest-first by lastOpenedAt. Degrades to [] on any error. */
export function getRecentProjects(storage?: StorageLike): RecentProjectEntry[] {
  const s = storage ?? getDefaultStorage();
  try {
    const raw = s?.getItem(RECENT_PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((e): e is RecentProjectEntry => e !== null)
      .sort((a, b) => (a.lastOpenedAt < b.lastOpenedAt ? 1 : a.lastOpenedAt > b.lastOpenedAt ? -1 : 0));
  } catch {
    return [];
  }
}

/** Insert or update an entry (upsert on id), bumping lastOpenedAt. Never throws. */
export function recordRecentProject(
  entry: Omit<RecentProjectEntry, 'lastOpenedAt' | 'createdAt'> & { createdAt?: string; lastOpenedAt?: string },
  storage?: StorageLike
): void {
  const s = storage ?? getDefaultStorage();
  if (!s) return;
  try {
    const now = entry.lastOpenedAt ?? new Date().toISOString();
    const rest = getRecentProjects(s).filter((e) => e.id !== entry.id);
    const next: RecentProjectEntry[] = [
      {
        ...entry,
        createdAt: entry.createdAt ?? now,
        lastOpenedAt: now,
      },
      ...rest,
    ].slice(0, MAX_ENTRIES);
    s.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full/unavailable — index is best-effort, never block the flow.
  }
}

/** Patch an existing entry (e.g. mark edited). No-op when absent. Never throws. */
export function touchRecentProject(id: string, patch: Partial<Omit<RecentProjectEntry, 'id'>>, storage?: StorageLike): void {
  const s = storage ?? getDefaultStorage();
  if (!s) return;
  try {
    const current = getRecentProjects(s);
    const idx = current.findIndex((e) => e.id === id);
    if (idx === -1) return;
    current[idx] = { ...current[idx], ...patch };
    s.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(current.slice(0, MAX_ENTRIES)));
  } catch {
    // best-effort
  }
}

export function removeRecentProject(id: string, storage?: StorageLike): void {
  const s = storage ?? getDefaultStorage();
  if (!s) return;
  try {
    const next = getRecentProjects(s).filter((e) => e.id !== id);
    s.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
}
