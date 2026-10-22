import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Eye, Flame, Clock, Layers, Maximize2 } from 'lucide-react';
import { VideoAnalysisResult, FrameForensicSignal } from '../types';

interface VideoPlayerTimelineProps {
  analysis: VideoAnalysisResult;
  selectedFrameIndex: number;
  onSelectFrame: (idx: number) => void;
}

export const VideoPlayerTimeline: React.FC<VideoPlayerTimelineProps> = ({
  analysis,
  selectedFrameIndex,
  onSelectFrame,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewHeatmap, setViewHeatmap] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentFrame = analysis.frames[selectedFrameIndex] || analysis.frames[0];

  const handleTimelineClick = (idx: number, timestampMs: number) => {
    onSelectFrame(idx);
    if (videoRef.current) {
      videoRef.current.currentTime = timestampMs / 1000.0;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="bento-card col-span-7">
      <div className="card-header">
        <h3 className="card-title">
          <Eye size={18} color="var(--color-accent-mint)" />
          Video Player & Frame Timeline
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setViewHeatmap(!viewHeatmap)}
            style={{
              backgroundColor: viewHeatmap ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
              borderColor: viewHeatmap ? 'var(--color-accent-mint)' : 'var(--color-border)',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              padding: '6px 12px',
            }}
          >
            <Flame size={14} color={viewHeatmap ? 'var(--color-accent-mint)' : 'var(--color-muted-teal)'} />
            <span>{viewHeatmap ? 'Heatmap On' : 'Show Heatmap'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            style={{
              backgroundColor: showBoundingBoxes ? 'var(--color-elevated)' : 'var(--color-secondary-bg)',
              borderColor: showBoundingBoxes ? 'var(--color-muted-teal)' : 'var(--color-border)',
              color: 'var(--color-text-primary)',
              fontSize: '12px',
              padding: '6px 12px',
            }}
          >
            <Layers size={14} color="var(--color-accent-mint)" />
            <span>Objects ({currentFrame?.detected_objects?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Video Screen with Canvas Overlay */}
      <div
        className="video-container"
        style={{
          position: 'relative',
          background: '#090D0C',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          height: '275px',
          maxHeight: '285px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {viewHeatmap && currentFrame?.heatmap_data ? (
          <img
            src={currentFrame.heatmap_data}
            alt="Forensic Anomaly Heatmap"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <video
            key={analysis.video_filename}
            ref={videoRef}
            controls
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={(e) => {
              console.warn('[VideoPlayer] Playback error encountered, attempting direct backend stream:', e);
              const target = e.currentTarget;
              const directBackendUrl = `http://127.0.0.1:8000/media/${encodeURIComponent(analysis.video_filename)}`;
              if (target.src !== directBackendUrl) {
                target.src = directBackendUrl;
                target.load();
              }
            }}
            style={{ width: '100%', height: '100%', maxHeight: '275px', objectFit: 'contain' }}
          >
            {(analysis as any).video_blob_url && (
              <source src={(analysis as any).video_blob_url} type="video/mp4" />
            )}
            <source src={`/media/${encodeURIComponent(analysis.video_filename)}`} type="video/mp4" />
            <source src={`http://127.0.0.1:8000/media/${encodeURIComponent(analysis.video_filename)}`} type="video/mp4" />
            Your browser does not support HTML5 video playback.
          </video>
        )}

        {/* Object Bounding Boxes Overlay */}
        {showBoundingBoxes && !viewHeatmap && currentFrame?.detected_objects && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {currentFrame.detected_objects.map((obj, i) => {
              const [x1, y1, x2, y2] = obj.box;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${x1 * 100}%`,
                    top: `${y1 * 100}%`,
                    width: `${(x2 - x1) * 100}%`,
                    height: `${(y2 - y1) * 100}%`,
                    border: '2px solid var(--color-accent-mint)',
                    borderRadius: '4px',
                    boxShadow: '0 0 8px rgba(255, 69, 0, 0.5)',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '0',
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-accent-mint)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-muted-teal)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {obj.label} ({Math.round(obj.confidence * 100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Frame Inspection Details Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          padding: '8px 14px',
          background: 'var(--color-secondary-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          fontSize: '12.5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} color="var(--color-accent-mint)" />
          <span style={{ color: 'var(--color-text-secondary)' }}>
            Time: <b style={{ color: 'var(--color-text-primary)' }}>{currentFrame?.timestamp_formatted || '00:00.000'}</b> (Frame {currentFrame?.frame_index})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>Frame Check: </span>
          <b
            style={{
              color:
                currentFrame?.frame_anomaly_score > 0.65
                  ? '#EF4444'
                  : currentFrame?.frame_anomaly_score > 0.40
                  ? '#F59E0B'
                  : 'var(--color-accent-mint)',
              fontSize: '12.5px',
            }}
          >
            {currentFrame?.frame_anomaly_score > 0.65
              ? `Suspicious (${currentFrame?.frame_anomaly_score.toFixed(2)})`
              : currentFrame?.frame_anomaly_score > 0.40
              ? `Minor Clue (${currentFrame?.frame_anomaly_score.toFixed(2)})`
              : `Natural (${currentFrame?.frame_anomaly_score?.toFixed(2) || '0.00'})`}
          </b>
        </div>
      </div>

      {/* Frame Timeline Strip */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginTop: '10px',
          padding: '2px 0',
        }}
      >
        {analysis.frames.map((frame, idx) => {
          const isSelected = idx === selectedFrameIndex;
          const markerColor =
            frame.frame_anomaly_score > 0.65
              ? '#EF4444'
              : frame.frame_anomaly_score > 0.40
              ? '#F59E0B'
              : 'var(--color-accent-mint)';

          return (
            <div
              key={frame.frame_index}
              onClick={() => handleTimelineClick(idx, frame.timestamp_ms)}
              style={{
                flexShrink: 0,
                width: '64px',
                height: '44px',
                borderRadius: '6px',
                border: isSelected ? '2px solid var(--color-accent-mint)' : '1px solid var(--color-border)',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                background: '#090D0C',
                transition: 'border-color 0.15s ease',
              }}
              title={`Frame ${frame.frame_index} (${frame.timestamp_formatted}) - Anomaly: ${frame.frame_anomaly_score}`}
            >
              <img
                src={frame.thumbnail_data || ''}
                alt={`Frame ${frame.frame_index}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: markerColor,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
