/**
 * Component tests for AIProvidersPage (P1 milestone 3 slice).
 * All fetch traffic mocked; asserts new-shape PUT payloads, test-connection
 * flow, set-active toggle, fallback chain reorder, and first-run gating.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AIProvidersPage, type ProvidersResponse, type ConfigResponse } from '../pages/AIProvidersPage';

function jsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

/**
 * Normalize: AIProvidersPage prefixes VITE_API_URL when a developer env file
 * (e.g. .env.local) sets it — strip any absolute origin so recorded URLs and
 * assertions stay env-independent (same pattern as asset-mapping fix).
 */
function normalizeUrl(u: URL | string): string {
  return String(u).replace(/^https?:\/\/[^/]+/, '');
}

const providersConfigured: ProvidersResponse = {
  activeProvider: 'opencode',
  fallbackChain: ['openai-compat'],
  useRealAI: true,
  providers: [
    { id: 'opencode', available: true, configured: true, health: { ok: true, latencyMs: 42 } },
    { id: 'anthropic', available: false, configured: false, health: null },
    { id: 'openai-compat', available: true, configured: true, health: null },
    { id: 'mock', available: true, configured: true, health: null },
  ],
};

const providersUnconfigured: ProvidersResponse = {
  activeProvider: 'mock',
  fallbackChain: [],
  useRealAI: false,
  providers: [
    { id: 'opencode', available: true, configured: false, health: null },
    { id: 'anthropic', available: false, configured: false, health: null },
    { id: 'openai-compat', available: true, configured: false, health: null },
    { id: 'mock', available: true, configured: true, health: null },
  ],
};

const configStored: ConfigResponse = {
  provider: 'zai',
  apiUrl: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
  model: 'glm-4.5-flash',
  apiKey: '****abcd',
  useRealAI: true,
  activeProvider: 'opencode',
  fallbackChain: ['openai-compat'],
  opencode: { apiKey: '****zen1', model: 'big-pickle' },
  anthropic: { apiKey: '', model: 'claude-sonnet-4-6' },
  openaiCompat: { baseUrl: 'https://openrouter.ai/api/v1/chat/completions', apiKey: '****or99', model: 'glm-4.5-flash' },
};

const configEmpty: ConfigResponse = {
  ...configStored,
  apiKey: '',
  useRealAI: false,
  activeProvider: 'mock',
  fallbackChain: [],
  opencode: { apiKey: '', model: '' },
  openaiCompat: { baseUrl: 'https://api.z.ai/api/coding/paas/v4/chat/completions', apiKey: '', model: 'glm-4.5-flash' },
};

let calls: Array<{ url: string; method: string; body?: any }>;

