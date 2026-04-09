/**
 * @clawgame/web - API Client
 * Central module for all API communication.
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  query?: Record<string, string>;
  timeoutMs?: number;
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  
  // Add query parameters if provided
  if (options?.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, value);
      }
    });
  }

  // Client-side timeout via AbortController
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs || 60_000; // default 60s
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.details || `API error ${res.status}`);
    }

    return res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The AI service is taking too long to respond. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Project types (mirror shared) ───

export interface ProjectListItem {
  id: string;
  name: string;
  genre: string;
  artStyle: string;
  description?: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  version: string;
  engine: {
    version: string;
    runtimeTarget: string;
    renderBackend: string;
  };
  sceneCount: number;
  entityCount: number;
}

export interface CreateProjectInput {
  name: string;
  genre: string;
  artStyle: string;
  description?: string;
  runtimeTarget?: string;
  renderBackend?: string;
}

export interface UpdateProjectInput {
  name?: string;
  genre?: string;
  artStyle?: string;
  description?: string;
}

// ─── File system types ───

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

// ─── Scene analysis types ───

export interface SceneAnalysis {
  entityTypes: string[];
  entityCount: number;
  hasPlayer: boolean;
  hasEnemies: boolean;
  hasPlatforms: boolean;
  hasCollectibles: boolean;
  hasSprites: boolean;
  hasBackground: boolean;
  dominantGenre: string | null;
}

// ─── Asset types ───

export type AssetType = 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background';

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
  };
  aiGeneration?: {
    generationId: string;
    style: string;
    prompt: string;
    duration: number;
  };
}

export interface GenerateAssetRequest {
  type: AssetType;
  prompt: string;
  options?: {
    width?: number;
    height?: number;
    style?: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
    format?: 'png' | 'svg' | 'webp';
    backgroundColor?: string;
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
    error?: string;
    generatedAt: string;
    generationTime: number;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAssetsFilter {
  type?: AssetType;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UploadAssetRequest {
  name: string;
  type: AssetType;
  content: string; // base64
  mimeType: string;
}

export interface AssetStats {
  total: number;
  byType: Record<AssetType, number>;
  totalSize: number;
  aiGenerated: number;
}

// ─── AI Command types ───

export interface AICommandRequest {
  projectId: string;
  command: string;
  context?: {
    selectedFiles?: string[];
    selectedCode?: string;
    selectedRange?: { start: number; end: number };
    recentChanges?: Array<{ path: string; content: string }>;
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
}

export interface AICommandHistory {
  id: string;
  projectId: string;
  command: string;
  response: AICommandResponse;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

// ─── Export types ───

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

// ─── API functions ───

export const api = {
  health: () => request<{ status: string; version: string }>('/health'),

  listProjects: () =>
    request<{ projects: ProjectListItem[] }>('/api/projects').then((r) => r.projects),

  getProject: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),

  createProject: (input: CreateProjectInput) =>
    request<{ id: string; project: unknown }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateProject: (id: string, input: UpdateProjectInput) =>
    request<ProjectDetail>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteProject: (id: string) =>
    request<{ success: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // File system operations
  getFileTree: (projectId: string, path?: string, depth?: number) =>
    request<{ tree: FileNode[] }>(`/api/projects/${projectId}/files/tree`, {
      method: 'GET',
      query: {
        path: path || '',
        depth: depth?.toString() || '',
      },
    }).then((r) => r.tree),

  readFile: (projectId: string, filePath: string) =>
    request<FileContent>(`/api/projects/${projectId}/files/${filePath}`),

  writeFile: (projectId: string, filePath: string, content: string, encoding?: 'utf-8' | 'base64') =>
    request<FileWriteResult>(`/api/projects/${projectId}/files/${filePath}`, {
      method: 'PUT',
      body: JSON.stringify({ content, encoding: encoding || 'utf-8' }),
    }),

  deleteFile: (projectId: string, filePath: string) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/files/${filePath}`, {
      method: 'DELETE',
    }),

  createDirectory: (projectId: string, dirPath: string) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/files/mkdir`, {
      method: 'POST',
      body: JSON.stringify({ path: dirPath }),
    }),

  searchFiles: (projectId: string, query: string) =>
    request<{ results: FileNode[] }>(`/api/projects/${projectId}/files/search`, {
      method: 'GET',
      query: { q: query },
    }).then((r) => r.results),

  // Asset operations
  listAssets: (projectId: string, filter?: ListAssetsFilter) =>
    request<{ assets: AssetMetadata[] }>(`/api/projects/${projectId}/assets`, {
      method: 'GET',
      query: filter ? {
        type: filter.type || '',
        tag: filter.tag || '',
        search: filter.search || '',
        limit: filter.limit?.toString() || '',
        offset: filter.offset?.toString() || '',
      } : undefined,
    }).then((r) => r.assets),

  getAsset: (projectId: string, assetId: string) =>
    request<AssetMetadata>(`/api/projects/${projectId}/assets/${assetId}`),

  getAssetFile: (projectId: string, assetId: string) =>
    request<Blob>(`/api/projects/${projectId}/assets/${assetId}/file`),

  generateAsset: (projectId: string, assetReq: GenerateAssetRequest) =>
    request<{ generationId: string; metadata: AssetMetadata; status: string }>(`/api/projects/${projectId}/assets/generate`, {
      method: 'POST',
      body: JSON.stringify(assetReq),
      timeoutMs: 90_000, // AI generation can take longer
    }),

  getGenerationStatus: (projectId: string, generationId: string) =>
    request<GenerationStatus>(`/api/projects/${projectId}/assets/generations/${generationId}`),

  getGenerations: (projectId: string) =>
    request<{ generations: GenerationStatus[] }>(`/api/projects/${projectId}/assets/generations`).then((r) => r.generations || []),

  pollGenerations: (projectId: string) =>
    request<{ created: string[], errors: string[] }>(`/api/projects/${projectId}/assets/generations/poll`, {
      method: 'POST'
    }),

  uploadAsset: (projectId: string, uploadReq: UploadAssetRequest) =>
    request<AssetMetadata>(`/api/projects/${projectId}/assets/upload`, {
      method: 'POST',
      body: JSON.stringify(uploadReq),
    }),

  updateAsset: (projectId: string, assetId: string, updates: Partial<AssetMetadata>) =>
    request<AssetMetadata>(`/api/projects/${projectId}/assets/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteAsset: (projectId: string, assetId: string) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/assets/${assetId}`, {
      method: 'DELETE',
    }),

  getAssetStats: (projectId: string) =>
    request<AssetStats>(`/api/projects/${projectId}/assets/stats`),

  // Scene analysis
  getSceneAnalysis: (projectId: string) =>
    request<SceneAnalysis>(`/api/projects/${projectId}/scene-analysis`),

  // AI Command operations — 90s timeout (backend has 30s × 2 retries)
  processAICommand: (projectId: string, command: AICommandRequest) =>
    request<{ response: AICommandResponse }>(`/api/projects/${projectId}/ai/command`, {
      method: 'POST',
      body: JSON.stringify(command),
      timeoutMs: 90_000,
    }),

  getAIHistory: (projectId: string, limit?: number) => {
    const query = limit !== undefined ? { limit: limit.toString() } : undefined;
    return request<{ history: AICommandHistory[] }>(`/api/projects/${projectId}/ai/history`, {
      method: 'GET',
      query,
    });
  },

  getAICommand: (projectId: string, commandId: string) =>
    request<{ command: AICommandHistory }>(`/api/projects/${projectId}/ai/commands/${commandId}`),

  getAIHealth: () => 
    request<{ status: string; service: string; version: string; features: string[] }>('/api/ai/health'),

  // Export operations
  exportGame: (projectId: string, options?: ExportOptions) =>
    request<ExportResult>(`/api/projects/${projectId}/export`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  listExports: (projectId: string) =>
    request<{ exports: ExportResult[] }>(`/api/projects/${projectId}/exports`)
      .then((r) => r.exports),

  downloadExport: (projectId: string, filename: string) =>
    `${API_BASE}/api/projects/${projectId}/exports/${filename}`,

  deleteExport: (projectId: string, filename: string) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/exports/${filename}`, {
      method: 'DELETE',
    }),

  // Git operations
  gitStatus: (projectId: string) =>
    request<{
      initialized: boolean;
      branch: string | null;
      ahead: number;
      behind: number;
      changedFiles: { path: string; status: string }[];
      recentCommits: { hash: string; message: string }[];
    }>(`/api/projects/${projectId}/git/status`),

  gitCommit: (projectId: string, message: string) =>
    request<{ success: boolean; hash: string; message: string }>(`/api/projects/${projectId}/git/commit`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  gitLog: (projectId: string, limit?: number) =>
    request<{ commits: { hash: string; message: string; author: string; date: string; filesChanged: number }[] }>(
      `/api/projects/${projectId}/git/log`,
      { query: limit !== undefined ? { limit: limit.toString() } : undefined },
    ),

  gitInit: (projectId: string) =>
    request<{ initialized: boolean }>(`/api/projects/${projectId}/git/init`, { method: 'POST' }),

  gitDiff: (projectId: string) =>
    request<{ files: { path: string; additions: number; deletions: number }[]; summary: string }>(
      `/api/projects/${projectId}/git/diff`,
    ),

  gitRevert: (projectId: string, body: { filePath?: string; commitHash?: string }) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/git/revert`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
