/**
 * Re-export shim — implementation moved to @clawgame/engine
 * (packages/engine/src/preview-scene.ts) so the API phaser-html export path
 * can run the exact same normalizer as the web preview without a cross-app
 * relative import. Import from here or from '@clawgame/engine' directly.
 */
export {
  createDefaultPreviewScene,
  inferEntityType,
  normalizePreviewScene,
} from '@clawgame/engine';

export type {
  CollectibleData,
  DialogueChoice,
  DialogueEffect,
  DialogueNode,
  DialogueTree,
  Platform,
  PreviewSceneData,
  Waypoint,
} from '@clawgame/engine';
