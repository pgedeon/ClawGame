import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Send, RefreshCw, X, CheckCircle2, AlertTriangle, XCircle, WifiOff, Zap } from 'lucide-react';
import { api, type AICommandRequest, type AICommandResponse, type AICommandHistory, type AIHealthResponse } from '../api/client';
import { useToast } from '../components/Toast';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { CodeDiffView, ConfidenceBadge } from '../components/CodeDiffView';
import '../ai-thinking.css';
import { logger } from '../utils/logger';

function getProviderNotice(status?: { state: string; message?: string }): string | null {
  if (!status) return null;
  switch (status.state) {
    case 'rate_limited': return '⚡ AI provider rate-limited — using fast local fallback.';
    case 'circuit_open': return '🔌 AI service temporarily unavailable — using offline mode.';
    case 'timed_out': return '⏱️ AI response took too long — using local suggestion.';
    case 'degraded': return '⚠️ AI service is degraded — responses may be slower.';
    default: return null;
  }
}

function getErrorMessage(error: any): string {
  const msg = error?.message || 'Unknown error';
  if (error?.code === 'rate_limited' || msg.includes('rate') || msg.includes('1302')) {
    return '⚡ AI provider is rate-limited. Using fallback response — try again in a minute.';
  }
  if (error?.code === 'timeout' || msg.includes('timeout') || msg.includes('abort')) {
    return '⏱️ AI is taking too long. Try a shorter or more specific prompt.';
  }
  if (error?.code === 'circuit_open') {
    return '🔌 AI service temporarily unavailable. Using offline mode.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return '📡 Cannot reach the AI server. Is the backend running?';
  }
  return `❌ Error: ${msg}`;
}

function getAIStatusMessage(health: AIHealthResponse): { title: string; description: string; isReal: boolean; isWorking: boolean } {
  const isReal = health.service !== 'mock-ai-preview';
  const hasProviderIssues = health.providerStatus?.state && 
    ['rate_limited', 'circuit_open', 'timed_out', 'degraded'].includes(health.providerStatus.state);
  
  if (!isReal) {
    return {
      title: 'AI Assistant (Demo Mode)',
      description: 'Set USE_REAL_AI=1 in the API environment to enable real AI.',
      isReal: false,
      isWorking: false
    };
  }
  
  if (hasProviderIssues) {
    const notice = getProviderNotice(health.providerStatus);
    return {
      title: 'AI Assistant (Limited Service)',
      description: notice || 'AI service is currently experiencing issues. Using local templates.',
      isReal: true,
      isWorking: false
    };
  }
  
  if (health.status === 'ok' || health.status === 'connected') {
    return {
      title: `AI Assistant (${health.service})`,
      description: `Connected to ${health.service}${health.model ? ` • Model: ${health.model}` : ''}`,
      isReal: true,
      isWorking: true
    };
  }
  
  return {
    title: 'AI Assistant (Service Issues)',
    description: 'AI service is currently unavailable. Using local templates.',
    isReal: true,
    isWorking: false
  };
}

