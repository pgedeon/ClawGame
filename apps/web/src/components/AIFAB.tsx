import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, Wifi, WifiOff, BookOpen, AlertTriangle } from 'lucide-react';
import { useToast } from './Toast';
import { api, type AIHealthResponse } from '../api/client';
import { MarkdownRenderer } from './MarkdownRenderer';
import { PromptRecipeLibrary, type PromptRecipe } from './PromptRecipeLibrary';
import '../ai-fab.css';

interface AIFABProps {
  /** Current page context for AI awareness */
  pageContext?: string;
  sceneSummary?: string;
  selectedEntities?: string[];
  projectId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fromFallback?: boolean;
}

interface AIStatus {
  status: 'checking' | 'connected' | 'limited' | 'offline';
  service?: string;
  isReal: boolean;
  isWorking: boolean;
  message: string;
}

function getAIStatus(health: AIHealthResponse | null): AIStatus {
  if (!health) {
    return {
      status: 'checking',
      isReal: false,
      isWorking: false,
      message: 'Checking AI status...'
    };
  }

  const isReal = health.service !== 'mock-ai-preview';
  const hasProviderIssues = health.providerStatus?.state && 
    ['rate_limited', 'circuit_open', 'timed_out', 'degraded'].includes(health.providerStatus.state);

  if (!isReal) {
    return {
      status: 'offline',
      isReal: false,
      isWorking: false,
      message: 'Demo mode - set USE_REAL_AI=1 to enable real AI'
    };
  }

  if (hasProviderIssues) {
    return {
      status: 'limited',
      isReal: true,
      isWorking: false,
      message: health.providerStatus?.message || 'AI service limited - using local templates'
    };
  }

  if (health.status === 'ok' || health.status === 'connected') {
    return {
      status: 'connected',
      service: health.service,
      isReal: true,
      isWorking: true,
      message: `Connected to ${health.service}${health.model ? ` • Model: ${health.model}` : ''}`
    };
  }

  return {
    status: 'offline',
    isReal: true,
    isWorking: false,
    message: 'AI service unavailable - using local templates'
  };
}

