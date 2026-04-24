/**
 * @clawgame/web - Animations Editor Panel
 * Create and preview sprite animations.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  AnimationsConfig,
  AnimationDefinition,
  createDefaultAnimationsConfig,
  createAnimation,
  addAnimation,
  removeAnimation,
  updateAnimation,
} from '@clawgame/engine';
import { Plus, Trash2, Play, Pause, X, ChevronRight } from 'lucide-react';

interface AnimationsPanelProps {
  config: AnimationsConfig;
  onConfigChange: (config: AnimationsConfig) => void;
  availableFrames?: string[];
}

export function AnimationsPanel({ config, onConfigChange, availableFrames = [] }: AnimationsPanelProps) {
  const [selectedAnim, setSelectedAnim] = useState<string | null>(null);
  const [newAnimKey, setNewAnimKey] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const handleCreateAnim = useCallback(() => {
    if (!newAnimKey.trim()) return;
    const key = newAnimKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (config.animations.some((a) => a.key === key)) return;
    const anim = createAnimation(key, selectedFrames.length > 0 ? selectedFrames : [key + '-0']);
    onConfigChange(addAnimation(config, anim));
    setSelectedAnim(key);
    setNewAnimKey('');
  }, [newAnimKey, selectedFrames, config, onConfigChange]);

  const handleDeleteAnim = useCallback(
    (key: string) => {
      onConfigChange(removeAnimation(config, key));
      if (selectedAnim === key) setSelectedAnim(null);
    },
    [config, selectedAnim, onConfigChange],
  );

  const handleUpdateAnim = useCallback(
    (patch: Partial<AnimationDefinition>) => {
      if (!selectedAnim) return;
      onConfigChange(updateAnimation(config, selectedAnim, patch));
    },
    [config, selectedAnim, onConfigChange],
  );

  const handleToggleFrame = useCallback((frame: string) => {
    setSelectedFrames((prev) => (prev.includes(frame) ? prev.filter((f) => f !== frame) : [...prev, frame]));
  }, []);

  const handleAutoSequence = useCallback(() => {
    if (availableFrames.length > 0) {
      setSelectedFrames([...availableFrames]);
    }
  }, [availableFrames]);

  const currentAnim = config.animations.find((a) => a.key === selectedAnim);

  return (
    <div className="animations-panel">
      <div className="panel-header">
        <h3>Animations ({config.animations.length})</h3>
      </div>

      {/* Animation list */}
      <div className="anim-list">
        {config.animations.map((anim) => (
          <div
            key={anim.key}
            className={`anim-item ${selectedAnim === anim.key ? 'selected' : ''}`}
            onClick={() => setSelectedAnim(anim.key)}
          >
            <ChevronRight size={14} className="anim-chevron" />
            <span className="anim-key">{anim.key}</span>
            <span className="anim-meta">
              {anim.frames.length} frames · {anim.frameRate}fps
            </span>
            <button
              className="icon-btn danger"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAnim(anim.key);
              }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {config.animations.length === 0 && <div className="empty-state">No animations yet.</div>}
      </div>

      {/* Create new */}
      <div className="anim-create">
        <input
          placeholder="Animation key"
          value={newAnimKey}
          onChange={(e) => setNewAnimKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateAnim()}
        />
        <button className="small-action-btn" onClick={handleCreateAnim} disabled={!newAnimKey.trim()}>
          <Plus size={14} /> Create
        </button>
      </div>

      {/* Selected animation editor */}
      {currentAnim && (
        <div className="anim-editor">
          <h4>{currentAnim.key}</h4>

          <div className="property-row">
            <label>Frame Rate</label>
            <input
              type="number"
              value={currentAnim.frameRate}
              min={1}
              max={120}
              onChange={(e) => handleUpdateAnim({ frameRate: Number(e.target.value) })}
            />
          </div>
          <div className="property-row">
            <label>Repeat</label>
            <input
              type="number"
              value={currentAnim.repeat}
              min={-1}
              onChange={(e) => handleUpdateAnim({ repeat: Number(e.target.value) })}
            />
            <span className="hint">-1 = infinite</span>
          </div>
          <div className="property-row">
            <label>Delay (ms)</label>
            <input
              type="number"
              value={currentAnim.delay}
              min={0}
              onChange={(e) => handleUpdateAnim({ delay: Number(e.target.value) })}
            />
          </div>
          <div className="property-row">
            <label>Time Scale</label>
            <input
              type="number"
              value={currentAnim.timeScale}
              min={0.1}
              max={10}
              step={0.1}
              onChange={(e) => handleUpdateAnim({ timeScale: Number(e.target.value) })}
            />
          </div>
          <div className="property-row">
            <label>Yoyo</label>
            <input
              type="checkbox"
              checked={currentAnim.yoyo}
              onChange={(e) => handleUpdateAnim({ yoyo: e.target.checked })}
            />
          </div>

          {/* Frame browser */}
          <div className="frame-browser">
            <div className="frame-browser-header">
              <span>Frames ({currentAnim.frames.length})</span>
              <button className="small-action-btn" onClick={handleAutoSequence}>
                Auto-select all
              </button>
            </div>
            <div className="frame-list">
              {currentAnim.frames.map((frame, i) => (
                <div key={i} className="frame-item">
                  <span>{frame.key}</span>
                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      handleUpdateAnim({
                        frames: currentAnim.frames.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            {availableFrames.length > 0 && (
              <div className="available-frames">
                <span>Available frames:</span>
                {availableFrames.map((f) => (
                  <button
                    key={f}
                    className={`frame-chip ${selectedFrames.includes(f) ? 'selected' : ''}`}
                    onClick={() => handleToggleFrame(f)}
                  >
                    {f}
                  </button>
                ))}
                {selectedFrames.length > 0 && (
                  <button
                    className="small-action-btn"
                    onClick={() => {
                      const newFrames = [
                        ...currentAnim.frames,
                        ...selectedFrames.filter(
                          (f) => !currentAnim.frames.some((cf) => cf.key === f),
                        ).map((f) => ({ key: f })),
                      ];
                      handleUpdateAnim({ frames: newFrames });
                      setSelectedFrames([]);
                    }}
                  >
                    Add selected
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="anim-preview">
            <div className="preview-controls">
              <button
                className={`icon-btn ${isPreviewPlaying ? 'active' : ''}`}
                onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                title={isPreviewPlaying ? 'Pause' : 'Play'}
              >
                {isPreviewPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <span>Preview</span>
            </div>
            <canvas ref={previewRef} width={128} height={128} className="preview-canvas" />
          </div>
        </div>
      )}
    </div>
  );
}
