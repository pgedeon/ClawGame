/**
 * @clawgame/web - Game Preview Page
 * Loads and runs actual game content from project with enhanced UX
 */

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Play, X, Zap, Code, ArrowLeft } from 'lucide-react';
import '../game-preview.css';
import { logger } from '../utils/logger';

interface ProjectScene {
  name: string;
  entities: Array<{
    id: string;
    transform: {
      x: number;
      y: number;
      scaleX: number;
      scaleY: number;
      rotation: number;
    };
    components: Record<string, any>;
  }>;
}

interface GameStats {
  fps: number;
  entities: number;
  memory: string;
}

const GamePreviewContent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStatsRef = useRef<GameStats>({ fps: 60, entities: 0, memory: '0MB' });
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectScene, setProjectScene] = useState<ProjectScene | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({ fps: 60, entities: 0, memory: '0MB' });
  const [gameStarted, setGameStarted] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);

  // Load project scene
  useEffect(() => {
    if (!projectId) return;

    const loadProjectScene = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load project
        const project = await api.getProject(projectId);
        
        // Try to load existing scene or create default
        try {
          const sceneData = await api.readFile(projectId, 'scenes/main-scene.json');
          const parsedScene: ProjectScene = JSON.parse(sceneData.content);
          
          // Validate and fix scene structure
          const validatedScene: ProjectScene = {
            name: parsedScene.name || 'Main Scene',
            entities: parsedScene.entities || [],
          };
          
          setProjectScene(validatedScene);
        } catch (sceneErr) {
          // No scene exists, create default
          const defaultScene: ProjectScene = {
            name: 'Main Scene',
            entities: [
              {
                id: 'player-1',
                transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  playerInput: true,
                  movement: { vx: 0, vy: 0, speed: 200 },
                  sprite: { width: 32, height: 32, color: '#3b82f6' }
                }
              },
              {
                id: 'enemy-1', 
                transform: { x: 600, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  ai: { type: 'patrol', speed: 50 },
                  movement: { vx: 0, vy: 0, speed: 50 },
                  sprite: { width: 32, height: 32, color: '#ef4444' }
                }
              },
              {
                id: 'coin-1',
                transform: { x: 500, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  collision: { width: 16, height: 16, type: 'collectible' },
                  sprite: { width: 16, height: 16, color: '#fbbf24' }
                }
              },
              {
                id: 'coin-2',
                transform: { x: 300, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
                components: {
                  collision: { width: 16, height: 16, type: 'collectible' },
                  sprite: { width: 16, height: 16, color: '#fbbf24' }
                }
              }
            ]
          };
          
          setProjectScene(defaultScene);
        }
      } catch (err) {
        logger.error('Failed to load project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProjectScene();
  }, [projectId]);

  // Initialize game loop
  useEffect(() => {
    if (!canvasRef.current || !projectScene) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Simple game engine
    const entities = new Map(
      projectScene.entities.map(entity => [entity.id, {
        ...entity,
        vx: 0,
        vy: 0,
        color: entity.components.sprite?.color || '#8b5cf6',
        width: entity.components.sprite?.width || 32,
        height: entity.components.sprite?.height || 32,
      }])
    );

    const keys: Record<string, boolean> = {};
    let frameCount = 0;
    let lastTime = performance.now();
    let score = 0;

    // Input handling
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      
      // ESC to pause/exit
      if (e.key === 'Escape') {
        if (gameStarted && !gamePaused) {
          setGamePaused(true);
        } else if (gamePaused) {
          setGamePaused(false);
          lastTime = performance.now();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game update logic
    const update = () => {
      if (!gameStarted || gamePaused) return;

      const currentTime = performance.now();
      const deltaTime = Math.min(currentTime - lastTime, 50); // Cap delta time
      lastTime = currentTime;

      // Update entities with AI/movement logic
      entities.forEach((entity, id) => {
        // Player movement
        if (entity.components?.playerInput) {
          const speed = entity.components.movement?.speed || 200;
          entity.vx = 0;
          entity.vy = 0;

          if (keys['arrowleft'] || keys['a']) entity.vx = -speed;
          if (keys['arrowright'] || keys['d']) entity.vx = speed;
          if (keys['arrowup'] || keys['w']) entity.vy = -speed;
          if (keys['arrowdown'] || keys['s']) entity.vy = speed;

          // Update position
          entity.transform.x += entity.vx * (deltaTime / 1000);
          entity.transform.y += entity.vy * (deltaTime / 1000);

          // Keep player in bounds
          const margin = entity.width / 2;
          entity.transform.x = Math.max(margin, Math.min(canvas.width - margin, entity.transform.x));
          entity.transform.y = Math.max(margin, Math.min(canvas.height - margin, entity.transform.y));
        }

        // Simple AI patrol for enemies
        if (entity.components?.ai?.type === 'patrol' && gameStarted) {
          const patrolSpeed = entity.components.ai.patrolSpeed || 50;
          const time = currentTime / 1000;
          
          // Simple back-and-forth patrol
          entity.transform.x = 400 + Math.sin(time * patrolSpeed / 100) * 200;
          entity.transform.y = 300 + Math.cos(time * patrolSpeed / 100) * 100;
        }

        // Rotation animation for coins
        if (entity.components?.collision?.type === 'collectible' && gameStarted) {
          entity.transform.rotation += deltaTime * 0.003;
        }
      });

      // Check collisions
      const player = entities.get('player-1');
      const collectibles = Array.from(entities.values()).filter(e => 
        e.components?.collision?.type === 'collectible'
      );

      collectibles.forEach(coin => {
        const dx = player!.transform.x - coin.transform.x;
        const dy = player!.transform.y - coin.transform.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (player!.width + coin.width) / 2) {
          // Collect coin - remove from game
          entities.delete(coin.id);
          score += 10;
        }
      });

      // Update game stats
      frameCount++;
      if (frameCount % 30 === 0) {
        const fps = Math.round(1000 / deltaTime);
        const memory = typeof (performance as any).memory === 'object' 
          ? `${((performance as any).memory.usedJSHeapSize || 0) / 1048576 | 0}MB`
          : 'N/A';
        
        gameStatsRef.current = {
          fps,
          entities: entities.size,
          memory
        };
        
        setGameStats(prev => ({
          ...prev,
          fps,
          entities: entities.size,
          memory
        }));
      }
    };

    // Render function
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
      ctx.lineWidth = 1;
      const gridSize = 32;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw entities
      entities.forEach((entity, id) => {
        const { x, y, scaleX, scaleY, rotation } = entity.transform;
        const width = entity.width;
        const height = entity.height;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.scale(scaleX, scaleY);

        // Draw entity
        ctx.fillStyle = entity.color;
        ctx.fillRect(-width/2, -height/2, width, height);

        // Add border for player
        if (entity.components?.playerInput) {
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 2;
          ctx.strokeRect(-width/2, -height/2, width, height);
        }

        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(id.split('-')[0], 0, 4);

        ctx.restore();
      });

      // Draw UI
      const stats = gameStatsRef.current;
      
      // Stats panel
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 100);
      
      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 30);
      ctx.fillText(`FPS: ${stats.fps}`, 20, 50);
      ctx.fillText(`Entities: ${stats.entities}`, 20, 70);
      ctx.fillText(`Memory: ${stats.memory}`, 20, 90);

      // Controls panel
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width - 210, 10, 200, 120);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Controls:', canvas.width - 200, 30);
      ctx.fillText('WASD/Arrows: Move', canvas.width - 200, 50);
      ctx.fillText('ESC: Pause Game', canvas.width - 200, 70);
      ctx.fillText(`Scene: ${projectScene?.name || "Game Preview"}`, canvas.width - 200, 90);
      ctx.fillText(gameStarted ? 'Status: Running' : 'Status: Paused', canvas.width - 200, 110);
    };

    // Game loop
    const gameLoop = () => {
      update();
      render();
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    // Start game loop
    gameLoop();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [projectScene, gameStarted, gamePaused]);

  const handleStartGame = () => {
    setGameStarted(true);
    setGamePaused(false);
  };

  const handleBackToEditor = () => {
    navigate(`/project/${projectId}`);
  };

  const handlePauseResume = () => {
    setGamePaused(!gamePaused);
  };

  if (loading) {
    return (
      <div className="game-preview">
        <div className="game-preview-loading">
          <div className="game-preview-spinner" />
          <p>Loading game...</p>
          <p className="game-preview-subtitle">Loading project data and initializing game engine</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-preview">
        <div className="game-preview-error">
          <div className="game-preview-error-icon">⚠️</div>
          <h3>Failed to Load Game</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-preview">
      {/* Header */}
      <div className="game-preview-header">
        <button 
          className="header-btn"
          onClick={handleBackToEditor}
          title="Back to editor"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="header-title">
          <span className="game-title">{projectScene?.name || "Game Preview"}</span>
          {!gameStarted && <span className="status-badge ready">Ready</span>}
          {gameStarted && !gamePaused && <span className="status-badge running">Playing</span>}
          {gamePaused && <span className="status-badge paused">Paused</span>}
        </div>
        {gameStarted && (
          <button 
            className="header-btn"
            onClick={handlePauseResume}
            title={gamePaused ? 'Resume' : 'Pause'}
          >
            {gamePaused ? <Play size={16} /> : <Zap size={16} />}
            {gamePaused ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>

      <div className="game-preview-container">
        <div className="game-preview-canvas-container">
          <canvas ref={canvasRef} className="game-preview-canvas" />
          
          {!gameStarted && (
            <div className="game-preview-start-screen">
              <div className="start-screen-content">
                <div className="start-screen-icon">🎮</div>
                <h2>Ready to Play</h2>
                <p>Use WASD or Arrow Keys to move</p>
                <p>Collect coins to increase your score</p>
                <button 
                  className="start-game-btn"
                  onClick={handleStartGame}
                >
                  <Play size={20} />
                  Start Game
                </button>
              </div>
            </div>
          )}
          
          {gamePaused && (
            <div className="game-preview-pause-overlay">
              <div className="pause-screen-content">
                <div className="pause-screen-icon">⏸️</div>
                <h2>Game Paused</h2>
                <p>Press ESC or click Resume to continue</p>
                <button 
                  className="resume-game-btn"
                  onClick={handlePauseResume}
                >
                  <Play size={20} />
                  Resume Game
                </button>
              </div>
            </div>
          )}
          
          {!projectScene && (
            <div className="game-preview-placeholder">
              <p>No scene data available</p>
              <button 
                className="action-btn"
                onClick={handleBackToEditor}
              >
                <Code size={16} />
                Create Scene
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
