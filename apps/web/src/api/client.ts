/**
 * ClawGame API Client
 * Central module for all API communication.
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit & { query?: Record<string, string> }): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  
  // Add query parameters if provided
  if (options?.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, value);
      }
    });
  }

  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
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

export interface DiffEntry {
  type: 'added' | 'modified' | 'deleted';
  path: string;
  oldContent?: string;
  newContent?: string;
  summary?: string;
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
};