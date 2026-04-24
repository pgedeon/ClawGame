/**
 * @clawgame/web - API Client (M11 Enhanced)
 * Central module for all API communication with multi-model generation support.
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

import type { 
  ExtendedStyleValue, 
  GenerateAssetRequest, 
  GenerationStatus,
  AssetMetadata,
  AssetType,
  AssetStats,
  SceneAnalysis,
  GenerationHealth,
  UploadAssetRequest,
  AICommandRequest,
  AICommandResponse,
  AICommandHistory,
  AIHealthResponse,
  AIProviderStatus,
  AICommandRequestOptions,
  AICommandStreamOptions,
  CreateProjectInput,
  ProjectListItem,
  ProjectDetail,
  FileNode,
  FileContent,
  FileWriteResult,
  ExportResult,
  ExportOptions,
  HostedExport,
  HostedOptions,
  GenerationResult,
  GenerationQuality,
  GenerationFormat,
  GenerationAspectRatio
} from './types';

export type {
  ExtendedStyleValue,
  GenerateAssetRequest,
  GenerationStatus,
  AssetMetadata,
  AssetType,
  AssetStats,
  SceneAnalysis,
  GenerationHealth,
  UploadAssetRequest,
  AICommandRequest,
  AICommandResponse,
  AICommandHistory,
  AIHealthResponse,
  AIProviderStatus,
  AICommandRequestOptions,
  AICommandStreamOptions,
  CreateProjectInput,
  ProjectListItem,
  ProjectDetail,
  FileNode,
  FileContent,
  FileWriteResult,
  ExportResult,
  ExportOptions,
  HostedExport,
  HostedOptions,
  GenerationResult,
  GenerationQuality,
  GenerationFormat,
  GenerationAspectRatio
} from './types';

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions extends RequestInit {
  query?: Record<string, QueryValue>;
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

function buildApiUrl(path: string, query?: Record<string, QueryValue>): URL {
  const baseUrl = API_BASE || window.location.origin;
  const url = new URL(`${baseUrl}${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
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
  const { query, timeoutMs = 30000, ...fetchOptions } = options || {};

  const url = buildApiUrl(path, query);
  const headers = buildHeaders(fetchOptions.headers);

  // M11: Add enhanced timeout handling for AI generation
  const aiTimeout = timeoutMs === 90000 ? 120000 : timeoutMs; // Longer timeout for AI operations
  const { signal, didTimeout, cleanup } = createAbortSignal(aiTimeout, fetchOptions.signal ?? undefined);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      signal,
    });

    if (res.status === 204) {
      return null as T;
    }

    if (!res.ok) {
      const errorDetails = await readErrorResponse(res);
      const message = typeof errorDetails.error === 'string'
        ? errorDetails.error
        : `HTTP ${res.status}: ${res.statusText}`;
      
      throw new APIClientError(message, 'http_error', {
        status: res.status,
        details: errorDetails,
      });
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await res.json();
    }

    // Handle binary responses for asset files
    if (contentType?.startsWith('image/')) {
      return await res.blob() as T;
    }

    return await res.text() as T;
  } catch (error) {
    if (error instanceof APIClientError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new APIClientError(
          error.message + (timeoutMs === 90000 ? ' (AI generation timeout)' : ''),
          didTimeout() ? 'timeout' : 'aborted'
        );
      }
    }

    throw new APIClientError(
      error instanceof Error ? error.message : 'Network error',
      'network_error'
    );
  } finally {
    cleanup();
  }
}

// ── Asset Management ──

export const api = {
  // Basic asset operations
  listAssets: (projectId: string, options?: { type?: string; search?: string; limit?: string; offset?: string }) =>
    request<AssetMetadata[]>(`/api/projects/${projectId}/assets`, { query: options }),

  getAsset: (projectId: string, assetId: string) =>
    request<AssetMetadata>(`/api/projects/${projectId}/assets/${assetId}`),

  getAssetFile: (projectId: string, assetId: string) =>
    request<Blob>(`/api/projects/${projectId}/assets/${assetId}/file`),

  // M11 Enhanced asset generation with multi-model support
  generateAsset: (projectId: string, assetReq: GenerateAssetRequest) =>
    request<{ 
      generationId: string; 
      metadata: AssetMetadata; 
      status: string;
      model?: string; // M11: Return model info
      quality?: string; // M11: Return quality info
    }>(`/api/projects/${projectId}/assets/generate`, {
      method: 'POST',
      body: JSON.stringify(assetReq),
      timeoutMs: 120000, // M11: Increased timeout for multi-model AI generation
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

  // M11 Scene analysis feature
  getSceneAnalysis: (projectId: string) =>
    request<SceneAnalysis>(`/api/projects/${projectId}/scene-analysis`),

  // M11 Generation health check
  getGenerationHealth: (projectId: string) =>
    request<GenerationHealth>(`/api/projects/${projectId}/assets/generations/health`),

  // AI Command operations — 90s timeout (backend has 30s × 2 retries)
  processAICommand: (projectId: string, command: AICommandRequest, options?: AICommandRequestOptions) =>
    request<{ response: AICommandResponse }>(`/api/projects/${projectId}/ai/command`, {
      method: 'POST',
      body: JSON.stringify(command),
      timeoutMs: 90000, // M11: Extended timeout for AI commands
      ...options,
    }),

  getAICommandHistory: (projectId: string) =>
    request<AICommandHistory[]>(`/api/projects/${projectId}/ai/command-history`),

  getAIHistory: (projectId: string, limit?: number) =>
    request<AICommandHistory[]>(`/api/projects/${projectId}/ai/command-history`, {
      query: { limit },
    }).then((history) => ({ history })),

  getAIHealth: (projectId = 'default') =>
    request<AIHealthResponse>(`/api/projects/${projectId}/ai/health`),

  // Streaming AI command responses (for real-time generation)
  processAICommandStream: (projectId: string, command: AICommandRequest, options?: AICommandStreamOptions) => {
    const url = buildApiUrl(`/api/projects/${projectId}/ai/command-stream`);
    const headers = buildHeaders({ 'Content-Type': 'application/json' });
    const { signal, cleanup } = createAbortSignal(options?.timeoutMs || 120000, options?.signal);

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(command),
      signal,
    }).then(async (res) => {
      if (!res.ok) {
        const errorDetails = await readErrorResponse(res);
        const message = typeof errorDetails.error === 'string'
          ? errorDetails.error
          : `HTTP ${res.status}: ${res.statusText}`;
        throw new APIClientError(
          message,
          'http_error',
          { status: res.status, details: errorDetails }
        );
      }

      if (!res.body) {
        throw new APIClientError('No response body', 'invalid_response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // M11: Handle streaming responses for real-time AI generation
      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              if (options?.onChunk) {
                options.onChunk(chunk);
              }

              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
            reader.releaseLock();
          }
        },
      });

      cleanup();
      return new Response(stream);
    });
  },

  // Project operations
  getProjects: () =>
    request<{ projects: ProjectListItem[] }>('/api/projects').then((r) => r.projects || []),

  listProjects: () =>
    request<{ projects: ProjectListItem[] }>('/api/projects').then((r) => r.projects || []),

  getProject: (projectId: string) =>
    request<ProjectDetail>(`/api/projects/${projectId}`),

  createProject: (projectData: CreateProjectInput) =>
    request<{ id: string; project: ProjectDetail }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    }),

  updateProject: (projectId: string, updates: Partial<{ name: string; genre?: string; artStyle?: string }>) =>
    request<any>(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteProject: (projectId: string) =>
    request<{ success: boolean }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    }),

  // File operations
  getFileTree: (projectId: string, path = '', depth = 5) =>
    request<{ tree: FileNode[] }>(`/api/projects/${projectId}/files/tree`, {
      query: { path, depth },
    }).then((r) => r.tree || []),

  readFile: (projectId: string, path: string) =>
    request<FileContent>(`/api/projects/${projectId}/files/${encodeURI(path)}`),

  writeFile: (projectId: string, path: string, content: string, encoding: 'utf-8' | 'base64' = 'utf-8') =>
    request<FileWriteResult>(`/api/projects/${projectId}/files/${encodeURI(path)}`, {
      method: 'PUT',
      body: JSON.stringify({ content, encoding }),
    }),

  createDirectory: (projectId: string, path: string) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/files/mkdir`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  searchFiles: (projectId: string, q: string) =>
    request<{ results: FileNode[] }>(`/api/projects/${projectId}/files/search`, {
      query: { q },
    }).then((r) => r.results || []),

  // Template operations
  getTemplates: () =>
    request<any[]>('/api/templates'),

  getTemplate: (templateId: string) =>
    request<any>(`/api/templates/${templateId}`),

  // Export operations
  exportProject: (projectId: string, options?: { format?: 'html' | 'zip'; includeAssets?: boolean }) =>
    request<Blob>(`/api/projects/${projectId}/export`, {
      query: options,
    }),

  exportGame: (projectId: string, options?: ExportOptions) =>
    request<ExportResult>(`/api/projects/${projectId}/export`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  getExports: (projectId: string) =>
    request<any[]>(`/api/projects/${projectId}/exports`),

  listExports: (projectId: string) =>
    request<{ exports: ExportResult[] }>(`/api/projects/${projectId}/exports`).then((r) => r.exports || []),

  getExport: (projectId: string, exportId: string) =>
    request<any>(`/api/projects/${projectId}/exports/${exportId}`),

  downloadExport: (projectId: string, filename: string) =>
    buildApiUrl(`/api/projects/${projectId}/exports/${encodeURIComponent(filename)}`).toString(),

  deleteExport: (projectId: string, filename: string) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/exports/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    }),

  listHostedExports: (projectId: string) =>
    request<{ hosted: HostedExport[] }>(`/api/projects/${projectId}/hosted`).then((r) => r.hosted || []),

  hostExport: (projectId: string, filename: string, options?: HostedOptions) =>
    request<{ success: boolean; hosted: HostedExport; message: string }>(
      `/api/projects/${projectId}/exports/${encodeURIComponent(filename)}/host`,
      { method: 'POST', body: JSON.stringify(options || {}) },
    ),

  viewHostedExport: (hostedId: string) =>
    buildApiUrl(`/api/hosted/${hostedId}/view`).toString(),

  deleteHostedExport: (projectId: string, hostedId: string) =>
    request<{ success: boolean; message: string }>(`/api/projects/${projectId}/hosted/${hostedId}`, {
      method: 'DELETE',
    }),

  getHostedHealth: () =>
    request<{ status: string; hostedDir: string; baseUrl: string }>('/api/hosted/health'),

  // Git operations
  gitStatus: (projectId: string) =>
    request<unknown>(`/api/projects/${projectId}/git/status`),

  gitDiff: (projectId: string) =>
    request<{ files: Array<{ path: string; additions: number; deletions: number }>; summary: string }>(
      `/api/projects/${projectId}/git/diff`,
    ),

  gitInit: (projectId: string) =>
    request<{ initialized: boolean }>(`/api/projects/${projectId}/git/init`, { method: 'POST' }),

  gitCommit: (projectId: string, message: string) =>
    request<{ success: boolean; hash: string; message: string }>(`/api/projects/${projectId}/git/commit`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  gitRevert: (projectId: string, body: { filePath?: string; commitHash?: string }) =>
    request<{ success: boolean }>(`/api/projects/${projectId}/git/revert`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Search operations
  searchAssets: (projectId: string, query: string, options?: { type?: string; limit?: number }) =>
    request<AssetMetadata[]>(`/api/projects/${projectId}/assets/search`, {
      query: { search: query, ...options },
    }),

  searchProjects: (query: string, options?: { genre?: string; limit?: number }) =>
    request<any[]>('/api/projects/search', {
      query: { search: query, ...options },
    }),
};

// ── AI Provider Status Utils (M11 Enhanced) ──

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

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error occurred.';
}
