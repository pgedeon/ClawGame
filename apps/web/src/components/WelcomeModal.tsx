import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Code, Layers, Play, X, ChevronRight } from 'lucide-react';

interface WelcomeModalProps {
  projectId: string;
  projectName: string;
}

const steps = [
  {
    id: 1,
    title: 'Edit Your Game Code',
    description: 'Open the Code Editor to modify game scripts. Use AI to help generate features.',
    icon: <Code size={28} />,
    action: 'code',
    label: 'Open Code Editor'
  },
  {
    id: 2,
    title: 'Design Your Scene',
    description: 'Use the Scene Editor to visually place entities and design your game world.',
    icon: <Layers size={28} />,
    action: 'scene',
    label: 'Open Scene Editor'
  },
  {
    id: 3,
    title: 'Play and Test',
    description: 'Run your game to see it in action. Press Play anytime to test changes.',
    icon: <Play size={28} />,
    action: 'play',
    label: 'Play Game'
  }
];

export function WelcomeModal({ projectId, projectName }: WelcomeModalProps) {
  const [visible, setVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-hide after 10 seconds if user doesn't interact
    const timer = setTimeout(() => {
      if (visible && currentStep === 0) {
        dismiss();
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [visible, currentStep]);

  const dismiss = () => {
    setVisible(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      dismiss();
    }
  };

  const handleAction = (action: string) => {
    dismiss();
    switch (action) {
      case 'code':
        navigate(`/project/${projectId}/editor`);
        break;
      case 'scene':
        navigate(`/project/${projectId}/scene-editor`);
        break;
      case 'play':
        navigate(`/project/${projectId}/preview`);
        break;
    }
  };

  if (!visible) return null;

  const current = steps[currentStep];

  return (
    <div className="welcome-modal-overlay" onClick={dismiss}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button className="welcome-modal-close" onClick={dismiss} aria-label="Close">
          <X size={20} />
        </button>

        <div className="welcome-modal-icon">
          <Sparkles size={32} color="#8b5cf6" />
        </div>

        <div className="welcome-modal-content">
          <h1>Welcome, {projectName}!</h1>
          <p className="welcome-modal-subtitle">
            Your project is ready. Here are the next steps:
          </p>

          <div className="welcome-steps">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`welcome-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(index)}
              >
                <div className="welcome-step-number">
                  {index < currentStep ? '✓' : step.id}
                </div>
                <div className="welcome-step-content">
                  <div className="welcome-step-header">
                    <span className="welcome-step-icon">{step.icon}</span>
                    <h3>{step.title}</h3>
                  </div>
                  <p>{step.description}</p>
                  <button
                    className="welcome-step-action"
                    onClick={() => handleAction(step.action)}
                  >
                    {step.label} <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="welcome-modal-actions">
            <button className="welcome-modal-skip" onClick={dismiss}>
              Start exploring on my own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
