/**
 * @clawgame/shared - Shared utilities and types
 */

// Project metadata types
export interface ClawGameProject {
  name: string;
  version: string;
  engine: EngineConfig;
  project: ProjectMeta;
  ai?: AIConfig;
  assets?: AssetsConfig;
  openclaw?: OpenClawConfig;
}

export interface EngineConfig {
  version: string;
  runtimeTarget: 'browser' | 'desktop' | 'mobile';
  renderBackend: 'canvas' | 'webgl' | 'webgpu';
}

export interface ProjectMeta {
  displayName: string;
  genre: string;
  artStyle: string;
  description?: string;
}

export interface AIConfig {
  providers: string[];
  defaultProvider: string;
  roles: string[];
}

export interface AssetsConfig {
  comfyui?: {
    enabled: boolean;
    url: string;
  };
  formats: string[];
  directories: Record<string, string>;
}

export interface OpenClawConfig {
  integrationLevel: 'native' | 'basic' | 'none';
  memoryPaths: string[];
  agentRoles: string[];
}

// Entity/Component types (for engine)
export interface Entity {
  id: string;
  name: string;
  components: Component[];
  transform: Transform;
}

export interface Component {
  type: string;
  data: Record<string, unknown>;
}

export interface Transform {
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

// Scene types
export interface Scene {
  id: string;
  name: string;
  entities: Entity[];
  layers: Layer[];
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  entityIds: string[];
}
