/**
 * AI Thinking Indicator Component
 * Shows animated progress when AI is processing a command.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface AIThinkingIndicatorProps {
  steps: string[];
  onComplete?: () => void;
}

export function AIThinkingIndicator({ steps, onComplete }: AIThinkingIndicatorProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!steps || steps.length === 0) return;

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = Math.min(prev + 1, steps.length - 1);
        if (next === steps.length - 1 && onComplete) {
          setTimeout(onComplete, 500);
        }
        return next;
      });
    }, 1200); // Advance step every 1.2 seconds

    return () => clearInterval(interval);
  }, [steps, onComplete]);

  return (
    <div className="ai-thinking-indicator">
      <div className="ai-pulse">
        <div className="pulse-ring pulse-1"></div>
        <div className="pulse-ring pulse-2"></div>
        <div className="pulse-center">
          <Sparkles size={24} color="#8b5cf6" />
        </div>
      </div>

      <div className="ai-thinking-steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`thinking-step ${i <= currentStep ? 'completed' : ''} ${i === currentStep ? 'active' : ''}`}
          >
            {i <= currentStep ? '✓' : '○'} {step}
          </div>
        ))}
      </div>
    </div>
  );
}
