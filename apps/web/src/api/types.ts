/**
 * @clawgame/web - API Client Types (M11 Enhanced)
 * Extended types for multi-model image generation and style presets.
 */

// M11: Extended asset types with full support
export type AssetType =
  | 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background' | 'effect'
  | 'character' | 'enemy' | 'npc' | 'prop' | 'chest' | 'ui' | 'video'
  | 'game-entity' | 'visual-asset' | 'sfx' | 'speech' | 'music';

// M11 Enhanced style types with comprehensive game asset categories
export type ExtendedStyleValue = 
  // Basic styles (backward compatible)
  | 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic'
  // Character-specific styles
  | 'character-pixel' | 'character-vector' | 'character-3d' | 'character-stylized'
  // Enemy-specific styles  
  | 'enemy-fantasy' | 'enemy-sci-fi' | 'enemy-horror' | 'enemy-robot'
  // Prop-specific styles
  | 'prop-fantasy' | 'prop-modern' | 'prop-ancient' | 'prop-futuristic'
  // UI-specific styles
  | 'ui-flat' | 'ui-neumorphic' | 'ui-glassmorphic' | 'ui-retro'
  // Background-specific styles
  | 'background-fantasy' | 'background-sci-fi' | 'background-nature' | 'background-abstract';

// M11 Enhanced GenerateAssetRequest with multi-model support
export interface GenerateAssetRequest {
  type: AssetType;
  prompt: string;
  options?: {
    width?: number;
    height?: number;
    style?: ExtendedStyleValue; // M11: Extended style values
    format?: 'png' | 'svg' | 'webp';
    backgroundColor?: string;
    model?: 'zai' | 'openai' | 'stability' | 'local'; // M11: Multi-model support
    quality?: 'draft' | 'standard' | 'high' | 'ultra'; // M11: Quality presets
    aspectRatio?: '1:1' | '4:3' | '16:9' | '3:4' | '9:16'; // M11: Aspect ratios
  };
}

// M11 Enhanced GenerationStatus with detailed model and quality information
export interface GenerationStatus {
  id: string;
  projectId: string;
  type: AssetType;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  result?: {
    success: boolean;
    svg?: string;
    png?: string;
    webp?: string;
    error?: string;
    generatedAt: string;
    generationTime: number;
    model: string; // M11: Track which model generated this
    quality?: string; // M11: Track quality setting
    confidence?: number; // M11: Confidence score
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
  model?: string; // M11: Track the model used
  quality?: string; // M11: Track the quality setting
  style?: string; // M11: Track the style used
}

// M11: Asset metadata with generation information
export interface AssetMetadata {
  id: string;
  projectId: string;
  name: string;
  type: AssetType;
  prompt?: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  status: 'generated' | 'uploaded' | 'error';
  generationData?: {
    model: string;
    confidence: number;
    parameters?: Record<string, unknown>;
    quality?: string; // M11: Include quality data
  };
  aiGeneration?: {
    model: string;
    style: string;
    prompt: string;
    duration: number;
    quality?: string; // M11: Include quality data
  };
}

// M11: Asset service types
export interface AssetStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byModel: Record<string, number>;
  generated: number;
  uploaded: number;
}

// M11: Scene analysis types
export interface SceneAnalysis {
  totalAssets: number;
  sceneAssets: number;
  suggestions: SceneSuggestion[];
  recommendations: string[];
  dominantGenre?: string;
  entityTypes?: string[];
  hasEnemies?: boolean;
  hasCollectibles?: boolean;
  hasPlayer?: boolean;
  hasPlatforms?: boolean;
  hasSprites?: boolean;
  hasBackground?: boolean;
}

