import React, { useState } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { useToast } from './Toast';
import '../ai-fab.css';

interface AIFABProps {
  projectId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function AIFAB({ projectId }: AIFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const { addToast } = useToast();

  const togglePanel = () => {
    setIsOpen(prev => !prev);
  };

  const handleSend = () => {
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

    // Simulate AI thinking then show preview mode response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: `I understand you want: "${text}"\n\nI'm currently in **Preview Mode**. Full AI capabilities are coming soon!\n\nSoon I'll be able to:\n• Generate game code from descriptions\n• Create and modify entities\n• Build complete game scenes\n• Optimize your game logic`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
      addToast('AI is in preview mode — full capabilities coming soon', 'info', 4000);
    }, 1200);
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
              <span className="ai-panel-badge">Preview</span>
            </div>
          </div>

          <div className="ai-panel-messages">
            {messages.length === 0 && (
              <div className="ai-panel-empty">
                <Bot size={32} />
                <p>Hi! I'm your AI game dev assistant.</p>
                <p className="ai-panel-hint">
                  Ask me to generate code, create entities, or build scenes.
                  <br />
                  <small>Full AI capabilities coming soon.</small>
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
              placeholder="Ask AI anything..."
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