export function AICommandPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    response?: AICommandResponse;
    isError?: boolean;
    isStreaming?: boolean;
  }>>([]);
  const [aiHealth, setAiHealth] = useState<AIHealthResponse | null>(null);
  const [isRealAI, setIsRealAI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<AICommandHistory[]>([]);
  const [appliedChanges, setAppliedChanges] = useState<Set<string>>(new Set());
  const [rejectedChanges, setRejectedChanges] = useState<Set<string>>(new Set());
  const [applyingChanges, setApplyingChanges] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAIStatus();
    if (projectId) loadCommandHistory();
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAIStatus = async () => {
    try {
      const health = await api.getAIHealth();
      setAiHealth(health);
      const isReal = health.service !== 'mock-ai-preview';
      setIsRealAI(isReal);
      
      const statusInfo = getAIStatusMessage(health);
      
      setMessages(prev => {
        if (prev.length > 1) return prev; // don't reset conversation
        return [{
          type: 'assistant' as const,
          content: `🤖 ${statusInfo.title}\n\n${statusInfo.description}\n\n` +
            (statusInfo.isWorking 
              ? '✨ **Real AI Features Available:**\n- Actual code generation\n- Context-aware code analysis\n- Real-time code suggestions\n- Bug detection and fixes\n\n💬 **Try asking:**\n- "Create a simple player movement system"\n- "Explain the collision system"\n- "Fix this attack cooldown bug"'
              : '💡 **Using Local Templates:**\n- Pattern-based code suggestions\n- Static analysis and fixes\n- Example code generation\n\n💬 **Try asking:**\n- "Create a simple player movement system"\n- "Explain the collision system"\n- "Show me enemy AI patterns"'),
          timestamp: new Date(),
        }];
      });
    } catch (err) {
      logger.error('Failed to check AI status:', err);
      setIsRealAI(false);
      setMessages(prev => {
        if (prev.length > 1) return prev;
        return [{
          type: 'assistant' as const,
          content: '🤖 AI Assistant (Service Unavailable)\n\n⚠️ Cannot connect to AI service. Using local templates.\n\n💡 **Local Template Features:**\n- Pattern-based code suggestions\n- Static analysis and fixes\n- Example code generation\n\n💬 **Try asking:**\n- "Create a simple player movement system"\n- "Explain the collision system"\n- "Show me enemy AI patterns"',
          timestamp: new Date(),
        }];
      });
    }
  };

  const loadCommandHistory = async () => {
    if (!projectId) return;
    try {
      const result = await api.getAIHistory(projectId, 10);
      setCommandHistory(result.history);
    } catch (error) {
      logger.error('Failed to load command history:', error);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => prev.map((m, i) => 
      i === prev.length - 1 && m.isStreaming 
        ? { ...m, isStreaming: false, content: m.content || '⏹️ Request cancelled.' }
        : m
    ));
  };

  const handleApplyChange = async (responseId: string, changeIdx: number) => {
    if (!projectId) return;
    const key = `${responseId}-${changeIdx}`;
    const msg = messages.find(m => m.response?.id === responseId);
    if (!msg?.response?.changes?.[changeIdx]) return;
    const change = msg.response.changes[changeIdx];
    if (!change.newContent) {
      showToast({ type: 'error', message: 'No code content to apply' });
      return;
    }
    setApplyingChanges(prev => new Set(prev).add(key));
    try {
      await api.writeFile(projectId, change.path, change.newContent);
      setAppliedChanges(prev => new Set(prev).add(key));
      setRejectedChanges(prev => { const n = new Set(prev); n.delete(key); return n; });
      showToast({ type: 'success', message: `Applied ${change.path}` });
    } catch (error: any) {
      showToast({ type: 'error', message: `Failed: ${error.message || 'Unknown error'}` });
    } finally {
      setApplyingChanges(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const handleRejectChange = (responseId: string, changeIdx: number) => {
    setRejectedChanges(prev => new Set(prev).add(`${responseId}-${changeIdx}`));
  };

  const handleApplyAllChanges = async (responseId: string) => {
    if (!projectId) return;
    const msg = messages.find(m => m.response?.id === responseId);
    if (!msg?.response?.changes) return;
    let applied = 0, failed = 0;
    for (let i = 0; i < msg.response.changes.length; i++) {
      const change = msg.response.changes[i];
      if (!change.newContent) continue;
      const key = `${responseId}-${i}`;
      if (appliedChanges.has(key) || rejectedChanges.has(key)) continue;
      setApplyingChanges(prev => new Set(prev).add(key));
      try {
        await api.writeFile(projectId, change.path, change.newContent);
        setAppliedChanges(prev => new Set(prev).add(key));
        applied++;
      } catch { failed++; }
      setApplyingChanges(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
    if (failed > 0) {
      showToast({ type: 'warning', message: `Applied ${applied} changes, ${failed} failed` });
    } else if (applied > 0) {
      showToast({ type: 'success', message: `Applied all ${applied} changes` });
    }
  };

  const handleRetry = async () => { await checkAIStatus(); showToast({ type: 'info', message: 'AI status refreshed' }); };
  const handleRetryLastPrompt = () => {
    if (lastFailedPrompt) handleSubmit({ preventDefault: () => {} } as React.FormEvent, lastFailedPrompt);
  };

  const getConfidence = (response: AICommandResponse): number | null => {
    if (!response.changes || response.changes.length === 0) return null;
    return response.changes.reduce((sum, c) => sum + c.confidence, 0) / response.changes.length;
  };

  const providerBanner = aiHealth?.providerStatus?.state &&
    ['rate_limited', 'circuit_open', 'timed_out', 'degraded'].includes(aiHealth.providerStatus.state)
    ? getProviderNotice(aiHealth.providerStatus) : null;

  const statusInfo = aiHealth ? getAIStatusMessage(aiHealth) : null;

  const handleSubmit = async (e: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    if (!projectId) return;
    const text = (overrideText ?? input).trim();
    if (!text) return;
    const userMessage = { type: 'user' as const, content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLastFailedPrompt(null);

    const streamMsgIdx = messages.length;
    setMessages(prev => [...prev, { type: 'assistant' as const, content: '', timestamp: new Date(), isStreaming: true }]);

    abortControllerRef.current = new AbortController();
    try {
      const result = await api.processAICommand(projectId, {
        command: text,
        projectId,
        context: {
          selectedFiles: [],
        },
      }, { signal: abortControllerRef.current.signal });

      const finalContent = result.response.content || result.response.title || 'AI completed your request.';
      const isFallback = result.response.fromFallback === true;
      
      setMessages(prev => {
        const updated = [...prev];
        const streamingMsg = updated[streamMsgIdx];
        if (streamingMsg) {
          updated[streamMsgIdx] = {
            ...streamingMsg,
            content: finalContent,
            response: result.response,
            isStreaming: false,
          };
        }
        return updated;
      });

      if (isFallback) {
        showToast({ type: 'warning', message: 'AI service unavailable — using local templates' });
        setLastFailedPrompt(text);
      }

      await loadCommandHistory();
    } catch (error: any) {
      if (abortControllerRef.current.signal.aborted) return;
      logger.error('Failed to process AI command:', error);
      setMessages(prev => {
        const updated = [...prev];
        const streamingMsg = updated[streamMsgIdx];
        if (streamingMsg) {
          updated[streamMsgIdx] = {
            ...streamingMsg,
            content: getErrorMessage(error),
            isError: true,
            isStreaming: false,
          };
        }
        return updated;
      });
      setLastFailedPrompt(text);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="ai-command-page">
      <div className="ai-command-container">
        <div className="ai-command-header">
          <div className="ai-command-title">
            <Sparkles size={24} className="ai-icon" />
            <h2>AI Command</h2>
            {statusInfo && (
              <div className={`ai-status-badge ${statusInfo.isWorking ? 'working' : 'limited'}`}>
                {statusInfo.isWorking ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {statusInfo.isWorking ? 'Real AI Active' : 'Local Templates'}
              </div>
            )}
          </div>
          <button className="refresh-btn" onClick={handleRetry} title="Refresh AI status">
            <RefreshCw size={20} />
          </button>
        </div>

        {providerBanner && (
          <div className="ai-notice-banner warning">
            <AlertTriangle size={16} />
            <span>{providerBanner}</span>
          </div>
        )}

        {statusInfo && (
          <div className="ai-status-panel">
            <div className="ai-status-header">
              <h3>AI Service Status</h3>
              <div className={`ai-status-indicator ${statusInfo.isWorking ? 'healthy' : 'limited'}`}>
                <WifiOff size={14} />
                <span>{statusInfo.isWorking ? 'Available' : 'Limited Service'}</span>
              </div>
            </div>
            <div className="ai-status-details">
              <p>{statusInfo.description}</p>
              {aiHealth?.features && aiHealth.features.length > 0 && (
                <div className="ai-features">
                  <strong>Available Features:</strong>
                  <ul>
                    {aiHealth.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="ai-command-messages">
          {messages.map((msg, idx) => (
            <div key={`${msg.type}-${idx}`} className={`ai-message ai-message--${msg.type}`}>
              <div className="ai-message-avatar">{msg.type === 'user' ? '👤' : '🤖'}</div>
              <div className="ai-message-content">
                {msg.isStreaming ? (
                  <div className="ai-thinking-indicator">
                    <div className="ai-thinking-dots"><span /><span /><span /></div>
                    <span>AI is thinking...</span>
                  </div>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}
                {msg.response && (
                  <div className="ai-command-response">
                    <div className="ai-response-header">
                      <div className="ai-response-meta">
                        <span className="ai-response-id">ID: {msg.response.id}</span>
                        <span className="ai-response-type">{msg.response.type}</span>
                        {msg.response.riskLevel && (
                          <span className={`ai-risk-badge ${msg.response.riskLevel}`}>
                            {msg.response.riskLevel} risk
                          </span>
                        )}
                        {getConfidence(msg.response) !== null && (
                          <ConfidenceBadge confidence={getConfidence(msg.response)!} />
                        )}
                      </div>
                      {msg.response.changes && msg.response.changes.length > 0 && (
                        <div className="ai-response-actions">
                          <button
                            onClick={() => handleApplyAllChanges(msg.response!.id)}
                            disabled={appliedChanges.size === msg.response!.changes.length || applyingChanges.size > 0}
                            className="apply-all-btn"
                          >
                            <CheckCircle2 size={14} />
                            Apply All ({msg.response.changes.length})
                          </button>
                        </div>
                      )}
                    </div>
                    {msg.response.changes && (
                      <div className="ai-changes-list">
                        {msg.response.changes.map((change, changeIdx) => {
                          const isApplied = appliedChanges.has(`${msg.response!.id}-${changeIdx}`);
                          const isRejected = rejectedChanges.has(`${msg.response!.id}-${changeIdx}`);
                          const isApplying = applyingChanges.has(`${msg.response!.id}-${changeIdx}`);
                          
                          return (
                            <div key={changeIdx} className="ai-change-item">
                              <div className="ai-change-header">
                                <span className="ai-change-path">{change.path}</span>
                                <div className="ai-change-actions">
                                  <button
                                    onClick={() => handleApplyChange(msg.response!.id, changeIdx)}
                                    disabled={isApplied || isApplying}
                                    className={`apply-btn ${isApplied ? 'applied' : ''}`}
                                  >
                                    {isApplying ? 'Applying...' : isApplied ? '✓ Applied' : 'Apply'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectChange(msg.response!.id, changeIdx)}
                                    disabled={isRejected}
                                    className={`reject-btn ${isRejected ? 'rejected' : ''}`}
                                  >
                                    {isRejected ? '✗ Rejected' : '✗'}
                                  </button>
                                </div>
                              </div>
                              <div className="ai-change-summary">
                                <ConfidenceBadge confidence={change.confidence} />
                                <span>{change.summary}</span>
                              </div>
                              {change.oldContent && change.newContent && (
                                <CodeDiffView
                                  path={change.path}
                                  oldCode={change.oldContent}
                                  newCode={change.newContent}
                                  summary={change.summary}
                                  confidence={change.confidence}
                                  isApplied={isApplied}
                                  isApplying={isApplying}
                                  onApply={() => handleApplyChange(msg.response!.id, changeIdx)}
                                  onReject={() => handleRejectChange(msg.response!.id, changeIdx)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {msg.response.errors && msg.response.errors.length > 0 && (
                      <div className="ai-response-errors">
                        <h4>Issues Found:</h4>
                        <ul>
                          {msg.response.errors.map((error, idx) => (
                            <li key={idx} className="ai-error-item">
                              <XCircle size={14} />
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {msg.response.nextSteps && msg.response.nextSteps.length > 0 && (
                      <div className="ai-response-next-steps">
                        <h4>Next Steps:</h4>
                        <ul>
                          {msg.response.nextSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="ai-command-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={statusInfo?.isWorking ? "Ask me anything about your game..." : "Try 'add player movement' or 'create enemy'..."}
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            className="ai-command-send"
            disabled={!input.trim() || isLoading}
            title="Send message"
          >
            <Send size={20} />
          </button>
          {isLoading && (
            <button
              type="button"
              className="ai-command-cancel"
              onClick={handleCancel}
              title="Cancel request"
            >
              <X size={20} />
            </button>
          )}
        </form>

        {lastFailedPrompt && (
          <div className="ai-retry-panel">
            <p>Previous AI request failed. Would you like to try again?</p>
            <div className="ai-retry-actions">
              <button onClick={handleRetryLastPrompt} className="retry-btn">
                <RefreshCw size={16} />
                Retry with Local Templates
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}