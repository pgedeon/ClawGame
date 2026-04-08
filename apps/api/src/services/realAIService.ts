/**
 * Real AI Command Service
 * Connects to OpenRouter API for actual LLM-based code generation and assistance.
 */

import axios, { type AxiosInstance } from 'axios';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getFileTree, readFileContent } from './fileService';
import { FastifyLoggerInstance } from 'fastify';

// OpenRouter API configuration
const AI_API_URL = process.env.AI_API_URL || 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'glm-4.5-flash';

// Types
export interface AICommandRequest {
  projectId: string;
  command: string;
  context?: {
    selectedFiles?: string[];
    selectedCode?: string;
    selectedRange?: { start: number; end: number };
    recentChanges?: Array<{ path: string; content: string }>;
  };
}

export interface AICommandResponse {
  id: string;
  type: 'explanation' | 'change' | 'fix' | 'analysis' | 'error';
  title: string;
  content: string;
  changes?: Array<{
    path: string;
    oldContent?: string;
    newContent?: string;
    summary: string;
    confidence: number;
  }>;
  nextSteps?: string[];
  estimatedTime?: number;
  riskLevel: 'low' | 'medium' | 'high';
  errors?: string[];
}

export interface AICommandHistory {
  id: string;
  projectId: string;
  command: string;
  response: AICommandResponse;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

export class RealAIService {
  private history: Map<string, AICommandHistory> = new Map();
  private axios: AxiosInstance;
  private logger: FastifyLoggerInstance;

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
    this.axios = axios.create({
      baseURL: AI_API_URL,
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/pgedeon/ClawGame',
        'X-Title': 'ClawGame AI-Powered Game Engine',
      },
      timeout: 120000, // 60 second timeout
    });
  }

  async processCommand(request: AICommandRequest): Promise<AICommandResponse> {
    const { projectId, command, context } = request;

    // Get project context
    const projectContext = await this.getProjectContext(projectId, context);

    // Build system prompt for game development
    const systemPrompt = this.buildSystemPrompt(projectContext);

    // Build user prompt with command and context
    const userPrompt = await this.buildUserPrompt(command, projectContext, context);

    try {
      // Call OpenRouter API
      const response = await this.axios.post('', {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
      });

      const aiResponse = response.data.choices[0].message.content;
      
      // Parse and structure the AI response
      const structuredResponse = this.parseAIResponse(command, aiResponse);

      // Store in history
      const historyId = this.generateId();
      this.history.set(historyId, {
        id: historyId,
        projectId,
        command,
        response: structuredResponse,
        timestamp: new Date(),
        status: 'completed',
      });

      return structuredResponse;
    } catch (error: any) {
      this.logger.error({ err: error.response?.data || error.message }, 'AI API call failed');

      // Return error response
      const errorResponse: AICommandResponse = {
        id: this.generateId(),
        type: 'error',
        title: 'AI Service Error',
        content: `Failed to process your request: ${error.response?.data?.error?.message || error.message}`,
        riskLevel: 'high',
        errors: [error.message],
      };

      return errorResponse;
    }
  }

  private buildSystemPrompt(projectContext: any): string {
    return `You are ClawGame AI, an intelligent assistant for game development in a web-based game engine.

**Your Role:**
Help developers build games faster by:
- Explaining game code and systems clearly
- Suggesting code improvements and fixes
- Generating game code (TypeScript/JavaScript)
- Analyzing code quality and architecture
- Providing actionable recommendations

**Tech Stack:**
- Language: TypeScript/JavaScript
- Engine: Custom 2D web game engine
- Runtime: HTML5 Canvas + JavaScript
- File Structure: scripts/, scenes/, assets/, docs/

**Response Format:**
Structure your responses with these sections:
1. **Analysis:** Brief explanation of what you understand
2. **Solution/Code:** Actual code or explanation
3. **Changes:** List specific files to modify (if applicable)
4. **Next Steps:** Recommended follow-up actions

**Code Style:**
- Use TypeScript with type annotations
- Follow existing patterns in the project
- Add comments for complex logic
- Keep code modular and testable

**When Generating Code:**
- Provide complete, runnable code snippets
- Include necessary imports
- Show context (where code fits)
- Explain key decisions

**Be helpful, concise, and accurate. Focus on practical solutions that work immediately.**`;
  }

  private async buildUserPrompt(command: string, projectContext: any, context?: AICommandRequest["context"]): Promise<string> {
    let prompt = `User Request: ${command}\n\n`;

    // Add selected code if present
    if (context?.selectedCode) {
      prompt += `Selected Code:\n\`\`\`typescript\n${context.selectedCode}\n\`\`\`\n\n`;
    }

    // Add file context
    if (projectContext.selectedFiles.length > 0) {
      prompt += `Relevant Files:\n`;
      for (const filePath of projectContext.selectedFiles) {
        try {
          const content = await readFileContent(projectContext.projectId, filePath);
          const preview = content.content.substring(0, 500);
          prompt += `\nFile: ${filePath}\n\`\`\`typescript\n${preview}${content.content.length > 500 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
        } catch (err) {
          prompt += `\nFile: ${filePath}\n[Could not read file]\n`;
        }
      }
    }

    // Add project tree summary
    prompt += `\nProject Structure:\n`;
    const treeSummary = this.summarizeTree(projectContext.tree);
    prompt += treeSummary;

    prompt += `\n\nPlease provide a helpful response with code, explanations, or analysis as appropriate.`;

    return prompt;
  }

  private summarizeTree(tree: any[], depth: number = 0): string {
    if (!tree || tree.length === 0) return '(empty)';
    
    const items = tree.slice(0, 10).map((item) => {
      const prefix = '  '.repeat(depth);
      const indicator = item.type === 'directory' ? '📁' : '📄';
      const name = item.type === 'directory' 
        ? `${item.name}/`
        : (item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name);
      
      return `${prefix}${indicator} ${name}`;
    });

    let result = items.join('\n');
    if (tree.length > 10) {
      result += `\n  ... and ${tree.length - 10} more items`;
    }

    return result;
  }

  private parseAIResponse(command: string, aiContent: string): AICommandResponse {
    const responseId = this.generateId();

    // Detect response type from content
    let type: AICommandResponse['type'] = 'explanation';
    const lowerContent = aiContent.toLowerCase();

    if (lowerContent.includes('error') || lowerContent.includes('invalid') || lowerContent.includes('incorrect')) {
      type = 'error';
    } else if (lowerContent.includes('fix') || lowerContent.includes('bug') || lowerContent.includes('solve')) {
      type = 'fix';
    } else if (lowerContent.includes('analysis') || lowerContent.includes('review') || lowerContent.includes('assess')) {
      type = 'analysis';
    } else if (lowerContent.includes('create') || lowerContent.includes('implement') || lowerContent.includes('add')) {
      type = 'change';
    }

    // Extract code blocks and build changes array
    const changes = this.extractCodeChanges(aiContent);

    // Extract next steps
    const nextSteps = this.extractNextSteps(aiContent);

    // Determine risk level based on content
    const riskLevel: AICommandResponse['riskLevel'] = this.assessRisk(aiContent);

    return {
      id: responseId,
      type,
      title: this.generateTitle(command, type),
      content: aiContent,
      changes: changes.length > 0 ? changes : undefined,
      nextSteps: nextSteps.length > 0 ? nextSteps : undefined,
      riskLevel,
    };
  }

  private extractCodeChanges(content: string): Array<{
    path: string;
    newContent: string;
    summary: string;
    confidence: number;
  }> {
    const changes: Array<{ path: string; newContent: string; summary: string; confidence: number }> = [];
    
    // Match code blocks with file path hints
    const codeBlockRegex = /```(?:typescript|javascript|tsx|ts|js)?\n([\s\S]*?)```/g;
    const matches = [...content.matchAll(codeBlockRegex)];

    for (const match of matches) {
      const code = match[1].trim();
      if (code.length < 50) continue; // Skip very short snippets

      // Try to extract file path from preceding text
      const beforeMatch = content.substring(0, match.index);
      const pathMatch = beforeMatch.match(/(?:file:|in|modify|update)\s+([^\n,]+)/i);
      const filePath = pathMatch 
        ? pathMatch[1].trim().replace(/['"`]/g, '')
        : 'new file';

      changes.push({
        path: filePath,
        newContent: code,
        summary: `Code for ${filePath}`,
        confidence: 0.85,
      });
    }

    return changes;
  }

  private extractNextSteps(content: string): string[] {
    const steps: string[] = [];
    
    // Look for numbered lists or bullet points
    const lines = content.split('\n');
    let inNextSteps = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('next steps') || line.toLowerCase().includes('next:')) {
        inNextSteps = true;
        continue;
      }

      if (inNextSteps) {
        const match = line.match(/^\s*[-•*]?\s*\d+[.)]?\s*(.+)/);
        if (match) {
          steps.push(match[1].trim());
        } else if (line.trim() === '') {
          continue;
        } else {
          break; // End of list
        }
      }
    }

    return steps;
  }

  private assessRisk(content: string): 'low' | 'medium' | 'high' {
    const lower = content.toLowerCase();
    
    const highRiskKeywords = ['delete', 'remove', 'destructive', 'break', 'corrupt'];
    const mediumRiskKeywords = ['modify', 'change', 'refactor', 'update', 'rewrite'];
    
    if (highRiskKeywords.some(keyword => lower.includes(keyword))) {
      return 'high';
    }
    
    if (mediumRiskKeywords.some(keyword => lower.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  private generateTitle(command: string, type: AICommandResponse['type']): string {
    const commandLower = command.toLowerCase();
    
    switch (type) {
      case 'explanation':
        return `Explanation: ${command.substring(0, 50)}${command.length > 50 ? '...' : ''}`;
      case 'change':
        if (commandLower.includes('create')) return 'Create New Feature';
        if (commandLower.includes('add')) return 'Add Feature';
        if (commandLower.includes('implement')) return 'Implementation';
        return 'Code Change';
      case 'fix':
        return 'Bug Fix';
      case 'analysis':
        return 'Code Analysis';
      case 'error':
        return 'Error Report';
      default:
        return 'AI Response';
    }
  }

  private async getProjectContext(projectId: string, context?: AICommandRequest['context']) {
    const tree = await getFileTree(projectId, '', 0, 2); // Get 2 levels of tree
    return {
      projectId,
      tree,
      selectedFiles: context?.selectedFiles || [],
      selectedCode: context?.selectedCode || '',
    };
  }

  async getCommandHistory(projectId: string, limit: number = 10): Promise<AICommandHistory[]> {
    const allHistory = Array.from(this.history.values())
      .filter(h => h.projectId === projectId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return allHistory.slice(0, limit);
  }

  async getCommandDetails(commandId: string): Promise<AICommandHistory | null> {
    return this.history.get(commandId) || null;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  async healthCheck(): Promise<{ status: string; service: string; model: string; features: string[] }> {
    try {
      // Test API with minimal request
      await this.axios.post('', {
        model: AI_MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });

      return {
        status: 'ok',
        service: 'real-ai-openrouter',
        model: AI_MODEL,
        features: [
          'real-time code generation',
          'code explanation',
          'bug fixing',
          'code analysis',
          'code suggestions',
          'TypeScript/JavaScript support',
        ],
      };
    } catch (error: any) {
      this.logger.error({ err: error.message }, 'AI health check failed');
      return {
        status: 'error',
        service: 'real-ai-openrouter',
        model: AI_MODEL,
        features: [],
      };
    }
  }

}
