import React from 'react';
import { ShieldAlert, CheckCircle, Search } from 'lucide-react';
import { VideoAnalysisResult } from '../types';

interface ForensicSignalsBentoProps {
  analysis: VideoAnalysisResult;
}

// Friendly plain-English names and descriptions for signals
const SIGNAL_FRIENDLY_INFO: Record<string, { title: string; simpleDesc: string }> = {
  'Noise Residual': {
    title: 'Camera Grain (Noise)',
    simpleDesc: 'Checks if natural camera grain is present or artificially smoothed out by AI tools.',
  },
  'Temporal Flow': {
    title: 'Motion & Movement',
    simpleDesc: 'Checks if movement between frames flows smoothly and realistically without jumps.',
  },
  'Frequency Spectrum': {
    title: 'AI Artifacts (Patterns)',
    simpleDesc: 'Looks for repeating pixel grid patterns typically left behind by AI video generators.',
  },
  'Object Coherence': {
    title: 'Object Stability',
    simpleDesc: 'Checks if people, items, and backgrounds remain consistent without warping or flickering.',
  },
};

export const ForensicSignalsBento: React.FC<ForensicSignalsBentoProps> = ({ analysis }) => {
  return (
    <div
      className="bento-card"
      style={{
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '6px',
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div className="card-header" style={{ marginBottom: '6px', paddingBottom: '6px' }}>
        <h3 className="card-title" style={{ fontSize: '13.5px' }}>
          <Search size={17} color="var(--color-accent-mint)" />
          Detailed Detection Checks
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {analysis.suspicious_intervals.length > 0 ? (
            <span style={{ fontSize: '10.5px', background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.4)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              <ShieldAlert size={13} color="#EF4444" />
              {analysis.suspicious_intervals.length} Suspicious Segment
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--color-accent-mint)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <CheckCircle size={13} color="var(--color-accent-mint)" />
              All Look Natural
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {analysis.signal_breakdowns.map((sb, idx) => {
          const isAnomalous = sb.status === 'Anomalous';
          const isSuspicious = sb.status === 'Suspicious';
          const statusBg = isAnomalous ? 'var(--verdict-fake-bg)' : isSuspicious ? 'var(--verdict-uncertain-bg)' : 'var(--verdict-real-bg)';
          const statusColor = isAnomalous ? 'var(--verdict-fake-text)' : isSuspicious ? 'var(--verdict-uncertain-text)' : 'var(--verdict-real-text)';
          const statusBorder = isAnomalous ? 'var(--verdict-fake-border)' : isSuspicious ? 'var(--verdict-uncertain-border)' : 'var(--verdict-real-border)';

          const friendly = SIGNAL_FRIENDLY_INFO[sb.signal_name] || {
            title: sb.signal_name,
            simpleDesc: sb.description,
          };

          const statusLabel = isAnomalous ? 'Artificial' : isSuspicious ? 'Suspicious' : 'Natural';

          return (
            <div
              key={idx}
              style={{
                background: 'var(--color-secondary-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '6px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '4px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 700, fontSize: '11.5px', color: 'var(--color-text-primary)' }}>
                    {friendly.title}
                  </span>
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '9.5px',
                      fontWeight: 700,
                      backgroundColor: statusBg,
                      color: statusColor,
                      border: `1px solid ${statusBorder}`,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                <p style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.3 }}>
                  {friendly.simpleDesc}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Level: <b style={{ color: isAnomalous ? '#EF4444' : isSuspicious ? '#F59E0B' : 'var(--color-accent-mint)' }}>
                      {isAnomalous ? 'High' : isSuspicious ? 'Medium' : 'Natural'} ({sb.raw_score.toFixed(2)})
                    </b>
                  </span>
                  <span style={{ color: 'var(--color-muted-teal)', fontWeight: 600 }}>Weight: {Math.round(sb.weight * 100)}%</span>
                </div>

                {/* Visual Progress Bar */}
                <div style={{ width: '100%', height: '4px', background: 'var(--color-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, sb.raw_score * 100)}%`,
                      height: '100%',
                      background: isAnomalous ? '#EF4444' : isSuspicious ? '#F59E0B' : 'var(--color-primary)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flagged Segment Alert Strip */}
      {analysis.suspicious_intervals.length > 0 && (
        <div style={{ marginTop: '4px', padding: '5px 10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#FCA5A5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={13} color="#EF4444" />
            <span><b>Flagged Segment:</b> {analysis.suspicious_intervals[0].start_formatted} &rarr; {analysis.suspicious_intervals[0].end_formatted}</span>
          </div>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '10.5px' }}>
            Missing camera grain.
          </span>
        </div>
      )}
    </div>
  );
};
