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
    <div className="bento-card col-span-8">
      <div className="card-header">
        <h3 className="card-title">
          <Eye size={18} />
          Synchronized Video Canvas & Evidence Timeline
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setViewHeatmap(!viewHeatmap)}
            style={{
              backgroundColor: viewHeatmap ? '#004741' : 'transparent',
              color: viewHeatmap ? '#FFFFFF' : '#101816',
            }}
          >
            <Flame size={14} />
            <span>{viewHeatmap ? 'Heatmap Active' : 'Show Spatial Heatmap'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            style={{
              backgroundColor: showBoundingBoxes ? '#E6F0EE' : 'transparent',
            }}
          >
            <Layers size={14} />
            <span>Scene Objects ({currentFrame?.detected_objects?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Video Screen with Canvas Overlay */}
      <div className="video-container" style={{ position: 'relative' }}>
        {viewHeatmap && currentFrame?.heatmap_data ? (
          <img
            src={currentFrame.heatmap_data}
            alt="Forensic Anomaly Heatmap"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <video
            ref={videoRef}
            src={`/media/${analysis.video_filename}`}
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{ width: '100%', height: '100%' }}
          />
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
                    border: '2px solid #004741',
                    borderRadius: '2px',
                    boxShadow: '0 0 6px rgba(0, 71, 65, 0.4)',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '0',
                      backgroundColor: '#004741',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '2px',
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
          marginTop: '14px',
          padding: '8px 12px',
          background: '#FAF9F5',
          border: '1px solid #E2DED5',
          borderRadius: '6px',
          fontSize: '13px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} color="#004741" />
          <span>
            Current Timestamp: <b>{currentFrame?.timestamp_formatted || '00:00.000'}</b> (Frame {currentFrame?.frame_index})
          </span>
        </div>
        <div>
          Frame Anomaly Score:{' '}
          <b
            style={{
              color:
                currentFrame?.frame_anomaly_score > 0.65
                  ? '#B91C1C'
                  : currentFrame?.frame_anomaly_score > 0.40
                  ? '#B45309'
                  : '#0F766E',
            }}
          >
            {currentFrame?.frame_anomaly_score?.toFixed(3) || '0.000'}
          </b>
        </div>
      </div>

      {/* Frame Timeline Strip */}
      <div className="timeline-track">
        {analysis.frames.map((frame, idx) => {
          const isSelected = idx === selectedFrameIndex;
          const markerColor =
            frame.frame_anomaly_score > 0.65
              ? '#B91C1C'
              : frame.frame_anomaly_score > 0.40
              ? '#B45309'
              : '#0F766E';

          return (
            <div
              key={frame.frame_index}
              onClick={() => handleTimelineClick(idx, frame.timestamp_ms)}
              className={`timeline-frame-item ${isSelected ? 'selected' : ''}`}
              title={`Frame ${frame.frame_index} (${frame.timestamp_formatted}) - Anomaly: ${frame.frame_anomaly_score}`}
            >
              <img
                src={frame.thumbnail_data || ''}
                alt={`Frame ${frame.frame_index}`}
              />
              <div
                className="timeline-marker-bar"
                style={{ backgroundColor: markerColor }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
