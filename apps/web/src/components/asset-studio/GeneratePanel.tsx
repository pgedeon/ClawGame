/**
 * @clawgame/web - Asset Generation Panel
 * AI-powered asset generation form with progress tracking.
 */

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import type { AssetType, GenerateAssetRequest, GenerationStatus } from '../../api/client';
import { useToast } from '../Toast';
import { ASSET_TYPE_ICONS, STYLES, type StyleValue, getGenerationStatusText } from './types';
import { api } from '../../api/client';
import { logger } from '../../utils/logger';
import { useParams } from 'react-router-dom';

interface GeneratePanelProps {
  onGenerationStarted: (gen: GenerationStatus) => void;
}

export const GeneratePanel: React.FC<GeneratePanelProps> = ({ onGenerationStarted }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const { showToast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType>('sprite');
  const [selectedStyle, setSelectedStyle] = useState<StyleValue>('pixel');

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || !projectId) return;

    setIsGenerating(true);
    try {
      showToast({ type: 'info', message: '🎨 Starting AI generation...' });

      const request: GenerateAssetRequest = {
        type: selectedType,
        prompt,
        options: { style: selectedStyle, format: 'svg', width: 64, height: 64 },
      };

      const result = await api.generateAsset(projectId, request);
      const newGen = await api.getGenerationStatus(projectId, result.generationId);

      if (newGen) {
        onGenerationStarted(newGen);
      }

      setPrompt('');
      showToast({ type: 'success', message: `🎨 Generation started!` });
    } catch (error: any) {
      logger.error('Asset generation failed:', error);
      showToast({ type: 'error', message: `Failed to start generation: ${error.message}` });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="studio-panel">
      <div className="panel-header">
        <Sparkles size={18} className="panel-icon" />
        <h2>Generate with AI</h2>
      </div>

      <div className="generate-form">
        {/* Asset Type Selector */}
        <div className="form-group">
          <label>Asset Type</label>
          <div className="asset-type-grid">
            {(Object.keys(ASSET_TYPE_ICONS) as AssetType[]).map((type) => (
              <button
                key={type}
                className={`asset-type-button ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
                title={type}
              >
                {ASSET_TYPE_ICONS[type]}
                <span className="type-label">{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Style Selector */}
        <div className="form-group">
          <label>Style</label>
          <div className="style-grid">
            {STYLES.map((style) => (
              <button
                key={style.value}
                className={`style-button ${selectedStyle === style.value ? 'active' : ''}`}
                onClick={() => setSelectedStyle(style.value)}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="form-group">
          <label htmlFor="prompt">Prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your asset... e.g., 'A red pixel art sword with glowing blade'"
            rows={4}
            className="prompt-input"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="generate-button"
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="spinning" />
              AI Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Asset
            </>
          )}
        </button>
      </div>
    </div>
  );
};
