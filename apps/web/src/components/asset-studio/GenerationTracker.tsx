/**
 * @clawgame/web - Generation Tracker
 * Shows active generation progress and history.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import type { GenerationStatus } from '../../api/client';
import { getGenerationStatusText } from './types';

interface GenerationTrackerProps {
  activeGeneration: GenerationStatus | null;
  generations: GenerationStatus[];
}

export const GenerationTracker: React.FC<GenerationTrackerProps> = ({
  activeGeneration,
  generations,
}) => {
  if (!activeGeneration && generations.length === 0) return null;

  return (
    <>
      {/* Active Generation Progress */}
      {activeGeneration && (
        <div className="studio-panel generation-status">
          <div className="panel-header">
            <Loader2 size={18} className="panel-icon spinning" />
            <h2>Generation Progress</h2>
          </div>

          <div className="generation-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${activeGeneration.progress}%` }}
              />
            </div>
            <div className="progress-text">
              {activeGeneration.progress}% - {getGenerationStatusText(activeGeneration.status)}
            </div>
          </div>

          {activeGeneration.prompt && (
            <div className="generation-prompt">
              <span className="prompt-label">Prompt:</span>
              <span className="prompt-text">{activeGeneration.prompt}</span>
            </div>
          )}
        </div>
      )}

      {/* Recent Generations List */}
      {generations.length > 0 && (
        <div className="studio-panel">
          <div className="panel-header">
            <Loader2 size={18} className="panel-icon" />
            <h2>Recent Generations</h2>
          </div>
          <div className="generations-list">
            {generations.slice(0, 3).map((gen) => (
              <div key={gen.id} className="generation-item">
                <div className="generation-type">{gen.type}</div>
                <div className="generation-status">{getGenerationStatusText(gen.status)}</div>
                <div className="generation-progress-bar">
                  <div
                    className="generation-progress-fill"
                    style={{ width: `${gen.progress}%` }}
                  />
                </div>
              </div>
            ))}
            {generations.length > 3 && (
              <div className="generations-more">+ {generations.length - 3} more</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
