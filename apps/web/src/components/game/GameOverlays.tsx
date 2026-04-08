/**
 * @clawgame/web - Game Overlay Screens
 * Start, pause, game-over, and victory overlays for the game preview.
 */

import React from 'react';

interface BaseOverlayProps {
  visible: boolean;
}

export function StartOverlay({ visible }: BaseOverlayProps) {
  if (!visible) return null;
  return (
    <div className="game-overlay start-overlay">
      <div className="overlay-content start-content">
        <div className="start-particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${15 + i * 14}%`,
              animationDelay: `${i * 0.3}s`,
            }} />
          ))}
        </div>
        <h2 className="start-title">🎮 Ready to Play</h2>
        <div className="start-controls-info">
          <div className="control-key"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</div>
          <div className="control-key"><kbd>Space</kbd> Shoot</div>
          <div className="control-key"><kbd>I</kbd> Inventory</div>
          <div className="control-key"><kbd>Q</kbd> Quests</div>
          <div className="control-key"><kbd>C</kbd> Craft Spells</div>
          <div className="control-key"><kbd>TAB</kbd> Talk to NPC</div>
        </div>
        <button className="start-btn pulse-glow">
          Press ENTER or Click to Start
        </button>
        <p className="start-hint">Defeat enemies, collect runes, craft spells!</p>
      </div>
    </div>
  );
}

export function PauseOverlay({ visible, onResume }: BaseOverlayProps & { onResume: () => void }) {
  if (!visible) return null;
  return (
    <div className="game-overlay pause-overlay">
      <div className="overlay-content pause-content">
        <h2>⏸️ Paused</h2>
        <p>Press ESC or click to resume</p>
        <button className="resume-btn" onClick={onResume}>
          Resume
        </button>
      </div>
    </div>
  );
}

export function GameOverOverlay({ visible, score, time, onRestart }: BaseOverlayProps & {
  score: number;
  time: number;
  onRestart: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="game-overlay gameover-overlay shake-in">
      <div className="overlay-content gameover-content">
        <h2 className="gameover-title">💀 Game Over</h2>
        <div className="gameover-stats">
          <div className="stat-row">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Time</span>
            <span className="stat-value">{Math.floor(time / 60)}m {Math.floor(time % 60)}s</span>
          </div>
        </div>
        <button className="restart-btn" onClick={onRestart}>
          🔄 Try Again
        </button>
      </div>
    </div>
  );
}

export function VictoryOverlay({ visible, score, time, collectedRunes, onRestart }: BaseOverlayProps & {
  score: number;
  time: number;
  collectedRunes: string[];
  onRestart: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="game-overlay victory-overlay">
      <div className="overlay-content victory-content">
        <h2 className="victory-title">🏆 Victory!</h2>
        <p className="victory-subtitle">All runes collected!</p>
        <div className="victory-runes">
          {collectedRunes.map((rune, i) => (
            <span key={i} className="rune-badge">{rune}</span>
          ))}
        </div>
        <div className="victory-stats">
          <div className="stat-row">
            <span className="stat-label">Final Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Time</span>
            <span className="stat-value">{Math.floor(time / 60)}m {Math.floor(time % 60)}s</span>
          </div>
        </div>
        <button className="restart-btn" onClick={onRestart}>
          🔄 Play Again
        </button>
      </div>
    </div>
  );
}
