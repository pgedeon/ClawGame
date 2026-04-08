import React, { useState, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useToast } from './Toast';
import { api } from '../api/client';
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
  const { showToast } = useToast();

  // Check AI health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await api.getAIHealth();
        setAiStatus(health.status === 'ok' ? 'connected' : 'offline');
      } catch {
        setAiStatus('offline');
      }
    };
    checkHealth();
    // Recheck every 60s
    const interval = setInterval(checkHealth, 60_000);
    return () => clearInterval(interval);
  }, []);

  const togglePanel = () => {
    setIsOpen(prev => !prev);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    if (!projectId) {
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: "I'd love to help, but no project is open. Please open a project first so I can work with your game code.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
      return;
    }

    try {
      const result = await api.processAICommand(projectId, {
        command: text,
        projectId,
        
      });

      const isFallback = result.response?.fromFallback === true;
      const content = isFallback
        ? `⚠️ **Offline mode** — generated from local templates\n\n${result.response.content}\n\n_*The AI service is unavailable. This code was generated locally. Try specific commands like "add player movement" or "create enemy".*_`
        : result.response.content;

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: Date.now(),
        fromFallback: isFallback,
      };
      setMessages(prev => [...prev, aiMsg]);

      if (isFallback) {
        setAiStatus('offline');
      } else {
        setAiStatus('connected');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error';
      const isTimeout = errorMsg.includes('abort') || errorMsg.includes('timeout') || errorMsg.includes('Timeout');

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: isTimeout
          ? `⏱️ **AI request timed out**\n\nThe AI service is taking too long to respond. This could be due to high load or connectivity issues.\n\n**Suggestions:**\n• Try a shorter, more specific command\n• Wait a moment and try again\n• Use the Code Editor to make changes manually`
          : `❌ **Error:** ${errorMsg}\n\nSomething went wrong. Please try again or use the Code Editor to make changes manually.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setAiStatus('offline');
      showToast({
        type: 'error',
        message: isTimeout ? 'AI request timed out — try a shorter command' : 'AI command failed',
        duration: 5000,
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`ai-fab ${isOpen ? 'ai-fab--open' : ''}`}
        onClick={togglePanel}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        title="AI Assistant (Ctrl+K)"
      >
        {isOpen ? <X size={22} /> : <Bot size={22} />}
        {!isOpen && <span className="ai-fab-pulse" />}
      </button>

      {/* AI Panel */}
      {isOpen && (
        <div className="ai-panel" role="dialog" aria-label="AI Assistant">
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Sparkles size={16} />
              <span>AI Assistant</span>
              <span className={`ai-panel-badge ${aiStatus}`}>
                {aiStatus === 'connected' ? (
                  <><Wifi size={10} /> Live</>
                ) : aiStatus === 'offline' ? (
                  <><WifiOff size={10} /> Offline</>
                ) : (
                  'Connecting...'
                )}
              </span>
            </div>
          </div>

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
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`ai-msg ai-msg--${msg.role}`}>
                <div className="ai-msg-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="ai-msg-content">{msg.content}</div>
              </div>
            ))}
            {isThinking && (
              <div className="ai-msg ai-msg--assistant">
                <div className="ai-msg-avatar">🤖</div>
                <div className="ai-msg-content ai-msg-thinking">
                  <span className="dot-flashing" />
                </div>
              </div>
            )}
          </div>

          <div className="ai-panel-input">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                aiStatus === 'connected'
                  ? "Ask me anything about your game..."
                  : "Try 'add player movement' or 'create enemy'..."
              }
              disabled={isThinking}
              autoFocus
            />
            <button
              className="ai-panel-send"
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
