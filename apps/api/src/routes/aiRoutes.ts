import { FastifyInstance } from 'fastify';
import * as mockAiService from '../services/aiService';
import { RealAIService } from '../services/realAIService';

// Environment variable to control which AI service to use
const USE_REAL_AI = process.env.USE_REAL_AI === 'true' || process.env.USE_REAL_AI === '1';

// Global reference to real AI service (initialized with logger)
let realAIServiceInstance: RealAIService | null = null;

export async function aiRoutes(app: FastifyInstance) {
  app.log.info(`AI Routes initialized: ${USE_REAL_AI ? 'Real AI (z.ai + fallback)' : 'Mock AI (Preview Mode)'}`);

  // Initialize real AI service with logger on first use
  if (USE_REAL_AI && !realAIServiceInstance) {
    realAIServiceInstance = new RealAIService(app.log);
  }

  // Process an AI command (standard JSON response)
  app.post<{ Body: any; Params: { projectId: string } }>(
    '/api/projects/:projectId/ai/command',
    async (request, reply) => {
      const { projectId } = request.params;
      const body = request.body as any;

      // Check if client wants streaming
      const wantsStreaming = body.stream === true;

      try {
        if (USE_REAL_AI && realAIServiceInstance) {
          if (wantsStreaming) {
            // Stream the response as SSE
            reply.raw.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no',
            });

            let fullContent = '';
            const response = await realAIServiceInstance.processCommandStream(
              {
                projectId,
                command: body.command,
                context: body.context,
              },
              (chunk) => {
                fullContent += chunk;
                const sseData = JSON.stringify({ type: 'chunk', content: chunk });
                reply.raw.write(`data: ${sseData}\n\n`);
              },
            );

            // Send the final structured response
            const finalData = JSON.stringify({ type: 'done', response });
            reply.raw.write(`data: ${finalData}\n\n`);
            reply.raw.end();
            return;
          }

          // Standard non-streaming response
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
        return {
          error: 'Failed to process AI command',
          details: err.message,
        };
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
      if (USE_REAL_AI && realAIServiceInstance) {
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
      if (USE_REAL_AI && realAIServiceInstance) {
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
    if (USE_REAL_AI && realAIServiceInstance) {
      const health = await realAIServiceInstance.healthCheck();
      return health;
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
