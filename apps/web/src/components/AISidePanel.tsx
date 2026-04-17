import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, Wifi, WifiOff, BookOpen, Settings, Expand, AlertTriangle } from 'lucide-react';
import { useToast } from './Toast';
import { api, type AICommandRequest, type AICommandResponse, type AIHealthResponse } from '../api/client';
import { MarkdownRenderer } from './MarkdownRenderer';
import { PromptRecipeLibrary, type PromptRecipe } from './PromptRecipeLibrary';
import '../ai-thinking.css';
import '../ai-sidepanel.css';
import { logger } from '../utils/logger';

interface AISidePanelProps {
  /** Current page context for AI awareness */
  pageContext?: string;
  sceneSummary?: string;
  selectedEntities?: string[];
  selectedCode?: string;
  currentFile?: string;
  projectId?: string;
  /** Control panel width and position */
  defaultWidth?: number;
  defaultPosition?: 'right' | 'left';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fromFallback?: boolean;
  isStreaming?: boolean;
  context?: {
    selectedFiles?: string[];
    selectedCode?: string;
    currentPage?: string;
  };
}

interface AIStatus {
  status: 'checking' | 'connected' | 'limited' | 'offline';
  service?: string;
  isReal: boolean;
  isWorking: boolean;
  message: string;
  lastChecked: number;
}

function getAIStatus(health: AIHealthResponse | null): AIStatus {
  if (!health) {
    return {
      status: 'checking',
      isReal: false,
      isWorking: false,
      message: 'Checking AI status...',
      lastChecked: Date.now()
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
      message: 'Demo mode - set USE_REAL_AI=1 to enable real AI',
      lastChecked: Date.now()
    };
  }

  if (hasProviderIssues) {
    return {
      status: 'limited',
      isReal: true,
      isWorking: false,
      message: health.providerStatus?.message || 'AI service limited - using local templates',
      lastChecked: Date.now()
    };
  }

  if (health.status === 'ok' || health.status === 'connected') {
    return {
      status: 'connected',
      service: health.service,
      isReal: true,
      isWorking: true,
      message: `Connected to ${health.service}${health.model ? ` • Model: ${health.model}` : ''}`,
      lastChecked: Date.now()
    };
  }

  return {
    status: 'offline',
    isReal: true,
    isWorking: false,
    message: 'AI service unavailable - using local templates',
    lastChecked: Date.now()
  };
}

