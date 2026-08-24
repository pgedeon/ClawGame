/**
 * Component tests for ExportPage default export format (retro-2 ruling #2).
 * phaser-html is THE single shipped export format — the Configure step's
 * format select must default to it. All fetch stubbed; env-independent
 * (no assertion depends on VITE_API_URL or any developer .env.local).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExportPage } from '../pages/ExportPage';
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
  const fetchMock = vi.fn(async () =>
    jsonResponse({
      // getProject detail shape
      project: { id: 'proj-1', name: 'Smoke Project' },
      version: '1.0.0',
      settings: {},
      assets: [],
      // listExports → []
      exports: [],
      hosted: [],
    })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderExportPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/project/proj-1/export']}>
        <Routes>
          <Route path="/project/:projectId/export" element={<ExportPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('ExportPage — default export format (retro-2 ruling #2)', () => {
  it('defaults the Configure-step format select to phaser-html', async () => {
    installFetch();
    renderExportPage();

    const select = await screen.findByRole('combobox', { name: /export format/i });
    expect(select).toHaveValue('phaser-html');
  });

  it('still offers html as an explicit option', async () => {
    installFetch();
    renderExportPage();

    const select = await screen.findByRole('combobox', { name: /export format/i });
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toContain('html');
    expect(options).toContain('phaser-html');
  });
});
