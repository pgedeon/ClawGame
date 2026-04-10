/**
 * @clawgame/web - Replay Controls Component
 * UI for recording and playing back game replays.
 * Part of M14: Playtest Lab + Publishing.
 */
import React, { useState, useCallback } from 'react';
import { Play, Square, Save, RotateCcw, Download, Eye } from 'lucide-react';
import { 
  ReplayRecorder, 
  ReplayPlayer, 
  serializeReplay, 
  downloadReplay,
} from '../../rpg/replay';

interface ReplayControlsProps {
  projectId: string;
  isRecording: boolean;
  onToggleRecording: (recording: boolean) => void;
  onStartPlayback: (replay: string) => void;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  projectId,
  isRecording,
  onToggleRecording,
  onStartPlayback,
}) => {
  const [recorder] = useState(() => new ReplayRecorder(projectId));
  const [replayData, setReplayData] = useState<ReplayPlayer | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const handleRecord = useCallback(() => {
    if (isRecording) {
      // Stop recording
      const data = recorder.stop();
      setRecordingTime(0);
      setReplayData(null);
      onToggleRecording(false);
      
      // Download the replay
      downloadReplay(data);
      
      // Auto-play the replay
      const player = new ReplayPlayer(data);
      setReplayData(player);
    } else {
      // Start recording
      recorder.start();
      setRecordingTime(0);
      setReplayData(null);
      onToggleRecording(true);
    }
  }, [isRecording, recorder, onToggleRecording]);

  const handlePlay = useCallback(() => {
    if (replayData) {
      replayData.play();
    }
  }, [replayData]);

  const handlePause = useCallback(() => {
    if (replayData) {
      replayData.pause();
    }
  }, [replayData]);

  const handleReset = useCallback(() => {
    if (replayData) {
      replayData.reset();
      setRecordingTime(0);
    }
  }, [replayData]);

  // Timer for recording
  React.useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

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
        ) : replayData ? (
          <div className="playback-indicator">
            <span>Replay: {formatTime(Math.round(replayData.progress * replayData.durationMs / 1000))}</span>
            <span>{Math.round(replayData.progress * 100)}%</span>
          </div>
        ) : (
          <span>Ready to replay</span>
        )}
      </div>

      <div className="replay-buttons">
        {isRecording ? (
          <button
            className="record-stop-btn"
            onClick={handleRecord}
            title="Stop recording"
          >
            <Square size={16} /> Stop
          </button>
        ) : replayData ? (
          <React.Fragment>
            <button
              className="playback-play-btn"
              onClick={handlePlay}
              title="Play"
              disabled={replayData.isPlaying}
            >
              <Play size={16} /> Play
            </button>
            <button
              className="playback-pause-btn"
              onClick={handlePause}
              title="Pause"
              disabled={!replayData.isPlaying}
            >
              <Square size={16} /> Pause
            </button>
            <button
              className="playback-reset-btn"
              onClick={handleReset}
              title="Reset"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </React.Fragment>
        ) : (
          <button
            className="record-start-btn"
            onClick={handleRecord}
            title="Start recording"
          >
            <Save size={16} /> Record
          </button>
        )}
      </div>
    </div>
  );
};