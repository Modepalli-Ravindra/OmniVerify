import React from 'react';
import { Activity, Radio, Waves, ShieldAlert, Cpu } from 'lucide-react';
import { VideoAnalysisResult } from '../types';

interface ForensicSignalsBentoProps {
  analysis: VideoAnalysisResult;
}

export const ForensicSignalsBento: React.FC<ForensicSignalsBentoProps> = ({ analysis }) => {
  return (
    <>
      {/* 4 Individual Signal Bento Cards */}
      <div className="bento-card col-span-12">
        <div className="card-header">
          <h3 className="card-title">
            <Cpu size={18} />
            Multi-Signal Forensic Feature Space & Evidence Fusion
          </h3>
          <span style={{ fontSize: '12px', color: '#64716D' }}>
            Bayesian Log-Odds Fusion Head (Weighted Contributions)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {analysis.signal_breakdowns.map((sb, idx) => {
            const isAnomalous = sb.status === 'Anomalous';
            const isSuspicious = sb.status === 'Suspicious';
            const statusBg = isAnomalous ? '#FEE2E2' : isSuspicious ? '#FEF3C7' : '#D1FAE5';
            const statusColor = isAnomalous ? '#991B1B' : isSuspicious ? '#92400E' : '#065F46';

            return (
              <div
                key={idx}
                style={{
                  background: '#FAF9F5',
                  border: '1px solid #E2DED5',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#004741' }}>{sb.signal_name}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: statusBg,
                        color: statusColor,
                      }}
                    >
                      {sb.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#64716D', marginBottom: '12px', minHeight: '36px' }}>
                    {sb.description}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#64716D' }}>Raw Anomaly Score:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{sb.raw_score.toFixed(3)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span style={{ color: '#64716D' }}>Ensemble Weight:</span>
                    <span style={{ fontWeight: 700 }}>{Math.round(sb.weight * 100)}%</span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: '#E2DED5', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, sb.raw_score * 100)}%`,
                        height: '100%',
                        background: isAnomalous ? '#B91C1C' : isSuspicious ? '#B45309' : '#004741',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Temporally Localized Suspicious Intervals Panel */}
      <div className="bento-card col-span-12">
        <div className="card-header">
          <h3 className="card-title">
            <ShieldAlert size={18} />
            Temporally Localized Suspicious Intervals
          </h3>
          <span style={{ fontSize: '12px', color: '#64716D' }}>
            Millisecond Transition Boundary Logging
          </span>
        </div>

        {analysis.suspicious_intervals.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {analysis.suspicious_intervals.map((inv, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2DED5',
                  borderLeft: '4px solid #B91C1C',
                  borderRadius: '6px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#004741', fontSize: '13px' }}>
                    {inv.start_formatted} &rarr; {inv.end_formatted} (Frames {inv.start_frame}&ndash;{inv.end_frame})
                  </span>
                  <span style={{ color: '#B91C1C', fontWeight: 800, fontSize: '12px' }}>
                    Anomaly: {inv.average_anomaly_score.toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#101816', marginBottom: '4px' }}>
                  <b>Dominant Defect:</b> {inv.primary_contributing_signal}
                </div>
                <div style={{ fontSize: '12px', color: '#64716D' }}>
                  {inv.evidence_rationale}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64716D', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
            No anomalous temporal intervals detected above forensic tolerance threshold. Temporal velocity and frame structural similarity remain continuous.
          </p>
        )}
      </div>
    </>
  );
};
