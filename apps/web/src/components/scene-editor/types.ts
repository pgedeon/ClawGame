/**
 * @clawgame/web - Scene Editor shared types and state
 * Uses canonical schema from @clawgame/engine
 */

import {
  Entity,
  Transform,
  Scene,
  SerializableEntity,
  toSerializableEntity,
  toRuntimeEntity,
} from '@clawgame/engine';
import { AssetType } from '../../api/client';

// Re-export canonical types for convenience
export type { Entity, Transform, Scene, SerializableEntity };
export { toSerializableEntity, toRuntimeEntity };

// Tool modes for the editor
export type ToolMode = 'select' | 'move' | 'add-entity';

// Entity templates for quick creation
export interface EntityTemplate {
  id: string;
  name: string;
  transform: Transform;
  components: Map<string, any>;
}

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  {
    id: 'player',
    name: '🎮 Player',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('playerInput', true);
      m.set('movement', { vx: 0, vy: 0, speed: 200 });
      return m;
    })(),
  },
  {
    id: 'enemy',
    name: '👾 Enemy',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('ai', { type: 'patrol', patrolSpeed: 50 });
      m.set('movement', { vx: 0, vy: 0, speed: 50 });
      return m;
    })(),
  },
  {
    id: 'coin',
    name: '🪙 Coin',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('collision', { width: 16, height: 16, type: 'collectible' });
      return m;
    })(),
  },
  {
    id: 'wall',
    name: '🧱 Wall',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('collision', { width: 32, height: 32, type: 'wall' });
      return m;
    })(),
  },
];

export const ASSET_TYPE_FILTERS: Array<{ value: AssetType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sprite', label: 'Sprites' },
  { value: 'tileset', label: 'Tilesets' },
  { value: 'texture', label: 'Textures' },
];

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface SceneEditorState {
  scene: Scene | null;
  entities: Entity[];
  selectedEntityId: string | null;
  toolMode: ToolMode;
  selectedTemplate: EntityTemplate | null;
  viewport: ViewportState;
  showGrid: boolean;
  snapping: boolean;
  gridSize: number;
  projectName: string;
  error: string | null;
}
