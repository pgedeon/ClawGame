import React, { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, Command, Bot, Zap } from 'lucide-react';

const TOUR_SEEN_KEY = 'clawgame:tour-seen';
const TOUR_VERSION = 'v0.9.4'; // Sync with VERSION.json

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string;
}

const steps: TourStep[] = [
  {
    title: 'Welcome to ClawGame',
    description:
      'The first AI-native game development platform. Describe what you want to build — our AI writes the code.',
    icon: <Sparkles size={32} color="#8b5cf6" />,
  },
  {
    title: 'AI Everywhere',
    description:
      'Press Ctrl+K (⌘K) anywhere to summon the AI command palette. Ask it to create, fix, or explain anything.',
    icon: <Command size={32} color="#8b5cf6" />,
  },
  {
    title: 'Your AI Co-Pilot',
    description:
      'The floating AI button follows you inside projects. Click it anytime for contextual help, code generation, or analysis.',
    icon: <Bot size={32} color="#8b5cf6" />,
  },
  {
    title: 'Build Faster',
    description:
      'Create a project, then let AI generate game scripts, scenes, and assets. Review, tweak, and play — all in browser.',
    icon: <Zap size={32} color="#8b5cf6" />,
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TOUR_SEEN_KEY);
    if (stored !== TOUR_VERSION) {
      setVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TOUR_SEEN_KEY, TOUR_VERSION);
  };

  if (!visible) return null;

  const current = steps[step];

  return (
    <div className="onboarding-overlay" onClick={dismiss}>
      <div className="onboarding-card" onClick={(e) => e.stopPropagation()}>
        <button className="onboarding-close" onClick={dismiss} aria-label="Close tour">
          <X size={16} />
        </button>

        <div className="onboarding-icon">{current.icon}</div>

        <h2>{current.title}</h2>
        <p>{current.description}</p>

        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i <= step ? 'active' : ''}`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-primary" onClick={handleNext}>
            {step < steps.length - 1 ? (
              <>
                Next <ChevronRight size={16} />
              </>
            ) : (
              "Let's Build! 🚀"
            )}
          </button>
          <button className="onboarding-skip" onClick={dismiss}>
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}
