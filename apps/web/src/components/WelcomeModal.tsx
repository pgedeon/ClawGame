import React, { useState, useEffect, useRef } from 'react';
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
  // Only show once per project — track dismissal in localStorage
  const storageKey = `clawgame_welcome_dismissed_${projectId}`;
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(storageKey);
    } catch {
      return true;
    }
  });
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Auto-hide after 10 seconds if user doesn't interact
    const timer = setTimeout(() => {
      if (visible && currentStep === 0) {
        dismiss();
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [visible, currentStep]);

  // Focus management
  useEffect(() => {
    if (visible) {
      // Store the currently focused element before opening the modal
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the first focusable element inside the modal
      const firstFocusable = modalRef.current?.querySelector(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;

      firstFocusable?.focus();

      // Handle Tab key to trap focus within the modal
      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const focusableElements = Array.from(
            modalRef.current?.querySelectorAll(
              'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) || []
          ) as HTMLElement[];

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            // Shift+Tab: Moving backwards
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            // Tab: Moving forwards
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }

        // Close modal on Escape key
        if (e.key === 'Escape') {
          e.preventDefault();
          dismiss();
        }
      };

      // Add keyboard event listener
      document.addEventListener('keydown', handleTab);

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleTab);
        document.body.style.overflow = '';
      };
    } else {
      // Restore focus to the previously focused element when modal closes
      previousFocusRef.current?.focus();
    }
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, '1');
    } catch { /* ignore */ }
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
    <div
      className="welcome-modal-overlay"
      onClick={dismiss}
      role="presentation"
    >
      <div
        className="welcome-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        aria-describedby="welcome-modal-description"
        tabIndex={-1}
      >
        <button
          className="welcome-modal-close"
          onClick={dismiss}
          aria-label="Close welcome modal"
        >
          <X size={20} />
        </button>

        <div className="welcome-modal-icon">
          <Sparkles size={32} color="#8b5cf6" aria-hidden="true" />
        </div>

        <div className="welcome-modal-content">
          <h1 id="welcome-modal-title">
            Welcome, {projectName}!
          </h1>
          <p id="welcome-modal-description" className="welcome-modal-subtitle">
            Your project is ready. Here are the next steps:
          </p>

          <div className="welcome-steps" role="list">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`welcome-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(index)}
                role="listitem"
                tabIndex={index === currentStep ? 0 : -1}
                aria-current={index === currentStep ? 'step' : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCurrentStep(index);
                  }
                }}
              >
                <div className="welcome-step-number" aria-hidden="true">
                  {index < currentStep ? '✓' : step.id}
                </div>
                <div className="welcome-step-content">
                  <div className="welcome-step-header">
                    <span className="welcome-step-icon" aria-hidden="true">{step.icon}</span>
                    <h3>{step.title}</h3>
                  </div>
                  <p>{step.description}</p>
                  <button
                    className="welcome-step-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(step.action);
                    }}
                    aria-label={`Navigate to ${step.label}`}
                  >
                    {step.label} <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="welcome-modal-actions">
            <button
              className="welcome-modal-skip"
              onClick={dismiss}
              aria-label="Skip welcome and start exploring"
            >
              Start exploring on my own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
