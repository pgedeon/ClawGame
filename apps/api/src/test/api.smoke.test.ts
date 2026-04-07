import { describe, it, expect } from 'vitest';
import { buildApp } from './helpers';

describe('Health Check', () => {
  it('should return ok status', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.6.1');

    await app.close();
  });
});

describe('Projects API', () => {
  it('should list projects (empty or with data)', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('projects');
    expect(Array.isArray(body.projects)).toBe(true);

    await app.close();
  });

  it('should return 404 for non-existent project', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/non-existent-id',
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body).toHaveProperty('error');

    await app.close();
  });

  it('should reject project creation without required fields', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Test' }, // Missing genre and artStyle
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toContain('required');

    await app.close();
  });

  it('should create a project with valid data', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: {
        name: 'Test Game',
        genre: 'action',
        artStyle: 'pixel',
        description: 'A test game',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('project');

    await app.close();
  });
});

describe('AI API', () => {
  it('should return AI health in mock mode', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/ai/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('service');

    await app.close();
  });
});

describe('Assets API', () => {
  it('should list assets for a project', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/test-project/assets',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('assets');
    expect(Array.isArray(body.assets)).toBe(true);

    await app.close();
  });

  it('should return stats for project assets', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/projects/test-project/assets/stats',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('byType');

    await app.close();
  });

  it('should reject asset generation without required fields', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/test-project/assets/generate',
      payload: { type: 'sprite' }, // Missing prompt
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toContain('required');

    await app.close();
  });
});
