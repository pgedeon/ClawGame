/**
 * @clawgame/web - Export / Publish Page
 * Guided multi-step publishing flow: Configure → Preview → Publish
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type ExportResult, type ExportOptions } from '../api/client';
import { logger } from '../utils/logger';
import { useToast } from '../components/Toast';
import {
  Download,
  Play,
  RefreshCw,
  Trash2,
  FileText,
  Package,
  Settings,
  Lock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Eye,
  Globe,
  Copy,
  ExternalLink,
} from 'lucide-react';

type PublishStep = 'configure' | 'preview' | 'publish';

interface StepConfig {
  key: PublishStep;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const STEPS: StepConfig[] = [
  { key: 'configure', label: 'Configure', icon: <Settings size={18} />, description: 'Set export options' },
  { key: 'preview', label: 'Preview', icon: <Eye size={18} />, description: 'Verify your game' },
  { key: 'publish', label: 'Publish', icon: <Globe size={18} />, description: 'Export & share' },
];

export function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [exports, setExports] = useState<ExportResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<PublishStep>('configure');
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeAssets: true,
    minify: false,
    compress: false,
    format: 'html',
  });

  // Load project data
  useEffect(() => {
    if (projectId) {
      loadProject();
      loadExports();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) {
      setError('No project selected');
      setIsLoading(false);
      return;
    }
    try {
      const projectData = await api.getProject(projectId);
      setProject(projectData);
    } catch (err) {
      logger.error('Failed to load project:', err);
      setError('Failed to load project');
      showToast({ type: 'error', message: 'Failed to load project data' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadExports = async () => {
    if (!projectId) return;
    try {
      const data = await api.listExports(projectId);
      setExports(data);
      // If exports exist, pre-fill last export for publish step
      if (data.length > 0) {
        setLastExport(data[0]);
      }
    } catch (err) {
      logger.error('Failed to load exports:', err);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setCurrentStep(STEPS[stepIndex + 1].key);
  };
  const goBack = () => {
    if (stepIndex > 0) setCurrentStep(STEPS[stepIndex - 1].key);
  };

  const handleExport = useCallback(async () => {
    if (!projectId) return;
    setIsExporting(true);
    setError(null);
    try {
      const result = await api.exportGame(projectId, exportOptions);
      setLastExport(result);
      await loadExports();
      showToast({ type: 'success', message: 'Game exported successfully!' });
      // Auto-advance to publish step
      setCurrentStep('publish');
    } catch (err) {
      logger.error('Failed to export game:', err);
      setError('Failed to export game');
      showToast({ type: 'error', message: 'Export failed — check that the server is running' });
    } finally {
      setIsExporting(false);
    }
  }, [projectId, exportOptions]);

  const handleDownload = useCallback((exp?: ExportResult) => {
    const target = exp || lastExport;
    if (!projectId || !target) return;
    const downloadUrl = api.downloadExport(projectId, target.filename);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = target.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [projectId, lastExport]);

  const handlePlay = useCallback((exp?: ExportResult) => {
    const target = exp || lastExport;
    if (!projectId || !target) return;
    const downloadUrl = api.downloadExport(projectId, target.filename);
    window.open(downloadUrl, '_blank');
  }, [projectId, lastExport]);

  const handleDelete = async (exp: ExportResult) => {
    if (!projectId || !confirm(`Delete export "${exp.filename}"?`)) return;
    try {
      await api.deleteExport(projectId, exp.filename);
      await loadExports();
      if (lastExport?.filename === exp.filename) setLastExport(null);
    } catch (err) {
      logger.error('Failed to delete export:', err);
      setError('Failed to delete export');
    }
  };

  const handleCopyLink = useCallback(() => {
    if (!projectId || !lastExport) return;
    const url = api.downloadExport(projectId, lastExport.filename);
    navigator.clipboard.writeText(url).then(
      () => showToast({ type: 'success', message: 'Download link copied!' }),
      () => showToast({ type: 'error', message: 'Failed to copy link' }),
    );
  }, [projectId, lastExport]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="export-page">
        <div className="export-loading">
          <RefreshCw className="loading-spinner" />
          <p>Loading publish page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="export-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🚀 Publish Your Game</h1>
            <p>Configure, verify, and share your game with the world</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="publish-stepper">
        {STEPS.map((step, i) => {
          const isActive = step.key === currentStep;
          const isCompleted = i < stepIndex;
          return (
            <React.Fragment key={step.key}>
              {i > 0 && <div className={`stepper-line ${i <= stepIndex ? 'active' : ''}`} />}
              <button
                className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => {
                  // Allow going back to completed steps
                  if (isCompleted) setCurrentStep(step.key);
                }}
                disabled={!isCompleted && i > stepIndex}
              >
                <span className="step-icon">
                  {isCompleted ? <CheckCircle2 size={18} /> : step.icon}
                </span>
                <span className="step-label">{step.label}</span>
                <span className="step-desc">{step.description}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {error && <div className="error-banner">❌ {error}</div>}

      <div className="export-content">
        {/* Step 1: Configure */}
        {currentStep === 'configure' && (
          <div className="export-options-panel">
            <div className="panel-header">
              <Settings size={20} />
              <h3>Export Settings</h3>
            </div>

            <div className="option-group">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={exportOptions.includeAssets}
                  onChange={(e) => setExportOptions({ ...exportOptions, includeAssets: e.target.checked })}
                />
                <div className="option-info">
                  <span className="option-name">Include Assets</span>
                  <span className="option-description">Embed all game assets in the HTML file</span>
                </div>
              </label>

              <label className="option-item option-disabled">
                <input type="checkbox" checked={exportOptions.minify} disabled />
                <div className="option-info">
                  <div className="option-header">
                    <span className="option-name">Minify Code</span>
                    <span className="option-badge coming-soon"><Lock size={12} /> Coming Soon</span>
                  </div>
                  <span className="option-description">Reduce file size by minifying code</span>
                </div>
              </label>

              <label className="option-item option-disabled">
                <input type="checkbox" checked={exportOptions.compress} disabled />
                <div className="option-info">
                  <div className="option-header">
                    <span className="option-name">Compress Output</span>
                    <span className="option-badge coming-soon"><Lock size={12} /> Coming Soon</span>
                  </div>
                  <span className="option-description">Create ZIP file for easy distribution</span>
                </div>
              </label>
            </div>

            <div className="publish-nav">
              <button className="btn-primary publish-nav-next" onClick={goNext}>
                Next: Preview <ChevronRight size={16} />
              </button>
            </div>

            <div className="project-info">
              <div className="info-item">
                <span className="info-label">Project:</span>
                <span className="info-value">{project?.name || 'Unknown'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Version:</span>
                <span className="info-value">{project?.version || '1.0.0'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Verify */}
        {currentStep === 'preview' && (
          <div className="export-options-panel">
            <div className="panel-header">
              <Eye size={20} />
              <h3>Preview & Verify</h3>
            </div>
            <p className="step-intro">
              Review your game before publishing. Make sure everything looks right.
            </p>

            <div className="preview-checklist">
              <div className="checklist-item">
                <CheckCircle2 size={18} className="check-icon done" />
                <span>Game scene loads correctly</span>
              </div>
              <div className="checklist-item">
                <CheckCircle2 size={18} className={`check-icon ${exportOptions.includeAssets ? 'done' : 'pending'}`} />
                <span>Assets {exportOptions.includeAssets ? 'will be' : "won't be"} embedded</span>
              </div>
              <div className="checklist-item">
                <CheckCircle2 size={18} className="check-icon done" />
                <span>Export format: {exportOptions.format?.toUpperCase() || 'HTML'}</span>
              </div>
            </div>

            {lastExport && (
              <div className="last-export-summary">
                <h4>📦 Previous Export Available</h4>
                <p><strong>{lastExport.filename}</strong> — {formatFileSize(lastExport.size)} — {formatDate(lastExport.createdAt)}</p>
                <div className="last-export-actions">
                  <button className="btn-secondary" onClick={() => handlePlay()}>
                    <Play size={16} /> Play Previous
                  </button>
                </div>
              </div>
            )}

            <div className="preview-actions">
              <button className="btn-primary" onClick={() => navigate(`../preview`)}>
                <Eye size={18} /> Open Game Preview
              </button>
            </div>

            <div className="publish-nav">
              <button className="btn-secondary" onClick={goBack}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn-primary publish-nav-next" onClick={goNext}>
                Next: Publish <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Publish */}
        {currentStep === 'publish' && (
          <div className="export-options-panel">
            <div className="panel-header">
              <Globe size={20} />
              <h3>Publish & Share</h3>
            </div>
            <p className="step-intro">
              Export your game and share it with players.
            </p>

            <div className="publish-actions">
              <button
                className="btn-primary export-btn publish-main-btn"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <><RefreshCw className="spin" size={18} /> Exporting...</>
                ) : (
                  <><Download size={18} /> Export Game Now</>
                )}
              </button>
            </div>

            {lastExport && (
              <div className="publish-result">
                <div className="publish-result-header">
                  <CheckCircle2 size={24} className="done" />
                  <h4>Export Ready!</h4>
                </div>
                <div className="publish-result-details">
                  <div className="detail-row"><span className="detail-label">File</span><span>{lastExport.filename}</span></div>
                  <div className="detail-row"><span className="detail-label">Size</span><span>{formatFileSize(lastExport.size)}</span></div>
                  <div className="detail-row"><span className="detail-label">Assets</span><span>{lastExport.assetCount} embedded</span></div>
                  <div className="detail-row"><span className="detail-label">Created</span><span>{formatDate(lastExport.createdAt)}</span></div>
                </div>
                <div className="publish-share-actions">
                  <button className="btn-primary" onClick={() => handleDownload()}>
                    <Download size={16} /> Download
                  </button>
                  <button className="btn-secondary" onClick={() => handlePlay()}>
                    <ExternalLink size={16} /> Open in Browser
                  </button>
                  <button className="btn-secondary" onClick={handleCopyLink}>
                    <Copy size={16} /> Copy Link
                  </button>
                </div>
              </div>
            )}

            <div className="publish-nav">
              <button className="btn-secondary" onClick={goBack}>
                <ChevronLeft size={16} /> Back
              </button>
            </div>

            {/* Export History */}
            <div className="export-history-section">
              <div className="panel-header">
                <Package size={20} />
                <h3>Export History</h3>
                <span className="export-count">{exports.length}</span>
              </div>
              {exports.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} />
                  <p>No exports yet</p>
                  <p className="empty-hint">Click "Export Game Now" to create your first build</p>
                </div>
              ) : (
                <div className="export-list">
                  {exports.map((exp) => (
                    <div key={exp.filename} className="export-item">
                      <div className="export-item-info">
                        <div className="export-item-header">
                          <h4>{exp.filename}</h4>
                          <span className="export-badge">{exp.format}</span>
                        </div>
                        <div className="export-item-meta">
                          <span>{formatFileSize(exp.size)}</span>
                          <span>•</span>
                          <span>{formatDate(exp.createdAt)}</span>
                          {exp.includesAssets && <><span>•</span><span>{exp.assetCount} assets</span></>}
                        </div>
                      </div>
                      <div className="export-item-actions">
                        <button className="btn-icon btn-play" onClick={() => handlePlay(exp)} title="Play"><Play size={18} /></button>
                        <button className="btn-icon btn-download" onClick={() => handleDownload(exp)} title="Download"><Download size={18} /></button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(exp)} title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="export-info-section">
        <h3>ℹ️ About Publishing</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🎮 Standalone HTML</h4>
            <p>Exports are single HTML files that contain your entire game. They run in any modern browser without a server.</p>
          </div>
          <div className="info-card">
            <h4>📦 Embedded Assets</h4>
            <p>All game assets are embedded as data URIs, making the export completely self-contained.</p>
          </div>
          <div className="info-card">
            <h4>🚀 Easy Distribution</h4>
            <p>Share your game by uploading to any web host or game portal, or send the HTML file directly.</p>
          </div>
          <div className="info-card">
            <h4>🔧 No Dependencies</h4>
            <p>The exported game includes a minimal engine that runs entirely in browser. No build tools required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
