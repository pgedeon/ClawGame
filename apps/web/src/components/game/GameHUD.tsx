/**
 * @clawgame/web - Game HUD
 * Head-Up Display: health bar, score, rune counter, and quick actions.
 *
 * ENHANCED: Added visual health indicators beyond color for accessibility
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

  // NEW: Health status text for accessibility
  const healthStatus = healthPct > 75 ? 'High' : healthPct > 50 ? 'Good' : healthPct > 25 ? 'Low' : 'Critical';

  // NEW: Health icon for visual cue beyond color
  const healthIcon = healthPct > 75 ? '💚' : healthPct > 50 ? '❤️' : healthPct > 25 ? '💛' : '❤️‍🩹';

  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);

  return (
    <div className="game-hud">
      <div className="hud-left">
        <div className="hud-health">
          <span className="hud-label" aria-hidden="true">{healthIcon} HP</span>
          <div className="health-bar-container" role="progressbar" aria-valuenow={health} aria-valuemin={0} aria-valuemax={maxHealth} aria-label={`Health: ${health} of ${maxHealth} (${healthStatus})`}>
            <div
              className="health-fill"
              style={{
                width: `${healthPct}%`,
                backgroundColor: healthColor,
                transition: 'width 0.3s ease, background-color 0.3s ease',
              }}
            />
            {/* NEW: Health status badge for accessibility - shows on critical or when hovering */}
            <div className={`health-status-badge ${healthStatus.toLowerCase()}`}>
              <span className="health-status-icon" aria-hidden="true">{healthIcon}</span>
              <span className="health-status-text">{healthStatus}</span>
            </div>
          </div>
          <span className="health-text">{health}/{maxHealth}</span>
        </div>
      </div>

      <div className="hud-center">
        <div className="hud-score">
          <span className="score-icon" aria-hidden="true">⭐</span>
          <span className="score-value">{score}</span>
        </div>
      </div>

      <div className="hud-right">
        <div className="hud-runes">
          <span className="rune-icon" aria-hidden="true">🔮</span>
          <span className="rune-count">{collectedRunes.length}/{totalRunes}</span>
        </div>
        <div className="hud-time">
          <span className="time-icon" aria-hidden="true">⏱️</span>
          <span className="time-value">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
        <button
          className="hud-pause-btn"
          onClick={onPause}
          aria-label={isPaused ? 'Resume game' : 'Pause game'}
        >
          <span aria-hidden="true">{isPaused ? '▶️' : '⏸️'}</span>
        </button>
      </div>
    </div>
  );
}
