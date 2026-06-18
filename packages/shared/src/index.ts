/**
 * @clawgame/shared - Shared utilities and types
 *
 * This file re-exports everything from focused modules.
 * Import from '@clawgame/shared' — all exports below are public API.
 *
 * Modules:
 *   - project-types.ts  : Project config interfaces
 *   - project-factory.ts: createDefaultProject()
 *   - assets.ts         : Asset enums, metadata, utilities
 *   - components.ts     : ECS component interfaces, scene types
 *   - math.ts           : Vector math utilities
 *   - templates.ts      : Game templates (platformer, RPG, shooter)
 *   - utils.ts          : ID generation, debug utilities
 */

// Project types
export type {
  ClawGameProject,
  LegacyClawGameProject,
  ProjectListItem,
  ProjectDetail,
  CreateProjectRequest,
  UpdateProjectRequest,
} from './project-types';

// Project factory
export { createDefaultProject } from './project-factory';

// Assets
export {
  AssetType,
  AssetRole,
  GenerationQuality,
  GenerationFormat,
  GenerationModel,
  GenerationAspectRatio,
  roleToType,
  SPRITE_TYPES,
  ASSET_UTILS,
  LEGACY_TYPES,
} from './assets';

export type {
  AssetMetadata,
  AIImageGenerationRequest,
  GenerationResult,
} from './assets';

// Components and scene types
export type {
  Vector2,
  Transform,
  Sprite,
  Movement,
  Stats,
  Collision,
  Animation,
  InputState,
  EngineEvents,
  Scene,
  SceneEntity,
  TransformComponent,
  SpriteComponent,
  MovementComponent,
  StatsComponent,
  CollisionComponent,
  InputComponent,
  AnimationComponent,
  DialogueComponent,
  TriggerComponent,
  AIComponent,
  WeaponComponent,
  ProjectileComponent,
} from './components';

// Math utilities
export {
  distance,
  normalize,
  clamp,
  lerp,
  random,
  randomInt,
  angleBetween,
  rotate,
} from './math';

// Game templates
export { GAME_TEMPLATES } from './templates';

// General utilities
export {
  generateId,
  generateProjectId,
  createId,
  DEBUG_UTILS,
} from './utils';
