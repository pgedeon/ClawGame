import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Code, Bug, Lightbulb, Wand2, Zap, Palette, Scale } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ContextualAIAssistantProps {
  projectId: string;
  context: string;
  selectedCode?: string;
  currentFile?: string;
}

const QUICK_ACTIONS = [
  { id: 'explain', label: 'Explain', icon: Lightbulb, prompt: 'Explain this code:' },
  { id: 'fix', label: 'Fix bugs', icon: Bug, prompt: 'Find and fix bugs in:' },
  { id: 'improve', label: 'Improve', icon: Code, prompt: 'Improve and refactor:' },
  { id: 'generate', label: 'Generate', icon: Wand2, prompt: 'Generate code for:' },
] as const;

// Entity-specific AI actions
const ENTITY_ACTIONS = [
  { id: 'ai-fix', label: 'AI: Fix', icon: Bug, prompt: 'Fix issues with this entity:', color: '#ef4444' },
  { id: 'ai-improve', label: 'AI: Improve', icon: Zap, prompt: 'Improve this entity:', color: '#f59e0b' },
  { id: 'ai-animate', label: 'AI: Animate', icon: Palette, prompt: 'Add animations to this entity:', color: '#8b5cf6' },
  { id: 'ai-balance', label: 'AI: Balance', icon: Scale, prompt: 'Balance the stats of this entity:', color: '#10b981' },
] as const;

export function ContextualAIAssistant({
  projectId,
  context,
  selectedCode,
  currentFile,
}: ContextualAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEntityActions, setShowEntityActions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const handleAskAI = async (promptOverride?: string) => {
    const question = promptOverride || input.trim();
    if (!question) return;

    setIsThinking(true);
    setError(null);
    setResponse(null);
    setShowEntityActions(false);

    const fullPrompt = selectedCode
      ? `${question}\n\n\`\`\`\n${selectedCode}\n\`\`\``
      : question;

    try {
      const result = await fetch(`/api/projects/${projectId}/ai/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          command: fullPrompt,
          context: { selectedFiles: currentFile ? [currentFile] : [], selectedCode },
        }),
      });

      if (!result.ok) throw new Error(`AI service error: ${result.status}`);
      const data = await result.json();
      setResponse(data.response?.content || data.response?.title || 'AI processed your request.');
      setInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response');
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskAI(); }
    if (e.key === 'Escape') setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="ai-context-trigger-group">
        <button
          className="ai-context-trigger"
          onClick={() => setIsOpen(true)}
          title="Ask AI about this code"
        >
          <Sparkles size={14} />
          <span>Ask AI</span>
        </button>
        {/* Floating entity action buttons */}
        <div className="ai-entity-actions-float">
          {ENTITY_ACTIONS.map((action) => (
            <button
              key={action.id}
              className="ai-entity-action-btn"
              onClick={() => { setIsOpen(true); setTimeout(() => handleAskAI(action.prompt), 100); }}
              title={action.label}
              style={{ '--action-color': action.color } as React.CSSProperties}
            >
              <action.icon size={12} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ai-context-panel">
      <div className="ai-context-header">
        <div className="ai-context-title">
          <Sparkles size={14} />
          <span>AI Assistant</span>
          {context && <span className="ai-context-badge">{context}</span>}
        </div>
        <button className="ai-context-close" onClick={() => setIsOpen(false)}>
          <X size={14} />
        </button>
      </div>

      {/* Entity actions row */}
      <div className="ai-entity-actions">
        {ENTITY_ACTIONS.map((action) => (
          <button
            key={action.id}
            className="ai-entity-action-pill"
            onClick={() => handleAskAI(action.prompt)}
            disabled={isThinking}
            style={{ '--action-color': action.color } as React.CSSProperties}
          >
            <action.icon size={11} />
            {action.label.replace('AI: ', '')}
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="ai-quick-actions">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            className="ai-quick-action"
            onClick={() => handleAskAI(action.prompt)}
            disabled={isThinking}
          >
            <action.icon size={12} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Response area */}
      {(response || error || isThinking) && (
        <div className="ai-context-response">
          {isThinking && (
            <div className="ai-thinking-indicator">
              <div className="ai-thinking-dots"><span /><span /><span /></div>
              <span>AI is thinking...</span>
              <div className="ai-skeleton-response">
                <div className="skeleton-line skeleton-w80"></div>
                <div className="skeleton-line skeleton-w60"></div>
                <div className="skeleton-line skeleton-w90"></div>
              </div>
            </div>
          )}
          {error && <div className="ai-error-message">{error}</div>}
          {response && (
            <div className="ai-response-text">
              <MarkdownRenderer content={response} />
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="ai-context-input">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCode ? "Ask about selected code..." : "Ask AI anything..."}
          disabled={isThinking}
        />
        <button className="ai-context-send" onClick={() => handleAskAI()} disabled={!input.trim() || isThinking}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
