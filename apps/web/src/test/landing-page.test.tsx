/**
 * Component tests for LandingPage (onboarding slice 1).
 * Gallery default + prompt bar beside it + Continue strip; zero modal/auth
 * interruptions on the activation path. All fetch stubbed; env-independent.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { templates } from '../templates/templateCatalog';
import { RECENT_PROJECTS_STORAGE_KEY } from '../utils/recentProjects';

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => data,
  };
}

let calls: Array<{ method: string; url: string; body?: any }>;

function installFetch(projectId = 'proj-1') {
  const fetchMock = vi.fn(async (url: URL | string, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url: u, method, body });
    if (u.endsWith('/api/projects') && method === 'POST') return jsonResponse({ id: projectId, project: {} });
    if (u.endsWith('/files/mkdir')) return jsonResponse({ success: true });
    if (u.includes('/files/')) return jsonResponse({ success: true });
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderLanding(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/project/:projectId/preview" element={<div>preview-page</div>} />
        <Route path="/project/:projectId" element={<div>project-overview</div>} />
        <Route path="/settings" element={<div>settings-page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  calls = [];
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('LandingPage — first-time visitor (US-1)', () => {
  it('renders the template gallery as primary content with one-line descriptions', () => {
    renderLanding();
    for (const t of templates) {
      expect(screen.getByRole('heading', { name: t.name })).toBeInTheDocument();
      expect(screen.getByText(t.description)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button', { name: /Play now/ })).toHaveLength(templates.length);
  });

  it('shows the AI prompt bar beside the gallery with honest caption', () => {
    renderLanding();
    expect(screen.getByPlaceholderText('Describe your game…')).toBeInTheDocument();
    expect(screen.getByText(/Starts from the closest template/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Start from a template')).toBeInTheDocument();
  });

  it('shows no auth, signup, key prompt, or tour modal anywhere', () => {
    renderLanding();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/api key/i)).not.toBeInTheDocument();
    expect(document.querySelector('.onboarding-overlay')).toBeNull();
  });

  it('one-click launch: card click creates project and navigates to preview', async () => {
    installFetch();
    renderLanding();

    fireEvent.click(screen.getAllByRole('button', { name: /Play now/ })[0]);

    await waitFor(() => expect(screen.getByText('preview-page')).toBeInTheDocument());
    expect(calls.some((c) => c.url.endsWith('/api/projects') && c.method === 'POST')).toBe(true);
    // Starter files written
    expect(calls.some((c) => c.url.endsWith('/files/scripts/game.ts'))).toBe(true);
    expect(calls.some((c) => c.url.endsWith('/files/scenes/main-scene.json'))).toBe(true);
    // Recorded in recent index
    const recent = JSON.parse(window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY) || '[]');
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe('proj-1');
  });

  it('prompt submit launches the matched template with description set', async () => {
    installFetch();
    renderLanding();

    fireEvent.change(screen.getByPlaceholderText('Describe your game…'), { target: { value: 'jump over pits and collect treasure' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(screen.getByText('preview-page')).toBeInTheDocument());
    const createCall = calls.find((c) => c.url.endsWith('/api/projects'));
    expect(createCall!.body.description).toBe('jump over pits and collect treasure');
    expect(createCall!.body.genre).toBe(templates.find((t) => t.id === 'platformer')!.genre);
  });

  it('shows launch error without navigating when creation fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ error: 'boom' }) }))
    );
    renderLanding();

    fireEvent.click(screen.getAllByRole('button', { name: /Play now/ })[0]);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText('preview-page')).not.toBeInTheDocument();
  });
});

describe('LandingPage — returning user (US-2)', () => {
  it('Continue building strip renders from local index immediately', () => {
    window.localStorage.setItem(
      RECENT_PROJECTS_STORAGE_KEY,
      JSON.stringify([
        { id: 'p1', name: 'Bouncing Ember', templateId: 'platformer', createdAt: '2026-08-24T01:00:00Z', lastOpenedAt: '2026-08-24T02:00:00Z' },
        { id: 'p2', name: 'Silent Harbor', templateId: 'topdown', createdAt: '2026-08-24T00:00:00Z', lastOpenedAt: '2026-08-24T01:00:00Z' },
      ])
    );
    renderLanding();

    expect(screen.getByText('Continue building')).toBeInTheDocument();
    expect(screen.getByText('Bouncing Ember')).toBeInTheDocument();
    expect(screen.getByText('Silent Harbor')).toBeInTheDocument();
  });

  it('strip is hidden when index empty; caps at 5 entries', () => {
    renderLanding();
    expect(screen.queryByText('Continue building')).not.toBeInTheDocument();

    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      name: `Project ${i}`,
      createdAt: '2026-08-24T00:00:00Z',
      lastOpenedAt: new Date(Date.UTC(2026, 7, 24, 0, i)).toISOString(),
    }));
    window.localStorage.setItem(RECENT_PROJECTS_STORAGE_KEY, JSON.stringify(many));
    renderLanding(
      // re-mount fresh
      '/'
    );
    const names = many.map((e) => e.name);
    expect(screen.getByText('Project 7')).toBeInTheDocument();
    expect(screen.queryByText(names[2])).not.toBeInTheDocument(); // only newest 5 shown
  });

  it('clicking a recent project opens its overview in one click', async () => {
    window.localStorage.setItem(
      RECENT_PROJECTS_STORAGE_KEY,
      JSON.stringify([
        { id: 'p1', name: 'Bouncing Ember', templateId: 'platformer', createdAt: '2026-08-24T01:00:00Z', lastOpenedAt: '2026-08-24T02:00:00Z' },
      ])
    );
    installFetch();
    renderLanding();

    fireEvent.click(screen.getByText('Bouncing Ember'));

    await waitFor(() => expect(screen.getByText('project-overview')).toBeInTheDocument());
    // No project creation happened — pure navigation
    expect(calls.filter((c) => c.method === 'POST' && c.url.endsWith('/api/projects'))).toHaveLength(0);
  });

  it('settings gear navigates to /settings', async () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await waitFor(() => expect(screen.getByText('settings-page')).toBeInTheDocument());
  });
});
