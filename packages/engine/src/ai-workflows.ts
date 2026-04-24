/**
 * @clawgame/engine - AI-assisted editor workflow types
 * Ensures AI edits operate on typed state with diffs and rollback.
 */

export interface AIEditOperation {
  id: string;
  type: 'add_entity' | 'remove_entity' | 'modify_entity' | 'add_asset' | 'add_code' | 'batch';
  description: string;
  /** Serialized before-state snapshot for rollback */
  beforeSnapshot: string;
  /** Serialized after-state (applied state) */
  afterSnapshot: string;
  /** Diff description human-readable */
  diff: string;
  timestamp: number;
}

export interface AICommandResult {
  success: boolean;
  operation: AIEditOperation;
  error?: string;
}

export interface AIDiffPreview {
  operations: AIEditOperation[];
  /** Combined diff text */
  diffSummary: string;
  /** Estimated risk: 'safe' | 'moderate' | 'risky' */
  risk: 'safe' | 'moderate' | 'risky';
}

export interface AICommandContext {
  sceneState: string;    // JSON serialized scene
  assetPackState: string; // JSON serialized asset pack
  projectRoot: string;
}

export const MAX_AI_OPERATIONS_PER_BATCH = 20;
export const MAX_SNAPSHOT_SIZE = 5 * 1024 * 1024; // 5MB

export function createAIEditOperation(
  type: AIEditOperation['type'],
  description: string,
  beforeSnapshot: string,
  afterSnapshot: string,
  diff: string,
): AIEditOperation {
  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    description,
    beforeSnapshot,
    afterSnapshot,
    diff,
    timestamp: Date.now(),
  };
}

export function assessRisk(operations: AIEditOperation[]): 'safe' | 'moderate' | 'risky' {
  const hasRemove = operations.some((op) => op.type === 'remove_entity');
  const hasBatch = operations.some((op) => op.type === 'batch');
  const count = operations.length;
  if (hasRemove || hasBatch || count > 5) return 'risky';
  if (count > 2) return 'moderate';
  return 'safe';
}

export function generateDiffSummary(operations: AIEditOperation[]): string {
  return operations
    .map((op) => `[${op.type}] ${op.description}`)
    .join('\n');
}

export function validateSnapshot(snapshot: string): { valid: boolean; error?: string } {
  if (snapshot.length > MAX_SNAPSHOT_SIZE) {
    return { valid: false, error: `Snapshot exceeds max size (${MAX_SNAPSHOT_SIZE} bytes)` };
  }
  try {
    JSON.parse(snapshot);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid JSON snapshot' };
  }
}
