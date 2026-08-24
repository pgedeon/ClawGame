import { FastifyInstance } from 'fastify';
import * as mockAiService from '../services/aiService';
import { RealAIService } from '../services/realAIService';
import { readAIConfig, writeAIConfig, maskApiKey, getApiKeyForProvider } from '../utils/envConfig';
import { ALL_PROVIDER_IDS, createProvider, isProviderConfigured } from '../services/ai/registry';
import { OpenCodeProvider } from '../services/ai/providers/opencode';
import type { AIProviderId } from '../services/ai/types';

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

  // Get current AI config (masked API keys) — legacy fields kept for backward compat
  app.get('/api/ai/config', async () => {
    const config = readAIConfig();
    return {
      // legacy shape
      provider: config.provider,
      apiUrl: config.apiUrl,
      model: config.model,
      apiKey: maskApiKey(config.apiKey),
      useRealAI: config.useRealAI,
      // multi-provider shape (docs/ai-provider-spec.md)
      activeProvider: config.activeProvider,
      fallbackChain: config.fallbackChain,
      opencode: { apiKey: maskApiKey(config.opencode.apiKey), model: config.opencode.model },
      anthropic: { apiKey: maskApiKey(config.anthropic.apiKey), model: config.anthropic.model },
      openaiCompat: {
        baseUrl: config.openaiCompat.baseUrl,
        apiKey: maskApiKey(config.openaiCompat.apiKey),
        model: config.openaiCompat.model,
      },
    };
  });

  // Update AI config (writes to .env + process.env). Accepts the legacy flat
  // shape AND the multi-provider shape (activeProvider/fallbackChain/per-provider).
  app.put<{ Body: any }>('/api/ai/config', async (request, reply) => {
    const body = request.body as any;
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

    // Multi-provider shape — validated lightly, unknown ids rejected.
    const VALID_IDS = ['opencode', 'anthropic', 'openai-compat', 'mock'];
    if (body.activeProvider !== undefined) {
      if (!VALID_IDS.includes(body.activeProvider)) {
        reply.code(400);
        return { error: `Unknown activeProvider '${body.activeProvider}'. Valid ids: ${VALID_IDS.join(', ')}` };
      }
      updates.activeProvider = body.activeProvider;
    }
    if (body.fallbackChain !== undefined) {
      if (!Array.isArray(body.fallbackChain) || body.fallbackChain.some((id: any) => !VALID_IDS.includes(id))) {
        reply.code(400);
        return { error: `fallbackChain must be an array of provider ids from: ${VALID_IDS.join(', ')}` };
      }
      updates.fallbackChain = body.fallbackChain;
    }
    for (const key of ['opencode', 'anthropic'] as const) {
      const section = body[key];
      if (section === undefined) continue;
      if (typeof section !== 'object') {
        reply.code(400);
        return { error: `'${key}' must be an object` };
      }
      updates[key] = {};
      if (section.apiKey !== undefined) updates[key].apiKey = String(section.apiKey);
      if (section.model !== undefined) updates[key].model = String(section.model);
    }
    if (body.openaiCompat !== undefined) {
      const section = body.openaiCompat;
      if (typeof section !== 'object') {
        reply.code(400);
        return { error: "'openaiCompat' must be an object" };
      }
      updates.openaiCompat = {};
      if (section.baseUrl !== undefined) updates.openaiCompat.baseUrl = String(section.baseUrl);
      if (section.apiKey !== undefined) updates.openaiCompat.apiKey = String(section.apiKey);
      if (section.model !== undefined) updates.openaiCompat.model = String(section.model);
    }

    const config = writeAIConfig(updates);

    // Re-initialize real AI service if needed
    if (isUseRealAI() && !realAIServiceInstance) {
      realAIServiceInstance = new RealAIService(app.log);
    }

    return {
      // legacy shape
      provider: config.provider,
      apiUrl: config.apiUrl,
      model: config.model,
      apiKey: maskApiKey(config.apiKey),
      useRealAI: config.useRealAI,
      // multi-provider shape
      activeProvider: config.activeProvider,
      fallbackChain: config.fallbackChain,
      opencode: { apiKey: maskApiKey(config.opencode.apiKey), model: config.opencode.model },
      anthropic: { apiKey: maskApiKey(config.anthropic.apiKey), model: config.anthropic.model },
      openaiCompat: {
        baseUrl: config.openaiCompat.baseUrl,
        apiKey: maskApiKey(config.openaiCompat.apiKey),
        model: config.openaiCompat.model,
      },
    };
  });

  // ── Provider discovery & connectivity (docs/ai-provider-spec.md §API surface) ──

  /** Health probe with a short ceiling so the listing endpoint stays snappy. */
  async function probeHealth(provider: AIProviderId): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    const instance = createProvider(provider);
    if (!instance) return { ok: false, error: 'not configured' };
    const timeout = new Promise<{ ok: boolean; error: string }>(resolve =>
      setTimeout(() => resolve({ ok: false, error: 'health check timed out' }), 6_000),
    );
    return Promise.race([instance.healthCheck(), timeout]);
  }

  // Available providers + which are configured + health (live probes for configured ones)
  app.get('/api/ai/providers', async () => {
    const config = readAIConfig();
    const entries = await Promise.all(ALL_PROVIDER_IDS.map(async (id) => {
      const configured = isProviderConfigured(id, config);
      // Every registry id now has a native adapter ('anthropic' landed in
      // session-13); 'mock' answers locally before the provider seam.
      const available = true;
      return {
        id,
        available,
        configured,
        health: configured && available ? await probeHealth(id) : null,
      };
    }));
    return { activeProvider: config.activeProvider, fallbackChain: config.fallbackChain, useRealAI: config.useRealAI, providers: entries };
  });

  // One-shot connectivity test used by Settings UI "Test connection"
  app.post<{ Body: { provider?: string } }>('/api/ai/test', async (request, reply) => {
    const requested = request.body?.provider;
    if (!requested || !(ALL_PROVIDER_IDS as string[]).includes(requested)) {
      reply.code(400);
      return { error: `Unknown provider '${requested ?? ''}'. Valid ids: ${ALL_PROVIDER_IDS.join(', ')}` };
    }
    const provider = requested as AIProviderId;
    if (provider === 'mock') {
      return { provider, ok: true, latencyMs: 0, note: 'Mock mode always answers locally.' };
    }
    if (!isProviderConfigured(provider)) {
      reply.code(400);
      return { provider, ok: false, error: `${provider} is not configured — save its API key first.` };
    }
    const instance = createProvider(provider);
    if (!instance) {
      // Unreachable: 'mock' early-returned above and every configured provider
      // id constructs through the registry.
      throw new Error(`No adapter registered for configured provider '${provider}'`);
    }
    const health = await instance.healthCheck();
    return { provider, ...health };
  });

  // List available models for a provider
  app.get<{ Querystring: { provider?: string } }>('/api/ai/models', async (request, reply) => {
    const provider = request.query.provider || 'zai';

    if (provider === 'opencode') {
      const config = readAIConfig();
      if (!config.opencode.apiKey) {
        reply.code(400);
        return { error: 'OpenCode API key not configured. Save an OpenCode API key first.' };
      }
      try {
        const opencode = new OpenCodeProvider(
          { apiKey: config.opencode.apiKey, model: config.opencode.model || undefined },
          app.log,
        );
        const models = await opencode.listModels();
        return { models };
      } catch (err: any) {
        reply.code(502);
        return { error: `Failed to fetch opencode catalog: ${err.message}` };
      }
    }

    if (provider === 'anthropic') {
      const config = readAIConfig();
      if (!config.anthropic.apiKey) {
        reply.code(400);
        return { error: 'Anthropic API key not configured. Save an Anthropic API key first.' };
      }
      try {
        const anthropic = createProvider('anthropic', app.log, config);
        if (!anthropic) throw new Error('Anthropic adapter unavailable despite configured key');
        const models = await anthropic.listModels();
        return { models };
      } catch (err: any) {
        reply.code(502);
        return { error: `Failed to fetch Anthropic catalog: ${err.message}` };
      }
    }

    if (provider === 'openai-compat') {
      const config = readAIConfig();
      if (!config.openaiCompat.apiKey) {
        reply.code(400);
        return { error: 'OpenAI-compatible provider not configured. Save its API key first.' };
      }
      try {
        const root = config.openaiCompat.baseUrl.replace(/\/chat\/completions\/?$/, '');
        const res = await fetch(`${root}/models`, {
          headers: { Authorization: `Bearer ${config.openaiCompat.apiKey}` },
        });
        if (!res.ok) throw new Error(`endpoint returned ${res.status}`);
        const data: any = await res.json();
        const models = (data.data || data.models || []).map((m: any) => ({
          id: m.id || m.name,
          name: m.name || m.id,
          context_length: m.context_length,
        })).filter((m: any) => Boolean(m.id));
        if (models.length === 0) throw new Error('empty catalog');
        return { models };
      } catch (err: any) {
        return {
          models: [
            { id: config.openaiCompat.model || 'gpt-4o-mini', name: `${config.openaiCompat.model || 'gpt-4o-mini'} (current)` },
          ],
          note: `live catalog unavailable (${err.message}) — showing current model`,
        };
      }
    }

    if (provider === 'mock') {
      return { models: [{ id: 'mock', name: 'Mock AI (local, no key)' }] };
    }

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
        app.log.error({ err }, 'AI command processing failed');
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
