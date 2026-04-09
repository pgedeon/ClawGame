/**
 * @clawgame/web - Game Preview Page
 * Refactored: uses extracted hooks and components.
 *   - useSceneLoader: scene loading + validation
 *   - useGamePreview: game loop, RPG state, event handlers
 *   - RPGPanels: inventory/quests/spellcraft/saveload/dialogue UI
 */

import React, { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Play, ArrowLeft, Skull, Trophy } from 'lucide-react';
import '../game-preview.css';
import { useSceneLoader } from '../hooks/useSceneLoader';
import { useGamePreview, GENRE_CONTROLS } from '../hooks/useGamePreview';
import { RPGPanels } from '../components/game/RPGPanels';

/* ═══════════════════════════════════════════════════════════
   GAME PREVIEW CONTENT
   ═══════════════════════════════════════════════════════════ */
const GamePreviewContent: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { loading, error, projectName, scene: projectScene, projectGenre } = useSceneLoader(projectId);

  const {
    canvasRef, gameStats, gameStarted, gamePaused, gameOver, victory,
    playerScore, playerHealth, playerMana, collectedRunes, timeElapsed,
    activePanel, notifications, inventoryItems, questList,
    dialogueSpeaker, dialoguePortrait, dialogueText, dialogueChoices,
    craftingGrid, craftResult, learnedSpells, saveSlots,
    controls,
    handleStartGame, handleRestart, handleBackToEditor,
    handleUseItem, handleEquipItem, handleCraftingCell, handleLearnSpell,
    handleAssignHotkey, handleSave, handleLoad, handleDeleteSave,
    handlePauseResume, handleDialogueChoice, setActivePanel,
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

  return (
    <div className="game-preview">
      <div className="game-preview-container">
        {/* Header */}
        <div className="game-preview-header">
          <button className="back-to-editor-btn" onClick={handleBackToEditor}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="game-preview-title">{projectName}</h1>
          <div className="game-preview-controls">
            <span className={`game-status ${gameStarted ? (gamePaused ? 'paused' : 'playing') : 'ready'}`}>
              {gameStarted ? (gamePaused ? '⏸ Paused' : '▶ Playing') : '⏹ Ready'}
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div className="game-preview-canvas-wrapper">
          <canvas ref={canvasRef} className="game-preview-canvas" />

          {/* Notifications */}
          {notifications.length > 0 && (
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 40 }}>
              {notifications.map(n => (
                <div key={n.id} style={{
                  padding: '8px 14px', marginBottom: 4, borderRadius: 8,
                  background: n.type === 'loot' ? 'rgba(34,197,94,0.9)' : n.type === 'quest' ? 'rgba(59,130,246,0.9)' : 'rgba(100,116,139,0.9)',
                  color: '#fff', fontSize: 13, fontWeight: 500, minWidth: 180,
                }}>{n.icon} {n.message}</div>
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
      </div>
    </div>
  );
};

/* ─── Page wrapper ─── */
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