export interface SceneSuggestion {
  type: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

// M11: Generation health types
export interface GenerationHealth {
  status: string;
  models: Record<string, { status: string; lastUsed?: string }>;
  features: string[];
  lastUpdated: string;
}

// Legacy types for backward compatibility
export type StyleValue = ExtendedStyleValue; // Alias for backward compatibility
export type GenerationQuality = 'draft' | 'standard' | 'high' | 'ultra';
export type GenerationFormat = 'svg' | 'png' | 'webp' | 'jpg';
export type GenerationAspectRatio = '1:1' | '2:3' | '3:2' | '16:9' | '21:9' | 'square' | 'portrait' | 'landscape' | 'wide' | 'cinematic';

export interface GenerationResult {
  content: string;
  metadata: {
    generationId: string;
    type: AssetType;
    prompt: string;
    style?: string;
    width: number;
    height: number;
    format: string;
    generationTime: number;
    model: string;
    confidence: number;
    quality?: string;
  };
}

// M11: Asset upload types
export interface UploadAssetRequest {
  name: string;
  type: AssetType;
  content?: string;
  mimeType?: string;
}

// M11: AI Command types (unchanged from existing)
export interface AICommandRequest {
  projectId?: string;
  command: string;
  context?: {
    files?: Array<{ path: string; content: string }>;
    selectedFiles?: string[];
    sceneSummary?: string;
    selectedEntities?: string[];
    currentPage?: string;
    selectedCode?: string;
    entities?: Array<{ id: string; type: string; properties: Record<string, unknown> }>;
    scene?: { entities: number; components: number; systems: number };
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    includeCodeAnalysis?: boolean;
    includePerformanceTips?: boolean;
  };
}

export interface AICommandResponse {
  id: string;
  type: 'explanation' | 'change' | 'fix' | 'analysis' | 'error';
  title: string;
  content: string;
  changes?: Array<{
    path: string;
    oldContent?: string;
    newContent?: string;
    summary: string;
    confidence: number;
  }>;
  nextSteps?: string[];
  estimatedTime?: number;
  riskLevel: 'low' | 'medium' | 'high';
  errors?: string[];
  fromFallback?: boolean;
  providerStatus?: AIProviderStatus;
}

export interface AICommandHistory {
  id: string;
  projectId: string;
  command: string;
  response: AICommandResponse;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

export interface AIHealthResponse {
  status: string;
  service: string;
  version?: string;
  model?: string;
  features: string[];
  note?: string;
  circuitOpen?: boolean;
  providerStatus?: AIProviderStatus;
}

export interface AIProviderStatus {
  state: 'ok' | 'rate_limited' | 'timed_out' | 'circuit_open' | 'degraded' | 'mock';
  message?: string;
  retryAfterSeconds?: number;
  updatedAt: string;
  providerCode?: string;
}

export interface AICommandRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface AICommandStreamOptions extends AICommandRequestOptions {
  onChunk?: (chunk: string) => void;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  genre: string;
  artStyle: string;
  settings?: {
    width?: number;
    height?: number;
    backgroundColor?: string;
    gravity?: { x: number; y: number };
  };
  runtimeTarget?: string;
  renderBackend?: string;
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
  assetCount?: number;
  entityCount?: number;
}

export interface ProjectDetail extends ProjectListItem {
  version?: string;
  settings?: Record<string, unknown>;
  sceneCount?: number;
  scenes?: string[];
  assets?: unknown;
  entities?: unknown[];
  engine: {
    version?: string;
    runtimeTarget?: string;
    renderBackend?: string;
    settings?: Record<string, unknown>;
  };
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modifiedAt?: string;
  extension?: string;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  size: number;
  modifiedAt: string;
}

export interface FileWriteResult {
  path: string;
  size: number;
  created: boolean;
}

export interface ExportOptions {
  includeAssets?: boolean;
  minify?: boolean;
  compress?: boolean;
  format?: 'html' | 'zip';
}

export interface ExportResult {
  projectId: string;
  projectName: string;
  version: string;
  format: 'html' | 'zip';
  size: number;
  filename: string;
  downloadUrl: string;
  createdAt: string;
  includesAssets: boolean;
  assetCount: number;
}

export interface HostedOptions {
  title?: string;
  description?: string;
  expiresInHours?: number;
  expiresInDays?: number;
  public?: boolean;
}

export interface HostedExport {
  id: string;
  projectId: string;
  filename: string;
  title: string;
  description?: string;
  url: string;
  viewUrl: string;
  hostedUrl: string;
  projectName?: string;
  createdAt: string;
  expiresAt?: string;
}
