import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Engine } from '@clawgame/engine';
import { Entity, Transform, Sprite, Movement, AI, Scene } from '@clawgame/engine';
import '../game-preview.css';

interface GamePreviewPageProps {
  projectId: string;
}

function GamePreviewContent({ projectId }: GamePreviewPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showHitboxes, setShowHitboxes] = useState(false);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
    return () => {
      stopGame();
    };
  }, [projectId]);

  const loadProject = async () => {
    try {
      const project = await api.getProject(projectId);
      setProjectName(project?.name || 'Unknown Project');
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const createDemoScene = (): Scene => {
    // Create a simple colored rectangle for player sprite
    const playerCanvas = document.createElement('canvas');
    playerCanvas.width = 32;
    playerCanvas.height = 32;
    const playerCtx = playerCanvas.getContext('2d');
    if (playerCtx) {
      playerCtx.fillStyle = '#ff6b35';
      playerCtx.fillRect(0, 0, 32, 32);
      // Add highlight
      playerCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      playerCtx.fillRect(0, 0, 32, 8);
      // Add border
      playerCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      playerCtx.lineWidth = 2;
      playerCtx.strokeRect(0, 0, 32, 32);
    }
    const playerImage = new Image();
    playerImage.src = playerCanvas.toDataURL();

    // Create enemy sprite
    const enemyCanvas = document.createElement('canvas');
    enemyCanvas.width = 24;
    enemyCanvas.height = 24;
    const enemyCtx = enemyCanvas.getContext('2d');
    if (enemyCtx) {
      enemyCtx.fillStyle = '#ff3366';
      enemyCtx.fillRect(0, 0, 24, 24);
      enemyCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      enemyCtx.lineWidth = 2;
      enemyCtx.strokeRect(0, 0, 24, 24);
    }
    const enemyImage = new Image();
    enemyImage.src = enemyCanvas.toDataURL();

    // Create coin sprite
    const coinCanvas = document.createElement('canvas');
    coinCanvas.width = 16;
    coinCanvas.height = 16;
    const coinCtx = coinCanvas.getContext('2d');
    if (coinCtx) {
      coinCtx.fillStyle = '#ffcc00';
      coinCtx.beginPath();
      coinCtx.arc(8, 8, 8, 0, Math.PI * 2);
      coinCtx.fill();
      coinCtx.strokeStyle = '#cc9900';
      coinCtx.lineWidth = 2;
      coinCtx.stroke();
    }
    const coinImage = new Image();
    coinImage.src = coinCanvas.toDataURL();

    // Create entities
    const playerTransform: Transform = { x: 200, y: 150 };
    const playerMovement: Movement = { vx: 0, vy: 0, speed: 200 };
    const playerSprite: Sprite = { image: playerImage, width: 32, height: 32 };

    const playerComponents = new Map();
    playerComponents.set('movement', playerMovement);
    playerComponents.set('sprite', playerSprite);

    const playerEntity: Entity = {
      id: 'player-1',
      transform: playerTransform,
      components: playerComponents
    };

    const enemyTransform: Transform = { x: 400, y: 150 };
    const enemyAI: AI = { type: 'patrol', patrolStart: { x: 400, y: 150 }, patrolEnd: { x: 500, y: 150 }, patrolSpeed: 30 };
    const enemyMovement: Movement = { vx: 0, vy: 0, speed: 50 };
    const enemySprite: Sprite = { image: enemyImage, width: 24, height: 24 };

    const enemyComponents = new Map();
    enemyComponents.set('ai', enemyAI);
    enemyComponents.set('movement', enemyMovement);
    enemyComponents.set('sprite', enemySprite);

    const enemyEntity: Entity = {
      id: 'enemy-1',
      transform: enemyTransform,
      components: enemyComponents
    };

    const coinTransform1: Transform = { x: 300, y: 200 };
    const coinSprite1: Sprite = { image: coinImage, width: 16, height: 16 };

    const coinComponents1 = new Map();
    coinComponents1.set('sprite', coinSprite1);

    const coinEntity1: Entity = {
      id: 'coin-1',
      transform: coinTransform1,
      components: coinComponents1
    };

    const coinTransform2: Transform = { x: 500, y: 200 };
    const coinComponents2 = new Map();
    coinComponents2.set('sprite', coinSprite1);

    const coinEntity2: Entity = {
      id: 'coin-2',
      transform: coinTransform2,
      components: coinComponents2
    };

    const entities = new Map();
    entities.set('player-1', playerEntity);
    entities.set('enemy-1', enemyEntity);
    entities.set('coin-1', coinEntity1);
    entities.set('coin-2', coinEntity2);

    return {
      name: 'Demo Scene',
      entities
    };
  };

  const startGame = () => {
    if (!canvasRef.current) return;

    try {
      const engine = new Engine(canvasRef.current, {
        width: 800,
        height: 600,
        showGrid,
        showHitboxes,
        showFPS: true,
        backgroundColor: '#f9fafb'
      });

      const demoScene = createDemoScene();
      engine.loadScene(demoScene);
      engine.start();

      engineRef.current = engine;
      setIsPlaying(true);
      setError(null);

      // Focus canvas wrapper for keyboard events
      if (canvasWrapperRef.current) {
        canvasWrapperRef.current.focus();
      }

      // FPS counter from engine
      const fpsInterval = setInterval(() => {
        // FPS is shown in debug panel
      }, 1000);

      return () => clearInterval(fpsInterval);

    } catch (err) {
      console.error('Failed to start game:', err);
      setError('Failed to start game engine');
    }
  };

  const stopGame = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setIsPlaying(false);
    setFps(0);
  };

  const resetGame = () => {
    stopGame();
    setTimeout(() => startGame(), 100);
  };

  if (isLoading) {
    return (
      <div className="game-preview-page">
        <div className="loading">Loading game preview...</div>
      </div>
    );
  }

  return (
    <div className="game-preview-page">
      <header className="page-header">
        <div className="project-info">
          <h1>🎮 Game Preview</h1>
          <p>Project: <span className="project-name">{projectName}</span></p>
        </div>

        <div className="game-controls">
          {!isPlaying ? (
            <button className="control-btn play" onClick={startGame}>
              ▶️ Play
            </button>
          ) : (
            <>
              <button className="control-btn stop" onClick={stopGame}>
                ⏹️ Stop
              </button>
              <button className="control-btn reset" onClick={resetGame}>
                🔄 Reset
              </button>
            </>
          )}

          <div className="game-stats">
            {fps > 0 && <span className="fps-counter">FPS: {fps}</span>}
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      <div className="game-container">
        <div
          className="canvas-wrapper"
          ref={canvasWrapperRef}
          tabIndex={0}
          onClick={() => canvasWrapperRef.current?.focus()}
          style={{ outline: 'none' }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="game-canvas"
          />

          {!isPlaying && (
            <div className="canvas-overlay">
              <div className="overlay-content">
                <h2>🚀 Ready to Play</h2>
                <p>Click Play button to start game preview</p>
                <p className="hint">Use arrow keys or WASD to move player</p>
                <p className="hint">The canvas will capture keyboard input when playing</p>
              </div>
            </div>
          )}

          {isPlaying && (
            <div className="playing-hint">
              Click here and use arrow keys / WASD to move
            </div>
          )}
        </div>

        <div className="game-sidebar">
          <div className="panel">
            <h3>📋 Game Info</h3>
            <div className="info-item">
              <span>Status:</span>
              <span className={isPlaying ? 'status-playing' : 'status-stopped'}>
                {isPlaying ? 'Playing' : 'Stopped'}
              </span>
            </div>
            <div className="info-item">
              <span>Canvas:</span>
              <span>800 × 600</span>
            </div>
            <div className="info-item">
              <span>Renderer:</span>
              <span>Canvas 2D</span>
            </div>
            <div className="info-item">
              <span>Entities:</span>
              <span>4 (player, enemy, 2 coins)</span>
            </div>
          </div>

          <div className="panel">
            <h3>🎯 Controls</h3>
            <div className="controls-list">
              <div className="control-item">
                <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>
                <span>Move player</span>
              </div>
              <div className="control-item">
                <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
                <span>Move player</span>
              </div>
              <div className="control-item">
                <kbd>Space</kbd>
                <span>Action (coming soon)</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>🐛 Debug</h3>
            <div className="debug-options">
              <label className="debug-option">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => {
                    setShowGrid(e.target.checked);
                    if (engineRef.current) {
                      engineRef.current.destroy();
                      startGame();
                    }
                  }}
                />
                Show grid
              </label>
              <label className="debug-option">
                <input
                  type="checkbox"
                  checked={showHitboxes}
                  onChange={(e) => {
                    setShowHitboxes(e.target.checked);
                    if (engineRef.current) {
                      engineRef.current.destroy();
                      startGame();
                    }
                  }}
                />
                Show hitboxes
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GamePreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="game-preview-page">
        <div className="error-state">
          <div className="error-icon">🎮</div>
          <h3>No Project Selected</h3>
          <p>Please open a project first to preview the game.</p>
        </div>
      </div>
    );
  }

  return <GamePreviewContent projectId={projectId} />;
}