export function AISidePanel({
  projectId,
  pageContext,
  sceneSummary,
  selectedEntities,
  selectedCode,
  currentFile,
  defaultWidth = 380,
  defaultPosition = 'right'
}: AISidePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiHealth, setAiHealth] = useState<AIHealthResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>({
    status: 'checking',
    isReal: false,
    isWorking: false,
    message: 'Checking AI status...',
    lastChecked: Date.now()
  });
  const [showRecipes, setShowRecipes] = useState(false);
  const [contextInfo, setContextInfo] = useState({
    currentPage: pageContext || '',
    selectedFiles: currentFile ? [currentFile] : [],
    selectedEntities: selectedEntities || [],
    hasCodeSelection: !!selectedCode,
  });
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  // Update context when props change
  useEffect(() => {
    setContextInfo({
      currentPage: pageContext || '',
      selectedFiles: currentFile ? [currentFile] : [],
      selectedEntities: selectedEntities || [],
      hasCodeSelection: !!selectedCode,
    });
  }, [pageContext, selectedEntities, currentFile, selectedCode]);

  // Check AI health periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health: AIHealthResponse = await api.getAIHealth();
        setAiHealth(health);
        setAiStatus(getAIStatus(health));
      } catch (error) {
        setAiHealth(null);
        setAiStatus({
          status: 'offline',
          isReal: false,
          isWorking: false,
          message: 'Cannot connect to AI service',
          lastChecked: Date.now()
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || !projectId) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      context: {
        selectedFiles: contextInfo.selectedFiles,
        selectedCode: selectedCode,
        currentPage: contextInfo.currentPage,
      }
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const result = await api.processAICommand(projectId, {
        command: text,
        projectId,
        context: {
          selectedFiles: contextInfo.selectedFiles,
          sceneSummary,
          selectedEntities: contextInfo.selectedEntities,
          currentPage: contextInfo.currentPage,
          selectedCode,
        },
      });

      const isFallback = result.response.fromFallback === true;
      const content = isFallback
        ? `⚠️ **Limited Service** — generated from local templates\n\n${result.response.content}\n\n*The AI service is currently unavailable. This code was generated using local templates and patterns based on your request.*`
        : result.response.content;

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: Date.now(),
        fromFallback: isFallback,
        context: {
          selectedFiles: contextInfo.selectedFiles,
          selectedCode,
          currentPage: contextInfo.currentPage,
        }
      };

      setMessages(prev => [...prev, assistantMsg]);
      
      // Update status based on result
      if (aiHealth) {
        const newStatus = getAIStatus(aiHealth);
        setAiStatus(newStatus);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');
      
      const errorContent = isTimeout 
        ? '⏱️ **AI request timed out** — Try a shorter or more specific prompt.'
        : `❌ **Error:** ${errorMessage}`;

      const errorMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now(),
        fromFallback: true,
      };

      setMessages(prev => [...prev, errorMsg]);
      
      // Update status to indicate limited service
      if (aiHealth) {
        const newStatus = getAIStatus(aiHealth);
        setAiStatus(newStatus);
      }
      
      showToast({
        type: 'error',
        message: isTimeout ? 'AI request timed out' : 'AI command failed',
        duration: 5000
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleRecipeSelect = (recipe: PromptRecipe) => {
    let prompt = recipe.prompt
      .replace(/\{[^}]+\}/g, (match) => {
        const inner = match.slice(1, -1);
        if (inner.includes('|')) return inner.split('|')[0];
        if (inner.includes(':')) return inner.split(':')[0];
        return `[${inner}]`;
      });
    setInput(prompt);
    setShowRecipes(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSend(); 
    }
    if (e.key === 'Escape') setIsOpen(false);
  };

  // Handle panel resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX - width);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !panelRef.current) return;
    
    const containerWidth = panelRef.current.parentElement?.clientWidth || window.innerWidth;
    let newWidth = e.clientX - dragStartX;
    newWidth = Math.max(300, Math.min(newWidth, containerWidth - 100));
    setWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Panel toggle button (only when collapsed) */}
      {!isOpen && (
        <button
          className="ai-panel-toggle"
          onClick={() => setIsOpen(true)}
          title="Open AI Assistant"
          style={{
            [defaultPosition]: '0',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <Bot size={20} />
        </button>
      )}

      {/* Side Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="ai-side-panel"
          style={{
            width: `${width}px`,
            [defaultPosition]: '0',
            zIndex: 1000
          }}
        >
          {/* Panel header */}
          <div className="ai-sidepanel-header">
            <div className="ai-sidepanel-title">
              <Sparkles size={16} />
              <span>AI Assistant</span>
              <div className={`ai-sidepanel-status ${aiStatus.status}`}>
                {aiStatus.status === 'connected' && <><Wifi size={12} /> Live</>}
                {aiStatus.status === 'limited' && <><AlertTriangle size={12} /> Limited</>}
                {aiStatus.status === 'offline' && <><WifiOff size={12} /> Offline</>}
                {aiStatus.status === 'checking' && <>Checking...</>}
              </div>
            </div>
            <div className="ai-sidepanel-actions">
              <button
                className="ai-sidepanel-recipes"
                onClick={() => setShowRecipes(!showRecipes)}
                title="Prompt recipes"
              >
                <BookOpen size={14} />
              </button>
              <button
                className="ai-sidepanel-settings"
                onClick={() => navigateToAISettings()}
                title="AI Settings"
              >
                <Settings size={14} />
              </button>
              <button
                className="ai-sidepanel-close"
                onClick={() => setIsOpen(false)}
                title="Close AI Assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* AI status info */}
          <div className={`ai-sidepanel-status-info ${aiStatus.isWorking ? 'working' : 'limited'}`}>
            <div className="ai-sidepanel-status-message">
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
            <div className="ai-sidepanel-status-features">
              {aiStatus.isWorking ? (
                <span>✨ Real AI: Code generation, analysis, suggestions</span>
              ) : (
                <span>💡 Local templates: Pattern-based suggestions</span>
              )}
            </div>
          </div>

          {/* Context summary */}
          {contextInfo.currentPage && (
            <div className="ai-sidepanel-context">
              <div className="context-item">
                <span className="context-label">Page:</span>
                <span className="context-value">{contextInfo.currentPage}</span>
              </div>
              {contextInfo.selectedFiles.length > 0 && (
                <div className="context-item">
                  <span className="context-label">File:</span>
                  <span className="context-value">{contextInfo.selectedFiles[0]}</span>
                </div>
              )}
              {contextInfo.selectedEntities.length > 0 && (
                <div className="context-item">
                  <span className="context-label">Selected:</span>
                  <span className="context-value">
                    {contextInfo.selectedEntities.slice(0, 3).join(', ')}
                    {contextInfo.selectedEntities.length > 3 && '...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Resize handle */}
          <div
            className="ai-sidepanel-resize-handle"
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          />

          {/* Recipe library */}
          {showRecipes ? (
            <div className="ai-sidepanel-content">
              <div className="ai-sidepanel-recipes-header">
                <h3>Prompt Recipes</h3>
                <button onClick={() => setShowRecipes(false)} className="back-to-chat">
                  ← Back to Chat
                </button>
              </div>
              <PromptRecipeLibrary onSelect={handleRecipeSelect} />
            </div>
          ) : (
            <div className="ai-sidepanel-content">
              {/* Messages */}
              <div className="ai-sidepanel-messages">
                {messages.length === 0 ? (
                  <div className="ai-sidepanel-empty">
                    <Bot size={48} />
                    <h3>AI Assistant</h3>
                    <p>
                      I'm here to help with your game development!
                      {aiStatus.isWorking && (
                        <><br /><small>🟢 Real AI Active — Can generate actual code for your game.</small></>
                      )}
                      {aiStatus.isWorking === false && aiStatus.isReal && (
                        <><br /><small>🟡 Limited Service — Using local templates due to AI service issues.</small></>
                      )}
                      {!aiStatus.isReal && (
                        <><br /><small>🔴 Demo Mode — Set USE_REAL_AI=1 to enable real AI.</small></>
                      )}
                    </p>
                    <button
                      className="ai-recipes-toggle"
                      onClick={() => setShowRecipes(true)}
                    >
                      <BookOpen size={14} /> View prompt recipes
                    </button>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`ai-sidepanel-message ai-sidepanel-message--${msg.role}`}>
                      <div className="ai-sidepanel-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
                      <div className="ai-sidepanel-content-wrapper">
                        <div className="ai-sidepanel-message-text">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                        {msg.fromFallback && (
                          <div className="ai-sidepanel-fallback-badge">
                            Local Template
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isThinking && (
                  <div className="ai-sidepanel-message ai-sidepanel-message--assistant">
                    <div className="ai-sidepanel-avatar">🤖</div>
                    <div className="ai-sidepanel-content-wrapper">
                      <div className="ai-sidepanel-thinking">
                        <div className="ai-thinking-dots">
                          <span /><span /><span />
                        </div>
                        <span>AI is thinking...</span>
                      </div>
                      <div className="ai-skeleton-response">
                        <div className="skeleton-line skeleton-w80" />
                        <div className="skeleton-line skeleton-w60" />
                        <div className="skeleton-line skeleton-w40" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="ai-sidepanel-input">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    aiStatus.isWorking 
                      ? "Ask me anything about your game..."
                      : "Try 'add player movement' or 'create enemy'..."
                  }
                  disabled={isThinking}
                />
                <button 
                  className="ai-sidepanel-send"
                  onClick={() => handleSend()} 
                  disabled={!input.trim() || isThinking}
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Helper function to navigate to AI settings
  function navigateToAISettings() {
    if (projectId) {
      window.location.href = `/project/${projectId}/ai-settings`;
    }
  }
}