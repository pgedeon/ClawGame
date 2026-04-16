/**
 * @clawgame/web - Scene Editor shared types and state
 * Uses canonical schema from @clawgame/engine
 */

import {
  Entity,
  EntityType,
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
export type ToolMode = 'select' | 'move' | 'add-entity' | 'pan' | 'paint-tile' | 'erase';

// Entity templates for quick creation
export interface EntityTemplate {
  id: string;
  type: EntityType;
  name: string;
  transform: Transform;
  components: Map<string, any>;
}

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  {
    id: 'player',
    type: 'player',
    name: '🎮 Player',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('playerInput', true);
      m.set('movement', { vx: 0, vy: 0, speed: 200 });
      m.set('sprite', { width: 32, height: 48, color: '#3b82f6' });
      m.set('collision', { width: 32, height: 48, type: 'player' });
      return m;
    })(),
  },
  {
    id: 'enemy',
    type: 'enemy',
    name: '👾 Enemy',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('ai', { type: 'patrol', patrolSpeed: 50 });
      m.set('movement', { vx: 0, vy: 0, speed: 50 });
      m.set('sprite', { width: 32, height: 32, color: '#ef4444' });
      m.set('collision', { width: 32, height: 32, type: 'enemy' });
      return m;
    })(),
  },
  {
    id: 'coin',
    type: 'collectible',
    name: '🪙 Coin',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 16, height: 16, color: '#fbbf24' });
      m.set('collision', { width: 16, height: 16, type: 'collectible' });
      m.set('collectible', { type: 'coin', value: 10, name: 'Coin' });
      return m;
    })(),
  },
  {
    id: 'wall',
    type: 'obstacle',
    name: '🧱 Wall',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 32, height: 32, color: '#475569' });
      m.set('collision', { width: 32, height: 32, type: 'wall' });
      return m;
    })(),
  },
  {
    id: 'platform',
    type: 'obstacle',
    name: '▬ Platform',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 128, height: 16, color: '#64748b' });
      m.set('collision', { width: 128, height: 16, type: 'wall' });
      return m;
    })(),
  },
  {
    id: 'npc',
    type: 'npc',
    name: '🧑 NPC',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 32, height: 48, color: '#22c55e' });
      m.set('collision', { width: 32, height: 48, type: 'none' });
      m.set('ai', { type: 'idle' });
      return m;
    })(),
  },
  {
    id: 'zone',
    type: 'custom',
    name: '📡 Trigger Zone',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 64, height: 64, color: '#a855f7' });
      m.set('collision', { width: 64, height: 64, type: 'collectible' });
      return m;
    })(),
  },
  {
    id: 'text',
    type: 'custom',
    name: '📝 Text Label',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 100, height: 24, color: '#1e293b' });
      m.set('text', { content: 'Hello!', fontSize: 16, color: '#ffffff' });
      return m;
    })(),
  },
  {
    id: 'particles',
    type: 'custom',
    name: '🔥 Particle Emitter',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 16, height: 16, color: '#f97316' });
      m.set('particles', { rate: 10, lifespan: 1000, speed: 50, color: '#f97316' });
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
