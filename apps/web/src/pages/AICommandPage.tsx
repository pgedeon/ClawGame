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
  const [isLoading, setIsLoading] = useState(false);
  const [isRealAI, setIsRealAI] = useState(false);
  const [commandHistory, setCommandHistory] = useState<AICommandHistory[]>([]);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [appliedChanges, setAppliedChanges] = useState<Set<string>>(new Set());
  const [applyingChanges, setApplyingChanges] = useState<Set<string>>(new Set());
  const [rejectedChanges, setRejectedChanges] = useState<Set<string>>(new Set());
  const [aiHealth, setAiHealth] = useState<AIHealthResponse | null>(null);
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
      
      setMessages(prev => {
        if (prev.length > 1) return prev; // don't reset conversation
        return [{
          type: 'assistant' as const,
          content: isReal 
            ? `🤖 Welcome to AI Command (Real AI Connected)\n\n**Connected to:** ${health.service}\n**Model:** ${health.model}\n\n✨ **Real AI Features Available:**\n- Actual code generation powered by ${health.model}\n- Context-aware code analysis\n- Real-time code suggestions\n- Bug detection and fixes\n\n💬 **Try asking:**\n- "Create a simple player movement system"\n- "Explain the collision system"\n- "Fix this attack cooldown bug"\n\nReady to help you build your game!`
            : `🤖 Welcome to AI Command (Demo Mode)\n\nSet \`USE_REAL_AI=1\` in the API environment to enable real AI.\n\n💬 **Try asking:**\n- "Create a simple player movement system"\n- "Explain the collision system"`,
          timestamp: new Date(),
        }];
      });
    } catch (err) {
      logger.error('Failed to check AI status:', err);
      setIsRealAI(false);
    }
  };

  const loadCommandHistory = async () => {
    if (!projectId) return;
    try {
      const history = await api.getAIHistory(projectId, 10);
      setCommandHistory(history.history);
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
      finally { setApplyingChanges(prev => { const n = new Set(prev); n.delete(key); return n; }); }
    }
    if (applied > 0) showToast({ type: 'success', message: `Applied ${applied} file${applied > 1 ? 's' : ''}` });
    if (failed > 0) showToast({ type: 'error', message: `Failed to apply ${failed} file${failed > 1 ? 's' : ''}` });
  };

  const handleSubmit = async (e: React.FormEvent, overridePrompt?: string) => {
    e.preventDefault();
    const userMessage = overridePrompt || input.trim();
    if (!userMessage || isLoading || !projectId) return;
    setInput('');
    setLastFailedPrompt(null);

    // Add user message
    setMessages(prev => [...prev, { type: 'user', content: userMessage, timestamp: new Date() }]);

    // Add streaming placeholder
    const streamMsgIdx = messages.length + 1; // +1 for the user msg we just added
    setMessages(prev => [...prev, {
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const commandRequest: AICommandRequest = { projectId, command: userMessage, context: {} };
      const result = await api.processAICommand(projectId, commandRequest, { signal: abortController.signal });
      
      const providerNotice = result.response.providerStatus 
        ? getProviderNotice(result.response.providerStatus)
        : null;

      const finalContent = result.response.fromFallback && providerNotice
        ? `${providerNotice}\n\n${result.response.content}`
        : result.response.content;

      setMessages(prev => prev.map((m, i) => 
        i === streamMsgIdx
          ? { ...m, content: finalContent, response: result.response, isStreaming: false }
          : m
      ));
      await loadCommandHistory();
    } catch (error: any) {
      if (abortController.signal.aborted) return;
      logger.error('Failed to process AI command:', error);
      setMessages(prev => prev.map((m, i) => 
        i === streamMsgIdx
          ? { ...m, content: getErrorMessage(error), isError: true, isStreaming: false }
          : m
      ));
      setLastFailedPrompt(userMessage);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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

  return (
    <div className="ai-command-page">
      <div className="ai-command-container">
        <div className="ai-command-header">
          <div className="ai-command-title">
            <Sparkles size={24} className="ai-icon" />
            <h2>AI Command{!isRealAI && ' (Demo)'}</h2>
            {aiHealth?.model && <span className="model-badge"><Zap size={12} /> {aiHealth.model}</span>}
          </div>
          <button className="refresh-btn" onClick={handleRetry} title="Refresh AI status">
            <RefreshCw size={20} />
          </button>
        </div>

        {!isRealAI && (
          <div className="mock-notice">
            🎭 <strong>Demo Mode Active:</strong> Set <code>USE_REAL_AI=1</code> in the API environment to enable real AI.
          </div>
        )}

        {providerBanner && (
          <div className="provider-banner warning">
            {providerBanner}
          </div>
        )}

        <div className="ai-messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type}${message.isStreaming ? ' streaming' : ''}`}>
              <div className="message-content">
                {message.isStreaming && !message.content ? (
                  <div className="ai-thinking-indicator" role="status" aria-live="polite">
                    <div className="ai-pulse">
                      <div className="pulse-ring pulse-1"></div>
                      <div className="pulse-ring pulse-2"></div>
                      <div className="pulse-center"><Sparkles size={32} /></div>
                    </div>
                    <div className="ai-thinking-steps">
                      <div className="thinking-step active">Connecting to AI...</div>
                      <div className="thinking-step">Generating response...</div>
                    </div>
                  </div>
                ) : message.response ? (
                  <div className="ai-response">
                    {message.response.type === 'explanation' && <div className="response-type explanation">📖 Explanation</div>}
                    {message.response.type === 'change' && <div className="response-type change">✨ Code Change</div>}
                    {message.response.type === 'fix' && <div className="response-type fix">🔧 Fix</div>}
                    {message.response.type === 'analysis' && <div className="response-type analysis">🔍 Analysis</div>}
                    {message.response.type === 'error' && <div className="response-type error">❌ Error</div>}
                    {message.response.title && <h3>{message.response.title}</h3>}
                    
                    {getConfidence(message.response) !== null && (
                      <div className="response-confidence">
                        <span className="response-confidence-label">AI Confidence:</span>
                        <ConfidenceBadge confidence={getConfidence(message.response)!} />
                      </div>
                    )}

                    <div className="response-body">
                      <MarkdownRenderer content={message.content} />
                    </div>

                    {message.response.changes && message.response.changes.length > 0 && (
                      <div className="changes-list">
                        <div className="changes-list-header">
                          <h4>Proposed Changes:</h4>
                          {message.response.changes.length > 1 && (
                            <button
                              className="apply-all-btn"
                              onClick={() => handleApplyAllChanges(message.response!.id)}
                              disabled={message.response.changes!.every((_, idx) =>
                                appliedChanges.has(`${message.response!.id}-${idx}`) || rejectedChanges.has(`${message.response!.id}-${idx}`)
                              )}
                            >
                              <CheckCircle2 size={14} /> Apply All to Project
                            </button>
                          )}
                        </div>
                        {message.response.changes.map((change, idx) => {
                          const key = `${message.response!.id}-${idx}`;
                          const isApplied = appliedChanges.has(key);
                          const isApplying = applyingChanges.has(key);
                          const isRejected = rejectedChanges.has(key);
                          if (isRejected) {
                            return (
                              <div key={idx} className="change-item change-rejected">
                                <div className="change-path">{change.path}</div>
                                <div className="rejected-badge"><XCircle size={14} /> Rejected</div>
                              </div>
                            );
                          }
                          return (
                            <CodeDiffView
                              key={idx}
                              path={change.path}
                              oldCode={change.oldContent}
                              newCode={change.newContent || ''}
                              summary={change.summary}
                              confidence={change.confidence}
                              isApplied={isApplied}
                              isApplying={isApplying}
                              onApply={() => handleApplyChange(message.response!.id, idx)}
                              onReject={() => handleRejectChange(message.response!.id, idx)}
                            />
                          );
                        })}
                      </div>
                    )}
                    {message.response.nextSteps && message.response.nextSteps.length > 0 && (
                      <div className="next-steps">
                        <h4>Suggested Next Steps:</h4>
                        <ul>
                          {message.response.nextSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {message.response.riskLevel && (
                      <div className={`risk-badge ${message.response.riskLevel}`}>
                        Risk: {message.response.riskLevel}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="simple-response">
                    <MarkdownRenderer content={message.content} />
                    {message.isError && lastFailedPrompt && (
                      <button className="retry-btn" onClick={handleRetryLastPrompt}>
                        <RefreshCw size={14} /> Retry
                      </button>
                    )}
                  </div>
                )}
                <div className="message-timestamp">{message.timestamp.toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.isStreaming && (
            <div className="cancel-row">
              <button className="cancel-btn" onClick={handleCancel}><X size={14} /> Cancel</button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-input-container">
          <form onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRealAI ? "Ask me anything about your game..." : "Ask me anything (Demo Mode)..."}
                disabled={!projectId}
                className="ai-input"
                autoFocus
              />
              <button type="submit" disabled={!input.trim() || isLoading || !projectId} className="send-btn" title={isLoading ? "Processing..." : "Send"}>
                {isLoading ? <RefreshCw size={20} className="spinning" /> : <Send size={20} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
