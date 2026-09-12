/**
 * Component tests for AISidePanel open-state defaults (QA v6 finding 2).
 * The panel must default to CLOSED on a fresh browser so its fixed-position
 * overlay never occludes page controls (Share / Add Entity), and must remember
 * the user's last explicit open/closed choice across mounts. All fetch
 * stubbed; env-independent.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AISidePanel, AI_PANEL_OPEN_STORAGE_KEY } from '../components/AISidePanel';
import { ToastProvider } from '../components/Toast';

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => data,
  };
}

function installFetch() {
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ status: 'ok', service: 'mock-ai-preview' })));
}

function renderPanel(pageContext: string) {
  return render(
    <ToastProvider>
      <AISidePanel projectId="proj-1" pageContext={pageContext} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  // jsdom has no scrollIntoView; the panel's messages-end effect calls it on mount.
  Element.prototype.scrollIntoView = vi.fn();
});

describe('AISidePanel open-state', () => {
  it('defaults to closed on a fresh browser (no stored preference)', () => {
    installFetch();
    renderPanel('Game Preview');
    // Collapsed state shows the toggle button; the panel body is absent.
    expect(screen.getByTitle('Open AI Assistant')).toBeInTheDocument();
    expect(document.querySelector('.ai-side-panel')).toBeNull();
  });

  it('opening the panel persists the choice and reopens on next mount', () => {
    installFetch();
    const { unmount } = renderPanel('Game Preview');
    fireEvent.click(screen.getByTitle('Open AI Assistant'));
    expect(document.querySelector('.ai-side-panel')).not.toBeNull();
    expect(window.localStorage.getItem(AI_PANEL_OPEN_STORAGE_KEY)).toBe('true');
    unmount();

    const second = renderPanel('Scene Editor');
    expect(document.querySelector('.ai-side-panel')).not.toBeNull();
    expect(screen.queryByTitle('Open AI Assistant')).toBeNull();
    second.unmount();
  });

  it('closing the panel persists the choice and stays closed on next mount', () => {
    installFetch();
    // Seed an open preference, then close via the panel's close button.
    window.localStorage.setItem(AI_PANEL_OPEN_STORAGE_KEY, 'true');
    const { unmount } = renderPanel('Scene Editor');
    expect(document.querySelector('.ai-side-panel')).not.toBeNull();
    fireEvent.click(screen.getByTitle('Close AI Assistant'));
    expect(document.querySelector('.ai-side-panel')).toBeNull();
    expect(window.localStorage.getItem(AI_PANEL_OPEN_STORAGE_KEY)).toBe('false');
    unmount();

    renderPanel('Game Preview');
    expect(document.querySelector('.ai-side-panel')).toBeNull();
    expect(screen.getByTitle('Open AI Assistant')).toBeInTheDocument();
  });

  it('invalid stored values fall back to closed', () => {
    installFetch();
    window.localStorage.setItem(AI_PANEL_OPEN_STORAGE_KEY, 'garbage');
    renderPanel('Game Preview');
    expect(document.querySelector('.ai-side-panel')).toBeNull();
  });
});
