/**
 * @clawgame/web - Asset Studio shared types and constants
 */

import React from 'react';
import {
  Image,
  Layers,
  Palette,
  Layout,
  Music,
} from 'lucide-react';
import type { AssetType } from '../../api/client';

/** Asset type → icon mapping */
export const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  sprite: <Image size={20} />,
  tileset: <Layers size={20} />,
  texture: <Palette size={20} />,
  icon: <Layout size={20} />,
  audio: <Music size={20} />,
  background: <Image size={20} />,
};

/** Asset type → color mapping */
export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  sprite: '#8b5cf6',
  tileset: '#10b981',
  texture: '#f59e0b',
  icon: '#ef4444',
  audio: '#6366f1',
  background: '#0f172a',
};

/** Generation style options */
export const STYLES = [
  { value: 'pixel', label: 'Pixel Art' },
  { value: 'vector', label: 'Vector' },
  { value: 'hand-drawn', label: 'Hand-drawn' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'realistic', label: 'Realistic' },
] as const;

export type StyleValue = (typeof STYLES)[number]['value'];

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
