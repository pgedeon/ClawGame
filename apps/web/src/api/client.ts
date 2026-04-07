/**
 * ClawGame API Client
 * Central module for all API communication.
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
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
};