/**
 * Component tests for ShareButton/SharePopover (share/publish slice 1).
 * All fetch stubbed; env-independent (no VITE_* or absolute-URL assertions —
 * URL routing normalizes through the recorded string, session-15 pattern).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, ToastList } from '../components/Toast';
import { ShareButton } from '../components/ShareButton';

const SHARE_OK = {
  success: true,
  url: 'http://localhost:3000/share/6f9619ff-8b86-d011-b42d-00cf4fc964ff',
  hosted: {
    id: '6f9619ff-8b86-d011-b42d-00cf4fc964ff',
    projectId: 'proj-1',
    projectName: 'My Game',
    filename: 'proj-1-my-game-phaser-x.html',
    hostedUrl: 'http://localhost:3000/share/6f9619ff-8b86-d011-b42d-00cf4fc964ff',
    createdAt: new Date().toISOString(),
    expiresAt: null,
    sourceIncluded: true,
  },
};

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => data,
  };
}

function installFetch(shareResponse: unknown, shareStatus = 201) {
  const calls: Array<{ url: string; method: string }> = [];
  const fetchMock = vi.fn(async (input: any, init?: any) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    // Normalize absolute origins away so the test holds under any VITE_API_URL.
    const url = raw.replace(/^https?:\/\/[^/]+/, '');
    const method = (init?.method || 'GET').toUpperCase();
    calls.push({ url, method });

    if (url.includes('/hosted') && method === 'GET') return jsonResponse({ hosted: [] });
    if (url.endsWith('/share') && method === 'POST') return jsonResponse(shareResponse, shareStatus);
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

function renderShareButton() {
  return render(
    <ToastProvider>
      <ShareButton projectId="proj-1" projectName="My Game" />
      <ToastList />
    </ToastProvider>,
  );
}

async function openPopover() {
  fireEvent.click(screen.getByTitle('Share this game'));
  await waitFor(() => screen.getByRole('dialog'));
}

beforeEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ShareButton/SharePopover — one-click share (slice 1)', () => {
  it('opens a popover with Create share link and lists existing links', async () => {
    installFetch(SHARE_OK);
    renderShareButton();
    await openPopover();

    expect(screen.getByText(/Create share link/i)).toBeTruthy();
  });

  it('creates a link on click and shows copy/open plus honest notes and source labeling', async () => {
    const { calls } = installFetch(SHARE_OK);
    renderShareButton();
    await openPopover();

    fireEvent.click(screen.getByText(/Create share link/i));

    await waitFor(() => expect(screen.getByDisplayValue(SHARE_OK.url)).toBeTruthy());
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/share'))).toBe(true);

    // Copy writes the capability-token URL to the clipboard.
    fireEvent.click(screen.getByText('Copy'));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SHARE_OK.url),
    );

    // Honesty rules: availability note + visible source-included labeling
    // (CEO ruling 2), never an expiry promise for non-expiring shares.
    expect(screen.getByText(/works while your ClawGame server is running/i)).toBeTruthy();
    expect(screen.getByText(/Includes full editable source/i)).toBeTruthy();
  });

  it('shows the export-stage error toast when export fails', async () => {
    installFetch({ success: false, stage: 'export', error: 'Project not found' }, 400);
    renderShareButton();
    await openPopover();

    fireEvent.click(screen.getByText(/Create share link/i));

    await waitFor(() => expect(screen.getByText(/Export failed/i)).toBeTruthy());
    // No dead link ever reaches the clipboard (US-1 AC 5).
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('shows the host-stage error toast when hosting fails after a successful export', async () => {
    installFetch({ success: false, stage: 'host', error: 'disk full' }, 500);
    renderShareButton();
    await openPopover();

    fireEvent.click(screen.getByText(/Create share link/i));

    await waitFor(() => expect(screen.getByText(/Hosting failed/i)).toBeTruthy());
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
