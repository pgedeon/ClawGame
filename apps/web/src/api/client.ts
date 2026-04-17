/**
 * @clawgame/web - API Client
 * Central module for all API communication.
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  query?: Record<string, string>;
  timeoutMs?: number;
}

export type APIClientErrorCode = 'timeout' | 'aborted' | 'http_error' | 'network_error' | 'invalid_response';

export class APIClientError extends Error {
  code: APIClientErrorCode;
  status?: number;
  details?: unknown;

  constructor(message: string, code: APIClientErrorCode, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = 'APIClientError';
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
  }
}

function buildApiUrl(path: string, query?: Record<string, string>): URL {
  const baseUrl = API_BASE || window.location.origin;
  const url = new URL(`${baseUrl}${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, value);
      }
    });
  }

  return url;
}

function buildHeaders(headers?: HeadersInit): Headers {
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  return requestHeaders;
}

function createAbortSignal(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let didTimeout = false;

  const abortFromExternalSignal = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', abortFromExternalSignal);
    }
  }

  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup: () => {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortFromExternalSignal);
      }
    },
  };
}

async function readErrorResponse(res: Response): Promise<Record<string, unknown>> {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return res.json().catch(() => ({}));
  }

  const text = await res.text().catch(() => '');
  return text ? { error: text } : {};
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const url = buildApiUrl(path, options?.query);
  const timeoutMs = options?.timeoutMs || 60_000;
  const { signal: externalSignal, query: _query, timeoutMs: _timeoutMs, headers, ...fetchOptions } = options || {};
  const controller = createAbortSignal(timeoutMs, externalSignal ?? undefined);

  try {
    const res = await fetch(url.toString(), {
      headers: buildHeaders(headers),
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await readErrorResponse(res);
      throw new APIClientError(
        String(body.error || body.details || `API error ${res.status}`),
        'http_error',
        { status: res.status, details: body },
      );
    }

    return res.json();
  } catch (err: any) {
    if (err instanceof APIClientError) {
      throw err;
    }

    if (controller.didTimeout()) {
      throw new APIClientError(
        'Request timed out. The AI service is taking too long to respond. Please try again.',
        'timeout',
      );
    }

    if (externalSignal?.aborted || err?.name === 'AbortError') {
      throw new APIClientError('Request cancelled.', 'aborted');
    }

    throw new APIClientError(err?.message || 'Network request failed.', 'network_error');
  } finally {
    controller.cleanup();
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
    sceneSummary?: string;
    selectedEntities?: string[];
    currentPage?: string;
  };
}

export interface AIProviderStatus {
  state: 'ready' | 'rate_limited' | 'timed_out' | 'degraded' | 'circuit_open' | 'mock';
  message: string;
  provider?: 'z.ai';
  providerCode?: string;
  retryAfterSeconds?: number;
  updatedAt: string;
  circuitOpenUntil?: string;
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

export interface AICommandRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface AICommandStreamOptions extends AICommandRequestOptions {
  onChunk?: (chunk: string) => void;
}

export function getAIProviderFallbackMessage(providerStatus?: AIProviderStatus | null): string | null {
  switch (providerStatus?.state) {
    case 'rate_limited':
      return 'AI provider is rate-limited. Using fallback response.';
    case 'timed_out':
      return "AI is taking too long. Here's a local suggestion instead.";
    case 'circuit_open':
    case 'degraded':
      return 'AI service temporarily unavailable. Using offline mode.';
    default:
      return null;
  }
}

export function formatAICommandResponseContent(
  response: Pick<AICommandResponse, 'content' | 'fromFallback' | 'providerStatus'>,
): string {
  const providerMessage = getAIProviderFallbackMessage(response.providerStatus);
  if (providerMessage) {
    return `${providerMessage}\n\n${response.content}`;
  }

  if (response.fromFallback && response.providerStatus?.state !== 'mock') {
    return `AI service temporarily unavailable. Using offline mode.\n\n${response.content}`;
  }

  return response.content;
}

export function getAIRequestErrorMessage(error: unknown): string {
  if (error instanceof APIClientError) {
    if (error.status === 429) {
      return 'AI provider is rate-limited. Using fallback response.';
    }

    if (error.code === 'timeout') {
      return "AI is taking too long. Here's a local suggestion instead.";
    }

    if (error.code === 'aborted') {
      return 'Request cancelled.';
    }
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  const normalized = message.toLowerCase();

  if (normalized.includes('rate') && normalized.includes('limit')) {
    return 'AI provider is rate-limited. Using fallback response.';
  }

  if (normalized.includes('timeout')) {
    return "AI is taking too long. Here's a local suggestion instead.";
  }

  return `Error: ${message}`;
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

// ─── Hosted Publishing types ───

export interface HostedOptions {
  expiresInDays?: number; // How long before the hosted link expires
  public?: boolean; // Whether the game should be publicly accessible
}

export interface HostedExport {
  id: string;
  projectId: string;
  projectName: string;
  filename: string;
  hostedUrl: string;
  createdAt: string;
  expiresAt?: string;
  downloadUrl: string;
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
  processAICommand: (projectId: string, command: AICommandRequest, options?: AICommandRequestOptions) =>
    request<{ response: AICommandResponse }>(`/api/projects/${projectId}/ai/command`, {
      method: 'POST',
      body: JSON.stringify(command),
      timeoutMs: options?.timeoutMs ?? 90_000,
      signal: options?.signal,
    }),

  processAICommandStream: async (projectId: string, command: AICommandRequest, options?: AICommandStreamOptions) => {
    const url = buildApiUrl(`/api/projects/${projectId}/ai/command`);
    const timeoutMs = options?.timeoutMs ?? 120_000;
    const controller = createAbortSignal(timeoutMs, options?.signal ?? undefined);

    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: buildHeaders({ Accept: 'text/event-stream' }),
        body: JSON.stringify({ ...command, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await readErrorResponse(res);
        throw new APIClientError(
          String(body.error || body.details || `API error ${res.status}`),
          'http_error',
          { status: res.status, details: body },
        );
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await res.json() as { response: AICommandResponse };
        if (body.response?.content) {
          options?.onChunk?.(body.response.content);
        }
        return body;
      }

      if (!res.body) {
        throw new APIClientError('AI stream did not include a response body.', 'invalid_response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: AICommandResponse | null = null;

      const processEventBlock = (rawEvent: string) => {
        const dataLines = rawEvent
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart());

        if (dataLines.length === 0) {
          return;
        }

        const payload = JSON.parse(dataLines.join('\n')) as {
          type?: 'chunk' | 'done' | 'error';
          content?: string;
          response?: AICommandResponse;
          error?: string;
          details?: string;
        };

        if (payload.type === 'chunk' && typeof payload.content === 'string') {
          options?.onChunk?.(payload.content);
          return;
        }

        if (payload.type === 'done' && payload.response) {
          finalResponse = payload.response;
          return;
        }

        if (payload.type === 'error') {
          throw new APIClientError(payload.error || payload.details || 'AI stream failed.', 'http_error');
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

        let separatorIndex = buffer.indexOf('\n\n');
        while (separatorIndex !== -1) {
          const eventBlock = buffer.slice(0, separatorIndex).trim();
          buffer = buffer.slice(separatorIndex + 2);

          if (eventBlock) {
            processEventBlock(eventBlock);
          }

          separatorIndex = buffer.indexOf('\n\n');
        }
      }

      buffer += decoder.decode();
      const trailingEvent = buffer.trim();
      if (trailingEvent) {
        processEventBlock(trailingEvent);
      }

      if (!finalResponse) {
        throw new APIClientError('AI stream ended before the final response arrived.', 'invalid_response');
      }

      return { response: finalResponse };
    } catch (err: any) {
      if (err instanceof APIClientError) {
        throw err;
      }

      if (controller.didTimeout()) {
        throw new APIClientError(
          'Request timed out. The AI service is taking too long to respond. Please try again.',
          'timeout',
        );
      }

      if (options?.signal?.aborted || err?.name === 'AbortError') {
        throw new APIClientError('Request cancelled.', 'aborted');
      }

      throw new APIClientError(err?.message || 'Failed to process streaming AI command.', 'network_error');
    } finally {
      controller.cleanup();
    }
  },

  getAIHistory: (projectId: string, limit?: number) => {
    const query = limit !== undefined ? { limit: limit.toString() } : undefined;
    return request<{ history: AICommandHistory[] }>(`/api/projects/${projectId}/ai/history`, {
      method: 'GET',
      query,
    });
  },

  getAICommand: (projectId: string, commandId: string) =>
    request<{ command: AICommandHistory }>(`/api/projects/${projectId}/ai/commands/${commandId}`),

  getAIHealth: () => request<AIHealthResponse>('/api/ai/health'),

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

  // Hosted Publishing operations
  hostExport: (projectId: string, exportFilename: string, options?: HostedOptions) =>
    request<{ success: boolean; hosted: HostedExport; message: string }>(`/api/projects/${projectId}/exports/${exportFilename}/host`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  getHostedExport: (hostedId: string) =>
    request<HostedExport>(`/api/hosted/${hostedId}`),

  viewHostedExport: (hostedId: string) =>
    `${API_BASE}/api/hosted/${hostedId}/view`,

  listHostedExports: (projectId: string) =>
    request<{ hosted: HostedExport[] }>(`/api/projects/${projectId}/hosted`)
      .then((r) => r.hosted),

  deleteHostedExport: (projectId: string, hostedId: string) =>
    request<{ success: boolean; message: string }>(`/api/projects/${projectId}/hosted/${hostedId}`, {
      method: 'DELETE',
    }),

  getHostedHealth: () =>
    request<{ status: string; hostedDir: string; baseUrl: string }>(`/api/hosted/health`),

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