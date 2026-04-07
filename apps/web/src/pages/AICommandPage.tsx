import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

export function AICommandPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([
    {
      type: 'assistant',
      content: '🤖 Welcome to AI Command! I can help you build your game with AI assistance.\n\n✨ **What I can help with:**\n• Create gameplay systems\n• Fix bugs and errors\n• Generate code snippets\n• Explain code and architecture\n• Suggest improvements\n• Generate assets (coming soon)\n\n💬 **Try asking:**\n"Create a simple player movement system"\n"Fix the attack cooldown bug"\n"Add health bar to player"\n\nWhat would you like me to help you with?',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
      // TODO: Actually connect to AI API
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Add simulated response
      const response = `🤖 I understand you want to: "${userMessage}"

This is a placeholder AI response. In the full implementation, I would:

1. Analyze your project context
2. Identify affected files and systems
3. Generate appropriate code or suggestions
4. Show you the changes before applying them
5. Apply the changes if you approve

🚀 **Current Status:** AI Command interface ready - actual AI integration coming next!

🔧 **API Integration Plan:**
- Connect to AI orchestration service
- Support multiple AI providers
- Show implementation plans
- Generate diffs and summaries
- Support approval workflow

Would you like to try another request or see what other commands are available?`;

      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: response,
          timestamp: new Date(),
        }
      ]);
    } catch (error) {
      console.error('AI request failed:', error);
      
      const errorMessage = '❌ Sorry, I encountered an error processing your request. This is a placeholder interface - actual AI integration is coming soon!';
      
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

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <div className="ai-command-page">
      <header className="page-header">
        <h1>AI Command</h1>
        <p>Work with AI to build your game</p>
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
                placeholder="Ask me anything about your game..."
                rows={2}
                className="chat-input"
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!input.trim() || isLoading}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}