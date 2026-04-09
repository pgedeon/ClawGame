import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Send, RefreshCw, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api, type AICommandRequest, type AICommandResponse, type AICommandHistory } from '../api/client';
import { useToast } from '../components/Toast';
import '../ai-thinking.css';
import { logger } from '../utils/logger';

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
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealAI, setIsRealAI] = useState(false);
  const [commandHistory, setCommandHistory] = useState<AICommandHistory[]>([]);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [appliedChanges, setAppliedChanges] = useState<Set<string>>(new Set()); // tracks "responseId-changeIdx"
  const [applyingChanges, setApplyingChanges] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial welcome message and check AI status
  useEffect(() => {
    checkAIStatus();
    if (projectId) {
      loadCommandHistory();
    }
  }, [projectId]);

  const checkAIStatus = async () => {
    try {
      const health = await fetch('http://localhost:3000/api/ai/health').then(r => r.json());
      const isReal = health.service !== 'mock-ai-preview';
      setIsRealAI(isReal);
      
      setMessages([{
        type: 'assistant',
        content: isReal 
          ? `🤖 Welcome to AI Command (Real AI Connected)\n\n**Connected to:** ${health.service}\n**Model:** ${health.model}\n\n✨ **Real AI Features Available:**\n• Actual code generation powered by ${health.model}\n• Context-aware code analysis\n• Real-time code suggestions\n• Bug detection and fixes\n• Code quality reviews\n\n💬 **Try asking:**\n"Create a simple player movement system"\n"Explain the collision system"\n"Fix this attack cooldown bug"\n"Analyze code quality"\n\nReady to help you build your game!`
          : `🤖 Welcome to AI Command\n\nThis is a demonstration of AI-powered game development features. Real AI integration is available by setting \`USE_REAL_AI=1\` in the API environment.\n\n✨ **What this includes:**\n• Command parsing and analysis\n• Response generation based on your intent\n• Code change suggestions\n• Risk assessment\n\n⚠️ **Current Limitations:**\n• This is a mock service - responses are generated locally\n• No actual code generation or modification\n• No real AI service integration yet\n• Responses are simulated based on command patterns\n\n💬 **Try asking:**\n"Create a simple player movement system"\n"Explain the collision system"\n"Fix this attack cooldown bug"\n"Analyze code quality"\n\nWhat would you like to explore?`,
        timestamp: new Date(),
      }]);
    } catch (err) {
      logger.error('Failed to check AI status:', err);
      setMessages([{
        type: 'assistant',
        content: '🤖 Welcome to AI Command\n\nThis is a demonstration of AI-powered game development features.\n\nNote: Could not connect to the API server. Make sure the backend is running at http://localhost:3000',
        timestamp: new Date(),
      }]);
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
    setMessages(prev => [...prev, {
      type: 'assistant',
      content: '⏹️ Request cancelled.',
      timestamp: new Date(),
    }]);
  };

  const handleApplyChange = async (responseId: string, changeIdx: number) => {
    if (!projectId) return;
    const key = `${responseId}-${changeIdx}`;
    
    // Find the message with this change
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
      showToast({ type: 'success', message: `Applied ${change.path} to project` });
    } catch (error: any) {
      logger.error('Failed to apply change:', error);
      showToast({ type: 'error', message: `Failed to apply: ${error.message || 'Unknown error'}` });
    } finally {
      setApplyingChanges(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleApplyAllChanges = async (responseId: string) => {
    if (!projectId) return;
    const msg = messages.find(m => m.response?.id === responseId);
    if (!msg?.response?.changes) return;
    
    const changes = msg.response.changes;
    let applied = 0;
    let failed = 0;
    
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      if (!change.newContent) continue;
      
      const key = `${responseId}-${i}`;
      if (appliedChanges.has(key)) continue; // already applied
      
      setApplyingChanges(prev => new Set(prev).add(key));
      
      try {
        await api.writeFile(projectId, change.path, change.newContent);
        setAppliedChanges(prev => new Set(prev).add(key));
        applied++;
      } catch {
        failed++;
      } finally {
        setApplyingChanges(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    }
    
    if (applied > 0) {
      showToast({ type: 'success', message: `Applied ${applied} file${applied > 1 ? 's' : ''} to project` });
    }
    if (failed > 0) {
      showToast({ type: 'error', message: `Failed to apply ${failed} file${failed > 1 ? 's' : ''}` });
    }
  };

  const handleSubmit = async (e: React.FormEvent, overridePrompt?: string) => {
    e.preventDefault();
    const userMessage = overridePrompt || input.trim();
    if (!userMessage || isLoading || !projectId) return;

    setInput('');
    setLastFailedPrompt(null);

    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);

    setIsLoading(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const commandRequest: AICommandRequest = {
        projectId,
        command: userMessage,
        context: {},
      };

      const result = await api.processAICommand(projectId, commandRequest);
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: result.response.fromFallback
          ? `⚠️ **AI service offline — using local code generation**\n\n${result.response.content}\n\n_*The external AI is currently unreachable. This response was generated locally with game-ready code templates. Try specific commands like "add player movement" or "create enemy patrol".*_`
          : result.response.content,
        timestamp: new Date(),
        response: result.response,
      }]);

      await loadCommandHistory();
    } catch (error: any) {
      if (abortController.signal.aborted) return;
      
      logger.error('Failed to process AI command:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMsg.includes('timeout');
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: `❌ ${isTimeout ? 'Request timed out. The AI is taking too long to respond — try a shorter or more specific prompt.' : `Error: ${errorMsg}`}`,
        timestamp: new Date(),
        isError: true,
      }]);
      setLastFailedPrompt(userMessage);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = async () => {
    await checkAIStatus();
    showToast({ type: 'info', message: 'AI status refreshed' });
  };

  const handleRetryLastPrompt = () => {
    if (lastFailedPrompt) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent, lastFailedPrompt);
    }
  };

  return (
    <div className="ai-command-page">
      <div className="ai-command-container">
        {/* Header */}
        <div className="ai-command-header">
          <div className="ai-command-title">
            <Sparkles size={24} className="ai-icon" />
            <h2>AI Command{!isRealAI && ' (Demo)'}</h2>
          </div>
          <button 
            className="refresh-btn"
            onClick={handleRetry}
            title="Refresh AI status"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Status Banner */}
        {!isRealAI && (
          <div className="mock-notice">
            🎭 <strong>Demo Mode Active:</strong> Set <code>USE_REAL_AI=1</code> in the API environment to enable real AI.
          </div>
        )}

        {/* Messages Container */}
        <div className="ai-messages-container">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.type}${isLoading && index === messages.length - 1 ? ' loading' : ''}`}
            >
              <div className="message-content">
                {message.response ? (
                  <div className="ai-response">
                    {message.response.type === 'explanation' && (
                      <div className="response-type explanation">📖 Explanation</div>
                    )}
                    {message.response.type === 'change' && (
                      <div className="response-type change">✨ Code Change</div>
                    )}
                    {message.response.type === 'fix' && (
                      <div className="response-type fix">🔧 Fix</div>
                    )}
                    {message.response.type === 'analysis' && (
                      <div className="response-type analysis">🔍 Analysis</div>
                    )}
                    {message.response.type === 'error' && (
                      <div className="response-type error">❌ Error</div>
                    )}
                    {message.response.title && (
                      <h3>{message.response.title}</h3>
                    )}
                    <div className="response-body">
                      {message.content.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
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
                                appliedChanges.has(`${message.response!.id}-${idx}`)
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
                          return (
                            <div key={idx} className={`change-item ${isApplied ? 'applied' : ''}`}>
                              <div className="change-path">{change.path}</div>
                              <div className="change-summary">{change.summary}</div>
                              <div className="change-meta">
                                <span className="change-confidence">
                                  Confidence: {Math.round(change.confidence * 100)}%
                                </span>
                                {change.newContent && (
                                  <span className="change-lines">
                                    {change.newContent.split('\n').length} lines
                                  </span>
                                )}
                              </div>
                              {change.newContent && (
                                <div className="change-code-preview">
                                  <pre><code>{change.newContent.length > 500 
                                    ? change.newContent.slice(0, 500) + '\n... (truncated)'
                                    : change.newContent
                                  }</code></pre>
                                </div>
                              )}
                              <div className="change-actions">
                                {isApplied ? (
                                  <span className="applied-badge">
                                    <CheckCircle2 size={14} /> Applied
                                  </span>
                                ) : change.newContent ? (
                                  <button
                                    className="apply-btn"
                                    onClick={() => handleApplyChange(message.response!.id, idx)}
                                    disabled={isApplying}
                                  >
                                    {isApplying ? (
                                      <><RefreshCw size={14} className="spinning" /> Applying...</>
                                    ) : (
                                      <><CheckCircle2 size={14} /> Apply to Project</>
                                    )}
                                  </button>
                                ) : (
                                  <span className="no-content-badge">
                                    <AlertTriangle size={14} /> No code content available
                                  </span>
                                )}
                              </div>
                            </div>
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
                    {message.content.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                    {message.isError && lastFailedPrompt && (
                      <button 
                        className="retry-btn"
                        onClick={handleRetryLastPrompt}
                      >
                        <RefreshCw size={14} /> Retry
                      </button>
                    )}
                  </div>
                )}
                <div className="message-timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message assistant loading">
              <div className="message-content">
                <div className="ai-thinking-indicator" role="status" aria-live="polite">
                  <div className="ai-pulse">
                    <div className="pulse-ring pulse-1"></div>
                    <div className="pulse-ring pulse-2"></div>
                    <div className="pulse-center">
                      <Sparkles size={32} />
                    </div>
                  </div>
                  <div className="ai-thinking-steps">
                    <div className="thinking-step active">Analyzing your request...</div>
                    <div className="thinking-step">Processing...</div>
                    <div className="thinking-step">Generating response...</div>
                  </div>
                </div>
                <button className="cancel-btn" onClick={handleCancel}>
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="ai-input-container">
          <form onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRealAI 
                  ? "Ask me anything about your game..."
                  : "Ask me anything about your game (Demo Mode)..."
                }
                disabled={!projectId}
                className="ai-input"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading || !projectId}
                className="send-btn"
                title={isLoading ? "Processing..." : "Send"}
              >
                {isLoading ? (
                  <RefreshCw size={20} className="spinning" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </form>
          <div className="input-hint">
            <p>⌘K to open command palette</p>
            <p>Press Enter to send</p>
            <p>Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}
