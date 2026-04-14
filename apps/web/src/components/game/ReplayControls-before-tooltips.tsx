/**
 * @clawgame/web - Replay Controls Component
 * UI for recording and playing back game replays.
 * Part of M14: Playtest Lab + Publishing.
 *
 * IMPROVED: Button groups for better visual hierarchy and spacing
 */
import React from 'react';
import { Play, Square, Save, RotateCcw, Download, StepForward, StepBack } from 'lucide-react';

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
          <input
            className="replay-seek"
            type="range"
            min={0}
            max={1000}
            value={Math.round(playbackProgress * 1000)}
            onChange={(event) => onSeekReplay(Number(event.target.value) / 1000)}
            aria-label="Replay timeline"
          />
        </div>
      )}

      {/* FIXED: Organized buttons into logical groups */}
      <div className="replay-buttons">
        {isRecording ? (
          <div className="replay-primary-group">
            <button
              className="record-stop-btn"
              onClick={onToggleRecording}
              title="Stop recording"
            >
              <Square size={16} /> Stop
            </button>
          </div>
        ) : hasReplay ? (
          <React.Fragment>
            {/* Primary actions - Play/Pause/Stop */}
            <div className="replay-primary-group">
              <button
                className="playback-play-btn"
                onClick={onPlayReplay}
                title="Play"
                disabled={isPlayingBack}
              >
                <Play size={16} /> Play
              </button>
              {!isPlayingBack && (
                <button
                  className="playback-pause-btn"
                  onClick={onPauseReplay}
                  title="Pause"
                  disabled
                >
                  <Square size={16} /> Pause
                </button>
              )}
              {isPlayingBack && (
                <button
                  className="playback-pause-btn"
                  onClick={onPauseReplay}
                  title="Pause"
                >
                  <Square size={16} /> Pause
                </button>
              )}
            </div>

            {/* Separator between primary and secondary */}
            <div className="replay-button-separator" />

            {/* Secondary actions - Frame stepping */}
            <div className="replay-secondary-group">
              <button
                className="playback-step-back-btn"
                onClick={onStepBackReplay}
                title="Step one frame backward"
              >
                <StepBack size={16} /> Back
              </button>
              <button
                className="playback-step-btn"
                onClick={onStepReplay}
                title="Step one frame"
              >
                <StepForward size={16} /> Step
              </button>
            </div>

            {/* Separator between secondary and tertiary */}
            <div className="replay-button-separator" />

            {/* Tertiary actions - Reset/Download */}
            <div className="replay-tertiary-group">
              <button
                className="playback-reset-btn"
                onClick={onResetReplay}
                title="Reset"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button
                className="playback-download-btn"
                onClick={onDownloadReplay}
                title="Download replay"
              >
                <Download size={16} /> Download
              </button>
            </div>
          </React.Fragment>
        ) : (
          <div className="replay-primary-group">
            <button
              className="record-start-btn"
              onClick={onToggleRecording}
              title="Start recording"
            >
              <Save size={16} /> Record
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
