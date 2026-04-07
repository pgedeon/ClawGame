/**
 * @clawgame/web - Game Preview Page
 */

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showHitboxes, setShowHitboxes] = useState(false);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fpsUpdateInterval, setFpsUpdateInterval] = useState<number | null>(null);

  useEffect(() => {
    loadProject();
    
    // Handle fullscreen change events
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (fpsUpdateInterval) clearInterval(fpsUpdateInterval);
      stopGame();
      exitFullscreen();
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

  const toggleFullscreen = () => {
    if (!canvasWrapperRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      canvasWrapperRef.current.requestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
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
      playerCtx.fillStyle = 'rgba(255,255,255,0.2)';
      playerCtx.fillRect(0, 0, 32, 8);
      // Add border
      playerCtx.strokeStyle = 'rgba(255,255,255,0.3)';
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
      enemyCtx.strokeStyle = 'rgba(255,255,255,0.3)';
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
    // MARK this entity as player-controlled so MovementSystem applies keyboard input
    playerComponents.set('playerInput', true);

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

      // Setup FPS counter from engine
      if (fpsUpdateInterval) clearInterval(fpsUpdateInterval);
      const interval = window.setInterval(() => {
        setFps(engine.getFPS());
      }, 100);
      setFpsUpdateInterval(interval);

      engineRef.current = engine;
      setIsPlaying(true);
      setError(null);

      // Focus canvas wrapper for keyboard events
      if (canvasWrapperRef.current) {
        canvasWrapperRef.current.focus();
      }

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
    if (fpsUpdateInterval) {
      clearInterval(fpsUpdateInterval);
      setFpsUpdateInterval(null);
    }
    setIsPlaying(false);
    setFps(0);
    exitFullscreen();
  };

  const resetGame = () => {
    stopGame();
    setTimeout(() => startGame(), 100);
  };

  const handleDebugToggle = (type: 'grid' | 'hitboxes', checked: boolean) => {
    setShowGrid(type === 'grid' ? checked : showGrid);
    setShowHitboxes(type === 'hitboxes' ? checked : showHitboxes);

    // Update engine config if running
    if (engineRef.current && isPlaying) {
      engineRef.current.setConfig({
        showGrid,
        showHitboxes
      });
    }
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
              <button 
                className="control-btn fullscreen-btn" 
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
              >
                {isFullscreen ? "⛶" : "⛶"}
              </button>
            </>
          )}

          <div className="game-stats">
            <div className="stat-item">
              <span className="stat-label">FPS:</span>
              <span className={`stat-value ${fps > 50 ? 'success' : fps > 30 ? '' : 'error'}`}>
                {fps}
              </span>
            </div>
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
          className={`canvas-wrapper ${isFullscreen ? 'fullscreen' : ''} ${isPlaying ? 'focused' : ''}`}
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
            style={{ 
              width: '100%',
              height: 'auto',
              maxWidth: '800px',
              maxHeight: '600px',
              objectFit: 'contain'
            }}
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

          {isFullscreen && (
            <div className="fullscreen-exit-hint">
              ⛶ Press <kbd>Esc</kbd> to exit fullscreen
            </div>
          )}
        </div>

        <div className="debug-panel">
          <div className="debug-panel-header">
            <h3>🐛 Debug Panel</h3>
          </div>

          <div className="debug-options">
            <label className="debug-option">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => handleDebugToggle('grid', e.target.checked)}
              />
              Show Grid
            </label>
            <label className="debug-option">
              <input
                type="checkbox"
                checked={showHitboxes}
                onChange={(e) => handleDebugToggle('hitboxes', e.target.checked)}
              />
              Show Hitboxes
            </label>
          </div>

          <div className="debug-info">
            <h4>Game State</h4>
            <div className="debug-info-section">
              <div className="debug-info-label">Status</div>
              <div className="debug-info-value">
                {isPlaying ? 'Playing' : 'Stopped'}
              </div>
            </div>
            <div className="debug-info-section">
              <div className="debug-info-label">Resolution</div>
              <div className="debug-info-value">800 × 600</div>
            </div>
            <div className="debug-info-section">
              <div className="debug-info-label">Renderer</div>
              <div className="debug-info-value">Canvas 2D</div>
            </div>
          </div>

          <div className="debug-info">
            <h4>Controls</h4>
            <div className="debug-info-section">
              <div className="debug-info-label">Movement</div>
              <div className="debug-info-value">
                <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
              </div>
            </div>
            <div className="debug-info-section">
              <div className="debug-info-label">Fullscreen</div>
              <div className="debug-info-value">Click button or <kbd>Esc</kbd> to exit</div>
            </div>
          </div>

          <div className="debug-info">
            <h4>Scene Entities ({4})</h4>
            <div className="debug-entity">
              <div className="debug-entity-header">
                <span className="debug-entity-name">player-1</span>
                <span className="debug-entity-type">Player</span>
              </div>
              <div className="debug-entity-props">
                pos: <span>(200, 150)</span><br/>
                speed: <span>200</span>
              </div>
            </div>
            <div className="debug-entity">
              <div className="debug-entity-header">
                <span className="debug-entity-name">enemy-1</span>
                <span className="debug-entity-type">Enemy</span>
              </div>
              <div className="debug-entity-props">
                pos: <span>(400, 150)</span><br/>
                type: <span>patrol</span>
              </div>
            </div>
            <div className="debug-entity">
              <div className="debug-entity-header">
                <span className="debug-entity-name">coin-1</span>
                <span className="debug-entity-type">Collectible</span>
              </div>
              <div className="debug-entity-props">
                pos: <span>(300, 200)</span>
              </div>
            </div>
            <div className="debug-entity">
              <div className="debug-entity-header">
                <span className="debug-entity-name">coin-2</span>
                <span className="debug-entity-type">Collectible</span>
              </div>
              <div className="debug-entity-props">
                pos: <span>(500, 200)</span>
              </div>
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