/**
 * Component tests for AICommandPage provider badge + failover toast
 * (session-14 lane A Unit 2, spec docs/ai-provider-spec.md §Frontend).
 *
 * All fetch stubbed; env-independent (no VITE_API_URL / .env.local dependency).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AICommandPage } from '../pages/AICommandPage';
import { ToastProvider, ToastList } from '../components/Toast';

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => data,
  };
}

const HEALTH_LIVE = {
  status: 'ok',
  service: 'real-ai-service',
  features: [],
  providerStatus: {
    state: 'ready',
    message: 'Live AI response received.',
    provider: 'opencode',
    updatedAt: new Date().toISOString(),
  },
};

const HEALTH_MOCK = {
  status: 'ok',
  service: 'mock-ai-preview',
  features: [],
};

function commandResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'resp-1',
    type: 'explanation',
    title: 'Done',
    content: 'RESPONSE_BODY',
    fromFallback: false,
    providerStatus: {
      state: 'ready',
      message: 'Live AI response received.',
      provider: 'opencode',
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

function installFetch(health: unknown, commandBody: unknown) {
  const fetchMock = vi.fn(async (input: any) => {
    const path = String(input instanceof URL ? input.pathname : input);
    if (path.endsWith('/ai/health')) return jsonResponse(health);
    if (path.endsWith('/ai/command-history')) return jsonResponse([]);
    if (path.endsWith('/ai/command')) return jsonResponse({ response: commandBody });
    return jsonResponse({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/project/proj-1/ai-command']}>
        <Routes>
          <Route path="/project/:projectId/ai-command" element={<AICommandPage />} />
        </Routes>
        {/* AppLayout mounts ToastList in the real app; mirror it here so
            showToast output is assertable without the full layout. */}
        <ToastList />
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function submitCommand() {
  const input = await screen.findByPlaceholderText(/ask|command/i);
  fireEvent.change(input, { target: { value: 'make a coin' } });
  fireEvent.submit(input.closest('form')!);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

beforeAll(() => {
  // jsdom does not implement scrollIntoView (AICommandPage auto-scroll effect).
  Element.prototype.scrollIntoView = vi.fn();
});

describe('AICommandPage provider badge', () => {
  it('shows the active provider label from health', async () => {
    installFetch(HEALTH_LIVE, commandResponse());
    renderPage();
    const badge = await screen.findByTestId('ai-provider-badge');
    expect(badge).toHaveTextContent('opencode');
  });

  it('falls back to mock label in preview mode', async () => {
    installFetch(HEALTH_MOCK, commandResponse());
    renderPage();
    const badge = await screen.findByTestId('ai-provider-badge');
    expect(badge).toHaveTextContent('mock');
  });
});

describe('AICommandPage failover toast', () => {
  it('toasts the serving fallback provider on demotion', async () => {
    installFetch(
      HEALTH_LIVE,
      commandResponse({
        providerStatus: {
          state: 'ready',
          message: 'Live AI response received.',
          provider: 'anthropic',
          failedOver: true,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    renderPage();
    await submitCommand();

    await waitFor(() => {
      expect(screen.getByText(/Switched to fallback provider anthropic/i)).toBeInTheDocument();
    });
  });

  it('keeps the local-template notice for non-failover fallback responses', async () => {
    installFetch(
      HEALTH_LIVE,
      commandResponse({
        content: 'LOCAL_TEMPLATE_CONTENT',
        fromFallback: true,
        providerStatus: {
          state: 'degraded',
          message: 'Using local templates.',
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    renderPage();
    await submitCommand();

    await waitFor(() => {
      expect(screen.getByText(/AI service unavailable — using local templates/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Switched to fallback provider/i)).not.toBeInTheDocument();
  });
});