function installFetch(opts: {
  providers?: ProvidersResponse;
  config?: ConfigResponse;
  modelsOk?: Record<string, boolean>;
} = {}) {
  const providers = opts.providers ?? providersConfigured;
  let config = opts.config ?? configStored;
  const fetchMock = vi.fn(async (url: URL | string, init?: RequestInit) => {
    const u = normalizeUrl(url);
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url: u, method, body });

    if (u.includes('/api/ai/providers')) return jsonResponse(providers);
    if (u.includes('/api/ai/config')) {
      if (method === 'PUT') {
        config = {
          ...config,
          ...(body.activeProvider !== undefined ? { activeProvider: body.activeProvider } : {}),
          ...(body.fallbackChain !== undefined ? { fallbackChain: body.fallbackChain } : {}),
          ...(body.opencode ? { opencode: { ...config.opencode, ...body.opencode, apiKey: body.opencode.apiKey ? '****new1' : config.opencode.apiKey } } : {}),
        };
        return jsonResponse(config);
      }
      return jsonResponse(config);
    }
    if (u.includes('/api/ai/models')) {
      const provider = new URL(url, 'http://localhost').searchParams.get('provider');
      const okMap = opts.modelsOk ?? {};
      if (okMap[provider || ''] === false) {
        return jsonResponse({ error: `${provider} is not configured` }, false, 400);
      }
      if (provider === 'opencode') {
        return jsonResponse({ models: [{ id: 'big-pickle', name: 'Big Pickle (free)' }, { id: 'mimo-v2.5-free', name: 'MiMo v2.5 Free' }] });
      }
      if (provider === 'anthropic') {
        return jsonResponse({ models: [{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' }] });
      }
      if (provider === 'openai-compat') {
        return jsonResponse({ models: [{ id: 'glm-4.5-flash', name: 'GLM-4.5 Flash' }] });
      }
      return jsonResponse({ models: [] });
    }
    if (u.includes('/api/ai/test')) {
      return jsonResponse({ provider: body?.provider, ok: true, latencyMs: 7 });
    }
    return jsonResponse({ error: 'not found' }, false, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AIProvidersPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  calls = [];
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('AIProvidersPage', () => {
  it('renders provider cards for opencode / anthropic / openai-compat plus mock row', async () => {
    installFetch();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('card-opencode')).toBeInTheDocument();
    });
    expect(screen.getByTestId('card-anthropic')).toBeInTheDocument();
    expect(screen.getByTestId('card-openai-compat')).toBeInTheDocument();
    expect(screen.getByTestId('card-mock')).toBeInTheDocument();
    expect(screen.getByTestId('configured-opencode')).toHaveTextContent('configured');
    expect(screen.getByTestId('configured-anthropic')).toHaveTextContent('not configured');
    // ACTIVE badge follows config.activeProvider
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('model dropdowns are fed by GET /api/ai/models?provider=', async () => {
    installFetch();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('model-select-opencode')).toBeInTheDocument();
    });
    const select = screen.getByTestId('model-select-opencode') as HTMLSelectElement;
    await waitFor(() => {
      expect(select.options.length).toBeGreaterThanOrEqual(2);
    });
    expect(select.options[0].value).toBe('big-pickle');
    expect(calls.some(c => c.url.includes('/api/ai/models?provider=anthropic'))).toBe(true);
  });
  it('Test Connection posts to /api/ai/test and shows visible result', async () => {
    installFetch();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('test-opencode')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('test-opencode'));

    await waitFor(() => {
      expect(screen.getByTestId('test-result-opencode')).toHaveTextContent('OK');
    });
    expect(screen.getByTestId('test-result-opencode')).toHaveTextContent('7ms');
    const testCall = calls.find(c => c.url.includes('/api/ai/test'));
    expect(testCall?.method).toBe('POST');
    expect(testCall?.body).toEqual({ provider: 'opencode' });
  });

  it('Set Active PUTs { activeProvider } in the new shape', async () => {
    const fetchMock = installFetch();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('set-active-anthropic')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('set-active-anthropic'));

    // Env-independent: match against normalized recorded URLs, not raw fetch args
    await waitFor(() => {
      const putCall = calls.find(c => c.url === '/api/ai/config' && c.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(putCall?.body).toEqual({ activeProvider: 'anthropic' });
    });
  });

  it('Save on a provider card PUTs per-provider settings with write-only key', async () => {
    const fetchMock = installFetch();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('key-input-opencode')).toBeInTheDocument();
    });
    // Write-only: input starts empty even though a masked key is stored
    expect((screen.getByTestId('key-input-opencode') as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('key-status-opencode')).toHaveTextContent('****zen1');

    fireEvent.change(screen.getByTestId('key-input-opencode'), { target: { value: 'sk-new-key' } });
    fireEvent.click(screen.getByTestId('save-opencode'));

    // Env-independent: match against normalized recorded URLs, not raw fetch args
    await waitFor(() => {
      const putCall = calls.find(c => c.url === '/api/ai/config' && c.method === 'PUT');
      expect(putCall).toBeTruthy();
      // Per-provider section payload: new key + currently selected model
      expect(putCall?.body).toEqual({ opencode: { apiKey: 'sk-new-key', model: 'big-pickle' } });
    });
  });

  it('fallback chain reorder PUTs the new order', async () => {
    const fetchMock = installFetch({ config: { ...configStored, fallbackChain: ['anthropic', 'openai-compat'] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('chain-item-anthropic')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('chain-up-openai-compat'));

    // Env-independent: match against normalized recorded URLs, not raw fetch args
    await waitFor(() => {
      const putCall = calls.find(c => c.url === '/api/ai/config' && c.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(putCall?.body).toEqual({ fallbackChain: ['openai-compat', 'anthropic'] });
    });
  });

  it('first-run prompt shows when nothing is configured and skip persists dismissal', async () => {
    installFetch({ providers: providersUnconfigured, config: configEmpty });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('first-run-prompt')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /opencode\.ai\/auth/i })).toHaveAttribute('href', 'https://opencode.ai/auth');

    fireEvent.click(screen.getByTestId('firstrun-skip'));
    await waitFor(() => {
      expect(screen.queryByTestId('first-run-prompt')).not.toBeInTheDocument();
    });
    expect(localStorage.getItem('clawgame-ai-firstrun-dismissed')).toBe('1');
  });

  it('first-run save PUTs opencode key + activeProvider, then runs connectivity test', async () => {
    const fetchMock = installFetch({ providers: providersUnconfigured, config: configEmpty });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('firstrun-key-input')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('firstrun-key-input'), { target: { value: 'oc-free-key' } });
    fireEvent.click(screen.getByText(/Save & Activate/i));

    // Env-independent: match against normalized recorded URLs, not raw fetch args
    await waitFor(() => {
      const putCall = calls.find(c => c.url === '/api/ai/config' && c.method === 'PUT');
      expect(putCall).toBeTruthy();
      expect(putCall?.body).toEqual({ opencode: { apiKey: 'oc-free-key' }, activeProvider: 'opencode' });
    });
    await waitFor(() => {
      const testCall = calls.filter(c => c.url.includes('/api/ai/test')).pop();
      expect(testCall?.body).toEqual({ provider: 'opencode' });
    });
  });

  it('first-run prompt skipped entirely when a provider already works', () => {
    installFetch(); // providersConfigured
    renderPage();

    // Loading resolves without ever showing the guided prompt
    return waitFor(() => {
      expect(screen.getByTestId('card-opencode')).toBeInTheDocument();
      expect(screen.queryByTestId('first-run-prompt')).not.toBeInTheDocument();
    });
  });

  it('mock Test Connection always answers ok', async () => {
    installFetch();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('test-mock')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId('test-mock'));

    await waitFor(() => {
      expect(screen.getByTestId('test-result-mock')).toHaveTextContent('OK');
    });
  });
});
