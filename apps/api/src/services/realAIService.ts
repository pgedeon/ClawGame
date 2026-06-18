/**
 * Real AI Command Service — Robust Edition
 * Connects to z.ai / OpenRouter-compatible API for LLM-based code generation.
 *
 * Improvements over v0.12.3:
 * - AbortController with 30s timeout (was 180s with no abort)
 * - Retry logic (2 attempts with exponential backoff)
 * - Streaming SSE support for real-time response delivery
 * - Graceful local fallback when API is unreachable
 * - Circuit breaker: skips API after N consecutive failures
 *
 * v0.13.5: Added project metadata context to AI prompts
 */

import { FastifyLoggerInstance } from 'fastify';
import { getFileTree, readFileContent } from './fileService';
import { ProjectService } from './projectService';

// ── Configuration ──

import {
  AIProviderError,
} from './ai-types';
import type {
  AICommandRequest,
  AICommandResponse,
  AICommandHistory,
  AIProviderStatus,
  AIProviderErrorDetails,
  AICallResult,
} from './ai-types';

import { generateFallbackResponse } from './ai-fallbacks';

// Re-export types for backward compatibility
export type {
  AICommandRequest,
  AICommandResponse,
  AICommandHistory,
  AIProviderStatus,
  AIProviderErrorDetails,
  AICallResult,
} from './ai-types';
export { AIProviderError } from './ai-types';

function getAIConfig() {
  return {
    apiUrl: process.env.AI_API_URL || 'https://api.z.ai/api/coding/paas/v4/chat/completions',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'glm-4.5-flash',
  };
}

const REQUEST_TIMEOUT_MS = 30_000;
const STREAM_IDLE_TIMEOUT_MS = 20_000;
const STREAM_MAX_DURATION_MS = 90_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1_000;
const CIRCUIT_BREAKER_THRESHOLD = 5;  // after 5 consecutive failures, use fallback
const CIRCUIT_BREAKER_RESET_MS = 60_000;  // try real API again after 60s


// ── Service ──