export function AIFAB({ projectId, pageContext, sceneSummary, selectedEntities }: AIFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiHealth, setAiHealth] = useState<AIHealthResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>({
    status: 'checking',
    isReal: false,
    isWorking: false,
    message: 'Checking AI status...'
  });
  const [lastAction, setLastAction] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const { showToast } = useToast();
  const fabRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await api.getAIHealth();
        setAiHealth(health);
        setAiStatus(getAIStatus(health));
      } catch {
        setAiHealth(null);
        setAiStatus({
          status: 'offline',
          isReal: false,
          isWorking: false,
          message: 'Cannot connect to AI service'
        });
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Show tooltip briefly on mount
  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(true), 2000);
    const h = setTimeout(() => setShowTooltip(false), 6000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, []);

  const togglePanel = () => setIsOpen(prev => !prev);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    setLastAction(text.slice(0, 30));
    setShowRecipes(false);

    if (!projectId) {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: "I'd love to help, but no project is open. Please open a project first.", timestamp: Date.now() }]);
      setIsThinking(false);
      return;
    }

    try {
      const result = await api.processAICommand(projectId, {
        command: text,
        projectId,
        context: {
          selectedFiles: [],
          sceneSummary,
          selectedEntities,
          currentPage: pageContext,
        },
      });

      const isFallback = result.response?.fromFallback === true;
      const content = isFallback
        ? `⚠️ **Limited Service** — generated from local templates\n\n${result.response.content}\n\n*The AI service is currently unavailable. This code was generated using local templates and patterns based on your request.*`
        : result.response.content;
        
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content, timestamp: Date.now(), fromFallback: isFallback }]);
      
      // Update status based on result
      if (aiHealth) {
        const newStatus = getAIStatus(aiHealth);
        setAiStatus(newStatus);
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error';
      const isTimeout = errorMsg.includes('abort') || errorMsg.includes('timeout');
      const errorContent = isTimeout 
        ? '⏱️ **AI request timed out** — Try a shorter or more specific prompt.'
        : `❌ **Error:** ${errorMsg}`;
        
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: errorContent, timestamp: Date.now() }]);
      
      // Update status to indicate limited service
      if (aiHealth) {
        const newStatus = getAIStatus(aiHealth);
        setAiStatus(newStatus);
      }
      
      showToast({ type: 'error', message: isTimeout ? 'AI request timed out' : 'AI command failed', duration: 5000 });
    } finally {
      setIsThinking(false);
    }
  };

  const handleRecipeSelect = (recipe: PromptRecipe) => {
    // Replace {placeholders} with generic defaults for now; user can edit before sending
    let prompt = recipe.prompt
      .replace(/\{[^}]+\}/g, (match) => {
        const inner = match.slice(1, -1);
        // If it's a pipe-separated choice, pick the first
        if (inner.includes('|')) return inner.split('|')[0];
        // If it has a colon like {length:3|5|7}, use the key
        if (inner.includes(':')) return inner.split(':')[0];
        return `[${inner}]`;
      });
    setInput(prompt);
    setShowRecipes(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') setIsOpen(false);
  };

  // FAB status color based on AI status
  const getFabColor = () => {
    switch (aiStatus.status) {
      case 'connected': return 'ai-fab--connected';
      case 'limited': return 'ai-fab--limited';
      case 'offline': return 'ai-fab--offline';
      default: return '';
    }
  };

  const getFabTitle = () => {
    if (isThinking) return 'AI is processing...';
    if (aiStatus.isWorking) return 'AI Assistant - Real AI active';
    if (aiStatus.isReal) return 'AI Assistant - Limited service';
    return 'AI Assistant - Demo mode';
  };

  return (
    <>
      {/* FAB with glow + tooltip */}
      <div className="ai-fab-wrapper">
        {showTooltip && !isOpen && (
          <div className="ai-fab-tooltip">
            <Sparkles size={12} />
            {lastAction ? `Last: ${lastAction}${lastAction.length >= 30 ? '...' : ''}` : getFabTitle()}
          </div>
        )}
        <button
          ref={fabRef}
          className={`ai-fab ${isOpen ? 'ai-fab--open' : ''} ${getFabColor()} ${isThinking ? 'ai-fab--thinking' : ''}`}
          onClick={togglePanel}
          aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
          title={getFabTitle()}
        >
          {isOpen ? <X size={22} /> : <Bot size={22} />}
          {!isOpen && <span className="ai-fab-pulse" />}
          {!isOpen && isThinking && <span className="ai-fab-thinking-ring" />}
          {!isOpen && aiStatus.status === 'limited' && <AlertTriangle size={12} className="ai-fab-warning" />}
        </button>
      </div>

      {/* AI Panel */}
      {isOpen && (
        <div className="ai-panel" role="dialog" aria-label="AI Assistant">
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Sparkles size={16} />
              <span>AI Assistant</span>
              <div className={`ai-panel-badge ${aiStatus.status}`}>
                {aiStatus.status === 'connected' && <><Wifi size={10} /> Live</>}
                {aiStatus.status === 'limited' && <><AlertTriangle size={10} /> Limited</>}
                {aiStatus.status === 'offline' && <><WifiOff size={10} /> Offline</>}
                {aiStatus.status === 'checking' && <>Checking...</>}
              </div>
            </div>
          </div>

          {/* AI status info */}
          <div className={`ai-status-info ${aiStatus.isWorking ? 'working' : 'limited'}`}>
            <div className="ai-status-message">
              {aiStatus.isWorking ? (
                <>
                  <Wifi size={12} />
                  <span>{aiStatus.message}</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={12} />
                  <span>{aiStatus.message}</span>
                </>
              )}
            </div>
            <div className="ai-status-features">
              {aiStatus.isWorking ? (
                <span>✨ Real AI: Code generation, analysis, suggestions</span>
              ) : (
                <span>💡 Local templates: Pattern-based suggestions</span>
              )}
            </div>
          </div>

          {/* Recipes toggle */}
          <button
            className="ai-panel-recipes-toggle"
            onClick={() => setShowRecipes(!showRecipes)}
          >
            <BookOpen size={13} />
            {showRecipes ? 'Hide recipes' : 'Prompt Recipes'}
          </button>

          {/* Recipe library (inline, replaces messages when shown) */}
          {showRecipes ? (
            <PromptRecipeLibrary
              onSelect={handleRecipeSelect}
            />
          ) : (
            <div className="ai-panel-messages">
              {messages.length === 0 && (
                <div className="ai-panel-empty">
                  <Bot size={32} />
                  <p>Hi! I'm your AI game dev assistant.</p>
                  <p className="ai-panel-hint">
                    Ask me to generate code, create entities, or build scenes.
                    {aiStatus.isWorking && (
                      <><br /><small>🟢 Real AI Active — Can generate actual code for your game.</small></>
                    )}
                    {!aiStatus.isWorking && aiStatus.isReal && (
                      <><br /><small>🟡 Limited Service — Using local templates due to AI service issues.</small></>
                    )}
                    {!aiStatus.isReal && (
                      <><br /><small>🔴 Demo Mode — Set USE_REAL_AI=1 to enable real AI.</small></>
                    )}
                  </p>
                  <button
                    className="ai-panel-recipes-toggle"
                    onClick={() => setShowRecipes(true)}
                    style={{ marginTop: 8, fontSize: '0.8rem' }}
                  >
                    <BookOpen size={13} />
                    Or pick a prompt recipe →
                  </button>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`ai-msg ai-msg--${msg.role}`}>
                  <div className="ai-msg-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
                  <div className="ai-msg-content">
                    <MarkdownRenderer content={msg.content} />
                    {msg.fromFallback && (
                      <div className="ai-fallback-notice">
                        <AlertTriangle size={12} />
                        <span>Generated from local templates</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="ai-msg ai-msg--assistant">
                  <div className="ai-msg-avatar">🤖</div>
                  <div className="ai-msg-content ai-msg-thinking">
                    <div className="ai-thinking-indicator">
                      <div className="ai-thinking-dots"><span /><span /><span /></div>
                      <span>AI is thinking...</span>
                    </div>
                    <div className="ai-skeleton-response">
                      <div className="skeleton-line skeleton-w80"></div>
                      <div className="skeleton-line skeleton-w60"></div>
                      <div className="skeleton-line skeleton-w40"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="ai-panel-input">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={aiStatus.isWorking ? "Ask me anything about your game..." : "Try 'add player movement' or 'create enemy'..."}
              disabled={isThinking}
              autoFocus
            />
            <button className="ai-panel-send" onClick={() => handleSend()} disabled={!input.trim() || isThinking} aria-label="Send message">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}