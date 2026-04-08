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
 */

import { FastifyLoggerInstance } from 'fastify';
import { getFileTree, readFileContent } from './fileService';

// ── Configuration ──

const AI_API_URL = process.env.AI_API_URL || 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'glm-4.5-flash';

const REQUEST_TIMEOUT_MS = 30_000;  // 30 seconds per attempt
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1_000;
const CIRCUIT_BREAKER_THRESHOLD = 5;  // after 5 consecutive failures, use fallback
const CIRCUIT_BREAKER_RESET_MS = 60_000;  // try real API again after 60s

// ── Types ──

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
  fromFallback?: boolean;
}

export interface AICommandHistory {
  id: string;
  projectId: string;
  command: string;
  response: AICommandResponse;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

// ── Service ──

export class RealAIService {
  private history: Map<string, AICommandHistory> = new Map();
  private logger: FastifyLoggerInstance;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0; // timestamp; 0 = closed

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
  }

  // ── Main entry point ──

  async processCommand(request: AICommandRequest): Promise<AICommandResponse> {
    const { projectId, command, context } = request;

    // Get project context
    const projectContext = await this.getProjectContext(projectId, context);
    const systemPrompt = this.buildSystemPrompt(projectContext);
    const userPrompt = await this.buildUserPrompt(command, projectContext, context);

    // Try the real API (with retries + circuit breaker)
    if (AI_API_KEY && !this.isCircuitOpen()) {
      const result = await this.callWithRetry(systemPrompt, userPrompt);
      if (result) {
        this.onApiSuccess();
        const structured = this.parseAIResponse(command, result);
        this.storeHistory(projectId, command, structured, 'completed');
        return structured;
      }
      this.onApiFailure();
    } else if (this.isCircuitOpen()) {
      this.logger.info('Circuit breaker open — using local fallback');
    } else {
      this.logger.warn('No AI_API_KEY configured — using local fallback');
    }

    // Fallback: generate a useful local response
    const fallback = this.generateFallbackResponse(command, projectContext);
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

    if (!AI_API_KEY || this.isCircuitOpen()) {
      // Simulate streaming for fallback
      const fallback = this.generateFallbackResponse(command, projectContext);
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
      const structured = this.parseAIResponse(command, fullText);
      this.storeHistory(projectId, command, structured, 'completed');
      return structured;
    } catch (err: any) {
      this.logger.error({ err: err.message }, 'Streaming API call failed');
      this.onApiFailure();
      const fallback = this.generateFallbackResponse(command, projectContext);
      onChunk('\n\n' + fallback.content);
      this.storeHistory(projectId, command, fallback, 'completed');
      return fallback;
    }
  }

  // ── API calling with retry + abort ──

  private async callWithRetry(systemPrompt: string, userPrompt: string): Promise<string | null> {
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        this.logger.info({ attempt: attempt + 1, model: AI_MODEL }, 'AI API call starting');

        const response = await fetch(AI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AI_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/pgedeon/ClawGame',
            'X-Title': 'ClawGame AI-Powered Game Engine',
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 8192,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`API returned ${response.status}: ${body.slice(0, 200)}`);
        }

