/**
 * Unit tests for the shared template launcher + recent projects index
 * (onboarding slice 1). All fetch traffic stubbed; env-independent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  launchTemplate,
  createProjectWithTemplate,
  generateProjectName,
  matchPromptToTemplate,
} from '../templates/templateLaunch';
import { getTemplateById } from '../templates/templateCatalog';
import { templateScenes } from '../templates/templateScenes';
import {
  getRecentProjects,
  recordRecentProject,
  touchRecentProject,
  removeRecentProject,
  RECENT_PROJECTS_STORAGE_KEY,
} from '../utils/recentProjects';

type Call = { method: string; url: string; body?: any };

let calls: Call[];

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => data,
  };
}

function installFetch(projectId = 'proj-1') {
  const fetchMock = vi.fn(async (url: URL | string, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url: u, method, body });

    if (u.endsWith('/api/projects') && method === 'POST') {
      return jsonResponse({ id: projectId, project: {} });
    }
    if (u.endsWith('/files/mkdir')) {
      return jsonResponse({ success: true });
    }
    if (u.includes('/files/') && method === 'PUT') {
      return jsonResponse({ success: true });
    }
    return jsonResponse({ error: `unrouted ${method} ${u}` }, );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  calls = [];
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('generateProjectName', () => {
  it('returns adjective+noun style names', () => {
    for (let i = 0; i < 25; i++) {
      expect(generateProjectName()).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    }
  });

  it('generates varied names across draws', () => {
    const names = new Set(Array.from({ length: 60 }, () => generateProjectName()));
    expect(names.size).toBeGreaterThan(1);
  });
});

describe('matchPromptToTemplate', () => {
  it('maps jump/platform wording to platformer', () => {
    expect(matchPromptToTemplate('a game where I jump over gaps')).toBe('platformer');
    expect(matchPromptToTemplate('side-scrolling platform adventure')).toBe('platformer');
  });

  it('maps talk/dialogue/npc/quest wording to dialogue', () => {
    expect(matchPromptToTemplate('talk to villagers and solve a quest')).toBe('dialogue');
    expect(matchPromptToTemplate('story driven npc conversations')).toBe('dialogue');
  });

  it('falls back to topdown for unmatched prompts', () => {
    expect(matchPromptToTemplate('shoot asteroids in space')).toBe('topdown');
    expect(matchPromptToTemplate('')).toBe('topdown');
  });
});

describe('launchTemplate', () => {
  it('creates an auto-named project with template defaults and starter files', async () => {
    installFetch();

    const result = await launchTemplate('platformer');

    expect(result.id).toBe('proj-1');
    expect(result.templateId).toBe('platformer');

    // One create call with catalog defaults
    const createCalls = calls.filter((c) => c.url.endsWith('/api/projects'));
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0].body.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(createCalls[0].body.genre).toBe(getTemplateById('platformer')!.genre);
    expect(createCalls[0].body.runtimeTarget).toBe('browser');

    // Template file sequence: game.ts, player.ts, scenes dir, main-scene.json
    const paths = calls.map((c) => c.url);
    expect(paths.some((p) => p.endsWith('/files/scripts/game.ts'))).toBe(true);
    expect(paths.some((p) => p.endsWith('/files/scripts/player.ts'))).toBe(true);
    expect(paths.some((p) => p.endsWith('/files/mkdir'))).toBe(true);
    const sceneCall = calls.find((c) => c.url.endsWith('/files/scenes/main-scene.json'));
    expect(sceneCall).toBeDefined();
    expect(JSON.parse(sceneCall!.body.content)).toEqual(templateScenes.platformer);

    // Recorded in the recent index
    const recent = getRecentProjects();
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe('proj-1');
    expect(recent[0].templateId).toBe('platformer');
  });

  it('stores prompt text as project description', async () => {
    installFetch();
    await launchTemplate('topdown', { description: 'twin-stick arena crawler' });
    const createCall = calls.find((c) => c.url.endsWith('/api/projects'));
    expect(createCall!.body.description).toBe('twin-stick arena crawler');
  });

  it('throws on unknown template id without calling the API', async () => {
    const fetchMock = installFetch();
    await expect(launchTemplate('nope')).rejects.toThrow('Unknown template: nope');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still returns the project when template file writing fails', async () => {
    const fetchMock = vi.fn(async (url: URL | string, init?: RequestInit) => {
      const u = String(url);
      const method = init?.method || 'GET';
      if (u.endsWith('/api/projects') && method === 'POST') return jsonResponse({ id: 'proj-x', project: {} });
      return { ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ error: 'boom' }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await launchTemplate('dialogue');
    expect(result.id).toBe('proj-x'); // creation not blocked by file failure
    expect(getRecentProjects()[0].id).toBe('proj-x');
  });
});

describe('createProjectWithTemplate (form path)', () => {
  it('uses explicit form input and preserves genre fallback', async () => {
    installFetch('form-1');
    const template = getTemplateById('topdown')!;
    const { id } = await createProjectWithTemplate(
      { name: 'My Game', genre: '', artStyle: 'pixel', description: '' },
      template
    );
    expect(id).toBe('form-1');
    const createCall = calls.find((c) => c.url.endsWith('/api/projects'));
    expect(createCall!.body.genre).toBe(template.genre); // filled from template
    expect(createCall!.body.name).toBe('My Game');
  });
});

describe('recentProjects index', () => {
  it('upserts by id and sorts newest-first by lastOpenedAt', () => {
    recordRecentProject({ id: 'a', name: 'Alpha', createdAt: '2026-08-24T01:00:00Z', lastOpenedAt: '2026-08-24T01:00:00Z' });
    recordRecentProject({ id: 'b', name: 'Beta', createdAt: '2026-08-24T02:00:00Z', lastOpenedAt: '2026-08-24T02:00:00Z' });
    recordRecentProject({ id: 'a', name: 'Alpha reopened' }); // bumps lastOpenedAt

    const recent = getRecentProjects();
    expect(recent.map((e) => e.id)).toEqual(['a', 'b']);
    expect(recent[0].name).toBe('Alpha reopened');
  });

  it('caps at 20 entries dropping oldest', () => {
    for (let i = 0; i < 25; i++) {
      recordRecentProject({ id: `p${i}`, name: `P${i}`, lastOpenedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString() });
    }
    const recent = getRecentProjects();
    expect(recent).toHaveLength(20);
    expect(recent[0].id).toBe('p24');
    expect(recent.some((e) => e.id === 'p0')).toBe(false);
  });

  it('touch patches fields, remove deletes, missing id is no-op', () => {
    recordRecentProject({ id: 'a', name: 'Alpha' });
    touchRecentProject('a', { edited: true });
    expect(getRecentProjects()[0].edited).toBe(true);
    touchRecentProject('missing', { edited: true });
    removeRecentProject('a');
    expect(getRecentProjects()).toEqual([]);
    expect(() => removeRecentProject('missing')).not.toThrow();
  });

  it('degrades gracefully on corrupt or absent storage data', () => {
    window.localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, '{not json');
    expect(getRecentProjects()).toEqual([]);
    window.localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    expect(getRecentProjects()).toEqual([]);
    window.localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify([{ garbage: true }, null]));
    expect(getRecentProjects()).toEqual([]);
  });
});
