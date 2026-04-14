/**
 * @clawgame/web - Keyboard Shortcuts Legend Component
 * Displays available keyboard shortcuts for the game preview.
 * Part of M14: Playtest Lab + Publishing.
 */
import React, { useState } from 'react';
import { Keyboard, X, Info } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  context?: 'game' | 'replay' | 'both';
}

const shortcuts: Shortcut[] = [
  // Game controls
  { key: 'WASD / Arrows', description: 'Move character', context: 'game' },
  { key: 'Space', description: 'Interact / Attack', context: 'game' },
  { key: 'Esc', description: 'Pause / Close panel', context: 'both' },
  { key: 'R', description: 'Restart game', context: 'game' },
  { key: 'F5', description: 'Quick save', context: 'game' },
  { key: 'Tab', description: 'Cycle RPG panels', context: 'game' },

  // Replay controls
  { key: 'Ctrl/Cmd + Space', description: 'Play/Pause', context: 'both' },
  { key: 'Ctrl/Cmd + R', description: 'Start/Stop recording', context: 'replay' },
  { key: 'Ctrl/Cmd + S', description: 'Download replay', context: 'replay' },
  { key: 'Ctrl/Cmd + ←/→', description: 'Step back/forward', context: 'replay' },
];

interface KeyboardShortcutsLegendProps {
  className?: string;
}

export const KeyboardShortcutsLegend: React.FC<KeyboardShortcutsLegendProps> = ({
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const gameShortcuts = shortcuts.filter(s => !s.context || s.context === 'game' || s.context === 'both');
  const replayShortcuts = shortcuts.filter(s => !s.context || s.context === 'replay' || s.context === 'both');

  return (
    <>
      {/* Trigger button */}
      <button
        className={`keyboard-shortcuts-trigger ${className}`}
        onClick={() => setIsOpen(true)}
        title="View keyboard shortcuts"
        aria-label="View keyboard shortcuts"
      >
        <Keyboard size={16} />
        <span>Shortcuts</span>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="keyboard-shortcuts-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="keyboard-shortcuts-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="keyboard-shortcuts-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="keyboard-shortcuts-header">
              <div className="keyboard-shortcuts-header-left">
                <Keyboard size={20} />
                <h2 id="keyboard-shortcuts-title">Keyboard Shortcuts</h2>
              </div>
              <button
                className="keyboard-shortcuts-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close keyboard shortcuts"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="keyboard-shortcuts-content">
              {/* Game controls section */}
              <div className="keyboard-shortcuts-section">
                <h3 className="keyboard-shortcuts-section-title">
                  <Info size={16} />
                  Game Controls
                </h3>
                <div className="keyboard-shortcuts-list">
                  {gameShortcuts.map((shortcut, index) => (
                    <div key={index} className="keyboard-shortcut-item">
                      <kbd className="keyboard-shortcut-key">{shortcut.key}</kbd>
                      <span className="keyboard-shortcut-description">
                        {shortcut.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Replay controls section */}
              <div className="keyboard-shortcuts-section">
                <h3 className="keyboard-shortcuts-section-title">
                  <Info size={16} />
                  Replay Controls
                </h3>
                <div className="keyboard-shortcuts-list">
                  {replayShortcuts.map((shortcut, index) => (
                    <div key={index} className="keyboard-shortcut-item">
                      <kbd className="keyboard-shortcut-key">{shortcut.key}</kbd>
                      <span className="keyboard-shortcut-description">
                        {shortcut.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="keyboard-shortcuts-footer">
              <p className="keyboard-shortcuts-tip">
                💡 Tip: Press <kbd>Esc</kbd> to close this dialog
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
