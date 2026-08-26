/**
 * First-run recipe catalog — onboarding slice 2 (amended per CEO decision
 * 2026-08-25, based on slice-2c verification in
 * docs/design/no-auth-onboarding.md §7).
 *
 * Only recipes whose effect is VERIFIED visible at Play ship as chips.
 * P1 (double coin value) and P3 (moving-platform clone) remain DEFERRED —
 * they need a pickup→score loop / movingPlatform consumer that the preview
 * runtime still lacks. P2 (player red) and T2 (repaint walls) were re-verified
 * end-to-end after tint support landed in ClawgamePhaserScene.createEntity
 * (feat/sprite-tint); shipping them would otherwise violate ruling #4
 * (scene-JSON-only, honesty beats demo-scope).
 *
 * Consumed by:
 * - apps/web FirstRunEditCard (chip labels + commands sent verbatim)
 * - apps/api aiService mock (exact command match → scene-JSON mutation)
 *
 * Shared package so both apps use one source of truth for the command strings.
 */

export type FirstRunTemplateId = 'platformer' | 'topdown';

export interface FirstRunRecipe {
  /** Stable recipe id (funnel-log `recipeId` prop). */
  id: string;
  /** Template this recipe is offered on. */
  templateId: FirstRunTemplateId;
  /** Exact command string; chips send it verbatim, mock matches it exactly. */
  command: string;
  /** Short chip label. */
  chipLabel: string;
  /** One-line honest description of the visible effect at Play. */
  summaryLine: string;
  /**
   * Present only when part of the recipe's effect is deferred (missing runtime
   * capability). Rendered with the chip summary so the promise stays honest.
   */
  deferredNote?: string;
}

/** Platformer genre id used by templateCatalog ('action'); keyed by template. */
export const FIRST_RUN_RECIPES: FirstRunRecipe[] = [
  // ── Platformer ──
  {
    id: 'platformer-move-platform',
    templateId: 'platformer',
    command: 'Move the orange platform further right',
    chipLabel: 'Move a platform',
    summaryLine: 'Moves the orange floating platform to a new spot — visible immediately.',
  },
  {
    id: 'platformer-widen-ground',
    templateId: 'platformer',
    command: 'Widen the ground platform across the level',
    chipLabel: 'Widen the ground',
    summaryLine: 'Extends the ground floor to the right — more room to run.',
  },
  {
    id: 'platformer-raise-gravity',
    templateId: 'platformer',
    command: 'Make gravity stronger so jumps feel snappier',
    chipLabel: 'Raise gravity',
    summaryLine: 'World gravity 900 → 1400 — falls and jumps feel much snappier.',
  },
  {
    id: 'platformer-player-red',
    templateId: 'platformer',
    command: 'Make the player red',
    chipLabel: 'Player red',
    summaryLine: 'Your blue player turns red — visible in preview and at Play.',
  },
  // ── Topdown ──
  {
    id: 'topdown-angry-enemy',
    templateId: 'topdown',
    command: 'Make the nearest enemy angry so it chases faster',
    chipLabel: 'Angry enemy',
    summaryLine: 'The red enemy chasing you speeds up (100 → 170) — verified at Play.',
  },
  {
    id: 'topdown-add-pillar',
    templateId: 'topdown',
    command: 'Add a stone pillar in the middle of the room',
    chipLabel: 'Add a pillar',
    summaryLine: 'A solid pillar appears mid-room and blocks your path.',
  },
  {
    id: 'topdown-speed-ring',
    templateId: 'topdown',
    command: 'Add a speed boost ring near my spawn point',
    chipLabel: 'Speed boost ring',
    summaryLine: 'A glowing trigger ring appears near your spawn.',
    deferredNote: 'Renders now; the speed boost itself needs trigger-action support (deferred).',
  },
  {
    id: 'topdown-repaint-walls',
    templateId: 'topdown',
    command: 'Repaint the walls',
    chipLabel: 'Repaint walls',
    summaryLine: 'All seven wall blocks turn purple — visible in preview and at Play.',
  },
];

/** Recipes offered for one template, catalog order. */
export function getRecipesForTemplate(templateId: string | undefined | null): FirstRunRecipe[] {
  if (!templateId) return [];
  return FIRST_RUN_RECIPES.filter((r) => r.templateId === templateId);
}
