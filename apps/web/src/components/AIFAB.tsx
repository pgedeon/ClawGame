import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, Wifi, WifiOff, BookOpen } from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../api/client';
import { MarkdownRenderer } from './MarkdownRenderer';
import { PromptRecipeLibrary, type PromptRecipe } from './PromptRecipeLibrary';
import '../ai-fab.css';

interface AIFABProps {
  projectId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fromFallback?: boolean;
}

export function AIFAB({ projectId }: AIFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
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
        setAiStatus(health.status === 'ok' ? 'connected' : 'offline');
      } catch { setAiStatus('offline'); }
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
      const result = await api.processAICommand(projectId, { command: text, projectId });
      const isFallback = result.response?.fromFallback === true;
      const content = isFallback
        ? `⚠️ **Offline mode** — generated from local templates\n\n${result.response.content}\n\n*The AI service is unavailable. This code was generated locally.*`
        : result.response.content;
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content, timestamp: Date.now(), fromFallback: isFallback }]);
      setAiStatus(isFallback ? 'offline' : 'connected');
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error';
      const isTimeout = errorMsg.includes('abort') || errorMsg.includes('timeout');
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: isTimeout ? '⏱️ **AI request timed out** — try a shorter command.' : `❌ **Error:** ${errorMsg}`, timestamp: Date.now() }]);
      setAiStatus('offline');
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

  return (
    <>
      {/* FAB with glow + tooltip */}
      <div className="ai-fab-wrapper">
        {showTooltip && !isOpen && (
          <div className="ai-fab-tooltip">
            <Sparkles size={12} />
            {lastAction ? `Last: ${lastAction}${lastAction.length >= 30 ? '...' : ''}` : 'AI Assistant — Ctrl+K'}
          </div>
        )}
        <button
          ref={fabRef}
          className={`ai-fab ${isOpen ? 'ai-fab--open' : ''} ${isThinking ? 'ai-fab--thinking' : ''}`}
          onClick={togglePanel}
          aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        >
          {isOpen ? <X size={22} /> : <Bot size={22} />}
          {!isOpen && <span className="ai-fab-pulse" />}
          {!isOpen && isThinking && <span className="ai-fab-thinking-ring" />}
        </button>
      </div>

      {/* AI Panel */}
      {isOpen && (
        <div className="ai-panel" role="dialog" aria-label="AI Assistant">
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Sparkles size={16} />
              <span>AI Assistant</span>
              <span className={`ai-panel-badge ${aiStatus}`}>
                {aiStatus === 'connected' ? <><Wifi size={10} /> Live</> : aiStatus === 'offline' ? <><WifiOff size={10} /> Offline</> : 'Connecting...'}
              </span>
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
                    {aiStatus === 'connected' && <><br /><small>🟢 Connected to AI — I can generate real code for your game.</small></>}
                    {aiStatus === 'offline' && <><br /><small>🔴 AI offline — I'll use local templates. Specific commands work best.</small></>}
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
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="ai-msg ai-msg--assistant">
                  <div className="ai-msg-avatar">🤖</div>
                  <div className="ai-msg-content ai-msg-thinking">
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
              placeholder={aiStatus === 'connected' ? "Ask me anything about your game..." : "Try 'add player movement' or 'create enemy'..."}
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