        const data = await response.json() as any;
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Malformed API response: missing choices[0].message.content');
        }

        this.logger.info({ attempt: attempt + 1, chars: data.choices[0].message.content.length }, 'AI API call succeeded');
        return data.choices[0].message.content;

      } catch (err: any) {
        lastError = err;
        const isAbort = err.name === 'AbortError';
        this.logger.warn({ attempt: attempt + 1, aborted: isAbort, err: err.message }, 'AI API call failed');

        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          this.logger.info({ delay }, 'Retrying after delay');
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    this.logger.error({ err: lastError?.message }, 'All AI API retries exhausted');
    return null;
  }

  private async streamApiCall(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/pgedeon/ClawGame',
          'X-Title': 'ClawGame AI-Powered Game Engine',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 8192,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`API returned ${response.status}: ${body.slice(0, 200)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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
    } finally {
      clearTimeout(timer);
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
  }

  private onApiFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
      this.logger.warn({ until: new Date(this.circuitOpenUntil).toISOString() }, 'Circuit breaker opened');
    }
  }

  // ── Local fallback (generates genuinely useful code) ──

  private generateFallbackResponse(command: string, projectContext: any): AICommandResponse {
    const lower = command.toLowerCase();
    const id = this.generateId();

    // Detect intent and generate relevant code
    if (lower.includes('player') && (lower.includes('move') || lower.includes('control') || lower.includes('input'))) {
      return this.fallbackPlayerMovement(command, id, projectContext);
    }
    if (lower.includes('enemy') || lower.includes('ai')) {
      return this.fallbackEnemyAI(command, id, projectContext);
    }
    if (lower.includes('collect') || lower.includes('coin') || lower.includes('pickup') || lower.includes('item')) {
      return this.fallbackCollectible(command, id, projectContext);
    }
    if (lower.includes('platform') || lower.includes('ground') || lower.includes('level')) {
      return this.fallbackPlatform(command, id, projectContext);
    }
    if (lower.includes('jump') || lower.includes('double jump')) {
      return this.fallbackJump(command, id, projectContext);
    }
    if (lower.includes('shoot') || lower.includes('projectile') || lower.includes('bullet')) {
      return this.fallbackProjectile(command, id, projectContext);
    }
    if (lower.includes('health') || lower.includes('damage') || lower.includes('combat')) {
      return this.fallbackHealthSystem(command, id, projectContext);
    }
    if (lower.includes('scene') || lower.includes('level') || lower.includes('create')) {
      return this.fallbackSceneSetup(command, id, projectContext);
    }

    // Generic fallback
    return this.fallbackGeneric(command, id, projectContext);
  }

  private fallbackPlayerMovement(command: string, id: string, ctx: any): AICommandResponse {
    return {
      id,
      type: 'change',
      title: 'Player Movement System',
      content: `## Player Movement System\n\nI've generated a complete player movement controller for your game. This includes WASD/Arrow key controls with smooth acceleration.\n\n\`\`\`typescript\n// scripts/player.ts\nimport { Entity, System } from '../engine';\n\nexport class PlayerInputSystem extends System {\n  private keys: Set<string> = new Set();\n  private speed = 300;\n  private jumpForce = -500;\n  private gravity = 1200;\n  private velocityY = 0;\n  private grounded = false;\n\n  onStart() {\n    window.addEventListener('keydown', (e) => this.keys.add(e.key));\n    window.addEventListener('keyup', (e) => this.keys.delete(e.key));\n  }\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n\n    const transform = player.getComponent('transform');\n    if (!transform) return;\n\n    // Horizontal movement\n    let moveX = 0;\n    if (this.keys.has('ArrowLeft') || this.keys.has('a')) moveX -= 1;\n    if (this.keys.has('ArrowRight') || this.keys.has('d')) moveX += 1;\n    transform.x += moveX * this.speed * dt;\n\n    // Jumping\n    if ((this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has(' ')) && this.grounded) {\n      this.velocityY = this.jumpForce;\n      this.grounded = false;\n    }\n\n    // Gravity\n    this.velocityY += this.gravity * dt;\n    transform.y += this.velocityY * dt;\n\n    // Ground collision (simple)\n    if (transform.y >= 400) {\n      transform.y = 400;\n      this.velocityY = 0;\n      this.grounded = true;\n    }\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ WASD + Arrow key movement\n- ✅ Jump with W / Up / Space\n- ✅ Gravity simulation\n- ✅ Ground collision\n\n**To use:** Add this to your game systems and attach a \`playerInput\` component to your player entity.`,
      changes: [{
        path: 'scripts/player.ts',
        newContent: `// scripts/player.ts\nimport { Entity, System } from '../engine';\n\nexport class PlayerInputSystem extends System {\n  private keys: Set<string> = new Set();\n  private speed = 300;\n  private jumpForce = -500;\n  private gravity = 1200;\n  private velocityY = 0;\n  private grounded = false;\n\n  onStart() {\n    window.addEventListener('keydown', (e) => this.keys.add(e.key));\n    window.addEventListener('keyup', (e) => this.keys.delete(e.key));\n  }\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n    const transform = player.getComponent('transform');\n    if (!transform) return;\n    let moveX = 0;\n    if (this.keys.has('ArrowLeft') || this.keys.has('a')) moveX -= 1;\n    if (this.keys.has('ArrowRight') || this.keys.has('d')) moveX += 1;\n    transform.x += moveX * this.speed * dt;\n    if ((this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has(' ')) && this.grounded) {\n      this.velocityY = this.jumpForce;\n      this.grounded = false;\n    }\n    this.velocityY += this.gravity * dt;\n    transform.y += this.velocityY * dt;\n    if (transform.y >= 400) {\n      transform.y = 400;\n      this.velocityY = 0;\n      this.grounded = true;\n    }\n  }\n}`,
        summary: 'Player movement system with WASD + jump',
        confidence: 0.9,
      }],
      nextSteps: ['Add the system to your game loop', 'Attach playerInput component to player entity', 'Adjust speed/jumpForce for your game feel'],
      riskLevel: 'low',
      fromFallback: true,
    };
  }

  private fallbackEnemyAI(command: string, id: string, ctx: any): AICommandResponse {
    return {
      id,
      type: 'change',
      title: 'Enemy AI Patrol System',
      content: `## Enemy AI Patrol System\n\nGenerated a basic enemy AI that patrols back and forth. Perfect for platformer enemies.\n\n\`\`\`typescript\n// scripts/enemy-ai.ts\nimport { Entity, System } from '../engine';\n\nexport class EnemyAISystem extends System {\n  private patrolRange = 200;\n  private speed = 100;\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const enemies = entities.filter(e => e.hasComponent('ai'));\n    \n    for (const enemy of enemies) {\n      const transform = enemy.getComponent('transform');\n      const ai = enemy.getComponent('ai');\n      if (!transform || !ai) continue;\n\n      // Initialize patrol data\n      if (!ai.startX) ai.startX = transform.x;\n      if (!ai.direction) ai.direction = 1;\n\n      // Move in current direction\n      transform.x += ai.direction * this.speed * dt;\n\n      // Reverse at patrol boundaries\n      if (transform.x > ai.startX + this.patrolRange) {\n        ai.direction = -1;\n      } else if (transform.x < ai.startX - this.patrolRange) {\n        ai.direction = 1;\n      }\n    }\n  }\n}\n\`\`\`\n\n**Features:**\n- ✅ Patrol back and forth\n- ✅ Configurable range and speed\n- ✅ Works with any entity that has an 'ai' component`,
      changes: [{
        path: 'scripts/enemy-ai.ts',
        newContent: `// scripts/enemy-ai.ts\nimport { Entity, System } from '../engine';\n\nexport class EnemyAISystem extends System {\n  private patrolRange = 200;\n  private speed = 100;\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const enemies = entities.filter(e => e.hasComponent('ai'));\n    for (const enemy of enemies) {\n      const transform = enemy.getComponent('transform');\n      const ai = enemy.getComponent('ai');\n      if (!transform || !ai) continue;\n      if (!ai.startX) ai.startX = transform.x;\n      if (!ai.direction) ai.direction = 1;\n      transform.x += ai.direction * this.speed * dt;\n      if (transform.x > ai.startX + this.patrolRange) ai.direction = -1;\n      else if (transform.x < ai.startX - this.patrolRange) ai.direction = 1;\n    }\n  }\n}`,
        summary: 'Enemy AI patrol system',
        confidence: 0.9,
      }],
      nextSteps: ['Add to game loop', 'Attach AI component to enemy entities', 'Adjust patrolRange and speed per enemy'],
      riskLevel: 'low',
      fromFallback: true,
    };
  }

  private fallbackCollectible(command: string, id: string, ctx: any): AICommandResponse {
    return {
      id,
      type: 'change',
      title: 'Collectible Item System',
      content: `## Collectible Item System\n\nGenerated a coin/pickup collection system with score tracking.\n\n\`\`\`typescript\n// scripts/collectible.ts\nimport { Entity, System } from '../engine';\n\nexport class CollectibleSystem extends System {\n  private score = 0;\n\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n    const pTransform = player.getComponent('transform');\n    if (!pTransform) return;\n\n    const collectibles = entities.filter(e => \n      e.hasComponent('collision') && \n      e.getComponent('collision')?.type === 'collectible'\n    );\n\n    for (const item of collectibles) {\n      const iTransform = item.getComponent('transform');\n      if (!iTransform) continue;\n\n      // Simple AABB collision\n      const dx = Math.abs(pTransform.x - iTransform.x);\n      const dy = Math.abs(pTransform.y - iTransform.y);\n      \n      if (dx < 32 && dy < 32) {\n        // Collected!\n        const value = item.getComponent('collision')?.value || 10;\n        this.score += value;\n        console.log(\`Collected! Score: \${this.score}\`);\n        \n        // Remove from scene\n        const idx = entities.indexOf(item);\n        if (idx > -1) entities.splice(idx, 1);\n      }\n    }\n  }\n\n  getScore() { return this.score; }\n}\n\`\`\`\n\n**Features:**\n- ✅ AABB collision detection\n- ✅ Score tracking\n- ✅ Automatic removal on collect\n- ✅ Configurable point values`,
      changes: [{
        path: 'scripts/collectible.ts',
        newContent: `// scripts/collectible.ts\nimport { Entity, System } from '../engine';\n\nexport class CollectibleSystem extends System {\n  private score = 0;\n  onUpdate(dt: number, entities: Entity[]) {\n    const player = entities.find(e => e.hasComponent('playerInput'));\n    if (!player) return;\n    const pTransform = player.getComponent('transform');\n    if (!pTransform) return;\n    const collectibles = entities.filter(e => \n      e.hasComponent('collision') && e.getComponent('collision')?.type === 'collectible'\n    );\n    for (const item of collectibles) {\n      const iTransform = item.getComponent('transform');\n      if (!iTransform) continue;\n      const dx = Math.abs(pTransform.x - iTransform.x);\n      const dy = Math.abs(pTransform.y - iTransform.y);\n      if (dx < 32 && dy < 32) {\n        const value = item.getComponent('collision')?.value || 10;\n        this.score += value;\n        const idx = entities.indexOf(item);\n        if (idx > -1) entities.splice(idx, 1);\n      }\n    }\n  }\n  getScore() { return this.score; }\n}`,
        summary: 'Collectible system with score tracking',
        confidence: 0.9,
      }],
      riskLevel: 'low',
      fromFallback: true,
    };
  }

  private fallbackPlatform(command: string, id: string, ctx: any): AICommandResponse {
    return {
      id,
      type: 'change',
      title: 'Platform / Level Builder',
      content: `## Platform Generation\n\nHere's a helper to generate platforms programmatically:\n\n\`\`\`typescript\n// scripts/level-generator.ts\nimport { Entity } from '../engine';\n\ninterface PlatformDef {\n  x: number; y: number; width: number; height: number;\n}\n\nexport function generateLevel(): Entity[] {\n  const platforms: PlatformDef[] = [\n    // Ground\n    { x: 0, y: 450, width: 800, height: 50 },\n    // Floating platforms\n    { x: 150, y: 350, width: 120, height: 20 },\n    { x: 350, y: 280, width: 100, height: 20 },\n    { x: 550, y: 200, width: 150, height: 20 },\n    { x: 200, y: 130, width: 100, height: 20 },\n  ];\n\n  return platforms.map((p, i) => {\n    const entity = new Entity(\`platform-\${i}\`);\n    entity.addComponent('transform', { x: p.x, y: p.y, width: p.width, height: p.height });\n    entity.addComponent('collision', { type: 'solid' });\n    entity.addComponent('sprite', { color: '#4a5568' });\n    return entity;\n  });\n}\n\`\`\`\n\nAdjust coordinates to fit your game.`,
      changes: [{
        path: 'scripts/level-generator.ts',
        newContent: `// scripts/level-generator.ts\nimport { Entity } from '../engine';\n\nexport function generateLevel(): Entity[] {\n  const platforms = [\n    { x: 0, y: 450, width: 800, height: 50 },\n    { x: 150, y: 350, width: 120, height: 20 },\n    { x: 350, y: 280, width: 100, height: 20 },\n    { x: 550, y: 200, width: 150, height: 20 },\n    { x: 200, y: 130, width: 100, height: 20 },\n  ];\n  return platforms.map((p, i) => {\n    const entity = new Entity(\`platform-\${i}\`);\n    entity.addComponent('transform', { x: p.x, y: p.y, width: p.width, height: p.height });\n    entity.addComponent('collision', { type: 'solid' });\n    entity.addComponent('sprite', { color: '#4a5568' });\n    return entity;\n  });\n}`,
        summary: 'Level generator with platform definitions',
        confidence: 0.85,
      }],
      riskLevel: 'low',
      fromFallback: true,
    };
  }

  private fallbackJump(command: string, id: string, ctx: any): AICommandResponse {
    const isDouble = command.toLowerCase().includes('double');
    return {
      id,
      type: 'change',
      title: isDouble ? 'Double Jump System' : 'Jump System',
      content: `## ${isDouble ? 'Double ' : ''}Jump System\n\n\`\`\`typescript\n// scripts/jump.ts\nexport class JumpController {\n  private jumpForce = -500;\n  private gravity = 1200;\n  private velocityY = 0;\n  private grounded = false;\n  ${isDouble ? 'private jumpsRemaining = 2;\n  private maxJumps = 2;' : 'private canJump = false;'}\n\n  update(dt: number, transform: any, keys: Set<string>) {\n    // Jump input\n    const jumpPressed = keys.has('ArrowUp') || keys.has('w') || keys.has(' ');\n    ${isDouble ? `if (jumpPressed && this.jumpsRemaining > 0) {\n      this.velocityY = this.jumpForce * (this.jumpsRemaining < this.maxJumps ? 0.85 : 1);\n      this.jumpsRemaining--;\n    }` : `if (jumpPressed && this.grounded) {\n      this.velocityY = this.jumpForce;\n      this.grounded = false;\n    }`}\n\n    // Gravity\n    this.velocityY += this.gravity * dt;\n    transform.y += this.velocityY * dt;\n\n    // Ground\n    if (transform.y >= 400) {\n      transform.y = 400;\n      this.velocityY = 0;\n      this.grounded = true;\n      ${isDouble ? 'this.jumpsRemaining = this.maxJumps;' : 'this.canJump = true;'}\n    }\n  }\n}\n\`\`\`\n\n${isDouble ? '**Note:** Double jump applies 85% force on the second jump for balanced feel.' : '**Note:** Adjust `jumpForce` and `gravity` for different game feels.'}`,
      changes: [{
        path: 'scripts/jump.ts',
        newContent: `export class JumpController {\n  private jumpForce = -500;\n  private gravity = 1200;\n  private velocityY = 0;\n  private grounded = false;\n  ${isDouble ? 'private jumpsRemaining = 2;\n  private maxJumps = 2;' : 'private canJump = false;'}\n\n  update(dt: number, transform: any, keys: Set<string>) {\n    const jumpPressed = keys.has('ArrowUp') || keys.has('w') || keys.has(' ');\n    ${isDouble ? `if (jumpPressed && this.jumpsRemaining > 0) {\n      this.velocityY = this.jumpForce * (this.jumpsRemaining < this.maxJumps ? 0.85 : 1);\n      this.jumpsRemaining--;\n    }` : `if (jumpPressed && this.grounded) {\n      this.velocityY = this.jumpForce;\n      this.grounded = false;\n    }`}\n    this.velocityY += this.gravity * dt;\n    transform.y += this.velocityY * dt;\n    if (transform.y >= 400) {\n      transform.y = 400;\n      this.velocityY = 0;\n      this.grounded = true;\n      ${isDouble ? 'this.jumpsRemaining = this.maxJumps;' : 'this.canJump = true;'}\n    }\n  }\n}`,
        summary: `${isDouble ? 'Double ' : ''}jump controller`,
        confidence: 0.9,
      }],
      riskLevel: 'low',
      fromFallback: true,
    };
  }

  private fallbackProjectile(command: string, id: string, ctx: any): AICommandResponse {
    return {
      id,
      type: 'change',
      title: 'Projectile / Shooting System',
      content: `## Projectile Shooting System\n\n\`\`\`typescript\n// scripts/projectile.ts\nimport { Entity, System } from '../engine';\n\nexport class ProjectileSystem extends System {\n  private projectiles: { x: number; y: number; dx: number; speed: number }[] = [];\n  private cooldown = 0;\n  private fireRate = 0.3; // seconds between shots\n  private bulletSpeed = 600;\n\n  onUpdate(dt: number, entities: Entity[]) {\n    this.cooldown = Math.max(0, this.cooldown - dt);\n    \n    // Update existing projectiles\n    for (let i = this.projectiles.length - 1; i >= 0; i--) {\n      const p = this.projectiles[i];\n      p.x += p.dx * p.speed * dt;\n      if (p.x < -50 || p.x > 850) {\n        this.projectiles.splice(i, 1);\n      }\n    }\n  }\n\n  fire(x: number, y: number, direction: number) {\n    if (this.cooldown > 0) return;\n    this.projectiles.push({ x, y, dx: direction, speed: this.bulletSpeed });\n    this.cooldown = this.fireRate;\n  }\n\n  getProjectiles() { return this.projectiles; }\n}\n\`\`\`\n\n**Features:**\n- ✅ Fire rate limiting (cooldown)\n- ✅ Directional shooting\n- ✅ Auto-cleanup when off-screen`,
      changes: [{
        path: 'scripts/projectile.ts',
        newContent: `export class ProjectileSystem {\n  private projectiles: { x: number; y: number; dx: number; speed: number }[] = [];\n  private cooldown = 0;\n  private fireRate = 0.3;\n  private bulletSpeed = 600;\n\n  update(dt: number) {\n    this.cooldown = Math.max(0, this.cooldown - dt);\n    for (let i = this.projectiles.length - 1; i >= 0; i--) {\n      const p = this.projectiles[i];\n      p.x += p.dx * p.speed * dt;\n      if (p.x < -50 || p.x > 850) this.projectiles.splice(i, 1);\n    }\n  }\n\n  fire(x: number, y: number, direction: number) {\n    if (this.cooldown > 0) return;\n    this.projectiles.push({ x, y, dx: direction, speed: this.bulletSpeed });\n    this.cooldown = this.fireRate;\n  }\n\n  getProjectiles() { return this.projectiles; }\n}`,
        summary: 'Projectile shooting system with cooldown',
        confidence: 0.9,
      }],
      riskLevel: 'low',
      fromFallback: true,
    };
  }

  private fallbackHealthSystem(command: string, id: string, ctx: any): AICommandResponse {
    return {
      id,
      type: 'change',
      title: 'Health & Damage System',
      content: `## Health & Damage System\n\n\`\`\`typescript\n// scripts/health.ts\nexport class HealthSystem {\n  private maxHealth: number;\n  private currentHealth: number;\n  private invincibleTime = 0;\n  private invincibleDuration = 1.0; // 1s invincibility after hit\n\n  constructor(maxHealth = 100) {\n    this.maxHealth = maxHealth;\n    this.currentHealth = maxHealth;\n  }\n\n  update(dt: number) {\n    if (this.invincibleTime > 0) {\n      this.invincibleTime -= dt;\n    }\n  }\n\n  takeDamage(amount: number): boolean {\n    if (this.invincibleTime > 0) return false;\n    this.currentHealth = Math.max(0, this.currentHealth - amount);\n    this.invincibleTime = this.invincibleDuration;\n    return true;\n  }\n\n  heal(amount: number) {\n    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);\n  }\n\n  isDead() { return this.currentHealth <= 0; }\n  getHealth() { return this.currentHealth; }\n  getMaxHealth() { return this.maxHealth; }\n  getHealthPercent() { return this.currentHealth / this.maxHealth; }\n}\n\`\`\`\n\n**Features:**\n- ✅ Configurable max health\n- ✅ Invincibility frames after hit\n- ✅ Heal method\n- ✅ Health percentage for UI bars`,
      changes: [{
        path: 'scripts/health.ts',
        newContent: `export class HealthSystem {\n  private maxHealth: number;\n  private currentHealth: number;\n  private invincibleTime = 0;\n  private invincibleDuration = 1.0;\n\n  constructor(maxHealth = 100) {\n    this.maxHealth = maxHealth;\n    this.currentHealth = maxHealth;\n  }\n\n  update(dt: number) {\n    if (this.invincibleTime > 0) this.invincibleTime -= dt;\n  }\n\n  takeDamage(amount: number): boolean {\n    if (this.invincibleTime > 0) return false;\n    this.currentHealth = Math.max(0, this.currentHealth - amount);\n    this.invincibleTime = this.invincibleDuration;\n    return true;\n  }\n\n  heal(amount: number) {\n    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);\n  }\n\n  isDead() { return this.currentHealth <= 0; }\n  getHealth() { return this.currentHealth; }\n  getHealthPercent() { return this.currentHealth / this.maxHealth; }\n}`,
        summary: 'Health system with invincibility frames',
        confidence: 0.9,
      }],
      riskLevel: 'low',
      fromFallback: true,
    };
  }

  private fallbackSceneSetup(command: string, id: string, ctx: any): AICommandResponse {
    return {
      id,
      type: 'change',
      title: 'Scene Setup Helper',
      content: `## Scene Setup\n\nHere's a starter scene configuration you can modify:\n\n\`\`\`json\n{\n  "name": "My Game Scene",\n  "width": 800,\n  "height": 600,\n  "backgroundColor": "#1a1a2e",\n  "entities": [\n    {\n      "id": "player",\n      "components": {\n        "transform": { "x": 100, "y": 400, "width": 32, "height": 32 },\n        "sprite": { "color": "#4287f5" },\n        "playerInput": { "speed": 300, "jumpForce": -500 },\n        "collision": { "type": "dynamic" }\n      }\n    },\n    {\n      "id": "ground",\n      "components": {\n        "transform": { "x": 0, "y": 450, "width": 800, "height": 50 },\n        "sprite": { "color": "#4a5568" },\n        "collision": { "type": "solid" }\n      }\n    },\n    {\n      "id": "coin-1",\n      "components": {\n        "transform": { "x": 300, "y": 300, "width": 16, "height": 16 },\n        "sprite": { "color": "#f6ad55" },\n        "collision": { "type": "collectible", "value": 10 }\n      }\n    }\n  ]\n}\n\`\`\`\n\nEdit the coordinates, add more entities, and customize colors!`,
      changes: [{
        path: 'scenes/main.json',
        newContent: `{"name":"My Game Scene","width":800,"height":600,"backgroundColor":"#1a1a2e","entities":[{"id":"player","components":{"transform":{"x":100,"y":400,"width":32,"height":32},"sprite":{"color":"#4287f5"},"playerInput":{"speed":300,"jumpForce":-500},"collision":{"type":"dynamic"}}},{"id":"ground","components":{"transform":{"x":0,"y":450,"width":800,"height":50},"sprite":{"color":"#4a5568"},"collision":{"type":"solid"}}},{"id":"coin-1","components":{"transform":{"x":300,"y":300,"width":16,"height":16},"sprite":{"color":"#f6ad55"},"collision":{"type":"collectible","value":10}}}]}`,
        summary: 'Starter scene with player, ground, and coin',
        confidence: 0.8,
      }],
      riskLevel: 'low',
      fromFallback: true,
    };
  }

  private fallbackGeneric(command: string, id: string, ctx: any): AICommandResponse {
    return {
      id,
      type: 'explanation',
      title: `AI Response: ${command.substring(0, 50)}${command.length > 50 ? '...' : ''}`,
      content: `## Your Request: "${command}"\n\nI understand you're looking for help with your game. Here are the most common things I can generate code for:\n\n**🎮 Game Systems I Can Generate:**\n- **Player Movement** — Try: "Add player movement with WASD"\n- **Enemy AI** — Try: "Create an enemy patrol system"\n- **Collectibles** — Try: "Add coin pickup system"\n- **Jumping** — Try: "Add double jump to player"\n- **Shooting** — Try: "Add projectile shooting"\n- **Health** — Try: "Add health and damage system"\n- **Platforms** — Try: "Generate platformer level"\n- **Scene Setup** — Try: "Create a new scene with player and platforms"\n\n**💡 Tip:** Be specific about what you want. For example:\n- "Add player movement with arrow keys and WASD, speed 300"\n- "Create 3 enemies that patrol between x=100 and x=500"\n- "Add coin pickup worth 10 points each"\n\n*Note: The external AI service is currently unavailable. Responses are generated locally with game-ready code templates. More complex requests will be available when the AI service reconnects.*`,
      riskLevel: 'low',
      nextSteps: [
        'Try a more specific command from the list above',
        'Check that your AI API key is configured in Settings',
        'The AI service will automatically reconnect when available',
      ],
      fromFallback: true,
    };
  }

  // ── Prompt building ──

  private buildSystemPrompt(projectContext: any): string {
    return `You are ClawGame AI, an intelligent assistant for game development in a web-based game engine.

**Your Role:**
Help developers build games faster by generating code, explaining systems, and providing actionable recommendations.

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
- Follow existing patterns in the project
- Add comments for complex logic
- Keep code modular and testable
- Provide complete, runnable code snippets

**Be helpful, concise, and accurate. Focus on practical solutions that work immediately.**`;
  }

  private async buildUserPrompt(command: string, projectContext: any, context?: AICommandRequest['context']): Promise<string> {
    let prompt = `User Request: ${command}\n\n`;

    if (context?.selectedCode) {
      prompt += `Selected Code:\n\`\`\`typescript\n${context.selectedCode}\n\`\`\`\n\n`;
    }

    if (projectContext.selectedFiles.length > 0) {
      prompt += `Relevant Files:\n`;
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

    prompt += `\nProject Structure:\n${this.summarizeTree(projectContext.tree)}`;
    prompt += `\n\nPlease provide a helpful response with code, explanations, or analysis.`;

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

  // ── Helpers ──

  private async getProjectContext(projectId: string, context?: AICommandRequest['context']) {
    const tree = await getFileTree(projectId, '', 0, 2);
    return {
      projectId,
      tree,
      selectedFiles: context?.selectedFiles || [],
      selectedCode: context?.selectedCode || '',
    };
  }

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

  async healthCheck(): Promise<{ status: string; service: string; model: string; features: string[]; circuitOpen: boolean }> {
    // Quick connectivity test (don't let the health check itself hang)
    if (!AI_API_KEY) {
      return {
        status: 'no-key',
        service: 'clawgame-ai',
        model: AI_MODEL,
        features: ['local-fallback-codegen', 'intent-detection', 'game-templates'],
        circuitOpen: false,
      };
    }

    if (this.isCircuitOpen()) {
      return {
        status: 'circuit-open',
        service: 'clawgame-ai',
        model: AI_MODEL,
        features: ['local-fallback-codegen', 'intent-detection'],
        circuitOpen: true,
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        this.onApiSuccess();
        return {
          status: 'ok',
          service: 'clawgame-ai',
          model: AI_MODEL,
          features: ['real-time-codegen', 'streaming', 'code-explanation', 'bug-fixing', 'analysis', 'local-fallback'],
          circuitOpen: false,
        };
      }

      return {
        status: 'error',
        service: 'clawgame-ai',
        model: AI_MODEL,
        features: ['local-fallback-codegen'],
        circuitOpen: false,
      };
    } catch {
      return {
        status: 'error',
        service: 'clawgame-ai',
        model: AI_MODEL,
        features: ['local-fallback-codegen'],
        circuitOpen: false,
      };
    }
  }
}
