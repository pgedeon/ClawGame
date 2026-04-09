/**
 * @clawgame/web - Animation Preview
 * Plays sliced sprite frames as an animation in a canvas.
 * M10: Sprite Analyzer deliverable
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

interface AnimationPreviewProps {
  /** URLs or data URIs of frame images */
  frames: string[];
  /** Frame dimensions */
  width: number;
  height: number;
  /** Default FPS */
  defaultFps?: number;
}

export function AnimationPreview({
  frames,
  width,
  height,
  defaultFps = 8,
}: AnimationPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [fps, setFps] = useState(defaultFps);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  // Preload images
  useEffect(() => {
    const imgs = frames.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });
    imagesRef.current = imgs;
  }, [frames]);

  // Draw current frame
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false; // Pixel-perfect for sprites
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const interval = 1000 / fps;

    const tick = (timestamp: number) => {
      if (timestamp - lastTimeRef.current >= interval) {
        lastTimeRef.current = timestamp;
        setCurrentFrame(prev => {
          const next = (prev + 1) % frames.length;
          drawFrame(next);
          return next;
        });
      }
      animRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, fps, frames.length, drawFrame]);

  // Draw on frame change (when paused)
  useEffect(() => {
    if (!isPlaying) {
      drawFrame(currentFrame);
    }
  }, [currentFrame, isPlaying, drawFrame]);

  const handleReset = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
    drawFrame(0);
  };

  if (frames.length === 0) {
    return (
      <div className="anim-preview-empty">
        <p>No frames to preview</p>
      </div>
    );
  }

  return (
    <div className="anim-preview">
      <div className="anim-preview-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="anim-preview-canvas"
        />
        <span className="anim-frame-counter">
          {currentFrame + 1} / {frames.length}
        </span>
      </div>

      <div className="anim-controls">
        <button onClick={handleReset} title="Reset">
          <RotateCcw size={14} />
        </button>
        <button onClick={() => setCurrentFrame(f => Math.max(0, f - 1))} title="Previous frame">
          <SkipBack size={14} />
        </button>
        <button
          className="anim-play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button onClick={() => setCurrentFrame(f => Math.min(frames.length - 1, f + 1))} title="Next frame">
          <SkipForward size={14} />
        </button>
      </div>

      <div className="anim-fps-control">
        <label>FPS</label>
        <input
          type="range"
          min={1}
          max={60}
          value={fps}
          onChange={e => setFps(+e.target.value)}
        />
        <span>{fps}</span>
      </div>

      {/* Frame strip */}
      <div className="anim-frame-strip">
        {frames.map((src, i) => (
          <button
            key={i}
            className={`anim-frame-thumb ${i === currentFrame ? 'active' : ''}`}
            onClick={() => { setCurrentFrame(i); setIsPlaying(false); }}
          >
            <img src={src} alt={`Frame ${i}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
