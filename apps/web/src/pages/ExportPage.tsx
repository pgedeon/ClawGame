/**
 * @clawgame/web - Export Page
 * Export games to standalone HTML files with embedded assets
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import '../export-page.css';

export function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [exports, setExports] = useState<ExportResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const exportsData = await api.listExports(projectId);
      setExports(exportsData);
    } catch (err) {
      logger.error('Failed to load exports:', err);
    }
  };

    const handleExport = async () => {
    if (!projectId) return;

    setIsExporting(true);
    setError(null);

    try {
      const result = await api.exportGame(projectId, exportOptions);
      await loadExports();
      
      // Auto-download export
      const downloadUrl = api.downloadExport(projectId, result.filename);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast({ type: 'success', message: 'Game exported successfully!' });
    } catch (err) {
      logger.error('Failed to export game:', err);
      setError('Failed to export game');
      showToast({ type: 'error', message: 'Export failed — check that the server is running' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = (exportResult: ExportResult) => {
    if (!projectId) return;
    const downloadUrl = api.downloadExport(projectId, exportResult.filename);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlay = (exportResult: ExportResult) => {
    if (!projectId) return;
    const downloadUrl = api.downloadExport(projectId, exportResult.filename);
    window.open(downloadUrl, '_blank');
  };

  const handleDelete = async (exportResult: ExportResult) => {
    if (!projectId) return;
    if (!confirm(`Delete export "${exportResult.filename}"?`)) {
      return;
    }

    try {
      await api.deleteExport(projectId, exportResult.filename);
      await loadExports();
    } catch (err) {
      logger.error('Failed to delete export:', err);
      setError('Failed to delete export');
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="export-page">
        <div className="export-loading">
          <RefreshCw className="loading-spinner" />
          <p>Loading export page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="export-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🚀 Export Game</h1>
            <p>Package your game as a standalone HTML file</p>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      <div className="export-content">
        {/* Export Options Panel */}
        <div className="export-options-panel">
          <div className="panel-header">
            <Settings size={20} />
            <h3>Export Options</h3>
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
              <input
                type="checkbox"
                checked={exportOptions.minify}
                disabled
              />
              <div className="option-info">
                <div className="option-header">
                  <span className="option-name">Minify Code</span>
                  <span className="option-badge coming-soon">
                    <Lock size={12} />
                    Coming Soon
                  </span>
                </div>
                <span className="option-description">Reduce file size by minifying code</span>
              </div>
            </label>

            <label className="option-item option-disabled">
              <input
                type="checkbox"
                checked={exportOptions.compress}
                disabled
              />
              <div className="option-info">
                <div className="option-header">
                  <span className="option-name">Compress Output</span>
                  <span className="option-badge coming-soon">
                    <Lock size={12} />
                    Coming Soon
                  </span>
                </div>
                <span className="option-description">Create ZIP file for easy distribution</span>
              </div>
            </label>
          </div>

          <button 
            className="btn-primary export-btn"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <RefreshCw className="spin" size={18} />
                Exporting...
              </>
            ) : (
              <>
                <Download size={18} />
                Export Game
              </>
            )}
          </button>

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

        {/* Export History Panel */}
        <div className="export-history-panel">
          <div className="panel-header">
            <Package size={20} />
            <h3>Export History</h3>
            <span className="export-count">{exports.length}</span>
          </div>

          {exports.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>No exports yet</p>
              <p className="empty-hint">Create your first export to get started</p>
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
                      {exp.includesAssets && (
                        <>
                          <span>•</span>
                          <span>{exp.assetCount} assets</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="export-item-actions">
                    <button
                      className="btn-icon btn-play"
                      onClick={() => handlePlay(exp)}
                      title="Play in browser"
                    >
                      <Play size={18} />
                    </button>
                    <button
                      className="btn-icon btn-download"
                      onClick={() => handleDownload(exp)}
                      title="Download file"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(exp)}
                      title="Delete export"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="export-info-section">
        <h3>ℹ️ About Exports</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🎮 Standalone HTML</h4>
            <p>Exports are single HTML files that contain your entire game, including all assets. They can run in any modern browser without a server.</p>
          </div>
          <div className="info-card">
            <h4>📦 Embedded Assets</h4>
            <p>All game assets (sprites, images, sounds) are embedded as data URIs. This makes the export completely self-contained.</p>
          </div>
          <div className="info-card">
            <h4>🚀 Easy Distribution</h4>
            <p>Share your game by uploading to any web host or game portal, or send the HTML file directly to players.</p>
          </div>
          <div className="info-card">
            <h4>🔧 No Dependencies</h4>
            <p>The exported game includes a minimal game engine that runs entirely in browser. No build tools or npm required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
