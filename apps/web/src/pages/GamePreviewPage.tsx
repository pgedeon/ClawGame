/**
 * @clawgame/web - Game Preview Page
 * Refactored: uses extracted hooks and components.
 *   - useSceneLoader: scene loading + validation
 *   - useGamePreview: game loop, RPG state, event handlers
 *   - RPGPanels: inventory/quests/spellcraft/saveload/dialogue UI
 *   - ReplayControls: deterministic replay capture (M14)
 *
 * Layout: single top bar + canvas fills remaining space + floating replay bar at bottom
 */

import React, { Suspense, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Play, ArrowLeft, Skull, Trophy, Monitor, Smartphone, Tablet, Maximize2, RotateCcw, Keyboard } from 'lucide-react';
import '../game-preview.css';
import { useSceneLoader } from '../hooks/useSceneLoader';
import { useGamePreview, GENRE_CONTROLS } from '../hooks/useGamePreview';
import { RPGPanels } from '../components/game/RPGPanels';
import { ReplayControls } from '../components/game/ReplayControls';
import { KeyboardShortcutsLegend } from '../components/game/KeyboardShortcutsLegend'
import { NotificationArea } from '../components/game/Notification';

/* ═══════════════════════════════════════════════════════════
   Compact top bar with back, title, status, device picker
   ═══════════════════════════════════════════════════════════ */

const DEVICE_PRESETS = [
  { id: 'responsive', name: 'Responsive', width: 0, height: 0, icon: <Maximize2 size={13} /> },
  { id: 'phone', name: 'Phone', width: 375, height: 667, icon: <Smartphone size={13} /> },
  { id: 'tablet', name: 'Tablet', width: 768, height: 1024, icon: <Tablet size={13} /> },
  { id: 'desktop', name: 'Desktop', width: 1280, height: 800, icon: <Monitor size={13} /> },
];

/* ═══════════════════════════════════════════════════════════
   GAME PREVIEW CONTENT
   ═══════════════════════════════════════════════════════════ */
