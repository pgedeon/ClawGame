/**
 * Component tests for GalleryPage (P3.1 community gallery/feed v1).
 * All fetch stubbed; env-independent (URL routing normalizes through the
 * recorded string, session-15 pattern — no VITE_* or absolute-origin asserts).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GalleryPage } from '../pages/GalleryPage';

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => data,
  };
}

const GAMES = [
  {
    id: 'tok-latest',
    name: 'Neon Jumper',
    plays: 12,
    remixes: 3,
    sharedAt: '2026-08-26T12:00:00.000Z',
    url: 'http://localhost:3000/share/tok-latest',
  },
  {
    id: 'tok-older',
    name: 'Cave Runner',
    plays: 0,
    remixes: 0,
    sharedAt: '2026-08-25T09:30:00.000Z',
    url: 'http://localhost:3000/share/tok-older',
  },
];

function installFetch(games: unknown[] | null, fail = false) {
  const calls: Array<{ url: string; method: string }> = [];
  const fetchMock = vi.fn(async (input: any) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const url = raw.replace(/^https?:\/\/[^/]+/, '');
    calls.push({ url, method: 'GET' });
    if (fail) return { ok: false, status: 500, headers: { get: () => 'application/json' }, json: async () => ({ error: 'boom' }) };
    return jsonResponse({ games });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

function renderGallery() {
  return render(
    <MemoryRouter initialEntries={['/gallery']}>
      <GalleryPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('GalleryPage — community feed v1', () => {
  it('renders one card per shared game with name, counts and shared date', async () => {
    installFetch(GAMES);
    renderGallery();

    await waitFor(() => expect(screen.getByTestId('gallery-grid')).toBeInTheDocument());
    expect(screen.getByText('Neon Jumper')).toBeInTheDocument();
    expect(screen.getByText('Cave Runner')).toBeInTheDocument();
    // Aggregate counters surface on the cards (feed's whole point).
    // textContent keeps the space after the inline icon — trim.
    expect(screen.getAllByTitle('Plays').map((el) => el.textContent?.trim())).toEqual(['12', '0']);
    expect(screen.getAllByTitle('Remixes').map((el) => el.textContent?.trim())).toEqual(['3', '0']);
    // Shared-date line renders per card (exact string is locale-dependent —
    // toLocaleDateString(undefined) — so assert presence, not formatting).
    expect(screen.getAllByText(/^Shared /)).toHaveLength(2);
  });

  it('links each card to the hosted /share/:token page in a new tab', async () => {
    installFetch(GAMES);
    renderGallery();

    await waitFor(() => expect(screen.getByTestId('gallery-grid')).toBeInTheDocument());
    const card = screen.getByText('Neon Jumper').closest('a');
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute('href', 'http://localhost:3000/share/tok-latest');
    expect(card).toHaveAttribute('target', '_blank');
    expect(card).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows the empty state when nothing has been shared yet', async () => {
    installFetch([]);
    renderGallery();

    await waitFor(() => expect(screen.getByTestId('gallery-empty')).toBeInTheDocument());
    expect(screen.queryByTestId('gallery-grid')).toBeNull();
  });

  it('shows a recoverable error state when the listing request fails', async () => {
    installFetch(null, true);
    renderGallery();

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByTestId('gallery-grid')).toBeNull();
    expect(screen.queryByTestId('gallery-empty')).toBeNull();
  });

  it('requests exactly GET /api/gallery', async () => {
    const { calls } = installFetch([]);
    renderGallery();

    await waitFor(() => expect(screen.getByTestId('gallery-empty')).toBeInTheDocument());
    expect(calls.some((c) => c.method === 'GET' && c.url.endsWith('/api/gallery'))).toBe(true);
  });
});
