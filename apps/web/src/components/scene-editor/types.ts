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

export type PhaserObjectKind =
  | 'image'
  | 'sprite'
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'tileSprite'
  | 'container'
  | 'zone'
  | 'particle-emitter'
  | 'tilemap-layer';

// Entity templates for quick creation
export interface EntityTemplate {
  id: string;
  type: EntityType;
  phaserKind: PhaserObjectKind;
  name: string;
  category: 'Gameplay' | 'Display' | 'Physics' | 'Effects' | 'Tilemaps';
  transform: Transform;
  components: Map<string, any>;
}

export const ENTITY_TEMPLATES: EntityTemplate[] = [
  {
    id: 'player',
    type: 'player',
    phaserKind: 'sprite',
    name: '🎮 Player',
    category: 'Gameplay',
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
    phaserKind: 'sprite',
    name: '👾 Enemy',
    category: 'Gameplay',
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
    phaserKind: 'sprite',
    name: '🪙 Coin',
    category: 'Gameplay',
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
    phaserKind: 'rectangle',
    name: '🧱 Wall',
    category: 'Physics',
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
    phaserKind: 'rectangle',
    name: '▬ Platform',
    category: 'Physics',
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
    phaserKind: 'sprite',
    name: '🧑 NPC',
    category: 'Gameplay',
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
    phaserKind: 'zone',
    name: '📡 Trigger Zone',
    category: 'Physics',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 64, height: 64, color: '#22d3ee80', opacity: 0.45 });
      m.set('collision', { width: 64, height: 64, type: 'none' });
      return m;
    })(),
  },
  {
    id: 'text',
    type: 'custom',
    phaserKind: 'text',
    name: '📝 Text Label',
    category: 'Display',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 100, height: 24, color: '#1e293b' });
      m.set('text', { content: 'Hello!', fontSize: 16, color: '#ffffff' });
      return m;
    })(),
  },
  {
    id: 'image',
    type: 'custom',
    phaserKind: 'image',
    name: '🖼️ Image',
    category: 'Display',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 64, height: 64, color: '#60a5fa' });
      return m;
    })(),
  },
  {
    id: 'rectangle',
    type: 'custom',
    phaserKind: 'rectangle',
    name: '▭ Rectangle',
    category: 'Display',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 96, height: 48, color: '#14b8a6' });
      return m;
    })(),
  },
  {
    id: 'circle',
    type: 'obstacle',
    phaserKind: 'circle',
    name: '● Circle',
    category: 'Display',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('sprite', { width: 32, height: 32, color: '#a855f7' });
      m.set('collision', { width: 32, height: 32, type: 'wall', shape: 'circle' });
      return m;
    })(),
  },
  {
    id: 'particles',
    type: 'custom',
    phaserKind: 'particle-emitter',
    name: '🔥 Particle Emitter',
    category: 'Effects',
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
