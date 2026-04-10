import { FastifyInstance } from 'fastify';
import * as mockAiService from '../services/aiService';
import { RealAIService } from '../services/realAIService';
import { readAIConfig, writeAIConfig, maskApiKey, getApiKeyForProvider } from '../utils/envConfig';

// Global reference to real AI service (initialized with logger)
let realAIServiceInstance: RealAIService | null = null;

function isUseRealAI(): boolean {
  return process.env.USE_REAL_AI === 'true' || process.env.USE_REAL_AI === '1';
}

export async function aiRoutes(app: FastifyInstance) {
  app.log.info(`AI Routes initialized: ${isUseRealAI() ? 'Real AI (z.ai + fallback)' : 'Mock AI (Preview Mode)'}`);

  // Initialize real AI service with logger on first use
  if (isUseRealAI() && !realAIServiceInstance) {
    realAIServiceInstance = new RealAIService(app.log);
  }

  // ── Config endpoints ──

  // Get current AI config (masked API key)
  app.get('/api/ai/config', async () => {
    const config = readAIConfig();
    return {
      provider: config.provider,
      apiUrl: config.apiUrl,
      model: config.model,
      apiKey: maskApiKey(config.apiKey),
      useRealAI: config.useRealAI,
    };
  });

  // Update AI config (writes to .env + process.env)
  app.put<{ Body: Partial<{ provider: string; apiUrl: string; model: string; apiKey: string; useRealAI: boolean }> }>('/api/ai/config', async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== 'object') {
      reply.code(400);
      return { error: 'Invalid request body' };
    }

    const updates: any = {};
    if (body.provider === 'openrouter' && !body.apiUrl) {
      updates.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    } else if (body.provider === 'zai' && !body.apiUrl) {
      updates.apiUrl = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
    }
    if (body.apiUrl !== undefined) updates.apiUrl = body.apiUrl;
    if (body.model !== undefined) updates.model = body.model;
    if (body.apiKey !== undefined) updates.apiKey = body.apiKey;
    if (body.useRealAI !== undefined) updates.useRealAI = body.useRealAI;
    if (body.provider !== undefined) updates.provider = body.provider;

    const config = writeAIConfig(updates);

    // Re-initialize real AI service if needed
    if (isUseRealAI() && !realAIServiceInstance) {
      realAIServiceInstance = new RealAIService(app.log);
    }

    return {
      provider: config.provider,
      apiUrl: config.apiUrl,
      model: config.model,
      apiKey: maskApiKey(config.apiKey),
      useRealAI: config.useRealAI,
    };
  });

  // List available models for a provider
  app.get<{ Querystring: { provider?: string } }>('/api/ai/models', async (request, reply) => {
    const provider = request.query.provider || 'zai';

    if (provider === 'openrouter') {
      const apiKey = getApiKeyForProvider('openrouter');
      if (!apiKey) {
        reply.code(400);
        return { error: 'OpenRouter API key not configured. Save an OpenRouter API key first.' };
      }
      try {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!res.ok) {
          reply.code(502);
          return { error: `OpenRouter returned ${res.status} — check your API key` };
        }
        const data: any = await res.json();
        const models = (data.data || []).map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          context_length: m.context_length,
          pricing: m.pricing,
        }));
        return { models };
      } catch (err: any) {
        reply.code(502);
        return { error: `Failed to fetch models: ${err.message}` };
      }
    }

    // z.ai — fetch from live API
    try {
      const config = readAIConfig();
      const baseUrl = config.apiUrl.replace(/\/chat\/completions$/, '').replace(/\/coding\/paas\/v4.*/, '/paas/v4');
      const res = await fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${config.zaiApiKey}` },
      });
      if (res.ok) {
        const data: any = await res.json();
        const models = (data.data || []).map((m: any) => ({
          id: m.id,
          name: m.id,
          context_length: m.context_length,
        }));
        return { models };
      }
    } catch {
      // fallback to defaults
    }
    return {
      models: [
        { id: 'glm-5.1', name: 'GLM-5.1' },
        { id: 'glm-5-turbo', name: 'GLM-5 Turbo' },
        { id: 'glm-5', name: 'GLM-5' },
        { id: 'glm-4.7', name: 'GLM-4.7' },
        { id: 'glm-4.6', name: 'GLM-4.6' },
        { id: 'glm-4.5-air', name: 'GLM-4.5 Air' },
        { id: 'glm-4.5', name: 'GLM-4.5' },
      ],
    };
  });

  // ── Command endpoints ──

  // Process an AI command (standard JSON response)
  app.post<{ Body: any; Params: { projectId: string } }>(
    '/api/projects/:projectId/ai/command',
    async (request, reply) => {
      const { projectId } = request.params;
      const body = request.body as any;
      const wantsStreaming = body.stream === true;

      try {
        if (isUseRealAI() && realAIServiceInstance) {
          if (wantsStreaming) {
            reply.raw.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no',
            });

            let fullContent = '';
            const response = await realAIServiceInstance.processCommandStream(
              { projectId, command: body.command, context: body.context },
              (chunk) => {
                fullContent += chunk;
                reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
              },
            );

            reply.raw.write(`data: ${JSON.stringify({ type: 'done', response })}\n\n`);
            reply.raw.end();
            return;
          }

          const response = await realAIServiceInstance.processCommand({
            projectId,
            command: body.command,
            context: body.context,
          });
          return { response };
        } else {
          const response = await mockAiService.aiService.processCommand({
            projectId,
            command: body.command,
            context: body.context,
          });
          return { response };
        }
      } catch (err: any) {
        app.log.error('AI command processing failed:', err);
        reply.code(500);
        return { error: 'Failed to process AI command', details: err.message };
      }
    },
  );

  // Get command history for a project
  app.get<{ Params: { projectId: string }; Querystring: { limit?: string } }>(
    '/api/projects/:projectId/ai/history',
    async (request) => {
      const { projectId } = request.params;
      const limit = parseInt(request.query.limit || '10', 10);

      let history: any[];
      if (isUseRealAI() && realAIServiceInstance) {
        history = await realAIServiceInstance.getCommandHistory(projectId, limit);
      } else {
        history = await mockAiService.aiService.getCommandHistory(projectId, limit);
      }
      return { history };
    },
  );

  // Get details of a specific command
  app.get<{ Params: { projectId: string; commandId: string } }>(
    '/api/projects/:projectId/ai/commands/:commandId',
    async (request, reply) => {
      const { projectId, commandId } = request.params;

      let command: any;
      if (isUseRealAI() && realAIServiceInstance) {
        command = await realAIServiceInstance.getCommandDetails(commandId);
      } else {
        command = await mockAiService.aiService.getCommandDetails(commandId);
      }

      if (!command) {
        reply.code(404);
        return { error: 'Command not found' };
      }
      if (command.projectId !== projectId) {
        reply.code(403);
        return { error: 'Access denied' };
      }
      return { command };
    },
  );

  // Health check for AI service
  app.get('/api/ai/health', async () => {
    if (isUseRealAI() && realAIServiceInstance) {
      return realAIServiceInstance.healthCheck();
    } else {
      return {
        status: 'ok',
        service: 'mock-ai-preview',
        version: '0.1.0',
        features: [
          'code explanation (simulated)',
          'code generation (simulated)',
          'bug fixing (simulated)',
          'code analysis (simulated)',
          'change preview (simulated)',
          'diff summaries (simulated)',
        ],
        note: 'Set USE_REAL_AI=1 to enable real AI service',
      };
    }
  });
}
