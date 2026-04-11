/**
 * @clawgame/web - Replay Controls Component
 * UI for recording and playing back game replays.
 * Part of M14: Playtest Lab + Publishing.
 */
import React from 'react';
import { Play, Square, Save, RotateCcw, Download } from 'lucide-react';

interface ReplayControlsProps {
  isRecording: boolean;
  recordingTime: number;
  hasReplay: boolean;
  playbackTime: number;
  playbackProgress: number;
  isPlayingBack: boolean;
  onToggleRecording: () => void;
  onPlayReplay: () => void;
  onPauseReplay: () => void;
  onResetReplay: () => void;
  onDownloadReplay: () => void;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isRecording,
  recordingTime,
  hasReplay,
  playbackTime,
  playbackProgress,
  isPlayingBack,
  onToggleRecording,
  onPlayReplay,
  onPauseReplay,
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
            <span>Replay: {formatTime(playbackTime)}</span>
            <span>{Math.round(playbackProgress * 100)}%</span>
          </div>
        ) : (
          <span>Ready to replay</span>
        )}
      </div>

      <div className="replay-buttons">
        {isRecording ? (
          <button
            className="record-stop-btn"
            onClick={onToggleRecording}
            title="Stop recording"
          >
            <Square size={16} /> Stop
          </button>
        ) : hasReplay ? (
          <React.Fragment>
            <button
              className="playback-play-btn"
              onClick={onPlayReplay}
              title="Play"
              disabled={isPlayingBack}
            >
              <Play size={16} /> Play
            </button>
            <button
              className="playback-pause-btn"
              onClick={onPauseReplay}
              title="Pause"
              disabled={!isPlayingBack}
            >
              <Square size={16} /> Pause
            </button>
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
          </React.Fragment>
        ) : (
          <button
            className="record-start-btn"
            onClick={onToggleRecording}
            title="Start recording"
          >
            <Save size={16} /> Record
          </button>
        )}
      </div>
    </div>
  );
};
