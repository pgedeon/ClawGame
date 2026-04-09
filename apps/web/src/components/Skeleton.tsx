/**
 * @clawgame/web - Skeleton Loading Components
 * Shimmer-effect skeleton layouts that match actual page structure.
 * Replaces generic spinners with meaningful loading placeholders.
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
}

/* ─── Base skeleton primitives ─── */

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-line ${className}`} />;
}

export function SkeletonRect({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-rect ${className}`} />;
}

export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-circle ${className}`} />;
}

/* ─── Page-level skeletons ─── */

export function DashboardSkeleton() {
  return (
    <div className="dashboard-page">
      {/* Hero skeleton */}
      <div className="skeleton-hero">
        <SkeletonLine className="skeleton-line--title" />
        <SkeletonLine className="skeleton-line--subtitle" />
        <div className="skeleton-hero-actions">
          <SkeletonRect className="skeleton-btn" />
          <SkeletonRect className="skeleton-btn" />
        </div>
      </div>
      {/* Action cards skeleton */}
      <div className="dashboard-section">
        <SkeletonLine className="skeleton-line--heading" />
        <div className="action-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      </div>
      {/* Projects skeleton */}
      <div className="dashboard-section">
        <SkeletonLine className="skeleton-line--heading" />
        <div className="projects-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-project-card">
              <SkeletonRect className="skeleton-project-thumb" />
              <div className="skeleton-project-info">
                <SkeletonLine className="skeleton-line--name" />
                <SkeletonLine className="skeleton-line--meta" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SceneEditorSkeleton() {
  return (
    <div className="scene-editor-page">
      {/* Header skeleton */}
      <div className="skeleton-editor-header">
        <div className="skeleton-header-left">
          <SkeletonLine className="skeleton-line--title" />
          <SkeletonLine className="skeleton-line--subtitle" />
        </div>
        <div className="skeleton-header-right">
          <SkeletonRect className="skeleton-btn" />
          <SkeletonRect className="skeleton-btn" />
        </div>
      </div>
      {/* Tool options skeleton */}
      <div className="skeleton-tool-bar">
        <SkeletonRect className="skeleton-tool-item" />
        <SkeletonRect className="skeleton-tool-item" />
        <SkeletonRect className="skeleton-tool-item" />
      </div>
      {/* Main area: 3 panels */}
      <div className="skeleton-editor-main">
        <div className="skeleton-panel skeleton-panel--left">
          <SkeletonLine className="skeleton-line--heading" />
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonRect key={i} className="skeleton-asset-item" />
          ))}
        </div>
        <div className="skeleton-panel skeleton-panel--center">
          <SkeletonRect className="skeleton-canvas" />
        </div>
        <div className="skeleton-panel skeleton-panel--right">
          <SkeletonLine className="skeleton-line--heading" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-prop-row">
              <SkeletonLine className="skeleton-prop-label" />
              <SkeletonRect className="skeleton-prop-value" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GamePreviewSkeleton() {
  return (
    <div className="game-preview-page">
      <div className="skeleton-preview-header">
        <SkeletonRect className="skeleton-btn" />
        <SkeletonLine className="skeleton-line--title" />
        <div className="skeleton-stats">
          <SkeletonRect className="skeleton-stat" />
          <SkeletonRect className="skeleton-stat" />
          <SkeletonRect className="skeleton-stat" />
        </div>
      </div>
      <div className="skeleton-preview-canvas">
        <div className="skeleton-overlay-center">
          <SkeletonRect className="skeleton-start-btn" />
        </div>
      </div>
    </div>
  );
}

export function AICommandSkeleton() {
  return (
    <div className="ai-command-page">
      <div className="skeleton-ai-header">
        <SkeletonLine className="skeleton-line--title" />
        <SkeletonRect className="skeleton-status-badge" />
      </div>
      <div className="skeleton-ai-messages">
        <div className="skeleton-message skeleton-message--user">
          <SkeletonLine className="skeleton-line--text" />
        </div>
        <div className="skeleton-message skeleton-message--assistant">
          <SkeletonLine className="skeleton-line--text" />
          <SkeletonLine className="skeleton-line--text short" />
          <SkeletonRect className="skeleton-code-block" />
        </div>
      </div>
      <div className="skeleton-ai-input">
        <SkeletonRect className="skeleton-input-bar" />
      </div>
    </div>
  );
}
