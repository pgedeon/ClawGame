import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
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
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealAI, setIsRealAI] = useState(false);
  const [commandHistory, setCommandHistory] = useState<AICommandHistory[]>([]);

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
      
      // Set welcome message based on AI status
      setMessages([{
        type: 'assistant',
        content: isReal 
          ? `🤖 Welcome to AI Command (Real AI Connected)\n\n**Connected to:** ${health.service}\n**Model:** ${health.model}\n\n✨ **Real AI Features Available:**\n• Actual code generation powered by ${health.model}\n• Context-aware code analysis\n• Real-time code suggestions\n• Bug detection and fixes\n• Code quality reviews\n\n💬 **Try asking:**\n"Create a simple player movement system"\n"Explain the collision system"\n"Fix this attack cooldown bug"\n"Analyze code quality"\n\nReady to help you build your game!`
          : `🤖 Welcome to AI Command\n\nThis is a demonstration of AI-powered game development features. Real AI integration is available by setting \`USE_REAL_AI=1\` in the API environment.\n\n✨ **What this includes:**\n• Command parsing and analysis\n• Response generation based on your intent\n• Code change suggestions\n• Risk assessment\n\n⚠️ **Current Limitations:**\n• This is a mock service - responses are generated locally\n• No actual code generation or modification\n• No real AI service integration yet\n• Responses are simulated based on command patterns\n\n💬 **Try asking:**\n"Create a simple player movement system"\n"Explain the collision system"\n"Fix this attack cooldown bug"\n"Analyze code quality"\n\nWhat would you like to explore?`,
        timestamp: new Date(),
      }]);
    } catch (err) {
      logger.error('Failed to check AI status:', err);
      // Default to preview mode if API not reachable
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
        context: {},
      };

      const result = await api.processAICommand(projectId, commandRequest);
      
      // Add assistant response
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: result.response.content,
          timestamp: new Date(),
          response: result.response,
        }
      ]);

      // Reload history to get updated command list
      await loadCommandHistory();
    } catch (error: any) {
      logger.error('Failed to process AI command:', error);
      
      const errorMessage = `❌ Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    await checkAIStatus();
    showToast({ type: 'info', message: 'AI status refreshed' });
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
                      <div className="response-type explanation">
                        📖 Explanation
                      </div>
                    )}
                    {message.response.type === 'change' && (
                      <div className="response-type change">
                        ✨ Code Change
                      </div>
                    )}
                    {message.response.type === 'fix' && (
                      <div className="response-type fix">
                        🔧 Fix
                      </div>
                    )}
                    {message.response.type === 'analysis' && (
                      <div className="response-type analysis">
                        🔍 Analysis
                      </div>
                    )}
                    {message.response.type === 'error' && (
                      <div className="response-type error">
                        ❌ Error
                      </div>
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
                        <h4>Proposed Changes:</h4>
                        {message.response.changes.map((change, idx) => (
                          <div key={idx} className="change-item">
                            <div className="change-path">{change.path}</div>
                            <div className="change-summary">{change.summary}</div>
                            <div className="change-confidence">
                              Confidence: {Math.round(change.confidence * 100)}%
                            </div>
                          </div>
                        ))}
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
                <div className="ai-thinking-indicator">
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
                disabled={isLoading || !projectId}
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
