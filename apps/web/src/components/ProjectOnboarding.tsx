/**
 * @clawgame/web - ProjectOnboarding
 * Guided next-steps panel shown when a user first enters a project.
 * Addresses the "what do I do next?" confusion reported by Game Dev testing.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Eye, Image, Code, Gamepad2, X } from 'lucide-react';

const ONBOARDING_DISMISSED_KEY = 'clawgame_onboarding_dismissed';

interface Step {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  path: string;
}

export function ProjectOnboarding() {
  const [dismissed, setDismissed] = useState(false);
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const wasDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  if (dismissed || !projectId) return null;

  const steps: Step[] = [
    {
      number: 1,
      icon: <Sparkles size={18} />,
      title: 'Ask AI to Build',
      description: 'Describe your game idea and let AI generate code and assets for you.',
      action: 'Open AI Command',
      path: `/project/${projectId}/ai`,
    },
    {
      number: 2,
      icon: <Image size={18} />,
      title: 'Create Assets',
      description: 'Generate sprites, tilesets, and backgrounds with AI-powered tools.',
      action: 'Open Asset Studio',
      path: `/project/${projectId}/assets`,
    },
    {
      number: 3,
      icon: <Eye size={18} />,
      title: 'Design Scenes',
      description: 'Visually place entities, set up levels, and configure game worlds.',
      action: 'Open Scene Editor',
      path: `/project/${projectId}/scene-editor`,
    },
    {
      number: 4,
      icon: <Code size={18} />,
      title: 'Write Code',
      description: 'Edit game scripts with full code intelligence and AI assistance.',
      action: 'Open Code Editor',
      path: `/project/${projectId}/editor`,
    },
    {
      number: 5,
      icon: <Gamepad2 size={18} />,
      title: 'Play & Test',
      description: 'Preview your game instantly in the browser with live debugging.',
      action: 'Open Preview',
      path: `/project/${projectId}/preview`,
    },
  ];

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
  };

  const handleStepClick = (step: Step) => {
    navigate(step.path);
  };

  return (
    <div className="onboarding-guide">
      <div className="onboarding-guide-header">
        <div className="guide-icon">🎮</div>
        <div style={{ flex: 1 }}>
          <h3>Welcome to your project!</h3>
          <p>Here's how to get started building your game:</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleDismiss}
          aria-label="Dismiss onboarding"
        >
          <X size={16} />
        </button>
      </div>

      <div className="onboarding-steps">
        {steps.map((step) => (
          <div
            key={step.number}
            className="onboarding-step"
            onClick={() => handleStepClick(step)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleStepClick(step);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div className="onboarding-step-number">{step.number}</div>
              <span style={{ color: 'var(--fg-secondary)' }}>{step.icon}</span>
            </div>
            <div className="onboarding-step-title">{step.title}</div>
            <div className="onboarding-step-desc">{step.description}</div>
            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-xs)' }}>
              <span className="btn btn-ai btn-sm" style={{ pointerEvents: 'none' }}>
                {step.action} →
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="onboarding-dismiss">
        <button className="btn btn-ghost btn-sm" onClick={handleDismiss}>
          Don't show again
        </button>
      </div>
    </div>
  );
}