const GamePreviewContent: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { loading, error, projectName, scene: projectScene, projectGenre } = useSceneLoader(projectId);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [device, setDevice] = useState(DEVICE_PRESETS[0]);
  const [deviceRotated, setDeviceRotated] = useState(false);

  const {
    previewRuntime,
    runtimeHostRef,
    canvasRef, gameStats, gameStarted, gamePaused, gameOver, victory,
    playerScore, highScore, playerHealth, playerMana, collectedRunes, timeElapsed,
    activePanel, notifications, inventoryItems, questList,
    dialogueSpeaker, dialoguePortrait, dialogueText, dialogueChoices,
    craftingGrid, craftResult, learnedSpells, saveSlots,
    isRecording, recordingTime, hasReplay, playbackTime, playbackDuration, playbackProgress, isPlayingBack,
    controls,
    handleStartGame, handleRestart, handleBackToEditor,
    handleUseItem, handleEquipItem, handleCraftingCell, handleLearnSpell,
    handleAssignHotkey, handleSave, handleLoad, handleDeleteSave,
    handlePauseResume, handleDialogueChoice, setActivePanel,
    handleToggleRecording, handlePlayReplay, handlePauseReplay, handleSeekReplay, handleStepBackReplay, handleStepReplay, handleResetReplay, handleDownloadReplay,
  } = useGamePreview(projectId, projectScene, projectGenre);

  if (loading) {
    return (
      <div className="game-preview">
        <div className="game-preview-loading">
          <div className="game-preview-spinner" />
          <p>Loading game engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-preview">
        <div className="game-preview-error">
          <div className="game-preview-error-icon">⚠️</div>
          <h3>Error Loading Game</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const isResponsive = device.id === 'responsive';
  const deviceW = deviceRotated ? device.height : device.width;
  const deviceH = deviceRotated ? device.width : device.height;

  return (
    <div className="game-preview">
      {/* ── Compact top bar ── */}
      <div className="gp-topbar">
        <div className="gp-topbar-left">
          <button className="back-to-editor-btn" onClick={handleBackToEditor} title="Back to Editor">
            <ArrowLeft size={16} />
          </button>
          <h1 className="game-preview-title">{projectName}</h1>
          <div className="gp-topbar-sep" />
          {/* Device presets */}
          <div className="gp-device-picker">
            {DEVICE_PRESETS.map(d => (
              <button
                key={d.id}
                className={`gp-device-btn ${device.id === d.id ? 'active' : ''}`}
                onClick={() => { setDevice(d); setDeviceRotated(false); }}
                title={d.name}
              >
                {d.icon}
              </button>
            ))}
            {!isResponsive && (
              <button
                className="gp-device-btn"
                onClick={() => setDeviceRotated(r => !r)}
                title="Rotate"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="gp-topbar-right">
          <span className="game-status" title={previewRuntime.active.description}>
            <Monitor size={11} /> {previewRuntime.active.shortLabel}
          </span>
          <span className={`game-status ${gameStarted ? (gamePaused ? 'paused' : 'playing') : 'ready'}`}>
            {gameStarted ? (gamePaused ? '⏸' : '▶') : '⏹'}
          </span>
          <button
            className="gp-device-btn"
            onClick={() => setShowShortcuts(s => !s)}
            title="Keyboard Shortcuts"
          >
            <Keyboard size={13} />
          </button>
          {showShortcuts && <KeyboardShortcutsLegend />}
        </div>
      </div>

      {/* ── Canvas area (fills all remaining space) ── */}
      <div className="gp-canvas-area">
        {isResponsive ? (
          <div className="gp-canvas-fill">
            <div ref={runtimeHostRef} className="game-preview-runtime-host">
              <canvas ref={canvasRef} className="game-preview-canvas" />
            </div>
          </div>
        ) : (
          <div className="gp-canvas-centered">
            <div
              className="gp-device-frame"
              style={{ width: deviceW, height: deviceH }}
            >
              <div className="gp-device-screen">
                <div ref={runtimeHostRef} className="game-preview-runtime-host">
                  <canvas ref={canvasRef} className="game-preview-canvas" />
                </div>
              </div>
            </div>
            <div className="gp-device-info">
              {deviceW} × {deviceH}
            </div>
          </div>
        )}

        {/* Notifications overlay */}
        {notifications.length > 0 && (
          <div className="gp-notifications">
            {notifications.map(n => (
              <div key={n.id} className={`gp-notification gp-notification-${n.type || 'default'}`}>
                <span>{n.icon}</span> {n.message}
              </div>
            ))}
          </div>
        )}

        {/* RPG Panels */}
        <RPGPanels
          activePanel={activePanel}
          onClosePanel={() => setActivePanel('none')}
          inventoryItems={inventoryItems}
          onUseItem={handleUseItem}
          onEquipItem={handleEquipItem}
          questList={questList}
          craftingGrid={craftingGrid}
          craftResult={craftResult}
          onCraftingCell={handleCraftingCell}
          onLearnSpell={handleLearnSpell}
          learnedSpells={learnedSpells}
          onAssignHotkey={handleAssignHotkey}
          saveSlots={saveSlots}
          gamePaused={gamePaused}
          onSave={handleSave}
          onLoad={handleLoad}
          onDeleteSave={handleDeleteSave}
          onResume={handlePauseResume}
          dialogueSpeaker={dialogueSpeaker}
          dialoguePortrait={dialoguePortrait}
          dialogueText={dialogueText}
          dialogueChoices={dialogueChoices}
          onDialogueChoice={handleDialogueChoice}
        />

        {/* ── Overlay screens ── */}
        {!gameStarted && (
          <div className="game-preview-start-screen">
            <div className="start-screen-content">
              <div className="start-screen-icon">🎮</div>
              <h2>{projectName}</h2>
              <p>{controls.description}</p>
              <div className="start-screen-info">
                {controls.items.map((item, idx) => (
                  <div key={idx} className="info-item">
                    <span className="info-icon">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <button className="start-game-btn" onClick={handleStartGame}><Play size={20} /> Start Game</button>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="game-preview-gameover-overlay">
            <div className="gameover-screen-content">
              <div className="gameover-screen-icon"><Skull size={64} /></div>
              <h2>Game Over</h2>
              <p className="gameover-score">Score: {playerScore}</p>
              {highScore > 0 && <p className="gameover-stats" style={{ color: playerScore >= highScore ? "#fbbf24" : "rgba(255,255,255,0.6)" }}>Best: {highScore}</p>}
              <p className="gameover-stats">Runes: {collectedRunes.length}</p>
              <p className="gameover-time">Time: {timeElapsed}s</p>
              <div className="gameover-buttons">
                <button className="restart-btn" onClick={handleRestart}><Play size={20} /> Try Again</button>
                <button className="back-btn" onClick={handleBackToEditor}><ArrowLeft size={18} /> Editor</button>
              </div>
            </div>
          </div>
        )}

        {victory && (
          <div className="game-preview-victory-overlay">
            <div className="victory-screen-content">
              <div className="victory-screen-icon"><Trophy size={64} /></div>
              <h2>Victory!</h2>
              <p className="victory-score">Score: {playerScore}</p>
              {highScore > 0 && <p className="victory-time" style={{ color: playerScore >= highScore ? "#fbbf24" : "rgba(255,255,255,0.6)" }}>Best: {highScore}</p>}
              <p className="victory-time">Time: {timeElapsed}s</p>
              <p className="victory-health">Health: {Math.round(playerHealth)}%</p>
              <div className="victory-buttons">
                <button className="restart-btn" onClick={handleRestart}><Play size={20} /> Play Again</button>
                <button className="back-btn" onClick={handleBackToEditor}><ArrowLeft size={18} /> Editor</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating replay bar at bottom ── */}
      <div className="gp-replay-bar">
        <ReplayControls
          isRecording={isRecording}
          recordingTime={recordingTime}
          hasReplay={hasReplay}
          playbackTime={playbackTime}
          playbackDuration={playbackDuration}
          playbackProgress={playbackProgress}
          isPlayingBack={isPlayingBack}
          onToggleRecording={handleToggleRecording}
          onPlayReplay={handlePlayReplay}
          onPauseReplay={handlePauseReplay}
          onSeekReplay={handleSeekReplay}
          onStepBackReplay={handleStepBackReplay}
          onStepReplay={handleStepReplay}
          onResetReplay={handleResetReplay}
          onDownloadReplay={handleDownloadReplay}
        />
      </div>
    </div>
  );
};

/* ─── Page wrapper ── */
export function GamePreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) {
    return (
      <div className="game-preview">
        <div className="game-preview-error">
          <div className="game-preview-error-icon">🎮</div>
          <h3>No Project Selected</h3>
          <p>Please open a project first to preview.</p>
        </div>
      </div>
    );
  }
  return (
    <Suspense fallback={
      <div className="game-preview">
        <div className="game-preview-loading">
          <div className="game-preview-spinner" />
          <p>Loading game engine...</p>
        </div>
      </div>
    }>
      <GamePreviewContent />
    </Suspense>
  );
}
