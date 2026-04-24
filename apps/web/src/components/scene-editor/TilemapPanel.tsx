/**
 * @clawgame/web - Tilemap Editor Panel
 * Basic tilemap layer management and tile painting UI.
 */

import React, { useState, useCallback } from 'react';
import {
  TilemapData,
  TileLayer,
  createDefaultTilemap,
  addTileLayer,
  removeTileLayer,
  setTile,
  fillRect,
} from '@clawgame/engine';
import { Plus, Trash2, Eye, EyeOff, Lock, Unlock, Paintbrush, Square, Eraser } from 'lucide-react';

interface TilemapPanelProps {
  tilemap: TilemapData;
  onTilemapChange: (map: TilemapData) => void;
  selectedTile: number;
  onSelectTile: (gid: number) => void;
  onPaintTile?: (layerId: string, col: number, row: number, gid: number) => void;
}

type PaintTool = 'paint' | 'fill' | 'erase';

export function TilemapPanel({
  tilemap,
  onTilemapChange,
  selectedTile,
  onSelectTile,
  onPaintTile,
}: TilemapPanelProps) {
  const [activeLayerId, setActiveLayerId] = useState(tilemap.layers[0]?.id ?? '');
  const [paintTool, setPaintTool] = useState<PaintTool>('paint');

  const activeLayer = tilemap.layers.find((l) => l.id === activeLayerId);

  const handleToggleVisibility = useCallback(
    (layerId: string) => {
      onTilemapChange({
        ...tilemap,
        layers: tilemap.layers.map((l) =>
          l.id === layerId ? { ...l, visible: !l.visible } : l,
        ),
      });
    },
    [tilemap, onTilemapChange],
  );

  const handleToggleLock = useCallback(
    (layerId: string) => {
      onTilemapChange({
        ...tilemap,
        layers: tilemap.layers.map((l) =>
          l.id === layerId ? { ...l, locked: !l.locked } : l,
        ),
      });
    },
    [tilemap, onTilemapChange],
  );

  const handleAddLayer = useCallback(() => {
    const name = `Layer ${tilemap.layers.length + 1}`;
    const next = addTileLayer(tilemap, name);
    onTilemapChange(next);
    setActiveLayerId(`layer-${next.layers.length}`);
  }, [tilemap, onTilemapChange]);

  const handleRemoveLayer = useCallback(
    (layerId: string) => {
      if (tilemap.layers.length <= 1) return;
      const next = removeTileLayer(tilemap, layerId);
      onTilemapChange(next);
      if (activeLayerId === layerId) setActiveLayerId(next.layers[0].id);
    },
    [tilemap, activeLayerId, onTilemapChange],
  );

  const handleCellClick = useCallback(
    (col: number, row: number) => {
      if (!activeLayerId || !activeLayer || activeLayer.locked) return;
      if (paintTool === 'paint') {
        const next = setTile(tilemap, activeLayerId, col, row, selectedTile);
        onTilemapChange(next);
      } else if (paintTool === 'erase') {
        const next = setTile(tilemap, activeLayerId, col, row, -1);
        onTilemapChange(next);
      } else if (paintTool === 'fill') {
        const next = fillRect(tilemap, activeLayerId, col, row, 1, 1, selectedTile);
        onTilemapChange(next);
      }
    },
    [activeLayerId, activeLayer, paintTool, selectedTile, tilemap, onTilemapChange],
  );

  return (
    <div className="tilemap-panel">
      <div className="panel-header">
        <h3>Tilemap ({tilemap.width}×{tilemap.height})</h3>
      </div>

      {/* Layer list */}
      <div className="layer-list">
        {tilemap.layers.map((layer) => (
          <div
            key={layer.id}
            className={`layer-item ${activeLayerId === layer.id ? 'active' : ''}`}
            onClick={() => setActiveLayerId(layer.id)}
          >
            <button
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleVisibility(layer.id);
              }}
              title={layer.visible ? 'Hide' : 'Show'}
            >
              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <span className="layer-name">{layer.name}</span>
            <button
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLock(layer.id);
              }}
              title={layer.locked ? 'Unlock' : 'Lock'}
            >
              {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <button
              className="icon-btn danger"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveLayer(layer.id);
              }}
              title="Delete layer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button className="small-action-btn" onClick={handleAddLayer}>
        <Plus size={14} /> Add Layer
      </button>

      {/* Paint tools */}
      <div className="paint-tools">
        <button
          className={`icon-btn ${paintTool === 'paint' ? 'active' : ''}`}
          onClick={() => setPaintTool('paint')}
          title="Paint"
        >
          <Paintbrush size={16} />
        </button>
        <button
          className={`icon-btn ${paintTool === 'fill' ? 'active' : ''}`}
          onClick={() => setPaintTool('fill')}
          title="Fill"
        >
          <Square size={16} />
        </button>
        <button
          className={`icon-btn ${paintTool === 'erase' ? 'active' : ''}`}
          onClick={() => setPaintTool('erase')}
          title="Erase"
        >
          <Eraser size={16} />
        </button>
        <span className="tool-label">
          Tile: {selectedTile >= 0 ? selectedTile : 'none'}
        </span>
      </div>

      {/* Mini grid preview */}
      {activeLayer && (
        <div className="tile-grid">
          {activeLayer.data.map((row, ri) => (
            <div key={ri} className="tile-row">
              {row.map((gid, ci) => (
                <div
                  key={ci}
                  className={`tile-cell ${gid >= 0 ? 'filled' : 'empty'} ${selectedTile === gid ? 'selected' : ''}`}
                  title={`(${ci},${ri}) = ${gid}`}
                  onClick={() => handleCellClick(ci, ri)}
                >
                  {gid >= 0 ? gid : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
