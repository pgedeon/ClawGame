import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Asset {
  id: string;
  name: string;
  type: 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio';
  url: string;
  prompt?: string;
  createdAt: string;
  status: 'generated' | 'generating' | 'error';
}

export function AssetStudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    const mockAssets: Asset[] = [
      {
        id: '1',
        name: 'Player Sprite',
        type: 'sprite',
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDE0TDExIDI5TDEwIDE1TDEyIDE0WiIgZmlsbD0iIzAwNzZiNSIvPgo8cGF0aCBkPSJNMTQgMkwxMiAxOEwxNCAyWiIgZmlsbD0iIzAwNzZiNSIvPgo8cGF0aCBkPSJNMjAgMTdIMjJWMjRIMjBMNjAgMTdIMjBWMjdIMjBaIiBmaWxsPSIjMDA3NmI1Ii8+Cjwvc3ZnPg==',
        prompt: 'Pixel art player character with blue armor',
        createdAt: '2026-04-07T10:00:00Z',
        status: 'generated'
      },
      {
        id: '2', 
        name: 'Ground Tileset',
        type: 'tileset',
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQwIDJDNDAgNiAyIDYgMlY2SDZWNDBaIiBmaWxsPSIjMDA3NmI1Ii8+CjxwYXRoIGQ9Ik0zMCAySDQwVjJDMiAyMCAyIDQwIDIgNDBaIiBmaWxsPSIjMDA3NmI1Ii8+CjxwYXRoIGQ9Ik00MCAySDEwVjJNMTAgM0g0MFYyTDQwIDIiIGZpbGw9IiMwMDc2YjUiLz4KPC9zdmc+',
        prompt: 'Ground tiles with grass pattern',
        createdAt: '2026-04-07T09:30:00Z',
        status: 'generated'
      }
    ];
    setAssets(mockAssets);
  }, []);

  const handleGenerateAsset = async () => {
    if (!generationPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    
    try {
      // Simulate generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newAsset: Asset = {
        id: Date.now().toString(),
        name: `Generated Asset ${assets.length + 1}`,
        type: 'sprite',
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDE0TDExIDI5TDEwIDE1TDEyIDE0WiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNMTQgMkwxMiAxOEwxNCAyWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNMjAgMTdIMjJWMjRIMjBMNjAgMTdIMjBWMjdIMjBaIiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPg==',
        prompt: generationPrompt,
        createdAt: new Date().toISOString(),
        status: 'generated'
      };

      setAssets(prev => [newAsset, ...prev]);
      setGenerationPrompt('');
    } catch (error) {
      console.error('Asset generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'sprite': return '🎮';
      case 'tileset': return '🧱';
      case 'texture': return '🖼️';
      case 'icon': return '🔲';
      case 'audio': return '🎵';
      default: return '📦';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return '#4CAF50';
      case 'generating': return '#ff6b35';
      case 'error': return '#d32f2f';
      default: return '#666';
    }
  };

  return (
    <div className="asset-studio-page">
      <header className="page-header">
        <h1>Asset Studio</h1>
        <p>Generate and manage game assets</p>
      </header>

      <div className="asset-studio-container">
        <div className="sidebar">
          <div className="generate-section">
            <h3>Generate Asset</h3>
            <p className="generate-hint">Describe what you want to create:</p>
            <textarea
              value={generationPrompt}
              onChange={(e) => setGenerationPrompt(e.target.value)}
              placeholder="A red pixel art character with sword..."
              className="generate-input"
              rows={3}
            />
            <button
              onClick={handleGenerateAsset}
              disabled={!generationPrompt.trim() || isGenerating}
              className="generate-button"
            >
              {isGenerating ? '⏳ Generating...' : '🎨 Generate Asset'}
            </button>
          </div>

          <div className="asset-list">
            <h3>Your Assets</h3>
            <div className="asset-items">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className={`asset-item ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <div className="asset-preview">
                    <img src={asset.url} alt={asset.name} className="asset-image" />
                  </div>
                  <div className="asset-info">
                    <div className="asset-name">
                      {getAssetTypeIcon(asset.type)} {asset.name}
                    </div>
                    <div className="asset-status" style={{ color: getStatusColor(asset.status) }}>
                      {asset.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="asset-details">
          {selectedAsset ? (
            <>
              <div className="detail-header">
                <h3>{selectedAsset.name}</h3>
                <div className="asset-type">
                  {getAssetTypeIcon(selectedAsset.type)} {selectedAsset.type}
                </div>
              </div>

              <div className="preview-section">
                <h4>Preview</h4>
                <div className="preview-container">
                  <img src={selectedAsset.url} alt={selectedAsset.name} className="preview-image" />
                </div>
              </div>

              <div className="metadata-section">
                <h4>Metadata</h4>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <label>Status:</label>
                    <span style={{ color: getStatusColor(selectedAsset.status) }}>
                      {selectedAsset.status}
                    </span>
                  </div>
                  <div className="metadata-item">
                    <label>Type:</label>
                    <span>{selectedAsset.type}</span>
                  </div>
                  <div className="metadata-item">
                    <label>Created:</label>
                    <span>{new Date(selectedAsset.createdAt).toLocaleString('en-US')}</span>
                  </div>
                </div>
              </div>

              {selectedAsset.prompt && (
                <div className="prompt-section">
                  <h4>Generation Prompt</h4>
                  <div className="prompt-text">
                    {selectedAsset.prompt}
                  </div>
                </div>
              )}

              <div className="action-buttons">
                <button className="primary-button">
                  Import to Project
                </button>
                <button className="secondary-button">
                  Regenerate
                </button>
                <button className="secondary-button">
                  Download
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select an asset to view details</p>
              <p className="hint">Or generate a new asset using the panel on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}