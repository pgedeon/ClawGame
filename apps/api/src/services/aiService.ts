/**
 * AI Command Service
 * Handles natural language processing for game development tasks.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getFileTree, readFileContent } from './fileService';
import { FIRST_RUN_RECIPES, type FirstRunRecipe } from '@clawgame/shared';

// AI response types
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

// For now, simulate AI responses - this will be connected to real AI services later
export class AIService {
  private history: Map<string, AICommandHistory> = new Map();

  async processCommand(request: AICommandRequest): Promise<AICommandResponse> {
    const { projectId, command, context } = request;
    
    // First-run recipe commands (onboarding slice 2) short-circuit the intent
    // parser: exact match against the shared catalog, then a template-aware
    // scene-JSON mutation of the project's actual scenes/main-scene.json.
    // Missing/unreadable scene file falls through to the generic path rather
    // than promising a change we cannot produce.
    const recipeResponse = await this.tryFirstRunRecipe(projectId, command);
    if (recipeResponse) {
      const historyId = this.generateId();
      this.history.set(historyId, {
        id: historyId,
        projectId,
        command,
        response: recipeResponse,
        timestamp: new Date(),
        status: 'completed'
      });
      return recipeResponse;
    }
    
    // Parse command intent
    const intent = this.parseCommandIntent(command);
    
    // Get project context
    const projectContext = await this.getProjectContext(projectId, context);
    
    // Generate response based on intent
    const response = await this.generateResponse(intent, projectContext, command);
    
    // Store in history
    const historyId = this.generateId();
    this.history.set(historyId, {
      id: historyId,
      projectId,
      command,
      response,
      timestamp: new Date(),
      status: 'completed'
    });

    return response;
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

  private parseCommandIntent(command: string): { type: 'explanation' | 'change' | 'fix' | 'analysis'; target?: string; details: string } {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('explain') || lowerCommand.includes('what does') || lowerCommand.includes('how does')) {
      return { type: 'explanation', target: this.extractTarget(lowerCommand), details: command };
    }
    
    if (lowerCommand.includes('fix') || lowerCommand.includes('bug') || lowerCommand.includes('error') || lowerCommand.includes('broken')) {
      return { type: 'fix', target: this.extractTarget(lowerCommand), details: command };
    }
    
    if (lowerCommand.includes('create') || lowerCommand.includes('add') || lowerCommand.includes('implement') || lowerCommand.includes('generate')) {
      return { type: 'change', target: this.extractTarget(lowerCommand), details: command };
    }
    
    if (lowerCommand.includes('analyze') || lowerCommand.includes('review') || lowerCommand.includes('audit')) {
      return { type: 'analysis', target: this.extractTarget(lowerCommand), details: command };
    }
    
    // Default to change for unclear commands
    return { type: 'change', target: this.extractTarget(lowerCommand), details: command };
  }

  private extractTarget(command: string): string | undefined {
    // Extract file names, system names, or component names from command
    const patterns = [
      /file\s+['"]([^'"]+)['"]/i,
      /in\s+([^.]+)/i,
      /([^,\s]+)\.(ts|tsx|js|jsx|json|css)$/i,
      /(player|enemy|health|movement|collision|scene|entity|system|component|game)/i
    ];
    
    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
    
    return undefined;
  }

  /**
   * Exact-match first-run recipe handling. Returns null when the command is
   * not a catalog recipe OR the project has no readable scenes/main-scene.json
   * (caller falls through to the generic mock path).
   */
  private async tryFirstRunRecipe(projectId: string, command: string): Promise<AICommandResponse | null> {
    const recipe = FIRST_RUN_RECIPES.find((r) => r.command === command.trim());
    if (!recipe) return null;

    let oldContent: string;
    try {
      const file = await readFileContent(projectId, 'scenes/main-scene.json');
      oldContent = file.content;
    } catch {
      return null;
    }

    let scene: any;
    try {
      scene = JSON.parse(oldContent);
    } catch {
      return null;
    }

    const mutated = applyFirstRunRecipeMutation(scene, recipe);
    if (!mutated) return null; // expected entity/shape missing — honest fallback

    const newContent = JSON.stringify(scene, null, 2);
    const summary = recipe.deferredNote
      ? `${recipe.summaryLine} (${recipe.deferredNote})`
      : recipe.summaryLine;

    return {
      id: this.generateId(),
      type: 'change',
      title: `Quick edit: ${recipe.chipLabel}`,
      content: `✨ Applied your quick edit as a scene change.\n\n**What changed:** ${summary}\n\nThe edit targets \`scenes/main-scene.json\` only, so you can see it in Play right after applying.` + (recipe.deferredNote ? `\n\nℹ️ ${recipe.deferredNote}` : ''),
      riskLevel: 'low',
      changes: [
        {
          path: 'scenes/main-scene.json',
          oldContent,
          newContent,
          summary,
          confidence: 1,
        },
      ],
      nextSteps: ['Apply the change, then press Start Game to see it'],
    };
  }

  private async getProjectContext(projectId: string, context?: AICommandRequest['context']) {
    const tree = await getFileTree(projectId, '', 0, 3);
    return {
      tree,
      selectedFiles: context?.selectedFiles || [],
      selectedCode: context?.selectedCode || '',
    };
  }

  private async generateResponse(intent: { type: string; target?: string; details: string }, projectContext: any, command: string): Promise<AICommandResponse> {
    const responseId = this.generateId();
    
    switch (intent.type) {
      case 'explanation':
        return this.generateExplanation(intent, projectContext, command, responseId);
        
      case 'change':
        return this.generateChangeRequest(intent, projectContext, command, responseId);
        
      case 'fix':
        return this.generateFixRequest(intent, projectContext, command, responseId);
        
      case 'analysis':
        return this.generateAnalysis(intent, projectContext, command, responseId);
        
      default:
        return this.generateGenericResponse(intent, projectContext, command, responseId);
    }
  }

  private generateExplanation(intent: any, projectContext: any, command: string, id: string): AICommandResponse {
    const target = intent.target || 'selected code';
    
    return {
      id,
      type: 'explanation',
      title: `Explanation of ${target}`,
      content: `🤖 I'll explain how ${target} works in your game project.\n\nBased on your request "${command}", I would:\n\n1. **Analyze the code structure** - Find relevant files and understand the architecture\n2. **Explain the purpose** - Describe what this code does and why it's important\n3. **Detail the implementation** - Break down how it works step by step\n4. **Show related code** - Highlight connections to other systems\n\n**Current Context:**\n• Project files: ${projectContext.tree.length} items\n• Selected files: ${projectContext.selectedFiles.join(', ') || 'None'}\n• Selected code: ${projectContext.selectedCode ? 'Yes' : 'No'}\n\n🚀 **Status:** Ready to provide detailed explanations when the AI service is connected!`,
      riskLevel: 'low',
      nextSteps: ['Connect real AI service', 'Analyze source code', 'Generate detailed explanation']
    };
  }

  private generateChangeRequest(intent: any, projectContext: any, command: string, id: string): AICommandResponse {
    const target = intent.target || 'game system';
    
    return {
      id,
      type: 'change',
      title: `Implement: ${target}`,
      content: `🚀 I'll help you implement ${target} in your game.\n\nYour request: "${command}"\n\n**My Implementation Plan:**\n\n1. **Analyze existing code** - Understand current architecture and patterns\n2. **Identify affected files** - Find files that need modification or new files to create\n3. **Generate code changes** - Write clean, game-specific code\n4. **Show diff preview** - Highlight all changes before applying\n5. **Apply changes** - Update files with your approval\n6. **Test and validate** - Ensure the implementation works correctly\n\n**Project Context:**\n• Total files: ${projectContext.tree.length} items\n• Scripts directory: ${projectContext.tree.find((t: any) => t.name === 'scripts') ? 'Available' : 'Missing'}\n• Project ready for development: ✅\n\n🎯 **Ready to generate code changes when AI service is connected!**`,
      riskLevel: 'medium',
      changes: [
        {
          path: 'scripts/player.ts',
          summary: 'Add player movement system with keyboard controls',
          confidence: 0.8,
          newContent: '// Player movement system\nexport class Player {\n  private x: number = 0;\n  private y: number = 0;\n  private speed: number = 5;\n  \n  update(keys: { [key: string]: boolean }) {\n    if (keys[\'ArrowLeft\']) this.x -= this.speed;\n    if (keys[\'ArrowRight\']) this.x += this.speed;\n    if (keys[\'ArrowUp\']) this.y -= this.speed;\n    if (keys[\'ArrowDown\']) this.y += this.speed;\n  }\n}'
        }
      ],
      nextSteps: ['Connect real AI service', 'Generate implementation plan', 'Create code changes', 'Show diff preview']
    };
  }

  private generateFixRequest(intent: any, projectContext: any, command: string, id: string): AICommandResponse {
    return {
      id,
      type: 'fix',
      title: 'Debug and Fix Issues',
      content: `🔧 I'll help you debug and fix issues in your game.\n\nYour request: "${command}"\n\n**Debug Process:**\n\n1. **Error Analysis** - Examine logs and error messages\n2. **Code Review** - Check for syntax errors, logic issues\n3. **Problem Identification** - Root cause analysis\n4. **Solution Generation** - Create targeted fixes\n5. **Testing** - Verify fixes resolve the issues\n6. **Prevention** - Suggest improvements to avoid similar issues\n\n**What I Need:**\n• Error messages or console output\n• Specific symptoms of the problem\n• When the issue occurs\n• Steps to reproduce (if possible)\n\n🛠️ **Ready to analyze and fix issues when AI service is connected!**`,
      riskLevel: 'medium',
      nextSteps: ['Connect real AI service', 'Analyze error logs', 'Identify root cause', 'Generate fixes']
    };
  }

  private generateAnalysis(intent: any, projectContext: any, command: string, id: string): AICommandResponse {
    return {
      id,
      type: 'analysis',
      title: 'Code Review & Analysis',
      content: `📊 I'll analyze your game code and provide insights.\n\nYour request: "${command}"\n\n**Analysis Includes:**\n\n• **Code Quality Review** - Best practices, readability, patterns\n• **Performance Analysis** - Potential bottlenecks and optimizations\n• **Architecture Review** - Component structure and design patterns\n• **Security Audit** - Common vulnerabilities and risks\n• **Maintainability Score** - How easy the code is to maintain\n• **Suggestion Summary** - Actionable improvement recommendations\n\n**Current Project State:**\n• Files analyzed: ${projectContext.tree.length} items\n• Type safety: TypeScript ✅\n• Code organization: Good structure ✅\n• Documentation: Needs improvement 📝\n\n📈 **Ready for comprehensive code analysis when AI service is connected!**`,
      riskLevel: 'low',
      nextSteps: ['Connect real AI service', 'Analyze codebase', 'Generate review report', 'Provide recommendations']
    };
  }

  private generateGenericResponse(intent: any, projectContext: any, command: string, id: string): AICommandResponse {
    return {
      id,
      type: 'explanation',
      title: 'AI Command Received',
      content: `🤖 I received your command: "${command}"\n\nI'm ready to help with your ClawGame project!\n\n**Supported AI Actions:**\n• Explain code and systems\n• Create and modify game features\n• Fix bugs and errors\n• Analyze code quality\n• Generate assets (coming soon)\n• Optimize performance\n\n**Current Project:**\n• Files: ${projectContext.tree.length} items\n• Selected: ${projectContext.selectedFiles.join(', ') || 'None'}\n\n🎯 **AI service integration coming soon - stay tuned for full functionality!**`,
      riskLevel: 'low',
      nextSteps: ['Connect real AI service', 'Analyze command intent', 'Generate appropriate response']
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// ── First-run recipe scene mutations (onboarding slice 2) ──
//
// Scene-JSON-only per CEO ruling #4: every mutation must be visible at Play
// through the current Phaser preview wiring (static/dynamic colliders, world
// gravity, chase AI). Mutations mirror the slice-2c verification harness
// (docs/design/no-auth-onboarding.md §7). Return false when the expected
// entity/shape is missing so the caller can fall back honestly.

type AnyScene = Record<string, any>;

function findEntity(scene: AnyScene, id: string): any | null {
  return Array.isArray(scene?.entities)
    ? scene.entities.find((e: any) => e?.id === id) ?? null
    : null;
}

function applyFirstRunRecipeMutation(scene: AnyScene, recipe: FirstRunRecipe): boolean {
  switch (recipe.id) {
    case 'platformer-move-platform': {
      const platform = findEntity(scene, 'platform-moving');
      if (!platform?.transform) return false;
      platform.transform.x = 640; // 380 → 640: visible jump to the right
      return true;
    }
    case 'platformer-widen-ground': {
      const ground = findEntity(scene, 'platform-ground');
      const components = ground?.components;
      if (!components?.sprite || !components?.collision) return false;
      components.sprite.width = 100; // rendered width = sprite.width × scaleX(12) = 1200
      components.collision.width = 1200; // physics footprint matches
      return true;
    }
    case 'platformer-raise-gravity': {
      if (!scene.physics || typeof scene.physics.gravity?.y !== 'number') return false;
      scene.physics.gravity.y = 1400; // 900 → 1400
      return true;
    }
    case 'platformer-player-red': {
      const player = findEntity(scene, 'player-1');
      if (typeof player?.components?.sprite?.color !== 'string') return false;
      // Exact mutation verified end-to-end at Play 2026-08-26, after tint
      // passthrough landed (docs/design/no-auth-onboarding.md §7.1).
      player.components.sprite.color = '#ef4444';
      return true;
    }
    case 'topdown-repaint-walls': {
      if (!Array.isArray(scene.entities)) return false;
      // All wall-* entities recolor — verified end-to-end at Play 2026-08-26,
      // after tint passthrough landed (§7.1). Returns false when the scene has
      // no walls so the caller falls back honestly.
      let repainted = 0;
      for (const entity of scene.entities) {
        if (typeof entity?.id !== 'string' || !entity.id.startsWith('wall-')) continue;
        if (typeof entity.components?.sprite?.color !== 'string') continue;
        entity.components.sprite.color = '#7c3aed';
        repainted += 1;
      }
      return repainted > 0;
    }
    case 'topdown-angry-enemy': {
      const enemy = findEntity(scene, 'enemy-1');
      if (typeof enemy?.components?.ai?.speed !== 'number') return false;
      enemy.components.ai.speed = 170; // verified chase-speed read path
      return true;
    }
    case 'topdown-add-pillar': {
      if (!Array.isArray(scene.entities)) return false;
      if (findEntity(scene, 'wall-pillar-3')) return true; // idempotent
      // Exact shape verified in slice-2c T3: blocks the spawn→right-wall path.
      scene.entities.push({
        id: 'wall-pillar-3',
        transform: { x: 480, y: 300, scaleX: 1, scaleY: 2, rotation: 0 },
        components: {
          sprite: { width: 48, height: 48, color: '#78716c' },
          collision: { width: 48, height: 96, type: 'solid' },
        },
      });
      return true;
    }
    case 'topdown-speed-ring': {
      if (!Array.isArray(scene.entities)) return false;
      if (findEntity(scene, 'trigger-speed-ring')) return true; // idempotent
      // Trigger-zone body (sensor): renders today; behavior deferred until
      // trigger actions exist — chip copy says so explicitly.
      scene.entities.push({
        id: 'trigger-speed-ring',
        transform: { x: 320, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
        components: {
          sprite: { width: 64, height: 64, color: '#22d3ee' },
          collision: { width: 64, height: 64, type: 'trigger' },
        },
      });
      return true;
    }
    default:
      return false;
  }
}

// Export singleton instance
export const aiService = new AIService();