export class RealAIService {
  private history: Map<string, AICommandHistory> = new Map();
  private logger: FastifyLoggerInstance;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0; // timestamp; 0 = closed
  private lastProviderStatus: AIProviderStatus = {
    state: 'mock',
    message: 'Local fallback mode active.',
    updatedAt: new Date().toISOString(),
  };

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
    this.lastProviderStatus = getAIConfig().apiKey
      ? this.buildProviderStatus('ready', 'Live AI is ready to respond.')
      : this.buildProviderStatus('mock', 'Live AI is not configured. Local fallback mode is active.');
  }

  // ── Main entry point ──

  async processCommand(request: AICommandRequest): Promise<AICommandResponse> {
    const { projectId, command, context } = request;

    const projectContext = await this.getProjectContext(projectId, context);
    const systemPrompt = this.buildSystemPrompt(projectContext);
    const userPrompt = await this.buildUserPrompt(command, projectContext, context);
    let fallbackStatus = this.buildProviderStatus('mock', 'Live AI is not configured. Local fallback mode is active.');

    if (getAIConfig().apiKey && !this.isCircuitOpen()) {
      const result = await this.callWithRetry(systemPrompt, userPrompt);
      if (result.content) {
        this.onApiSuccess();
        const structured = this.attachProviderStatus(
          this.parseAIResponse(command, result.content),
          this.buildProviderStatus('ready', 'Live AI response received.'),
        );
        this.storeHistory(projectId, command, structured, 'completed');
        return structured;
      }

      fallbackStatus = this.onApiFailure(result.error);
    } else if (this.isCircuitOpen()) {
      this.logger.info('Circuit breaker open — using local fallback');
      fallbackStatus = this.buildCircuitOpenStatus();
      this.lastProviderStatus = fallbackStatus;
    } else {
      this.logger.warn('No API key configured — using local fallback');
      this.lastProviderStatus = fallbackStatus;
    }

    const fallback = this.attachProviderStatus(
      this.generateFallback(command, projectContext),
      fallbackStatus,
    );
    this.storeHistory(projectId, command, fallback, 'completed');
    return fallback;
  }

  // ── Streaming support ──

  async processCommandStream(
    request: AICommandRequest,
    onChunk: (text: string) => void,
  ): Promise<AICommandResponse> {
    const { projectId, command, context } = request;
    const projectContext = await this.getProjectContext(projectId, context);
    const systemPrompt = this.buildSystemPrompt(projectContext);
    const userPrompt = await this.buildUserPrompt(command, projectContext, context);

    if (!getAIConfig().apiKey || this.isCircuitOpen()) {
      const fallbackStatus = !getAIConfig().apiKey
        ? this.buildProviderStatus('mock', 'Live AI is not configured. Local fallback mode is active.')
        : this.buildCircuitOpenStatus();
      this.lastProviderStatus = fallbackStatus;
      const fallback = this.attachProviderStatus(
        this.generateFallback(command, projectContext),
        fallbackStatus,
      );
      const words = fallback.content.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        onChunk(words.slice(i, i + 3).join(' ') + ' ');
        await new Promise(r => setTimeout(r, 30));
      }
      this.storeHistory(projectId, command, fallback, 'completed');
      return fallback;
    }

    try {
      const fullText = await this.streamApiCall(systemPrompt, userPrompt, onChunk);
      this.onApiSuccess();
      const structured = this.attachProviderStatus(
        this.parseAIResponse(command, fullText),
        this.buildProviderStatus('ready', 'Live AI streamed a response successfully.'),
      );
      this.storeHistory(projectId, command, structured, 'completed');
      return structured;
    } catch (err: any) {
      this.logger.error({ err: err.message }, 'Streaming API call failed');
      const fallbackStatus = this.onApiFailure(this.normalizeProviderError(err));
      const fallback = this.attachProviderStatus(
        this.generateFallback(command, projectContext),
        fallbackStatus,
      );
      onChunk('\n\n' + fallback.content);
      this.storeHistory(projectId, command, fallback, 'completed');
      return fallback;
    }
  }

  // ── API calling with retry + abort ──

  private async callWithRetry(systemPrompt: string, userPrompt: string): Promise<AICallResult> {
    let lastError: AIProviderErrorDetails | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        this.logger.info({ attempt: attempt + 1, model: getAIConfig().model }, 'AI API call starting');

        const response = await fetch(getAIConfig().apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAIConfig().apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/pgedeon/ClawGame',
            'X-Title': 'ClawGame AI-Powered Game Engine',
          },
          body: JSON.stringify({
            model: getAIConfig().model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw await this.createResponseError(response);
        }

        const data = await response.json() as any;
        const providerMessage = this.extractProviderMessage(data);
        const providerCode = this.extractProviderCode(data);
        if (response.status === 429 || providerCode === '1302' || this.isRateLimitText(providerMessage)) {
          throw new AIProviderError({
            kind: 'rate_limited',
            message: providerMessage || 'z.ai is currently rate limiting requests.',
            statusCode: response.status || 429,
            providerCode,
            retryAfterSeconds: this.parseRetryAfter(response.headers.get('retry-after')),
            retriable: false,
          });
        }

        if (!data.choices?.[0]?.message?.content) {
          throw new AIProviderError({
            kind: 'bad_response',
            message: 'Malformed AI response: missing choices[0].message.content.',
            retriable: false,
          });
        }

        this.logger.info({ attempt: attempt + 1, chars: data.choices[0].message.content.length }, 'AI API call succeeded');
        return { content: data.choices[0].message.content };

      } catch (err: any) {
        lastError = this.normalizeProviderError(err);
        this.logger.warn({
          attempt: attempt + 1,
          kind: lastError!.kind,
          statusCode: lastError!.statusCode,
          providerCode: lastError!.providerCode,
          retriable: lastError!.retriable,
          err: lastError!.message,
        }, 'AI API call failed');

        if (!lastError!.retriable) {
          break;
        }

        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          this.logger.info({ delay }, 'Retrying after delay');
          await new Promise(r => setTimeout(r, delay));
        }
      } finally {
        clearTimeout(timer);
      }
    }

    this.logger.error({ err: lastError?.message, kind: lastError?.kind }, 'AI API call exhausted fallback path');
    return { error: lastError };
  }

  private async streamApiCall(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
  ): Promise<string> {
    const controller = new AbortController();
    let timeoutReason: string = 'idle';
    let idleTimer: NodeJS.Timeout | null = null;
    const resetIdleTimer = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      idleTimer = setTimeout(() => {
        timeoutReason = 'idle';
        controller.abort();
      }, STREAM_IDLE_TIMEOUT_MS);
    };
    const maxTimer = setTimeout(() => {
      timeoutReason = 'max';
      controller.abort();
    }, STREAM_MAX_DURATION_MS);

    try {
      resetIdleTimer();

      const response = await fetch(getAIConfig().apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAIConfig().apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/pgedeon/ClawGame',
          'X-Title': 'ClawGame AI-Powered Game Engine',
        },
        body: JSON.stringify({
          model: getAIConfig().model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await this.createResponseError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIProviderError({
          kind: 'bad_response',
          message: 'AI provider did not return a readable stream.',
          retriable: false,
        });
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetIdleTimer();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk(delta);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      return fullText;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new AIProviderError({
          kind: 'timeout',
          message: timeoutReason === 'max'
            ? 'Live AI response took too long to complete.'
            : 'Live AI response stalled before completing.',
          retriable: false,
        });
      }
      throw err;
    } finally {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      clearTimeout(maxTimer);
    }
  }

  // ── Circuit breaker ──

  private isCircuitOpen(): boolean {
    if (this.consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) return false;
    if (Date.now() > this.circuitOpenUntil) {
      // Half-open: allow one attempt
      this.logger.info('Circuit breaker half-open — trying API again');
      return false;
    }
    return true;
  }

  private onApiSuccess() {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
    this.lastProviderStatus = this.buildProviderStatus('ready', 'Live AI is ready to respond.');
  }

  private onApiFailure(error?: AIProviderErrorDetails): AIProviderStatus {
    this.consecutiveFailures++;
    this.lastProviderStatus = this.buildStatusFromError(error);

    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
      this.logger.warn({ until: new Date(this.circuitOpenUntil).toISOString() }, 'Circuit breaker opened');
      this.lastProviderStatus = this.buildCircuitOpenStatus();
    }

    return this.lastProviderStatus;
  }

  private buildProviderStatus(
    state: AIProviderStatus['state'],
    message: string,
    details?: Partial<Pick<AIProviderStatus, 'providerCode' | 'retryAfterSeconds' | 'circuitOpenUntil'>>,
  ): AIProviderStatus {
    return {
      state,
      message,
      provider: getAIConfig().apiKey ? 'z.ai' : undefined,
      providerCode: details?.providerCode,
      retryAfterSeconds: details?.retryAfterSeconds,
      circuitOpenUntil: details?.circuitOpenUntil,
      updatedAt: new Date().toISOString(),
    };
  }

  private buildCircuitOpenStatus(): AIProviderStatus {
    return this.buildProviderStatus(
      'circuit_open',
      'Live AI is temporarily paused after repeated failures. Using local fallback responses.',
      { circuitOpenUntil: this.circuitOpenUntil ? new Date(this.circuitOpenUntil).toISOString() : undefined },
    );
  }

  private buildStatusFromError(error?: AIProviderErrorDetails): AIProviderStatus {
    if (!error) {
      return this.buildProviderStatus('degraded', 'Live AI is temporarily unavailable. Using local fallback responses.');
    }

    if (error.kind === 'rate_limited') {
      return this.buildProviderStatus(
        'rate_limited',
        'z.ai rate limit reached. Using local fallback so the request still completes quickly.',
        { providerCode: error.providerCode, retryAfterSeconds: error.retryAfterSeconds },
      );
    }

    if (error.kind === 'timeout') {
      return this.buildProviderStatus(
        'timed_out',
        'Live AI took too long to respond. Switched to local fallback instead of waiting for more retries.',
      );
    }

    return this.buildProviderStatus(
      'degraded',
      'Live AI is temporarily unavailable. Using local fallback responses.',
      { providerCode: error.providerCode },
    );
  }

  private attachProviderStatus(response: AICommandResponse, providerStatus: AIProviderStatus): AICommandResponse {
    const errors = providerStatus.message
      ? Array.from(new Set([...(response.errors || []), providerStatus.message]))
      : response.errors;

    return {
      ...response,
      providerStatus,
      errors: errors && errors.length > 0 ? errors : undefined,
    };
  }

  private normalizeProviderError(error: unknown): AIProviderErrorDetails | undefined {
    if (!error) {
      return undefined;
    }

    if (error instanceof AIProviderError) {
      return error.details;
    }

    if (typeof error === 'object' && error !== null && 'name' in error && (error as any).name === 'AbortError') {
      return {
        kind: 'timeout',
        message: 'Live AI timed out before returning a response.',
        retriable: false,
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    return {
      kind: 'network_error',
      message: message || 'Live AI request failed unexpectedly.',
      retriable: true,
    };
  }

  private async createResponseError(response: Response): Promise<AIProviderError> {
    const rawBody = await response.text().catch(() => '');
    const parsedBody = this.safeJsonParse(rawBody);
    const providerCode = this.extractProviderCode(parsedBody) || this.extractProviderCode(rawBody);
    const providerMessage = this.extractProviderMessage(parsedBody) || rawBody.slice(0, 300) || `API returned ${response.status}`;
    const retryAfterSeconds = this.parseRetryAfter(response.headers.get('retry-after'));
    const isRateLimited = response.status === 429 || providerCode === '1302' || this.isRateLimitText(providerMessage);

    return new AIProviderError({
      kind: isRateLimited ? 'rate_limited' : (response.status >= 500 ? 'http_error' : 'bad_response'),
      message: providerMessage,
      statusCode: response.status,
      providerCode,
      retryAfterSeconds,
      retriable: response.status >= 500 && response.status < 600,
    });
  }

  private safeJsonParse(value: string): any {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private extractProviderCode(value: any): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      const match = value.match(/\b1302\b/);
      return match ? match[0] : undefined;
    }

    const candidates = [
      value.code,
      value.error?.code,
      value.error_code,
      value.error?.error_code,
    ];
    const found = candidates.find(candidate => candidate !== undefined && candidate !== null);
    return found !== undefined && found !== null ? String(found) : undefined;
  }

  private extractProviderMessage(value: any): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    return value.error?.message || value.message || value.error?.details;
  }

  private parseRetryAfter(value: string | null): number | undefined {
    if (!value) {
      return undefined;
    }

    const retryAfterSeconds = Number(value);
    return Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined;
  }

  private isRateLimitText(message?: string): boolean {
    if (!message) {
      return false;
    }

    const normalized = message.toLowerCase();
    return normalized.includes('rate limit')
      || normalized.includes('too many requests')
      || normalized.includes('frequency')
      || normalized.includes('访问频率');
  }

  // ── Project context with metadata ──

  private async getProjectContext(projectId: string, context?: AICommandRequest['context']) {
    const tree = await getFileTree(projectId, '', 0, 2);

    // Load project metadata
    const ps = new ProjectService(this.logger);
    const project = await ps.getProject(projectId);
    const projectMetadata = project ? {
      name: project.project.name,
      genre: project.project.genre,
      artStyle: project.project.artStyle,
      description: project.project.description,
      template: (project as any).template,
    } : {
      name: 'Unknown Project',
      genre: 'unknown',
      artStyle: 'default',
      description: '',
      template: 'platformer',
    };

    return {
      projectId,
      project: projectMetadata,
      tree,
      selectedFiles: context?.selectedFiles || [],
      selectedCode: context?.selectedCode || '',
    };
  }

  // ── Prompt building ──

  private buildSystemPrompt(projectContext: any): string {
    const project = projectContext.project || {};

    return `You are ClawGame AI, an intelligent assistant for game development in a web-based game engine.

**Current Project:**
- Name: ${project.name || 'Unknown Project'}
- Genre: ${project.genre || 'unknown'}
- Art Style: ${project.artStyle || 'default'}
- Description: ${project.description || 'No description provided'}

**Your Role:**
Help developers build games faster by generating code, explaining systems, and providing actionable recommendations. Context-aware: tailor responses to the project's genre and art style.

**Tech Stack:**
- Language: TypeScript/JavaScript
- Engine: Custom 2D web game engine
- Runtime: HTML5 Canvas + JavaScript
- File Structure: scripts/, scenes/, assets/, docs/

**Response Format:**
1. **Analysis:** Brief explanation of what you understand
2. **Solution/Code:** Actual code with \`\`\`typescript blocks
3. **Changes:** List specific files to modify
4. **Next Steps:** Recommended follow-up actions

**Code Style:**
- Use TypeScript with type annotations
- Follow existing patterns in project
- Add comments for complex logic
- Keep code modular and testable
- Provide complete, runnable code snippets

**Be helpful, concise, and accurate. Focus on practical solutions that work immediately.**`;
  }

  private async buildUserPrompt(command: string, projectContext: any, context?: AICommandRequest['context']): Promise<string> {
    const project = projectContext.project || {};

    let prompt = `**User Request:** ${command}\n\n`;

    // Add project context header
    prompt += `**Project Context:**\n`;
    prompt += `- Genre: ${project.genre || 'unknown'}\n`;
    prompt += `- Art Style: ${project.artStyle || 'default'}\n`;
    if (project.description) {
      prompt += `- Description: ${project.description}\n`;
    }
    prompt += `\n`;

    if (context?.selectedCode) {
      prompt += `**Selected Code:**\n\`\`\`typescript\n${context.selectedCode}\n\`\`\`\n\n`;
    }

    if (projectContext.selectedFiles.length > 0) {
      prompt += `**Relevant Files:**\n`;
      for (const filePath of projectContext.selectedFiles) {
        try {
          const content = await readFileContent(projectContext.projectId, filePath);
          const preview = content.content.substring(0, 500);
          prompt += `\nFile: ${filePath}\n\`\`\`typescript\n${preview}${content.content.length > 500 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
        } catch {
          prompt += `\nFile: ${filePath}\n[Could not read file]\n`;
        }
      }
    }

    prompt += `\n**Project Structure:**\n${this.summarizeTree(projectContext.tree)}`;
    prompt += `\n\n**Please provide a helpful response with code, explanations, or analysis, tailored to this ${project.genre || 'game'} project.**`;

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
    if (tree.length > 10) result += `\n  ... and ${tree.length - 10} more items`;
    return result;
  }

  // ── Response parsing ──

  private parseAIResponse(command: string, aiContent: string): AICommandResponse {
    const responseId = this.generateId();
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

    const changes = this.extractCodeChanges(aiContent);
    const nextSteps = this.extractNextSteps(aiContent);
    const riskLevel = this.assessRisk(aiContent);

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
    path: string; newContent: string; summary: string; confidence: number;
  }> {
    const changes: Array<{ path: string; newContent: string; summary: string; confidence: number }> = [];
    const codeBlockRegex = /```(?:typescript|javascript|tsx|ts|js)?\n([\s\S]*?)```/g;
    const matches = [...content.matchAll(codeBlockRegex)];

    for (const match of matches) {
      const code = match[1].trim();
      if (code.length < 50) continue;
      const beforeMatch = content.substring(0, match.index);
      const pathMatch = beforeMatch.match(/(?:file:|in|modify|update)\s+([^\n,]+)/i);
      const filePath = pathMatch ? pathMatch[1].trim().replace(/['"`]/g, '') : 'new file';
      changes.push({ path: filePath, newContent: code, summary: `Code for ${filePath}`, confidence: 0.85 });
    }
    return changes;
  }

  private extractNextSteps(content: string): string[] {
    const steps: string[] = [];
    const lines = content.split('\n');
    let inNextSteps = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('next steps') || line.toLowerCase().includes('next:')) {
        inNextSteps = true; continue;
      }
      if (inNextSteps) {
        const match = line.match(/^\s*[-•*]?\s*\d+[.)]?\s*(.+)/);
        if (match) steps.push(match[1].trim());
        else if (line.trim() === '') continue;
        else break;
      }
    }
    return steps;
  }

  private assessRisk(content: string): 'low' | 'medium' | 'high' {
    const lower = content.toLowerCase();
    if (['delete', 'remove', 'destructive', 'break', 'corrupt'].some(k => lower.includes(k))) return 'high';
    if (['modify', 'change', 'refactor', 'update', 'rewrite'].some(k => lower.includes(k))) return 'medium';
    return 'low';
  }

  private generateTitle(command: string, type: AICommandResponse['type']): string {
    const cl = command.toLowerCase();
    switch (type) {
      case 'explanation': return `Explanation: ${command.substring(0, 50)}${command.length > 50 ? '...' : ''}`;
      case 'change':
        if (cl.includes('create')) return 'Create New Feature';
        if (cl.includes('add')) return 'Add Feature';
        if (cl.includes('implement')) return 'Implementation';
        return 'Code Change';
      case 'fix': return 'Bug Fix';
      case 'analysis': return 'Code Analysis';
      case 'error': return 'Error Report';
      default: return 'AI Response';
    }
  }

  // ── Local fallback (delegates to ai-fallbacks.ts) ──

  private generateFallback(command: string, projectContext: any): AICommandResponse {
    return generateFallbackResponse(command, projectContext);
  }

  // ── Helpers ──

  private storeHistory(projectId: string, command: string, response: AICommandResponse, status: 'completed' | 'failed') {
    const historyId = this.generateId();
    this.history.set(historyId, {
      id: historyId,
      projectId,
      command,
      response,
      timestamp: new Date(),
      status,
    });
  }

  async getCommandHistory(projectId: string, limit: number = 10): Promise<AICommandHistory[]> {
    return Array.from(this.history.values())
      .filter(h => h.projectId === projectId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getCommandDetails(commandId: string): Promise<AICommandHistory | null> {
    return this.history.get(commandId) || null;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  async healthCheck(): Promise<{
    status: string;
    service: string;
    model: string;
    features: string[];
    circuitOpen: boolean;
    providerStatus: AIProviderStatus;
  }> {
    const configured = Boolean(getAIConfig().apiKey);
    const providerStatus = !configured
      ? this.buildProviderStatus('mock', 'Live AI is not configured. Local fallback mode is active.')
      : (this.isCircuitOpen() ? this.buildCircuitOpenStatus() : this.lastProviderStatus);

    return {
      status: configured ? 'connected' : 'mock',
      service: configured ? 'clawgame-ai' : 'mock-ai-preview',
      model: getAIConfig().model,
      features: configured ? ['real-ai', 'code-generation', 'context-aware', 'streaming', 'local-fallback'] : ['mock-mode', 'local-fallback'],
      circuitOpen: this.isCircuitOpen(),
      providerStatus,
    };
  }
}

export const createRealAIService = (logger: FastifyLoggerInstance) => new RealAIService(logger);
