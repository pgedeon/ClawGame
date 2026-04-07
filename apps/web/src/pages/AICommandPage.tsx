import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AICommandRequest, type AICommandResponse, type AICommandHistory } from '../api/client';

export function AICommandPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    response?: AICommandResponse;
  }>>([
    {
      type: 'assistant',
      content: '🤖 Welcome to AI Command (Preview Mode)\n\nThis is a demonstration of AI-powered game development features. Real AI integration is coming soon!\n\n✨ **What this preview includes:**\n• Command parsing and analysis\n• Response generation based on your intent\n• Code change suggestions\n• Risk assessment\n\n⚠️ **Current Limitations:**\n• This is a mock service - responses are generated locally\n• No actual code generation or modification\n• No real AI service integration yet\n• Responses are simulated based on command patterns\n\n💬 **Try asking:**\n"Create a simple player movement system"\n"Explain the collision system"\n"Fix the attack cooldown bug"\n"Analyze code quality"\n\nWhat would you like to explore?',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [commandHistory, setCommandHistory] = useState<AICommandHistory[]>([]);

  // Load command history on mount
  useEffect(() => {
    if (projectId) {
      loadCommandHistory();
    }
  }, [projectId]);

  const loadCommandHistory = async () => {
    if (!projectId) return;
    
    try {
      const history = await api.getAIHistory(projectId, 10);
      setCommandHistory(history.history);
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !projectId) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        type: 'user',
        content: userMessage,
        timestamp: new Date(),
      }
    ]);

    setIsLoading(true);

    try {
      const commandRequest: AICommandRequest = {
        projectId,
        command: userMessage,
        context: {
          selectedFiles: [], // Could be enhanced with actual selected files
          selectedCode: '', // Could be enhanced with actual selected code
        }
      };

      const result = await api.processAICommand(projectId, commandRequest);
      const response = result.response;

      // Add AI response with structured data
      const previewNotice = response.content.includes('Preview Mode') || 
                           response.content.includes('when AI service is connected') 
                           ? '' 
                           : `\n\n⚠️ **Important:** This is a preview simulation. Real AI integration is planned for future releases.`;

      const enhancedContent = response.content + previewNotice;

      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: enhancedContent,
          timestamp: new Date(),
          response: {
            ...response,
            content: enhancedContent
          }
        }
      ]);

      // Update history
      setCommandHistory(prev => [
        {
          id: response.id,
          projectId,
          command: userMessage,
          response: {
            ...response,
            content: enhancedContent
          },
          timestamp: new Date(),
          status: 'completed',
        },
        ...prev.slice(0, 9) // Keep only last 9
      ]);

    } catch (error) {
      console.error('AI request failed:', error);
      
      const errorMessage = `❌ Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: errorMessage + '\n\nThis is a preview mock service - errors are simulated.',
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  const renderChanges = (response?: AICommandResponse) => {
    if (!response?.changes) return null;

    return (
      <div className="ai-changes">
        <h4>📝 Simulated Changes Preview:</h4>
        <div className="changes-list">
          {response.changes.map((change, index) => (
            <div key={index} className="change-item">
              <div className="change-path">{change.path}</div>
              <div className="change-summary">{change.summary}</div>
              <div className="change-confidence">
                Confidence: {Math.round(change.confidence * 100)}%
              </div>
            </div>
          ))}
        </div>
        <div className="mock-notice">
          ⚠️ These are simulated changes - no actual files will be modified.
        </div>
      </div>
    );
  };

  const renderNextSteps = (response?: AICommandResponse) => {
    if (!response?.nextSteps) return null;

    return (
      <div className="ai-next-steps">
        <h4>🎯 Next Steps (Preview):</h4>
        <ul className="steps-list">
          {response.nextSteps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
        <div className="mock-notice">
          ⚠️ Next steps are simulated for demonstration purposes.
        </div>
      </div>
    );
  };

  const renderRiskBadge = (riskLevel: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`risk-badge ${colors[riskLevel as keyof typeof colors] || colors.low}`}>
        {riskLevel}
      </span>
    );
  };

  return (
    <div className="ai-command-page">
      <header className="page-header">
        <h1>AI Command (Preview Mode)</h1>
        <p>Experience AI-powered game development in simulation mode</p>
        <div className="mock-notice">
          🎭 <strong>Preview Mode Active:</strong> This is a demonstration - no real AI integration yet.
        </div>
      </header>

      <div className="ai-command-container">
        <div className="ai-chat-container">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.type}`}
              >
                <div className="message-content">
                  {formatMessage(message.content)}
                  
                  {/* Show AI-specific response data */}
                  {message.type === 'assistant' && message.response && (
                    <div className="ai-response-details">
                      <div className="response-header">
                        <h3>{message.response.title}</h3>
                        {renderRiskBadge(message.response.riskLevel)}
                      </div>
                      
                      {renderChanges(message.response)}
                      {renderNextSteps(message.response)}
                      
                      {message.response.estimatedTime && (
                        <div className="estimated-time">
                          ⏱️ Estimated time: {message.response.estimatedTime}s
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message assistant loading">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="chat-input-container">
          <form onSubmit={handleSubmit} className="chat-form">
            <div className="input-wrapper">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your game (Preview Mode)..."
                rows={2}
                className="chat-input"
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!input.trim() || isLoading || !projectId}
              >
                {isLoading ? '⏳' : '→'}
              </button>
            </div>
          </form>

          <div className="quick-prompts">
            <h4>Quick Prompts</h4>
            <div className="prompt-buttons">
              <button 
                onClick={() => setInput("Create a simple player movement system")}
                className="prompt-button"
              >
                Player Movement
              </button>
              <button 
                onClick={() => setInput("Add health and damage system")}
                className="prompt-button"
              >
                Health System
              </button>
              <button 
                onClick={() => setInput("Generate pixel art sprites")}
                className="prompt-button"
              >
                Generate Assets
              </button>
              <button 
                onClick={() => setInput("Fix runtime errors")}
                className="prompt-button"
              >
                Debug Errors
              </button>
              <button 
                onClick={() => setInput("Analyze code quality")}
                className="prompt-button"
              >
                Code Review
              </button>
              <button 
                onClick={() => setInput("Explain the collision system")}
                className="prompt-button"
              >
                Explain Code
              </button>
            </div>
          </div>

          {/* Command History */}
          {commandHistory.length > 0 && (
            <div className="command-history">
              <h4>Recent Commands</h4>
              <div className="history-list">
                {commandHistory.slice(0, 5).map((cmd) => (
                  <div key={cmd.id} className="history-item">
                    <div className="history-command">{cmd.command}</div>
                    <div className="history-time">
                      {cmd.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="history-type">
                      {cmd.response.type} (Preview)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mock-status">
            <h4>ℹ️ About This Preview</h4>
            <div className="mock-details">
              <p><strong>What's Real:</strong></p>
              <ul>
                <li>Command parsing and intent analysis</li>
                <li>Response generation based on patterns</li>
                <li>UI interactions and state management</li>
                <li>Command history tracking</li>
                <li>Code change simulations</li>
              </ul>
              <p><strong>What's Not Real:</strong></p>
              <ul>
                <li>No actual AI service connection</li>
                <li>No file modifications</li>
                <li>No real code generation</li>
                <li>No contextual code analysis</li>
                <li>Simulated confidence scores</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}