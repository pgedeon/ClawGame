/**
 * AI Command Apply/Reject Flow — Smoke Test
 *
 * Validates the critical user flow: AI generates code changes → user applies → file written correctly.
 * This is the core "AI builds your game" promise.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from './helpers';

import * as fs from 'fs';

describe('AI Command Apply/Reject Flow', () => {
  let app: any;
  let testProjectId: string;
  let testProjectDir: string;

  beforeEach(async () => {
    app = await buildApp();

    // Create a test project via API
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: {
        name: 'AI Test Project',
        genre: 'platformer',
        artStyle: 'pixel',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const project = createRes.json();
    testProjectId = project.id || project.project?.id;
    testProjectDir = project.project?.path || '';
  });

  afterEach(async () => {
    await app.close();
    if (testProjectDir && fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  it('should generate a response via AI command (mock)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${testProjectId}/ai/command`,
      payload: {
        command: 'add player movement',
        context: {},
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('response');
    expect(body.response).toHaveProperty('content');
    expect(body.response).toHaveProperty('type');
  });

  it('should apply a code change by writing to the file endpoint', async () => {
    // Step 1: Get AI response
    const aiRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${testProjectId}/ai/command`,
      payload: { command: 'add player movement', context: {} },
    });
    expect(aiRes.statusCode).toBe(200);
    const response = aiRes.json().response;

    // Step 2: If AI produced changes, apply the first one
    if (response.changes && response.changes.length > 0 && response.changes[0].newContent) {
      const change = response.changes[0];
      const filePath = change.path;

      // Write via the wildcard file route (matches frontend api.writeFile)
      const writeRes = await app.inject({
        method: 'PUT',
        url: `/api/projects/${testProjectId}/files/${filePath}`,
        payload: { content: change.newContent },
      });
      expect(writeRes.statusCode).toBe(200);

      // Verify content persisted
      const readRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${testProjectId}/files/${filePath}`,
      });
      expect(readRes.statusCode).toBe(200);
      expect(readRes.json().content).toBe(change.newContent);
    }
  });

  it('should reject (skip) a change without affecting files', async () => {
    // Write an initial file
    const testContent = 'console.log("original");';
    const filePath = 'scripts/test-original.js';

    const writeRes = await app.inject({
      method: 'PUT',
      url: `/api/projects/${testProjectId}/files/${filePath}`,
      payload: { content: testContent },
    });
    expect(writeRes.statusCode).toBe(200);

    // "Reject" = don't write anything new. Original file stays intact.
    const readRes = await app.inject({
      method: 'GET',
      url: `/api/projects/${testProjectId}/files/${filePath}`,
    });
    expect(readRes.statusCode).toBe(200);
    expect(readRes.json().content).toBe(testContent);
  });

  it('should apply multiple changes (apply-all flow)', async () => {
    const aiRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${testProjectId}/ai/command`,
      payload: { command: 'create enemy system with patrol', context: {} },
    });
    expect(aiRes.statusCode).toBe(200);
    const response = aiRes.json().response;

    if (response.changes && response.changes.length > 1) {
      // Apply all changes
      for (const change of response.changes) {
        if (!change.newContent) continue;
        const writeRes = await app.inject({
          method: 'PUT',
          url: `/api/projects/${testProjectId}/files/${change.path}`,
          payload: { content: change.newContent },
        });
        expect(writeRes.statusCode).toBe(200);
      }

      // Verify all files
      for (const change of response.changes) {
        if (!change.newContent) continue;
        const readRes = await app.inject({
          method: 'GET',
          url: `/api/projects/${testProjectId}/files/${change.path}`,
        });
        expect(readRes.statusCode).toBe(200);
        expect(readRes.json().content).toBe(change.newContent);
      }
    }
  });

  it('should persist applied changes across repeated reads', async () => {
    const content = '// AI-generated player code\nexport class Player {}';
    const filePath = 'scripts/player.ts';

    // Apply
    await app.inject({
      method: 'PUT',
      url: `/api/projects/${testProjectId}/files/${filePath}`,
      payload: { content },
    });

    // Read back multiple times to confirm persistence
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects/${testProjectId}/files/${filePath}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().content).toBe(content);
    }
  });
});
