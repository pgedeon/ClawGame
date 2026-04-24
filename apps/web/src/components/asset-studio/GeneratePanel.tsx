/**
 * @clawgame/web - Asset Generation Panel (M11 Enhanced)
 * AI-powered asset generation with multi-model style presets and game-specific categories.
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import type { 
  AssetType, 
  GenerateAssetRequest, 
  GenerationStatus,
  ExtendedStyleValue 
} from '../../api/client';
import { useToast } from '../Toast';
import { 
  ASSET_TYPE_ICONS, 
  STYLES, 
  type StyleValue, 
  getStyleByValue,
  ASSET_CATEGORIES,
  ASSET_TYPE_TO_CATEGORY,
  getStylesByCategory 
} from './types';
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
  const [selectedStyle, setSelectedStyle] = useState<ExtendedStyleValue>('pixel');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'zai' | 'openai' | 'stability' | 'local'>('zai');
  const [selectedQuality, setSelectedQuality] = useState<'draft' | 'standard' | 'high' | 'ultra'>('standard');

  // Get current category and filtered styles
  const currentCategory = ASSET_TYPE_TO_CATEGORY[selectedType] || 'prop';
  const currentStyles = getStylesByCategory(currentCategory);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating || !projectId) return;

    setIsGenerating(true);
    try {
      showToast({ type: 'info', message: '🎨 Starting AI generation...' });

      // Map our extended styles to basic API styles for now, or pass the extended style directly
      const request: GenerateAssetRequest = {
        type: selectedType,
        prompt,
        options: { 
          style: selectedStyle,
          format: 'svg',
          model: selectedModel,
          quality: selectedQuality,
          // Set appropriate size based on asset type and category
          width: ASSET_CATEGORIES[currentCategory].sizes[0],
          height: ASSET_CATEGORIES[currentCategory].sizes[0],
        },
      };

      const result = await api.generateAsset(projectId, request);
      // The result has generationId, not id - use that
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

  const getCategoryIcon = (category: keyof typeof ASSET_CATEGORIES) => {
    return ASSET_CATEGORIES[category].icon;
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
                onClick={() => {
                  setSelectedType(type);
                  // Set default style for this category
                  const defaultStyle = getStylesByCategory(ASSET_TYPE_TO_CATEGORY[type] || 'prop')[0]?.value;
                  if (defaultStyle) setSelectedStyle(defaultStyle);
                }}
                title={type}
              >
                {ASSET_TYPE_ICONS[type]}
                <span className="type-label">{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Info */}
        <div className="category-info">
          <div className="category-header">
            {getCategoryIcon(currentCategory)}
            <span className="category-name">{ASSET_CATEGORIES[currentCategory].name}</span>
          </div>
          <p className="category-description">{ASSET_CATEGORIES[currentCategory].description}</p>
          <div className="category-tags">
            {ASSET_CATEGORIES[currentCategory].commonTypes.slice(0, 3).map((type) => (
              <span key={type} className="category-tag">{type}</span>
            ))}
            {ASSET_CATEGORIES[currentCategory].commonTypes.length > 3 && (
              <span className="category-tag">+{ASSET_CATEGORIES[currentCategory].commonTypes.length - 3}</span>
            )}
          </div>
        </div>

        {/* M11 Multi-Model Selection */}
        <div className="form-group">
          <label>AI Model</label>
          <div className="model-selector">
            <button
              className={`model-button ${selectedModel === 'zai' ? 'active' : ''}`}
              onClick={() => setSelectedModel('zai')}
              title="Z.AI - High quality game asset generation"
            >
              <span className="model-name">Z.AI</span>
              <span className="model-desc">Game optimized</span>
            </button>
            <button
              className={`model-button ${selectedModel === 'openai' ? 'active' : ''}`}
              onClick={() => setSelectedModel('openai')}
              title="OpenAI - Creative generation"
            >
              <span className="model-name">OpenAI</span>
              <span className="model-desc">Creative</span>
            </button>
            <button
              className={`model-button ${selectedModel === 'stability' ? 'active' : ''}`}
              onClick={() => setSelectedModel('stability')}
              title="Stability AI - Artistic generation"
            >
              <span className="model-name">Stability</span>
              <span className="model-desc">Artistic</span>
            </button>
            <button
              className={`model-button ${selectedModel === 'local' ? 'active' : ''}`}
              onClick={() => setSelectedModel('local')}
              title="Local - Fast offline generation"
            >
              <span className="model-name">Local</span>
              <span className="model-desc">Fast</span>
            </button>
          </div>
        </div>

        {/* Quality Selector */}
        <div className="form-group">
          <label>Quality</label>
          <div className="quality-selector">
            <button
              className={`quality-button ${selectedQuality === 'draft' ? 'active' : ''}`}
              onClick={() => setSelectedQuality('draft')}
              title="Fast draft quality"
            >
              Draft
            </button>
            <button
              className={`quality-button ${selectedQuality === 'standard' ? 'active' : ''}`}
              onClick={() => setSelectedQuality('standard')}
              title="Balanced quality and speed"
            >
              Standard
            </button>
            <button
              className={`quality-button ${selectedQuality === 'high' ? 'active' : ''}`}
              onClick={() => setSelectedQuality('high')}
              title="High quality generation"
            >
              High
            </button>
            <button
              className={`quality-button ${selectedQuality === 'ultra' ? 'active' : ''}`}
              onClick={() => setSelectedQuality('ultra')}
              title="Ultra quality with details"
            >
              Ultra
            </button>
          </div>
        </div>

        {/* Style Selector */}
        <div className="form-group">
          <div className="style-selector-header">
            <label>Style & Quality</label>
            <button
              className="category-toggle"
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            >
              <ChevronDown size={16} className={`chevron ${showCategoryFilter ? 'rotated' : ''}`} />
            </button>
          </div>

          {showCategoryFilter && (
            <div className="category-filters">
              {(Object.keys(ASSET_CATEGORIES) as (keyof typeof ASSET_CATEGORIES)[]).map((category) => (
                <div key={category} className="category-section">
                  <div className="category-section-header">
                    {getCategoryIcon(category)}
                    <span>{ASSET_CATEGORIES[category].name}</span>
                  </div>
                  <div className="category-styles">
                    {getStylesByCategory(category).map((style) => (
                      <button
                        key={style.value}
                        className={`style-button ${selectedStyle === style.value ? 'active' : ''}`}
                        onClick={() => setSelectedStyle(style.value as ExtendedStyleValue)}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Style Selection */}
          <div className="quick-styles">
            <div className="style-grid">
              {currentStyles.slice(0, 6).map((style) => (
                <button
                  key={style.value}
                  className={`style-button ${selectedStyle === style.value ? 'active' : ''}`}
                  onClick={() => setSelectedStyle(style.value as ExtendedStyleValue)}
                  title={style.label}
                >
                  {style.label}
                </button>
              ))}
              {currentStyles.length > 6 && (
                <button
                  className="style-button more-styles"
                  onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                >
                  +{currentStyles.length - 6} more
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Aspect Ratio & Size Info */}
        <div className="form-group size-info">
          <label>Recommended Size</label>
          <div className="size-info">
            <span className="size-text">
              {ASSET_CATEGORIES[currentCategory].sizes[0]}×{ASSET_CATEGORIES[currentCategory].sizes[0]}px
            </span>
            <span className="ratio-text">
              Aspect: {ASSET_CATEGORIES[currentCategory].aspectRatios[0]}
            </span>
          </div>
        </div>

        {/* Model & Quality Summary */}
        <div className="form-group model-info">
          <label>Generation Settings</label>
          <div className="model-info-grid">
            <div className="info-item">
              <span className="info-label">Model:</span>
              <span className="info-value">{selectedModel.toUpperCase()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Quality:</span>
              <span className="info-value">{selectedQuality}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Style:</span>
              <span className="info-value">{selectedStyle.replace('-', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="form-group">
          <label htmlFor="prompt">Prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your asset... e.g., 'A brave knight with shining armor and a sword'"
            rows={4}
            className="prompt-input"
          />
          {ASSET_CATEGORIES[currentCategory].commonTypes.length > 0 && (
            <div className="prompt-suggestions">
              <span className="suggestions-label">Try prompts like:</span>
              <div className="suggestion-tags">
                {ASSET_CATEGORIES[currentCategory].commonTypes.slice(0, 3).map((type) => (
                  <button
                    key={type}
                    className="suggestion-tag"
                    onClick={() => setPrompt(`A ${type} with detailed features`)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
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
