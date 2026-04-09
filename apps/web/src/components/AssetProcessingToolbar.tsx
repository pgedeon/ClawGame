/**
 * @clawgame/web - Asset Processing Toolbar
 * M10: Sprite analysis, slicing, pixel pipeline, batch utilities.
 */

import React, { useState } from 'react';
import {
  Scan, Scissors, Grid3x3, Palette, Layers, Zap, Settings2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useToast } from './Toast';
import { AnimationPreview } from './AnimationPreview';
import '../animation-preview.css';

interface AssetProcessingToolbarProps {
  projectId: string;
  selectedAssetPath: string | null;
  onProcessed?: () => void;
}

type ToolTab = 'analyze' | 'slice' | 'pixel' | 'palette' | 'tileset' | 'batch';

const API_BASE = 'http://localhost:3000';

export function AssetProcessingToolbar({
  projectId,
  selectedAssetPath,
  onProcessed,
}: AssetProcessingToolbarProps) {
  const [activeTab, setActiveTab] = useState<ToolTab | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { showToast } = useToast();

  // Slice state
  const [sliceWidth, setSliceWidth] = useState(32);
  const [sliceHeight, setSliceHeight] = useState(32);
  const [sliceName, setSliceName] = useState('sprite');

  // Pixel state
  const [pixelSize, setPixelSize] = useState(4);
  const [edgeCleanup, setEdgeCleanup] = useState(true);

  // Palette state
  const [maxColors, setMaxColors] = useState(16);

  // Batch state
  const [batchFormat, setBatchFormat] = useState<'png' | 'webp' | 'jpg'>('png');
  const [batchResize, setBatchResize] = useState('');
  const [batchTrim, setBatchTrim] = useState(false);

  const callApi = async (endpoint: string, body: any) => {
    setIsProcessing(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/assets/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult(data);
      showToast({ type: 'success', message: 'Processing complete' });
      onProcessed?.();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message || 'Processing failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = () => {
    if (!selectedAssetPath) return;
    callApi('analyze', { assetPath: selectedAssetPath });
  };

  const handleSlice = () => {
    if (!selectedAssetPath) return;
    callApi('slice', {
      assetPath: selectedAssetPath,
      frameWidth: sliceWidth,
      frameHeight: sliceHeight,
      name: sliceName,
    });
  };

  const handlePixelize = () => {
    if (!selectedAssetPath) return;
    callApi('pixelize', {
      assetPath: selectedAssetPath,
      pixelSize,
      edgeCleanup,
    });
  };

  const handlePaletteReduce = () => {
    if (!selectedAssetPath) return;
    callApi('palette-reduce', { assetPath: selectedAssetPath, maxColors });
  };

  const handleBatch = () => {
    if (!selectedAssetPath) return;
    const resize = batchResize
      ? { width: parseInt(batchResize.split('x')[0]), height: parseInt(batchResize.split('x')[1]) }
      : undefined;
    callApi('batch', {
      assetPaths: [selectedAssetPath],
      options: { format: batchFormat, resize, trim: batchTrim },
    });
  };

  const tools: Array<{ id: ToolTab; label: string; icon: React.ReactNode; action: () => void }> = [
    { id: 'analyze', label: 'Analyze', icon: <Scan size={14} />, action: handleAnalyze },
    { id: 'slice', label: 'Slice Sheet', icon: <Scissors size={14} />, action: handleSlice },
    { id: 'pixel', label: 'Pixelize', icon: <Grid3x3 size={14} />, action: handlePixelize },
    { id: 'palette', label: 'Reduce Palette', icon: <Palette size={14} />, action: handlePaletteReduce },
    { id: 'batch', label: 'Batch Convert', icon: <Layers size={14} />, action: handleBatch },
  ];

  return (
    <div className="asset-processing-toolbar">
      <div className="toolbar-header">
        <Settings2 size={14} />
        <span>Processing Tools</span>
      </div>

      {!selectedAssetPath && (
        <div className="toolbar-hint">Select an asset to use processing tools</div>
      )}

      <div className="tool-buttons">
        {tools.map(tool => (
          <div key={tool.id}>
            <button
              className="tool-btn"
              onClick={() => {
                if (activeTab === tool.id) {
                  setActiveTab(null);
                } else {
                  setActiveTab(tool.id);
                  if (tool.id === 'analyze') tool.action();
                }
              }}
              disabled={!selectedAssetPath || isProcessing}
              title={tool.label}
            >
              {tool.icon}
              <span>{tool.label}</span>
              {activeTab === tool.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>

            {activeTab === tool.id && tool.id !== 'analyze' && (
              <div className="tool-options">
                {tool.id === 'slice' && (
                  <>
                    <label>Frame Size
                      <div className="tool-input-row">
                        <input type="number" value={sliceWidth} onChange={e => setSliceWidth(+e.target.value)} min={1} />
                        <span>×</span>
                        <input type="number" value={sliceHeight} onChange={e => setSliceHeight(+e.target.value)} min={1} />
                      </div>
                    </label>
                    <label>Name <input type="text" value={sliceName} onChange={e => setSliceName(e.target.value)} /></label>
                    <button className="tool-run-btn" onClick={handleSlice} disabled={isProcessing}>
                      <Scissors size={12} /> {isProcessing ? 'Slicing...' : 'Slice'}
                    </button>
                  </>
                )}

                {tool.id === 'pixel' && (
                  <>
                    <label>Pixel Size <input type="number" value={pixelSize} onChange={e => setPixelSize(+e.target.value)} min={1} max={32} /></label>
                    <label className="tool-checkbox">
                      <input type="checkbox" checked={edgeCleanup} onChange={e => setEdgeCleanup(e.target.checked)} />
                      Edge Cleanup
                    </label>
                    <button className="tool-run-btn" onClick={handlePixelize} disabled={isProcessing}>
                      <Grid3x3 size={12} /> {isProcessing ? 'Processing...' : 'Pixelize'}
                    </button>
                  </>
                )}

                {tool.id === 'palette' && (
                  <>
                    <label>Max Colors <input type="number" value={maxColors} onChange={e => setMaxColors(+e.target.value)} min={2} max={256} /></label>
                    <button className="tool-run-btn" onClick={handlePaletteReduce} disabled={isProcessing}>
                      <Palette size={12} /> {isProcessing ? 'Reducing...' : 'Reduce'}
                    </button>
                  </>
                )}

                {tool.id === 'batch' && (
                  <>
                    <label>Format
                      <select value={batchFormat} onChange={e => setBatchFormat(e.target.value as any)}>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                        <option value="jpg">JPEG</option>
                      </select>
                    </label>
                    <label>Resize (e.g. 64x64) <input type="text" value={batchResize} onChange={e => setBatchResize(e.target.value)} placeholder="Leave empty for original" /></label>
                    <label className="tool-checkbox">
                      <input type="checkbox" checked={batchTrim} onChange={e => setBatchTrim(e.target.checked)} />
                      Trim Transparent
                    </label>
                    <button className="tool-run-btn" onClick={handleBatch} disabled={isProcessing}>
                      <Layers size={12} /> {isProcessing ? 'Processing...' : 'Convert'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Results */}
      {result && (
        <div className="tool-results">
          <div className="tool-results-header">
            <Zap size={12} /> Result
          </div>
          <pre className="tool-results-json">{JSON.stringify(result, null, 2)}</pre>
          {/* Animation preview for sliced sprites */}
          {result?.frames && result.frames.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="tool-results-header"><span>🎬 Animation Preview</span></div>
              <AnimationPreview
                frames={result.frames.map((f: any) => `http://localhost:3000/api/projects/${projectId}/files?path=${encodeURIComponent(f.path)}`)}
                width={result.manifest?.frameWidth || 32}
                height={result.manifest?.frameHeight || 32}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
