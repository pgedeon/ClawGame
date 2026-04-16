import React from 'react';
import { DungeonMinimap } from './game/DungeonMinimap';
import {
  TOWER_CONFIGS,
  TOWER_DISPLAY,
  TOWER_TYPE_ORDER,
  type TowerDefenseOverlayState,
  type TowerType,
} from '../utils/previewTowerDefense';

interface PreviewCanvasProps {
  runtimeHostRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  towerDefenseOverlay: TowerDefenseOverlayState;
  playerMana: number;
  showTowerDefenseUi: boolean;
  onSelectTowerType: (towerType: TowerType) => void;
  minimapData?: { playerX: number; playerY: number; entities: any[] };
  runtimeKind: string;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  runtimeHostRef,
  canvasRef,
  towerDefenseOverlay,
  playerMana,
  showTowerDefenseUi,
  onSelectTowerType,
  minimapData,
  runtimeKind,
}) => {
  return (
    <div ref={runtimeHostRef} className="game-preview-runtime-host">
      {/* Legacy canvas runtime needs explicit canvas element */}
      {runtimeKind === 'legacy-canvas' && (
        <canvas ref={canvasRef} className="game-preview-canvas" />
      )}

      {minimapData && minimapData.playerX !== 0 && (
        <DungeonMinimap
          playerX={minimapData.playerX}
          playerY={minimapData.playerY}
          entities={minimapData.entities}
          worldWidth={800}
          worldHeight={600}
        />
      )}

      {showTowerDefenseUi && towerDefenseOverlay?.enabled && (
        <div className="td-selection-overlay">
          {towerDefenseOverlay.feedback && (
            <div className={`td-placement-feedback td-placement-feedback-${towerDefenseOverlay.feedback.kind}`}>
              {towerDefenseOverlay.feedback.message}
            </div>
          )}

          <div className="td-selection-bar" role="toolbar" aria-label="Tower selection bar">
            {TOWER_TYPE_ORDER.map((towerType) => {
              const config = TOWER_CONFIGS[towerType];
              const display = TOWER_DISPLAY[towerType];
              const isSelected = towerDefenseOverlay.selectedTowerType === towerType;
              const canAfford = playerMana >= config.cost;

              return (
                <button
                  key={towerType}
                  type="button"
                  className={`td-selection-button ${isSelected ? 'selected' : ''} ${canAfford ? '' : 'locked'}`.trim()}
                  onClick={() => onSelectTowerType(towerType)}
                  aria-pressed={isSelected}
                  title={`${display.name} Tower — ${config.cost} mana`}
                >
                  <span className="td-selection-icon" aria-hidden="true">{display.icon}</span>
                  <span className="td-selection-copy">
                    <span className="td-selection-name">{display.name}</span>
                    <span className="td-selection-cost">{config.cost} mana</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="td-selection-hint">Click to place • 1-4 select • WASD + T for keyboard placement</div>
        </div>
      )}
    </div>
  );
};
