/**
 * @clawgame/web - Empty state component for new projects
 */

import React from 'react';
import { FolderOpen, Plus, FileCode2, Gamepad2 } from 'lucide-react';

interface EmptyStateProps {
  type: 'projects' | 'scenes' | 'assets' | 'entities';
  onCreate?: () => void;
  createLabel?: string;
}

const emptyMessages: Record<string, { icon: typeof FolderOpen; title: string; description: string }> = {
  projects: {
    icon: FolderOpen,
    title: 'No projects yet',
    description: 'Create your first game project to get started.',
  },
  scenes: {
    icon: FileCode2,
    title: 'No scenes in this project',
    description: 'Add a scene to start building your game world.',
  },
  assets: {
    icon: FolderOpen,
    title: 'No assets in the pack',
    description: 'Upload images, spritesheets, or audio files.',
  },
  entities: {
    icon: Gamepad2,
    title: 'This scene is empty',
    description: 'Add entities using the toolbar or drag from the asset browser.',
  },
};

export function EmptyState({ type, onCreate, createLabel }: EmptyStateProps) {
  const config = emptyMessages[type] ?? emptyMessages.projects;
  const Icon = config.icon;

  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">
        <Icon size={48} strokeWidth={1.5} />
      </div>
      <h3 className="empty-state-title">{config.title}</h3>
      <p className="empty-state-description">{config.description}</p>
      {onCreate && (
        <button className="primary-action-btn" onClick={onCreate}>
          <Plus size={16} /> {createLabel || 'Create'}
        </button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="loading-state-container">
      <div className="loading-spinner" />
      <p className="loading-message">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state-container">
      <p className="error-message">{message}</p>
      {onRetry && (
        <button className="secondary-action-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
