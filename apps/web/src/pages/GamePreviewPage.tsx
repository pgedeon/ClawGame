/**
 * @clawgame/web - Game Preview Page
 * Loads and runs actual game content from project
 */

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectScene, setProjectScene] = useState<ProjectScene | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({ fps: 60, entities: 0, memory: '0MB' });

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

  // Initialize game loop - only depends on projectScene, NOT gameStats
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
    let lastTime = 0;

    // Input handling
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game update logic
    const update = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
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
        if (entity.components?.ai?.type === 'patrol') {
          const patrolSpeed = entity.components.ai.patrolSpeed || 50;
          const time = currentTime / 1000;
          
          // Simple back-and-forth patrol
          entity.transform.x = 400 + Math.sin(time * patrolSpeed / 100) * 200;
          entity.transform.y = 300 + Math.cos(time * patrolSpeed / 100) * 100;
        }

        // Rotation animation for coins
        if (entity.components?.collision?.type === 'collectible') {
          entity.transform.rotation += deltaTime * 0.002;
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
        }
      });

      // Update game stats - using ref to avoid re-render
      frameCount++;
      if (frameCount % 30 === 0) {
        const fps = Math.round(1000 / deltaTime);
        const memory = typeof (performance as any).memory === 'object' 
          ? `${((performance as any).memory.usedJSHeapSize || 0) / 1048576 | 0}MB`
          : 'N/A';
        
        // Update ref instead of state to prevent re-renders
        gameStatsRef.current = {
          fps,
          entities: entities.size,
          memory
        };
        
        // Only trigger state update every 30 frames (2x per second at 60fps)
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

      // Draw UI - use gameStatsRef for latest values
      const stats = gameStatsRef.current;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 80);
      
      ctx.fillStyle = 'white';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`FPS: ${stats.fps}`, 20, 30);
      ctx.fillText(`Entities: ${stats.entities}`, 20, 50);
      ctx.fillText(`Memory: ${stats.memory}`, 20, 70);

      // Draw controls
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width - 210, 10, 200, 100);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Controls:', canvas.width - 200, 30);
      ctx.fillText('WASD/Arrows: Move', canvas.width - 200, 50);
      ctx.fillText('ESC: Exit game', canvas.width - 200, 70);
      ctx.fillText(`Scene: ${projectScene.name}`, canvas.width - 200, 90);
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
  }, [projectScene]); // Only depend on projectScene, NOT gameStats

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
      <div className="game-preview-container">
        <div className="game-preview-canvas-container">
          <canvas ref={canvasRef} className="game-preview-canvas" />
          {!projectScene && (
            <div className="game-preview-placeholder">
              <p>No scene data available</p>
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
