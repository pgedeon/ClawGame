/**
 * @clawgame/web - Asset Studio shared types and constants (M11 Enhanced)
 */

import React from 'react';
import {
  Image,
  Layers,
  Palette,
  Layout,
  Music,
  Shield,
  Zap,
  Crown,
  Users,
  Target,
  Sword,
  Gem,
} from 'lucide-react';
import type { AssetType } from '../../api/client';

/** Asset type to icon mapping */
export const ASSET_TYPE_ICONS: Partial<Record<AssetType, React.ReactNode>> = {
  sprite: <Image size={20} />,
  tileset: <Layers size={20} />,
  texture: <Palette size={20} />,
  icon: <Layout size={20} />,
  audio: <Music size={20} />,
  background: <Image size={20} />,
  effect: <Zap size={20} />,
  character: <Users size={20} />,
  enemy: <Sword size={20} />,
  npc: <Users size={20} />,
  prop: <Gem size={20} />,
  chest: <Crown size={20} />,
  ui: <Layout size={20} />,
};

/** Asset type to color mapping */
export const ASSET_TYPE_COLORS: Partial<Record<AssetType, string>> = {
  sprite: '#8b5cf6',
  tileset: '#10b981',
  texture: '#f59e0b',
  icon: '#ef4444',
  audio: '#6366f1',
  background: '#0f172a',
  effect: '#f97316',
  character: '#8b5cf6',
  enemy: '#dc2626',
  npc: '#14b8a6',
  prop: '#84cc16',
  chest: '#d97706',
  ui: '#0ea5e9',
};

/** M11 Enhanced style presets for different game asset categories */
export const STYLES = [
  // Basic styles (backward compatible)
  { value: 'pixel', label: 'Pixel Art', category: 'basic' },
  { value: 'vector', label: 'Vector', category: 'basic' },
  { value: 'hand-drawn', label: 'Hand-drawn', category: 'basic' },
  { value: 'cartoon', label: 'Cartoon', category: 'basic' },
  { value: 'realistic', label: 'Realistic', category: 'basic' },
  
  // Character-specific styles
  { value: 'character-pixel', label: 'Pixel Character', category: 'character', subcategory: 'pixel' },
  { value: 'character-vector', label: 'Vector Character', category: 'character', subcategory: 'vector' },
  { value: 'character-3d', label: '3D Character', category: 'character', subcategory: '3d' },
  { value: 'character-stylized', label: 'Stylized Character', category: 'character', subcategory: 'stylized' },
  
  // Enemy-specific styles
  { value: 'enemy-fantasy', label: 'Fantasy Enemy', category: 'enemy', subcategory: 'fantasy' },
  { value: 'enemy-sci-fi', label: 'Sci-Fi Enemy', category: 'enemy', subcategory: 'sci-fi' },
  { value: 'enemy-horror', label: 'Horror Enemy', category: 'enemy', subcategory: 'horror' },
  { value: 'enemy-robot', label: 'Robot Enemy', category: 'enemy', subcategory: 'robot' },
  
  // Prop-specific styles
  { value: 'prop-fantasy', label: 'Fantasy Prop', category: 'prop', subcategory: 'fantasy' },
  { value: 'prop-modern', label: 'Modern Prop', category: 'prop', subcategory: 'modern' },
  { value: 'prop-ancient', label: 'Ancient Prop', category: 'prop', subcategory: 'ancient' },
  { value: 'prop-futuristic', label: 'Futuristic Prop', category: 'prop', subcategory: 'futuristic' },
  
  // UI-specific styles
  { value: 'ui-flat', label: 'Flat UI', category: 'ui', subcategory: 'flat' },
  { value: 'ui-neumorphic', label: 'Neumorphic UI', category: 'ui', subcategory: 'neumorphic' },
  { value: 'ui-glassmorphic', label: 'Glassmorphic UI', category: 'ui', subcategory: 'glassmorphic' },
  { value: 'ui-retro', label: 'Retro UI', category: 'ui', subcategory: 'retro' },
  
  // Background-specific styles
  { value: 'background-fantasy', label: 'Fantasy Background', category: 'background', subcategory: 'fantasy' },
  { value: 'background-sci-fi', label: 'Sci-Fi Background', category: 'background', subcategory: 'sci-fi' },
  { value: 'background-nature', label: 'Nature Background', category: 'background', subcategory: 'nature' },
  { value: 'background-abstract', label: 'Abstract Background', category: 'background', subcategory: 'abstract' },
] as const;

export type StyleValue = (typeof STYLES)[number]['value'];

/** Asset category mapping for better prompt generation */
export const ASSET_CATEGORIES = {
  character: {
    name: 'Characters',
    icon: <Users size={16} />,
    description: 'Player characters, NPCs, allies',
    commonTypes: ['hero', 'villain', 'companion', 'civilian', 'merchant'],
    aspectRatios: ['1:1', '3:4', '2:3'],
    sizes: [64, 128, 256],
  },
  enemy: {
    name: 'Enemies',
    icon: <Shield size={16} />,
    description: 'Monsters, foes, boss characters',
    commonTypes: ['goblin', 'orc', 'dragon', 'robot', 'alien', 'undead'],
    aspectRatios: ['1:1', '4:3', '3:2'],
    sizes: [64, 96, 128],
  },
  prop: {
    name: 'Props',
    icon: <Gem size={16} />,
    description: 'Interactive objects, items, furniture',
    commonTypes: ['weapon', 'potion', 'chest', 'book', 'tool', 'furniture'],
    aspectRatios: ['1:1', '4:3', '16:9'],
    sizes: [32, 64, 128],
  },
  ui: {
    name: 'UI Elements',
    icon: <Layout size={16} />,
    description: 'Interface components, buttons, panels',
    commonTypes: ['button', 'panel', 'icon', 'menu', 'dialog', 'progress-bar'],
    aspectRatios: ['1:1', '4:1', '16:1'],
    sizes: [16, 32, 64],
  },
  background: {
    name: 'Backgrounds',
    icon: <Target size={16} />,
    description: 'Environments, scenes, landscapes',
    commonTypes: ['forest', 'castle', 'space', 'city', 'dungeon', 'mountain'],
    aspectRatios: ['16:9', '16:10', '21:9', '1:1'],
    sizes: [256, 512, 1024],
  },
} as const;

export type AssetCategory = keyof typeof ASSET_CATEGORIES;

/** Helper: get style by value */
export function getStyleByValue(value: StyleValue) {
  return STYLES.find(style => style.value === value);
}

/** Helper: get styles by category */
export function getStylesByCategory(category: AssetCategory) {
  return STYLES.filter(style => style.category === category);
}

/** Helper: get status display text */
export function getGenerationStatusText(status: 'pending' | 'generating' | 'completed' | 'failed'): string {
  switch (status) {
    case 'pending': return 'Queued';
    case 'generating': return 'Creating...';
    case 'completed': return 'Done';
    case 'failed': return 'Failed';
    default: return status;
  }
}

/** Asset type to category mapping */
export const ASSET_TYPE_TO_CATEGORY: Partial<Record<AssetType, AssetCategory>> = {
  sprite: 'character',
  tileset: 'prop',
  texture: 'background',
  icon: 'ui',
  audio: 'prop',
  background: 'background',
  effect: 'prop',
  character: 'character',
  enemy: 'enemy',
  npc: 'character',
  prop: 'prop',
  chest: 'prop',
  ui: 'ui',
};
