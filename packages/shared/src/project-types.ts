/**
 * @clawgame/shared - Project types
 * Domain-level project configuration and metadata types.
 */

import type { AssetMetadata } from './assets';
import type { SceneEntity } from './components';

export interface ClawGameProject {
  version: string;
  project: {
    id: string;
    name: string;
    displayName?: string;
    description?: string;
    genre: string;
    artStyle: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    settings?: Record<string, unknown>;
  };
  engine?: {
    version?: string;
    runtimeTarget?: string;
    renderBackend?: string;
    settings?: {
      width: number;
      height: number;
      backgroundColor: string;
      gravity: { x: number; y: number };
    };
  };
  ai?: {
    enabled: boolean;
    provider?: string;
    model?: string;
    settings?: {
      temperature: number;
      maxTokens: number;
    };
  };
  assets?: {
    enabled?: boolean;
    maxCount?: number;
    autoGenerate?: boolean;
    baseDir?: string;
    formats?: string[];
  };
  openclaw?: {
    version: string;
    features: string[];
    settings: {
      autoSave: boolean;
      autoBackup: boolean;
    };
  };
  settings: {
    width: number;
    height: number;
    backgroundColor: string;
    gravity: { x: number; y: number };
  };
}

export interface LegacyClawGameProject {
  id: string;
  name: string;
  description?: string;
  genre: string;
  artStyle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  project: {
    engine: {
      version: string;
      settings: {
        width: number;
        height: number;
        backgroundColor: string;
        gravity: { x: number; y: number };
      };
    };
    ai: {
      enabled: boolean;
      model: string;
      settings: {
        temperature: number;
        maxTokens: number;
      };
    };
    assets: {
      enabled: boolean;
      maxCount: number;
      autoGenerate: boolean;
    };
    openclaw: {
      version: string;
      features: string[];
      settings: {
        autoSave: boolean;
        autoBackup: boolean;
      };
    };
  };
  settings: {
    width: number;
    height: number;
    backgroundColor: string;
    gravity: { x: number; y: number };
  };
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  genre: string;
  artStyle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assetCount: number;
  entityCount: number;
}

export interface ProjectDetail extends ProjectListItem {
  version: string;
  settings: ClawGameProject['settings'];
  scenes?: string[];
  assets: AssetMetadata[] | ClawGameProject['assets'];
  entities?: SceneEntity[];
  engine?: ClawGameProject['engine'];
  ai?: ClawGameProject['ai'];
  openclaw?: ClawGameProject['openclaw'];
  sceneCount: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  genre: string;
  artStyle: string;
  settings?: Partial<ClawGameProject['settings']>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  genre?: string;
  artStyle?: string;
  status?: 'draft' | 'active' | 'completed';
  settings?: Partial<ClawGameProject['settings']>;
}
