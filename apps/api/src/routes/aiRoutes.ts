import { FastifyInstance } from 'fastify';
import * as aiService from '../services/aiService';

export async function aiRoutes(app: FastifyInstance) {
  // Process an AI command
  app.post<{ Body: aiService.AICommandRequest; Params: { projectId: string } }>(
    '/api/projects/:projectId/ai/command',
    async (request, reply) => {
      const { projectId } = request.params;
      const command = request.body;

      try {
        const response = await aiService.aiService.processCommand({
          ...command,
          projectId
        });
        
        return { response };
      } catch (err: any) {
        console.error('AI command processing failed:', err);
        reply.code(500);
        return { 
          error: 'Failed to process AI command',
          details: err.message 
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
      
      const history = await aiService.aiService.getCommandHistory(projectId, limit);
      return { history };
    }
  );

  // Get details of a specific command
  app.get<{ Params: { projectId: string; commandId: string } }>(
    '/api/projects/:projectId/ai/commands/:commandId',
    async (request, reply) => {
      const { projectId, commandId } = request.params;
      
      const command = await aiService.aiService.getCommandDetails(commandId);
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
    return { 
      status: 'ok',
      service: 'ai-command',
      version: '0.1.0',
      features: [
        'code explanation',
        'code generation',
        'bug fixing',
        'code analysis',
        'change preview',
        'diff summaries'
      ]
    };
  });
}