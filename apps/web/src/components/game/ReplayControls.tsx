/**
 * @clawgame/web - Replay Controls Component
 * UI for recording and playing back game replays.
 * Part of M14: Playtest Lab + Publishing.
 *
 * IMPROVED: Button groups, visual hierarchy, and tooltips for discoverability
 */
import React from 'react';
import { Play, Square, Save, RotateCcw, Download, StepForward, StepBack } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface ReplayControlsProps {
  isRecording: boolean;
  recordingTime: number;
  hasReplay: boolean;
  playbackTime: number;
  playbackDuration: number;
  playbackProgress: number;
  isPlayingBack: boolean;
  onToggleRecording: () => void;
  onPlayReplay: () => void;
  onPauseReplay: () => void;
  onSeekReplay: (progress: number) => void;
  onStepBackReplay: () => void;
  onStepReplay: () => void;
  onResetReplay: () => void;
  onDownloadReplay: () => void;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isRecording,
  recordingTime,
  hasReplay,
  playbackTime,
  playbackDuration,
  playbackProgress,
  isPlayingBack,
  onToggleRecording,
  onPlayReplay,
  onPauseReplay,
  onSeekReplay,
  onStepBackReplay,
  onStepReplay,
  onResetReplay,
  onDownloadReplay,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="replay-controls">
      <div className="replay-status">
        {isRecording ? (
          <div className="recording-indicator">
            <div className="recording-dot" />
            <span>Recording: {formatTime(recordingTime)}</span>
          </div>
        ) : hasReplay ? (
          <div className="playback-indicator">
            <span>Replay: {formatTime(playbackTime)} / {formatTime(playbackDuration)}</span>
            <span>{Math.round(playbackProgress * 100)}%</span>
          </div>
        ) : (
          <span>Ready to replay</span>
        )}
      </div>

      {hasReplay && (
        <div className="replay-timeline">
          <Tooltip text="Drag to seek replay position" position="top">
            <input
              className="replay-seek"
              type="range"
              min={0}
              max={1000}
              value={Math.round(playbackProgress * 1000)}
              onChange={(event) => onSeekReplay(Number(event.target.value) / 1000)}
              aria-label="Replay timeline"
            />
          </Tooltip>
        </div>
      )}

      {/* FIXED: Organized buttons into logical groups with tooltips */}
      <div className="replay-buttons">
        {isRecording ? (
          <div className="replay-primary-group">
            <Tooltip text="Stop recording (Ctrl/Cmd + R)" position="top">
              <button
                className="record-stop-btn"
                onClick={onToggleRecording}
                aria-label="Stop recording"
              >
                <Square size={16} /> Stop
              </button>
            </Tooltip>
          </div>
        ) : hasReplay ? (
          <React.Fragment>
            {/* Primary actions - Play/Pause/Stop */}
            <div className="replay-primary-group">
              <Tooltip text="Play replay (Ctrl/Cmd + Space)" position="top">
                <button
                  className="playback-play-btn"
                  onClick={onPlayReplay}
                  disabled={isPlayingBack}
                  aria-label="Play replay"
                >
                  <Play size={16} /> Play
                </button>
              </Tooltip>
              {!isPlayingBack && (
                <Tooltip text="Pause (Ctrl/Cmd + Space)" position="top">
                  <button
                    className="playback-pause-btn"
                    onClick={onPauseReplay}
                    disabled
                    aria-label="Pause replay"
                  >
                    <Square size={16} /> Pause
                  </button>
                </Tooltip>
              )}
              {isPlayingBack && (
                <Tooltip text="Pause (Ctrl/Cmd + Space)" position="top">
                  <button
                    className="playback-pause-btn"
                    onClick={onPauseReplay}
                    aria-label="Pause replay"
                  >
                    <Square size={16} /> Pause
                  </button>
                </Tooltip>
              )}
            </div>

            {/* Separator between primary and secondary */}
            <div className="replay-button-separator" />

            {/* Secondary actions - Frame stepping */}
            <div className="replay-secondary-group">
              <Tooltip text="Step one frame backward (Ctrl/Cmd + Left Arrow)" position="top">
                <button
                  className="playback-step-back-btn"
                  onClick={onStepBackReplay}
                  aria-label="Step one frame backward"
                >
                  <StepBack size={16} /> Back
                </button>
              </Tooltip>
              <Tooltip text="Step one frame forward (Ctrl/Cmd + Right Arrow)" position="top">
                <button
                  className="playback-step-btn"
                  onClick={onStepReplay}
                  aria-label="Step one frame forward"
                >
                  <StepForward size={16} /> Step
                </button>
              </Tooltip>
            </div>

            {/* Separator between secondary and tertiary */}
            <div className="replay-button-separator" />

            {/* Tertiary actions - Reset/Download */}
            <div className="replay-tertiary-group">
              <Tooltip text="Reset to start (Esc)" position="top">
                <button
                  className="playback-reset-btn"
                  onClick={onResetReplay}
                  aria-label="Reset to start"
                >
                  <RotateCcw size={16} /> Reset
                </button>
              </Tooltip>
              <Tooltip text="Download replay file (Ctrl/Cmd + S)" position="top">
                <button
                  className="playback-download-btn"
                  onClick={onDownloadReplay}
                  aria-label="Download replay file"
                >
                  <Download size={16} /> Download
                </button>
              </Tooltip>
            </div>
          </React.Fragment>
        ) : (
          <div className="replay-primary-group">
            <Tooltip text="Start recording (Ctrl/Cmd + R)" position="top">
              <button
                className="record-start-btn"
                onClick={onToggleRecording}
                aria-label="Start recording"
              >
                <Save size={16} /> Record
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};
