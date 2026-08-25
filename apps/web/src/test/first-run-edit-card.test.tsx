/**
 * Component tests for FirstRunEditCard (onboarding slice 2).
 * Chip → mock AI command (exact recipe command verbatim) → diff review →
 * apply via files PUT → funnel events + recent-index edited flag.
 * All fetch stubbed; env-independent (normalized URL routing).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FirstRunEditCard } from '../components/FirstRunEditCard';
import { recordRecentProject, RECENT_PROJECTS_STORAGE_KEY } from '../utils/recentProjects';
import {
  ACTIVATION_EVENTS_STORAGE_KEY,
  getEvents,
} from '../utils/activationEvents';

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => data,
  };
}

let calls: Array<{ url: string; method: string; body?: any }>;

/** Normalizes absolute origins so the suite passes with or without VITE_API_URL. */
function normalizeUrl(u: string) {
  return u.replace(/^https?:\/\/[^/]+/, '');
}

function installFetch(options: { sceneOnDisk?: string } = {}) {
  const fetchMock = vi.fn(async (url: URL | string, init?: RequestInit) => {
    const u = normalizeUrl(String(url));
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url: u, method, body });
    if (u.endsWith('/ai/health')) return jsonResponse({ status: 'ok', service: 'mock-ai-preview' });
    if (u.endsWith('/ai/command') && method === 'POST') {
      return jsonResponse({
        response: {
          id: 'resp-1',
          type: 'change',
          title: 'Quick edit',
          content: 'ok',
          riskLevel: 'low',
          changes: [{
            path: 'scenes/main-scene.json',
            oldContent: options.sceneOnDisk ?? '{"entities":[]}',
            newContent: (options.sceneOnDisk ?? '{"entities":[]}').replace('"entities":[]', '"entities":[{"id":"new"}]'),
            summary: 'A visible change',
            confidence: 1,
          }],
        },
      });
    }
    if (u.includes('/files/') && method === 'PUT') return jsonResponse({ success: true });
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function seedIndex(projectId: string, templateId: string) {
  recordRecentProject({ id: projectId, name: 'Test Project', templateId });
}

beforeEach(() => {
  calls = [];
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('FirstRunEditCard', () => {
  it('renders one chip per amended-catalog recipe for the template', () => {
    seedIndex('proj-1', 'platformer');
    installFetch();
    render(<FirstRunEditCard projectId="proj-1" templateId="platformer" />);
    expect(screen.getByTestId('first-run-edit-card')).toBeInTheDocument();
    expect(screen.getByText('Make it yours — try a free AI edit')).toBeInTheDocument();
    expect(screen.getByTestId('first-run-chip-platformer-move-platform')).toBeInTheDocument();
    expect(screen.getByTestId('first-run-chip-platformer-widen-ground')).toBeInTheDocument();
    expect(screen.getByTestId('first-run-chip-platformer-raise-gravity')).toBeInTheDocument();
    // No topdown recipes leak onto a platformer project
    expect(screen.queryByTestId('first-run-chip-topdown-add-pillar')).not.toBeInTheDocument();
  });

  it('renders nothing without a known template id', () => {
    installFetch();
    const { container } = render(<FirstRunEditCard projectId="proj-unknown" templateId={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides when the project is already edited or dismissed', () => {
    seedIndex('proj-1', 'topdown');
    recordRecentProject({ id: 'proj-1', name: 'Test Project', templateId: 'topdown', edited: true });
    installFetch();
    const { container } = render(<FirstRunEditCard projectId="proj-1" templateId="topdown" />);
    expect(container).toBeEmptyDOMElement();

    window.localStorage.clear();
    seedIndex('proj-2', 'topdown');
    recordRecentProject({ id: 'proj-2', name: 'T2', templateId: 'topdown', dismissedGuidance: true });
    const { container: c2 } = render(<FirstRunEditCard projectId="proj-2" templateId="topdown" />);
    expect(c2).toBeEmptyDOMElement();
  });

  it('chip click sends the exact catalog command and shows the diff for review', async () => {
    seedIndex('proj-1', 'topdown');
    const fetchMock = installFetch();
    render(<FirstRunEditCard projectId="proj-1" templateId="topdown" />);

    fireEvent.click(screen.getByTestId('first-run-chip-topdown-add-pillar'));

    await waitFor(() => expect(screen.getByText(/scenes\/main-scene\.json/)).toBeInTheDocument());
    const commandCall = calls.find((c) => c.url.endsWith('/ai/command'));
    expect(commandCall?.body.command).toBe('Add a stone pillar in the middle of the room');
    // Diff is previewable BEFORE apply — no write yet
    expect(calls.find((c) => c.method === 'PUT' && c.url.includes('/files/'))).toBeUndefined();
    // Funnel: suggestion shown + prompt submitted, no edit_applied yet
    const names = getEvents().map((e) => e.name);
    expect(names).toEqual(['ai_suggestion_shown', 'ai_prompt_submitted']);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('apply writes the file, tracks edit_applied, flags the index, and calls onApplied', async () => {
    seedIndex('proj-1', 'platformer');
    installFetch({ sceneOnDisk: '{"name":"Main Scene","entities":[]}' });
    const onApplied = vi.fn();
    render(<FirstRunEditCard projectId="proj-1" templateId="platformer" onApplied={onApplied} />);

    fireEvent.click(screen.getByTestId('first-run-chip-platformer-move-platform'));
    await waitFor(() => expect(screen.getByText(/scenes\/main-scene\.json/)).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /Apply/i })[0]);

    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    const writeCall = calls.find((c) => c.method === 'PUT' && c.url.includes('/files/'));
    expect(writeCall).toBeDefined();
    expect(writeCall!.url).toContain('/files/scenes/main-scene.json');
    expect(screen.getByText(/Press Start Game to see your change/i)).toBeInTheDocument();

    const events = getEvents();
    const applied = events.find((e) => e.name === 'edit_applied');
    expect(applied?.props).toMatchObject({
      provider: 'mock',
      recipeId: 'platformer-move-platform',
      path: 'main-scene.json',
    });

    const index = JSON.parse(window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY)!);
    expect(index.find((e: any) => e.id === 'proj-1').edited).toBe(true);
  });

  it('dismiss persists per-project guidance flag', () => {
    seedIndex('proj-1', 'topdown');
    installFetch();
    const { container } = render(<FirstRunEditCard projectId="proj-1" templateId="topdown" />);
    fireEvent.click(screen.getByLabelText('Dismiss suggestions'));
    expect(container).toBeEmptyDOMElement();
    const index = JSON.parse(window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY)!);
    expect(index.find((e: any) => e.id === 'proj-1').dismissedGuidance).toBe(true);
  });

  it('command failure shows an error instead of a diff', async () => {
    seedIndex('proj-1', 'topdown');
    vi.stubGlobal('fetch', vi.fn(async (url: URL | string) => {
      const u = normalizeUrl(String(url));
      if (u.endsWith('/ai/health')) return jsonResponse({ status: 'ok', service: 'mock-ai-preview' });
      throw new Error('network down');
    }));
    render(<FirstRunEditCard projectId="proj-1" templateId="topdown" />);
    fireEvent.click(screen.getByTestId('first-run-chip-topdown-angry-enemy'));
    await waitFor(() => expect(screen.getByText(/network down/i)).toBeInTheDocument());
    expect(getEvents().some((e) => e.name === 'edit_applied')).toBe(false);
  });
});
