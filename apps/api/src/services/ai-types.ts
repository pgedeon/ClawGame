/**
 * @clawgame/api - AI Service Types
 *
 * Shared types for AI command processing, used by both
 * realAIService.ts and ai-fallbacks.ts.
 */

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
  providerStatus?: AIProviderStatus;
}

export interface AICommandHistory {
  id: string;
  projectId: string;
  command: string;
  response: AICommandResponse;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

export interface AIProviderStatus {
  state: 'ready' | 'rate_limited' | 'timed_out' | 'degraded' | 'circuit_open' | 'mock';
  message: string;
  provider?: 'z.ai';
  providerCode?: string;
  retryAfterSeconds?: number;
  updatedAt: string;
  circuitOpenUntil?: string;
}

export interface AIProviderErrorDetails {
  kind: 'rate_limited' | 'timeout' | 'http_error' | 'network_error' | 'bad_response';
  message: string;
  statusCode?: number;
  providerCode?: string;
  retryAfterSeconds?: number;
  retriable: boolean;
}

export interface AICallResult {
  content?: string;
  error?: AIProviderErrorDetails;
}

export class AIProviderError extends Error {
  readonly details: AIProviderErrorDetails;

  constructor(details: AIProviderErrorDetails) {
    super(details.message);
    this.name = 'AIProviderError';
    this.details = details;
  }
}
