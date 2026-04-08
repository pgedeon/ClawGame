/**
 * @clawgame/web - Scene Editor AI Bar
 * Contextual AI assistant for scene editing tasks
 */

import React, { useState } from 'react';
import { Sparkles, Send, X, Lightbulb, Bug, Code, Wand2, Layers } from 'lucide-react';

interface SceneEditorAIBarProps {
  projectId: string;
  selectedEntityId?: string;
  selectedEntityType?: string;
  sceneEntities: Array<any>;
}

const QUICK_ACTIONS = [
  { 
    id: 'explain-entity', 
    label: 'Explain Entity', 
    icon: Lightbulb, 
    prompt: 'Explain this entity configuration:' 
  },
  { 
    id: 'fix-scene', 
    label: 'Fix Scene Issues', 
    icon: Bug, 
    prompt: 'Find and fix issues in my scene:' 
  },
  { 
    id: 'generate-code', 
    label: 'Generate Code', 
    icon: Code, 
    prompt: 'Generate TypeScript code for selected entities:' 
  },
  { 
    id: 'create-component', 
    label: 'Create Component', 
    icon: Wand2, 
    prompt: 'Create a custom component for:' 
  },
  { 
    id: 'optimize-scene', 
    label: 'Optimize Layout', 
    icon: Layers, 
    prompt: 'Optimize entity placement and layout:' 
  },
] as const;

export function SceneEditorAIBar({
  projectId,
  selectedEntityId,
  selectedEntityType,
  sceneEntities,
}: SceneEditorAIBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEntityContext = () => {
    if (selectedEntityId && selectedEntityType) {
      const entity = sceneEntities.find(e => e.id === selectedEntityId);
      return `selected ${selectedEntityType} entity`;
    } else if (sceneEntities.length > 0) {
      return `${sceneEntities.length} entities in scene`;
    }
    return 'scene editor';
  };

  const getSelectedEntityCode = () => {
    if (!selectedEntityId || !selectedEntityType) return null;
    
    const entity = sceneEntities.find(e => e.id === selectedEntityId);
    if (!entity) return null;

    return `Entity: ${selectedEntityType}
Transform: X=${entity.transform?.x || 0}, Y=${entity.transform?.y || 0}
Components: ${Array.from(entity.components?.keys() || []).join(', ')}
Position: (${Math.round((entity.transform?.x || 0) / 32)}, ${Math.round((entity.transform?.y || 0) / 32)})`;
  };

  const handleAskAI = async (promptOverride?: string) => {
    const question = promptOverride || input.trim();
    if (!question) return;

    setIsThinking(true);
    setError(null);
    setResponse(null);

    const fullPrompt = question + '\n\n' + getSelectedEntityCode();

    try {
      const result = await fetch(`/api/projects/${projectId}/ai/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          command: fullPrompt,
          context: {
            selectedFiles: ['scenes/main-scene.json'],
            selectedEntityId,
            sceneInfo: {
              entityCount: sceneEntities.length,
              selectedEntityType,
              timestamp: new Date().toISOString()
            }
          },
        }),
      });

      if (!result.ok) {
        throw new Error(`AI service error: ${result.status}`);
      }

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAI();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="scene-editor-ai-bar">
        <button
          className="ai-trigger-button"
          onClick={() => setIsOpen(true)}
          title="Ask AI about your scene"
        >
          <Sparkles size={14} />
          <span>AI Assistant</span>
          {getEntityContext() !== 'scene editor' && (
            <span className="ai-context-badge">{getEntityContext()}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="scene-editor-ai-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <Sparkles size={14} />
          <span>Scene AI Assistant</span>
          <span className="ai-context-badge">{getEntityContext()}</span>
        </div>
        <button className="ai-panel-close" onClick={() => setIsOpen(false)}>
          <X size={14} />
        </button>
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

      {/* Scene info */}
      {sceneEntities.length > 0 && (
        <div className="ai-scene-info">
          <div className="scene-stat">
            <span className="stat-label">Entities:</span>
            <span className="stat-value">{sceneEntities.length}</span>
          </div>
          {selectedEntityId && (
            <div className="scene-stat">
              <span className="stat-label">Selected:</span>
              <span className="stat-value">{selectedEntityType}</span>
            </div>
          )}
        </div>
      )}

      {/* Response area */}
      {(response || error || isThinking) && (
        <div className="ai-panel-response">
          {isThinking && (
            <div className="ai-thinking-indicator">
              <div className="ai-thinking-dots">
                <span />
                <span />
                <span />
              </div>
              <span>AI is analyzing your scene...</span>
            </div>
          )}
          {error && (
            <div className="ai-error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
          {response && (
            <div className="ai-response-content">
              <pre>{response}</pre>
              <div className="response-actions">
                <button 
                  className="copy-response"
                  onClick={() => navigator.clipboard.writeText(response)}
                >
                  Copy Code
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="ai-panel-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedEntityId ? "Ask about selected entity..." : "Ask about scene design..."}
          disabled={isThinking}
        />
        <button
          className="ai-panel-send"
          onClick={() => handleAskAI()}
          disabled={!input.trim() || isThinking}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}