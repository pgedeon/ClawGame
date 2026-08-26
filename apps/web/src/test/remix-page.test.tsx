/**
 * Component tests for RemixPage (share/publish slice 2).
 *
 * Covers the import flow end-to-end at the component level with all fetch
 * stubbed: payload fetch → project create → scene write → redirect into the
 * editor, plus error paths (invalid token, create failure) and the
 * StrictMode double-mount guard. URL routing normalizes through recorded
 * strings so tests hold under any VITE_API_URL (session-15 pattern).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { RemixPage } from '../pages/RemixPage';
import { RECENT_PROJECTS_STORAGE_KEY } from '../utils/recentProjects';
import { ACTIVATION_EVENTS_STORAGE_KEY } from '../utils/activationEvents';

const TOKEN = '6f9619ff-8b86-d011-b42d-00cf4fc964ff';

const PAYLOAD = {
  schema: 1,
  originProjectId: 'origin-project-1',
  originHostedId: TOKEN,
  sharedAt: new Date().toISOString(),
  sourceIncluded: true,
  project: {
    name: 'Space Shooter',
    genre: 'shooter',
    artStyle: 'pixel',
    description: 'Blast rocks',
    settings: { width: 1280, height: 720, backgroundColor: '#1a1a2e', gravity: { x: 0, y: 0.5 } },
  },
  scene: { name: 'Remix Marker Scene', entities: [{ id: 'probe-1' }] },
  assets: [],
};

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => data,
  };
}

interface Call { url: string; method: string; body?: any }

/**
 * Fetch stub with route-aware responses. `createId` controls the id the stubbed
 * create endpoint hands out; every call is recorded for assertions.
 */
function installFetch(opts: {
  remixStatus?: number;
  remixBody?: unknown;
  createStatus?: number;
  createId?: string;
} = {}) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: any, init?: any) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = raw.replace(/^https?:\/\/[^/]+/, '');
    const method = (init?.method || 'GET').toUpperCase();
    let body: any;
    try { body = JSON.parse(init?.body ?? 'null'); } catch { body = undefined; }
    calls.push({ url, method, body });

    if (url.includes(`/api/share/${TOKEN}/remix`) && method === 'GET') {
      return jsonResponse(opts.remixBody ?? PAYLOAD, opts.remixStatus ?? 200);
    }
    if (url === '/api/projects' && method === 'POST') {
      if (opts.createStatus && opts.createStatus >= 400) {
        return jsonResponse({ error: 'create exploded' }, opts.createStatus);
      }
      return jsonResponse({ id: opts.createId ?? 'remixed-1', project: {} });
    }
    if (url.includes('/files/mkdir') && method === 'POST') return jsonResponse({ success: true });
    if (url.includes('/files/') && method === 'PUT') return jsonResponse({ success: true });
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function renderRemixPage(initialUrl = `/remix/${TOKEN}`) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/remix/:token" element={<RemixPage />} />
        <Route path="/project/:projectId/editor" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RemixPage — remix import flow (slice 2)', () => {
  it('happy path: fetch payload → create "Remix of …" → write scene → redirect into editor', async () => {
    const { calls } = installFetch();
    renderRemixPage();

    // Redirect into the editor of the freshly created copy.
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/project/remixed-1/editor'),
    );

    // Create call: auto-named after the origin project.
    const create = calls.find((c) => c.method === 'POST' && c.url === '/api/projects');
    expect(create).toBeTruthy();
    expect(create!.body.name).toBe('Remix of Space Shooter');
    expect(create!.body.genre).toBe('shooter');
    expect(create!.body.settings).toMatchObject({ width: 1280 });

    // Scene JSON written verbatim into the new project.
    const write = calls.find((c) => c.method === 'PUT' && c.url.includes('scenes/main-scene.json'));
    expect(write).toBeTruthy();
    expect(write!.url).toContain('/api/projects/remixed-1/files/');
    const written = JSON.parse(write!.body.content);
    expect(written.name).toBe('Remix Marker Scene');
    expect(written.entities[0].id).toBe('probe-1');

    // Recent-projects lineage recorded with remixedFrom token.
    const recent = JSON.parse(window.localStorage.getItem(RECENT_PROJECTS_STORAGE_KEY) || '[]');
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ id: 'remixed-1', name: 'Remix of Space Shooter', remixedFrom: TOKEN });
  });

  it('records a game_remixed funnel event (ids only) after the fork fully succeeds', async () => {
    installFetch();
    renderRemixPage();

    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/project/remixed-1/editor'),
    );

    const events = JSON.parse(window.localStorage.getItem(ACTIVATION_EVENTS_STORAGE_KEY) || '[]');
    const remixEvent = events.find((e: any) => e.name === 'game_remixed');
    expect(remixEvent).toBeTruthy();
    expect(remixEvent.props).toEqual({ hostedId: TOKEN, projectId: 'remixed-1' });
    expect(typeof remixEvent.ts).toBe('string');
  });

  it('failed imports record no game_remixed event', async () => {
    installFetch({ remixStatus: 404 });
    renderRemixPage();

    await waitFor(() => screen.getByText(/Remix unavailable/i));

    const events = JSON.parse(window.localStorage.getItem(ACTIVATION_EVENTS_STORAGE_KEY) || '[]');
    expect(events.filter((e: any) => e.name === 'game_remixed')).toHaveLength(0);
  });

  it('invalid token (404): error card, no project created, back-to-game link offered', async () => {
    const { calls } = installFetch({ remixStatus: 404 });
    renderRemixPage();

    await waitFor(() => expect(screen.getByText(/Remix unavailable/i)).toBeTruthy());
    expect(screen.getByText(/invalid or the shared game no longer exists/i)).toBeTruthy();

    // No fork happened.
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/projects')).toBe(false);

    // Honest recovery path back to the playable share on the API origin.
    const back = screen.getByText(/Back to the game/i).closest('a') as HTMLAnchorElement;
    expect(back.getAttribute('href')).toContain(`/share/${TOKEN}`);
  });

  it('create failure: error card instead of a silent half-import', async () => {
    installFetch({ createStatus: 500 });
    renderRemixPage();

    await waitFor(() => expect(screen.getByText(/Remix unavailable/i)).toBeTruthy());
    expect(screen.getByText(/Remix failed/i)).toBeTruthy();
  });

  it('StrictMode double effect-cycle creates exactly one project and still navigates', async () => {
    const { calls } = installFetch();

    // Real StrictMode cycle: same instance mounts, cleanup runs, effect
    // re-fires with refs preserved. Regression guard: an over-eager
    // `cancelled` bail-out strands this exact flow in loading forever.
    render(
      <React.StrictMode>
        <MemoryRouter initialEntries={[`/remix/${TOKEN}`]}>
          <Routes>
            <Route path="/remix/:token" element={<RemixPage />} />
            <Route path="/project/:projectId/editor" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </React.StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/project/remixed-1/editor'),
    );
    expect(calls.filter((c) => c.method === 'POST' && c.url === '/api/projects')).toHaveLength(1);
  });

  it('play-only shares are refused with an honest message', async () => {
    installFetch({ remixBody: { ...PAYLOAD, sourceIncluded: false } });
    renderRemixPage();

    await waitFor(() => expect(screen.getByText(/play-only/i)).toBeTruthy());
  });
});
