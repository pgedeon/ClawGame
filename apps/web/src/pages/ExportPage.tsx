/**
 * @clawgame/web - Export / Publish Page
 * Guided publishing flow: Configure → Export → Publish (with real hosting)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type ExportResult, type ExportOptions, type HostedExport, type HostedOptions } from '../api/client';
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
  Globe as PublicGlobe,
  Clock,
  AlertCircle,
} from 'lucide-react';

type PublishStep = 'configure' | 'export' | 'publish';

interface StepConfig {
  key: PublishStep;
  label: string;
  icon: React.ReactNode;
  getDescription: (hostingAvailable: boolean) => string;
}

const STEPS: StepConfig[] = [
  { key: 'configure', label: 'Configure', icon: <Settings size={18} />, getDescription: () => 'Set export options' },
  { key: 'export', label: 'Export', icon: <Download size={18} />, getDescription: () => 'Generate game files' },
  {
    key: 'publish',
    label: 'Publish',
    icon: <Globe size={18} />,
    getDescription: (hostingAvailable) =>
      hostingAvailable ? 'Share with hosted links' : 'Download or open in browser',
  },
];

export function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [exports, setExports] = useState<ExportResult[]>([]);
  const [hostedExports, setHostedExports] = useState<HostedExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<PublishStep>('configure');
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);
  const [lastHosted, setLastHosted] = useState<HostedExport | null>(null);
  const [hostedHealth, setHostedHealth] = useState<{ status: string; hostedDir: string; baseUrl: string } | null>(null);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeAssets: true,
    minify: false,
    compress: false,
    format: 'html',
  });

  // Load project and export data
  useEffect(() => {
    if (projectId) {
      loadProject();
      loadExports();
      loadHostedExports();
      loadHostedHealth();
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

  const loadHostedExports = async () => {
    if (!projectId) return;
    try {
      const data = await api.listHostedExports(projectId);
      setHostedExports(data);
      if (data.length > 0) {
        setLastHosted(data[0]);
      }
    } catch (err) {
      logger.error('Failed to load hosted exports:', err);
    }
  };

  const loadHostedHealth = async () => {
    try {
      const health = await api.getHostedHealth();
      setHostedHealth(health);
    } catch (err) {
      logger.warn('Failed to load hosted service health:', err);
      setHostedHealth({ status: 'unknown', hostedDir: 'unknown', baseUrl: 'unknown' });
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const isHostedServiceHealthy = hostedHealth?.status === 'healthy';

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

  const handleHost = useCallback(async (exportResult: ExportResult) => {
    if (!projectId || !exportResult) return;
    setIsHosting(true);
    setError(null);
    try {
      const hostedOptions: HostedOptions = {
        expiresInDays: 30,
        public: true,
      };
      const result = await api.hostExport(projectId, exportResult.filename, hostedOptions);
      setLastHosted(result.hosted);
      await loadHostedExports();
      showToast({ type: 'success', message: 'Game successfully hosted for web viewing!' });
    } catch (err) {
      logger.error('Failed to host export:', err);
      setError('Failed to host game');
      showToast({ type: 'error', message: 'Hosting failed — check server configuration' });
    } finally {
      setIsHosting(false);
    }
  }, [projectId]);

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

  const handlePlayHosted = useCallback((hosted?: HostedExport) => {
    const target = hosted || lastHosted;
    if (!target) return;
    const viewUrl = api.viewHostedExport(target.id);
    window.open(viewUrl, '_blank');
  }, [lastHosted]);

  const handleCopyHostedLink = useCallback(() => {
    if (!projectId || !lastHosted) return;
    const url = api.viewHostedExport(lastHosted.id);
    navigator.clipboard.writeText(url).then(
      () => showToast({ type: 'success', message: 'Hosted game link copied!' }),
      () => showToast({ type: 'error', message: 'Failed to copy link' }),
    );
  }, [projectId, lastHosted]);

  const handleCopyDownloadLink = useCallback(() => {
    if (!projectId || !lastExport) return;
    const url = api.downloadExport(projectId, lastExport.filename);
    navigator.clipboard.writeText(url).then(
      () => showToast({ type: 'success', message: 'Download link copied!' }),
      () => showToast({ type: 'error', message: 'Failed to copy link' }),
    );
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

  const handleDeleteHosted = async (hosted: HostedExport) => {
    if (!projectId || !confirm(`Delete hosted game "${hosted.hostedUrl}"?`)) return;
    try {
      await api.deleteHostedExport(projectId, hosted.id);
      await loadHostedExports();
      if (lastHosted?.id === hosted.id) setLastHosted(null);
    } catch (err) {
      logger.error('Failed to delete hosted export:', err);
      setError('Failed to delete hosted export');
    }
  };

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
            <h1>🚀 Export & Share</h1>
            <p>
              {isHostedServiceHealthy
                ? 'Export your game and publish it with real web hosting'
                : 'Export your game as a standalone HTML file'}
            </p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>
      </header>

      {/* Hosted Service Status */}
      {hostedHealth && (
        <div className={`hosted-service-status ${hostedHealth.status}`}>
          <div className="status-header">
            <PublicGlobe size={16} />
            <span>Hosted Publishing Service</span>
            {hostedHealth.status === 'healthy' ? (
              <CheckCircle2 size={16} className="status-healthy" />
            ) : (
              <AlertCircle size={16} className="status-warning" />
            )}
          </div>
          <p className="status-message">
            {hostedHealth.status === 'healthy'
              ? '✅ Real hosting is available — your games will get public web URLs'
              : hostedHealth.status === 'degraded'
                ? '⚠️ Hosting service needs setup — currently only file downloads are available'
                : '⚠️ Hosting service status unknown — file downloads are always available'
            }
          </p>
          <div className="status-details">
            <span>Service: {hostedHealth.status}</span>
            {hostedHealth.status === 'healthy' && (
              <span>URL: {hostedHealth.baseUrl}</span>
            )}
          </div>
        </div>
      )}

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
                  if (isCompleted) setCurrentStep(step.key);
                }}
                disabled={!isCompleted && i > stepIndex}
              >
                <span className="step-icon">
                  {isCompleted ? <CheckCircle2 size={18} /> : step.icon}
                </span>
                <span className="step-label">{step.label}</span>
                <span className="step-desc">{step.getDescription(isHostedServiceHealthy)}</span>
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
              <div className="option-item">
                <div className="option-info">
                  <span className="option-name">Export Format</span>
                  <span className="option-description">Choose HTML (Canvas2D) or Phaser 4 runtime</span>
                </div>
                <select
                  value={exportOptions.format || 'html'}
                  onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as any })}
                  className="format-select"
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: '14px' }}
                >
                  <option value="html">HTML (Canvas2D)</option>
                  <option value="phaser-html">Phaser 4 (WebGL)</option>
                </select>
              </div>

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

            <div className="export-info">
              <h4>📋 What You'll Get</h4>
              <ul>
                <li>✅ Standalone HTML file with embedded game</li>
                <li>✅ Works in any modern browser without servers</li>
                <li>✅ {isHostedServiceHealthy ? '🌐 Real web hosting with public URLs' : '📥 File download for manual hosting'}</li>
                <li>✅ Complete game engine embedded</li>
              </ul>
            </div>

            <div className="publish-nav">
              <button className="btn-primary publish-nav-next" onClick={goNext}>
                Next: Export <ChevronRight size={16} />
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

        {/* Step 2: Export */}
        {currentStep === 'export' && (
          <div className="export-options-panel">
            <div className="panel-header">
              <Download size={20} />
              <h3>Generate Game Files</h3>
            </div>
            <p className="step-intro">
              Create your game export. This generates a complete, playable HTML file.
            </p>

            <div className="export-preview">
              <div className="preview-header">
                <h4>🎮 Export Preview</h4>
                <div className="export-details">
                  <span className="detail-badge">HTML Format</span>
                  <span className="detail-badge">{exportOptions.includeAssets ? 'Assets Included' : 'No Assets'}</span>
                  <span className="detail-badge">Standalone</span>
                </div>
              </div>

              <div className="export-features">
                <div className="feature-item">
                  <CheckCircle2 size={16} className="feature-icon" />
                  <div>
                    <strong>Complete Game</strong>
                    <p>Entire game including engine, assets, and player logic</p>
                  </div>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={16} className="feature-icon" />
                  <div>
                    <strong>Browser Compatible</strong>
                    <p>Works in Chrome, Firefox, Safari, Edge</p>
                  </div>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={16} className="feature-icon" />
                  <div>
                    <strong>No Dependencies</strong>
                    <p>Self-contained — no servers or external libraries</p>
                  </div>
                </div>
              </div>
            </div>

            {lastExport && (
              <div className="previous-export">
                <h4>📦 Previous Export Available</h4>
                <p><strong>{lastExport.filename}</strong> — {formatFileSize(lastExport.size)} — {formatDate(lastExport.createdAt)}</p>
                <div className="previous-export-actions">
                  <button className="btn-secondary" onClick={() => handlePlay()}>
                    <Play size={16} /> Play Previous
                  </button>
                  <button className="btn-secondary" onClick={() => handleDownload(lastExport)}>
                    <Download size={16} /> Download Previous
                  </button>
                </div>
              </div>
            )}

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
              <h3>Share Your Game</h3>
            </div>
            <p className="step-intro">
              {isHostedServiceHealthy
                ? 'Publish your game with real web hosting and share public URLs'
                : 'Download your game file to share or host manually'
              }
            </p>

            {/* Export and Host Action */}
            <div className="publish-actions">
              {!lastExport ? (
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
              ) : (
                <div className="export-actions-grid">
                  <button
                    className="btn-primary export-btn"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <><RefreshCw className="spin" size={18} /> Re-Export</>
                    ) : (
                      <><Download size={18} /> Re-Export Game</>
                    )}
                  </button>
                  {isHostedServiceHealthy && lastExport && (
                    <button
                      className="btn-success publish-host-btn"
                      onClick={() => handleHost(lastExport)}
                      disabled={isHosting}
                    >
                      {isHosting ? (
                        <><RefreshCw className="spin" size={18} /> Hosting...</>
                      ) : (
                        <><PublicGlobe size={18} /> Host for Web</>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results */}
            {lastHosted && (
              <div className="publish-result">
                <div className="publish-result-header">
                  <CheckCircle2 size={24} className="done" />
                  <h4>🌐 Game Hosted Successfully!</h4>
                </div>
                <div className="publish-result-details">
                  <div className="detail-row">
                    <span className="detail-label">🔗 Public URL:</span>
                    <a href={lastHosted.hostedUrl} target="_blank" rel="noopener noreferrer" className="hosted-url">
                      {lastHosted.hostedUrl}
                    </a>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📁 Original:</span>
                    <span>{lastHosted.filename}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🕒 Created:</span>
                    <span>{formatDate(lastHosted.createdAt)}</span>
                  </div>
                  {lastHosted.expiresAt && (
                    <div className="detail-row">
                      <span className="detail-label">⏰ Expires:</span>
                      <span>{formatDate(lastHosted.expiresAt)}</span>
                    </div>
                  )}
                </div>
                <div className="publish-share-actions">
                  <button className="btn-primary" onClick={() => handlePlayHosted()}>
                    <ExternalLink size={16} /> Play in Browser
                  </button>
                  <button className="btn-secondary" onClick={handleCopyHostedLink}>
                    <Copy size={16} /> Copy Link
                  </button>
                  <button className="btn-secondary" onClick={() => handleDownload()}>
                    <Download size={16} /> Download Original
                  </button>
                  <button className="btn-danger" onClick={() => handleDeleteHosted(lastHosted)}>
                    <Trash2 size={16} /> Delete Hosted
                  </button>
                </div>
              </div>
            )}

            {lastExport && !lastHosted && (
              <div className="download-result">
                <div className="download-result-header">
                  <FileText size={24} />
                  <h4>📥 Game Export Ready</h4>
                </div>
                <div className="download-result-details">
                  <div className="detail-row">
                    <span className="detail-label">📁 File:</span>
                    <span>{lastExport.filename}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📏 Size:</span>
                    <span>{formatFileSize(lastExport.size)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🎨 Assets:</span>
                    <span>{lastExport.assetCount} embedded</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🕒 Created:</span>
                    <span>{formatDate(lastExport.createdAt)}</span>
                  </div>
                </div>
                <div className="download-share-actions">
                  <button className="btn-primary" onClick={() => handlePlay()}>
                    <ExternalLink size={16} /> Open in Browser
                  </button>
                  <button className="btn-secondary" onClick={handleCopyDownloadLink}>
                    <Copy size={16} /> Copy Link
                  </button>
                  <button className="btn-secondary" onClick={() => handleDownload()}>
                    <Download size={16} /> Download File
                  </button>
                  {isHostedServiceHealthy && (
                    <button className="btn-success" onClick={() => handleHost(lastExport)}>
                      <PublicGlobe size={16} /> Host for Web
                    </button>
                  )}
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
                        {isHostedServiceHealthy && (
                          <button
                            className="btn-icon btn-host"
                            onClick={() => handleHost(exp)}
                            title={hostedExports.find(h => h.filename === exp.filename) ? 'Already Hosted' : 'Host for Web'}
                            disabled={!!hostedExports.find(h => h.filename === exp.filename)}
                          >
                            <PublicGlobe size={18} />
                          </button>
                        )}
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(exp)} title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hosted Exports History */}
            {isHostedServiceHealthy && hostedExports.length > 0 && (
              <div className="hosted-history-section">
                <div className="panel-header">
                  <PublicGlobe size={20} />
                  <h3>Hosted Games</h3>
                  <span className="export-count">{hostedExports.length}</span>
                </div>
                <div className="hosted-list">
                  {hostedExports.map((hosted) => (
                    <div key={hosted.id} className="hosted-item">
                      <div className="hosted-item-info">
                        <div className="hosted-item-header">
                          <h4>🌐 {hosted.projectName}</h4>
                          <span className="hosted-badge">Public</span>
                        </div>
                        <div className="hosted-item-meta">
                          <a href={hosted.hostedUrl} target="_blank" rel="noopener noreferrer" className="hosted-url">
                            {hosted.hostedUrl}
                          </a>
                          <span>•</span>
                          <span>{formatDate(hosted.createdAt)}</span>
                          {hosted.expiresAt && (
                            <>
                              <span>•</span>
                              <span className="expires-at">
                                <Clock size={12} /> Expires {formatDate(hosted.expiresAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="hosted-item-actions">
                        <button className="btn-icon btn-play" onClick={() => handlePlayHosted(hosted)} title="Play"><Play size={18} /></button>
                        <button className="btn-icon btn-copy" onClick={() => {
                          navigator.clipboard.writeText(hosted.hostedUrl);
                          showToast({ type: 'success', message: 'Hosted link copied!' });
                        }} title="Copy Link"><Copy size={18} /></button>
                        <button className="btn-icon btn-delete" onClick={() => handleDeleteHosted(hosted)} title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="export-info-section">
        <h3>ℹ️ About Publishing</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🎮 Standalone HTML</h4>
            <p>Exports are single HTML files containing your entire game. They run in any modern browser without dependencies.</p>
          </div>
          <div className="info-card">
            <h4>📦 Embedded Assets</h4>
            <p>All game assets are embedded as data URIs, making exports completely self-contained and portable.</p>
          </div>
          {isHostedServiceHealthy ? (
            <div className="info-card">
              <h4>🌐 Real Web Hosting</h4>
              <p>Automatic publishing to public URLs with expiration control. Perfect for sharing and playtesting.</p>
            </div>
          ) : (
            <div className="info-card">
              <h4>📥 Manual Distribution</h4>
              <p>Download files and upload to any web host, game portal, or share directly with players.</p>
            </div>
          )}
          <div className="info-card">
            <h4>🔧 No Dependencies</h4>
            <p>The exported game includes a minimal engine that runs entirely in browser. No build tools required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
