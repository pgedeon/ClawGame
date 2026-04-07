import { FastifyInstance } from 'fastify';
import * as mockAiService from '../services/aiService';
import * as realAIService from '../services/realAIService';

// Environment variable to control which AI service to use
const USE_REAL_AI = process.env.USE_REAL_AI === 'true' || process.env.USE_REAL_AI === '1';

export async function aiRoutes(app: FastifyInstance) {
  console.log(`AI Routes initialized: ${USE_REAL_AI ? 'Real AI (OpenRouter)' : 'Mock AI (Preview Mode)'}`);

  // Process an AI command
  app.post<{ Body: realAIService.AICommandRequest; Params: { projectId: string } }>(
    '/api/projects/:projectId/ai/command',
    async (request, reply) => {
      const { projectId } = request.params;
      const command = request.body;

      try {
        let response: realAIService.AICommandResponse;

        if (USE_REAL_AI) {
          response = await realAIService.realAIService.processCommand({
            ...command,
            projectId,
          });
        } else {
          response = await mockAiService.aiService.processCommand({
            ...command,
            projectId,
          });
        }

        return { response };
      } catch (err: any) {
        console.error('AI command processing failed:', err);
        reply.code(500);
        return {
          error: 'Failed to process AI command',
          details: err.message,
        };
      }
    }
  );

  // Get command history for a project
  app.get<{ Params: { projectId: string }; Querystring: { limit?: string } }>(
    '/api/projects/:projectId/ai/history',
    async (request) => {
      const { projectId } = request.params;
      const limit = parseInt(request.query.limit || '10', 10);

      let history: any[];
      if (USE_REAL_AI) {
        history = await realAIService.realAIService.getCommandHistory(projectId, limit);
      } else {
        history = await mockAiService.aiService.getCommandHistory(projectId, limit);
      }

      return { history };
    }
  );

  // Get details of a specific command
  app.get<{ Params: { projectId: string; commandId: string } }>(
    '/api/projects/:projectId/ai/commands/:commandId',
    async (request, reply) => {
      const { projectId, commandId } = request.params;

      let command: any;
      if (USE_REAL_AI) {
        command = await realAIService.realAIService.getCommandDetails(commandId);
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
    }
  );

  // Health check for AI service
  app.get('/api/ai/health', async () => {
    if (USE_REAL_AI) {
      const health = await realAIService.realAIService.healthCheck();
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
