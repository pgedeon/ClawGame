import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Engine } from '@clawgame/engine';
import type { Scene, Entity, Layer } from '@clawgame/shared';
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
    const playerEntity: Entity = {
      id: 'player-1',
      name: 'Player',
      components: [
        { type: 'movement', data: { speed: 200 } },
        { type: 'sprite', data: { color: '#ff6b35', width: 32, height: 32 } }
      ],
      transform: { x: 200, y: 150, rotation: 0, scaleX: 1, scaleY: 1 }
    };

    const enemyEntity: Entity = {
      id: 'enemy-1',
      name: 'Enemy',
      components: [
        { type: 'ai', data: { pattern: 'patrol', range: 120 } },
        { type: 'sprite', data: { color: '#ff3366', width: 24, height: 24 } }
      ],
      transform: { x: 400, y: 150, rotation: 0, scaleX: 1, scaleY: 1 }
    };

    const coinEntity: Entity = {
      id: 'coin-1',
      name: 'Coin',
      components: [
        { type: 'collectible', data: { value: 10 } },
        { type: 'sprite', data: { color: '#ffcc00', width: 16, height: 16 } }
      ],
      transform: { x: 300, y: 200, rotation: 0, scaleX: 1, scaleY: 1 }
    };

    const coinEntity2: Entity = {
      id: 'coin-2',
      name: 'Coin',
      components: [
        { type: 'collectible', data: { value: 10 } },
        { type: 'sprite', data: { color: '#ffcc00', width: 16, height: 16 } }
      ],
      transform: { x: 500, y: 200, rotation: 0, scaleX: 1, scaleY: 1 }
    };

    const groundEntity: Entity = {
      id: 'ground-1',
      name: 'Ground',
      components: [
        { type: 'collider', data: { static: true } },
        { type: 'sprite', data: { color: '#4a9c6d', width: 800, height: 40 } }
      ],
      transform: { x: 400, y: 280, rotation: 0, scaleX: 1, scaleY: 1 }
    };

    const mainLayer: Layer = {
      id: 'layer-main',
      name: 'Main',
      visible: true,
      entityIds: ['player-1', 'enemy-1', 'coin-1', 'coin-2', 'ground-1']
    };

    return {
      id: 'scene-demo',
      name: 'Demo Scene',
      entities: [playerEntity, enemyEntity, coinEntity, coinEntity2, groundEntity],
      layers: [mainLayer]
    };
  };

  const startGame = () => {
    if (!canvasRef.current) return;
    
    try {
      const engine = new Engine();
      engine.attach(canvasRef.current);
      
      const demoScene = createDemoScene();
      engine.addScene(demoScene);
      engine.setActiveScene('scene-demo');
      engine.start();
      
      engineRef.current = engine;
      setIsPlaying(true);
      setError(null);
      
      // Focus canvas wrapper for keyboard events
      if (canvasWrapperRef.current) {
        canvasWrapperRef.current.focus();
      }
      
      // FPS counter
      let frameCount = 0;
      let lastTime = performance.now();
      const countFps = () => {
        if (!engineRef.current) return;
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastTime = now;
        }
        requestAnimationFrame(countFps);
      };
      countFps();
      
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
                <p>Click the Play button to start the game preview</p>
                <p className="hint">Use arrow keys or WASD to move the player</p>
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
              <span>5 (player, enemy, 2 coins, ground)</span>
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
              <label className="checkbox-label">
                <input type="checkbox" /> Show hitboxes
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> Show FPS graph
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> Show entity info
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
