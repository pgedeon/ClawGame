/**
 * @clawgame/web - Game HUD
 * Head-Up Display: health bar, score, rune counter, and quick actions.
 */

import React from 'react';

interface GameHUDProps {
  health: number;
  maxHealth: number;
  score: number;
  gameTime: number;
  collectedRunes: string[];
  totalRunes: number;
  isPaused: boolean;
  onPause: () => void;
}

export function GameHUD({
  health,
  maxHealth,
  score,
  gameTime,
  collectedRunes,
  totalRunes,
  isPaused,
  onPause,
}: GameHUDProps) {
  const healthPct = maxHealth > 0 ? (health / maxHealth) * 100 : 100;
  const healthColor = healthPct > 50 ? '#22c55e' : healthPct > 25 ? '#eab308' : '#ef4444';
  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);

  return (
    <div className="game-hud">
      <div className="hud-left">
        <div className="hud-health">
          <span className="hud-label">❤️ HP</span>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{
                width: `${healthPct}%`,
                backgroundColor: healthColor,
                transition: 'width 0.3s ease, background-color 0.3s ease',
              }}
            />
          </div>
          <span className="health-text">{health}/{maxHealth}</span>
        </div>
      </div>

      <div className="hud-center">
        <div className="hud-score">
          <span className="score-icon">⭐</span>
          <span className="score-value">{score}</span>
        </div>
      </div>

      <div className="hud-right">
        <div className="hud-runes">
          <span className="rune-icon">🔮</span>
          <span className="rune-count">{collectedRunes.length}/{totalRunes}</span>
        </div>
        <div className="hud-time">
          <span className="time-icon">⏱️</span>
          <span className="time-value">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
        <button
          className="hud-pause-btn"
          onClick={onPause}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>
      </div>
    </div>
  );
}
