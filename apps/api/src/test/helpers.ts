import Fastify from 'fastify';
import cors from '@fastify/cors';
import { projectRoutes } from '../routes/projects';
import { fileRoutes } from '../routes/files';
import { aiRoutes } from '../routes/aiRoutes';
import { assetRoutes } from '../routes/assets';

/**
 * Build a test Fastify app.
 * PROJECTS_DIR is set by setup.ts before any imports — do NOT override here.
 */
export async function buildApp() {
  const app = Fastify({ logger: false });

  app.register(cors, { origin: '*' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', version: '0.6.1' }));

  // Register all routes
  app.register(projectRoutes);
  app.register(fileRoutes);
  app.register(aiRoutes);
  app.register(assetRoutes);

  return app;
}
