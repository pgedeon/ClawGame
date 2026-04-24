/**
 * Mock Generative Media API Client
 * M11: AI-powered media generation with fallback for compilation issues
 */

import type { AssetMetadata, AssetType } from './client';

export interface GenerationRequest {
  type: 'character' | 'enemy' | 'prop' | 'ui' | 'background' | 'texture' | 'sprite' | 'sfx' | 'speech' | 'music';
  prompt: string;
  style: string;
  width?: number;
  height?: number;
  count?: number;
  format?: 'svg' | 'png' | 'webp' | 'mp3' | 'wav';
}

export interface GenerationResult {
  id: string;
  assets: AssetMetadata[];
  metadata: {
    generationTime: number;
    model: string;
    style: string;
    prompt: string;
    cost?: number;
  };
}

export interface GenerationStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

// Mock data for development
const MOCK_ASSETS: Record<string, AssetMetadata[]> = {
  character: [
    {
      id: 'char-warrior',
      projectId: 'demo',
      name: 'Warrior Character',
      type: 'sprite',
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwaG90bykiLz4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIxNTAiIGZpbGw9IiNmMGYwZjAiLz4KPGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iMjAwIiBmaWxsPSIjRkZGIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMjUwIiBmaWxsPSIjNjY2Ii8+CjxjaXJjbGUgY3g9IjQwMCIgY3k9IjQwMCIgcj0iMzAwIiBmaWxsPSIjRkZGIi8+CjxyZWN0IHg9IjEwMCUiIHk9IjUwJSIgd2lkdGg9IjUwJSIgaGVpZ2h0PSI1MCUiIGZpbGw9InVybCgjcGhvdG8pIi8+Cjwvc3ZnPg==',
      size: 1024,
      mimeType: 'image/svg+xml',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['warrior', 'fantasy', 'character'],
      status: 'generated',
      generationData: {
        model: 'mock-gpt-4',
        confidence: 0.95,
        parameters: { style: 'fantasy', quality: 'high' },
      },
    },
  ],
  enemy: [
    {
      id: 'enemy-goblin',
      projectId: 'demo',
      name: 'Goblin Enemy',
      type: 'sprite',
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwaG90bykiLz4KPGNpcmNsZSBjeD0iMjUwIiBjeT0iMTUwIiByPSIxNTAiIGZpbGw9IiNmZmYiLz4KPGNpcmNsZSBjeD0iNjAiIGN5PSIxNTAiIHI9IjEwMCIgZmlsbD0iIzY2NiIvPgo8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjI1MCIgZmlsbD0iI2ZmZiIvPgo8cmVjdCB4PSIxMDAlIiB5PSI1MCUiIHdpZHRoPSI1MCUiIGhlaWdodD0iNTAlIiBmaWxsPSJ1cmwoI3BoaXRvKSIvPgo8L3N2Zz4=',
      size: 768,
      mimeType: 'image/svg+xml',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['goblin', 'enemy', 'fantasy'],
      status: 'generated',
      generationData: {
        model: 'mock-gpt-4',
        confidence: 0.92,
        parameters: { style: 'dark-fantasy', quality: 'medium' },
      },
    },
  ],
};

export const generativeMediaAPI = {
  // Mock image generation - bypasses API compilation
  async generateImage(request: GenerationRequest): Promise<GenerationResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    const mockAssets: AssetMetadata[] = MOCK_ASSETS[request.type] || [
      {
        id: `generated-${Date.now()}`,
        projectId: 'demo',
        name: `${request.type}-${Date.now()}`,
        type: request.type as AssetType,
        url: `data:image/svg+xml;base64,${btoa(`
          <svg width="${request.width || 64}" height="${request.height || 64}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0" />
            <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
              ${request.type}
            </text>
            <text x="50%" y="70%" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">
              ${request.prompt.substring(0, 20)}...
            </text>
          </svg>
        `)}`,
        size: 1024,
        mimeType: 'image/svg+xml',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [request.type, 'generated'],
        status: 'generated',
        generationData: {
          model: 'mock-gpt-4',
          confidence: 0.9,
          parameters: request,
        },
      },
    ];
    
    return {
      id: `generation-${Date.now()}`,
      assets: mockAssets,
      metadata: {
        generationTime: 1500 + Math.random() * 2000,
        model: 'mock-gpt-4',
        style: request.style,
        prompt: request.prompt,
      },
    };
  },
  
  async generateSpriteSheet(request: GenerationRequest): Promise<GenerationResult> {
    // Create mock sprite sheet with animation frames
    const frames: AssetMetadata[] = [];
    const count = request.count || 4;
    
    for (let i = 0; i < count; i++) {
      frames.push({
        id: `sprite-${Date.now()}-${i}`,
        projectId: 'demo',
        name: `${request.type}-frame-${i}`,
        type: 'sprite',
        url: `data:image/svg+xml;base64,${btoa(`
          <svg width="${request.width || 64}" height="${request.height || 64}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#e8f4f8" />
            <text x="50%" y="30%" text-anchor="middle" font-family="Arial" font-size="10" fill="#333">
              Frame ${i + 1}
            </text>
            <text x="50%" y="70%" text-anchor="middle" font-family="Arial" font-size="8" fill="#666">
              ${request.type}
            </text>
          </svg>
        `)}`,
        size: 512,
        mimeType: 'image/svg+xml',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['sprite', 'animation', request.type],
        status: 'generated',
        generationData: {
          model: 'mock-gpt-4',
          confidence: 0.95,
          parameters: { ...request, frame: i },
        },
      });
    }
    
    return {
      id: `sprite-generation-${Date.now()}`,
      assets: frames,
      metadata: {
        generationTime: 3000,
        model: 'mock-gpt-4',
        style: request.style,
        prompt: request.prompt,
      },
    };
  },
  
  async generateSoundEffect(request: GenerationRequest): Promise<GenerationResult> {
    // Mock audio generation
    const mockAudio: AssetMetadata = {
      id: `sound-${Date.now()}`,
      projectId: 'demo',
      name: `${request.type}-sound`,
      type: 'audio' as AssetType,
      url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77OihUBELTKn6qpVFApCn+DsvWEiBQ+f0fPSZyMHHWq88OWcTgwOUarm7blmFgU7k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9k9n1unEiBCl+zPDaizMGFSt8Oy2fDAYNStm4rF5WBELCJr3qatWFQU9==',
      size: 4096,
      mimeType: 'audio/wav',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['audio', 'sound', request.type],
      status: 'generated' as const,
      generationData: {
        model: 'mock-whisper',
        confidence: 0.88,
        parameters: { ...request },
      },
    };
    
    return {
      id: `sound-generation-${Date.now()}`,
      assets: [mockAudio],
      metadata: {
        generationTime: 2500,
        model: 'mock-whisper',
        style: request.style,
        prompt: request.prompt,
      },
    };
  },
  
  async getStatus(generationId: string): Promise<GenerationStatus> {
    return {
      id: generationId,
      status: 'completed',
      progress: 100,
      message: 'Generation completed successfully',
    };
  },
  
  async getGenerationHistory(): Promise<GenerationResult[]> {
    return [];
  },
};
