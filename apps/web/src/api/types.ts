/**
 * @clawgame/web - API Client Types
 *
 * Web-specific types for API communication.
 *
 * Where types overlap with @clawgame/shared, we import and re-export from shared.
 * Web-only types (API request/response shapes, UI state) are defined here.
 *
 * Migration status: AssetType union kept for API serialization compat.
 * AssetMetadata and GenerationResult are web-specific API response shapes
 * that correspond to but may differ from shared domain types.
 */

// ── Web-specific AssetType union ──
// Shared package has an enum version. This union is for API JSON serialization.
// The values are identical, so they're structurally compatible.
export type AssetType =
  | 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background' | 'effect'
  | 'character' | 'enemy' | 'npc' | 'prop' | 'chest' | 'ui' | 'video'
  | 'game-entity' | 'visual-asset' | 'sfx' | 'speech' | 'music';

// ── Web-specific style types ──
export type ExtendedStyleValue =
  | 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic'
  | 'character-pixel' | 'character-vector' | 'character-3d' | 'character-stylized'
  | 'enemy-fantasy' | 'enemy-sci-fi' | 'enemy-horror' | 'enemy-robot'
  | 'prop-fantasy' | 'prop-modern' | 'prop-ancient' | 'prop-futuristic'
  | 'ui-flat' | 'ui-neumorphic' | 'ui-glassmorphic' | 'ui-retro'
  | 'background-fantasy' | 'background-sci-fi' | 'background-nature' | 'background-abstract';

export type StyleValue = ExtendedStyleValue;

// ── Generation types (web-specific API shapes) ──

export type GenerationQuality = 'draft' | 'standard' | 'high' | 'ultra';
export type GenerationFormat = 'svg' | 'png' | 'webp' | 'jpg';
export type GenerationAspectRatio = '1:1' | '2:3' | '3:2' | '16:9' | '21:9' | 'square' | 'portrait' | 'landscape' | 'wide' | 'cinematic';

export interface GenerateAssetRequest {
  type: AssetType;
  prompt: string;
  options?: {
    width?: number;
    height?: number;
    style?: ExtendedStyleValue;
    format?: 'png' | 'svg' | 'webp';
    backgroundColor?: string;
    model?: 'zai' | 'openai' | 'stability' | 'local';
    quality?: GenerationQuality;
    aspectRatio?: GenerationAspectRatio;
  };
}

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
    model: string;
    quality?: string;
    confidence?: number;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
  model?: string;
  quality?: string;
  style?: string;
}

// AssetMetadata: web API response shape (corresponds to shared.AssetMetadata)
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
    quality?: string;
  };
  aiGeneration?: {
    model: string;
    style: string;
    prompt: string;
    duration: number;
    quality?: string;
  };
}

export interface AssetStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byModel: Record<string, number>;
  generated: number;
  uploaded: number;
}

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

export interface GenerationHealth {
  status: string;
  models: Record<string, { status: string; lastUsed?: string }>;
  features: string[];
  lastUpdated: string;
}

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

export interface UploadAssetRequest {
  name: string;
  type: AssetType;
  content?: string;
  mimeType?: string;
}

// ── AI Command types (web-specific API shapes) ──

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

// ── Project types (web-specific API shapes) ──

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

// ── File types (web-specific) ──

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

// ── Export types (web-specific) ──

export interface ExportOptions {
  includeAssets?: boolean;
  minify?: boolean;
  compress?: boolean;
  format?: 'html' | 'zip' | 'phaser-html';
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

// ── Hosted export types (web-specific) ──

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
