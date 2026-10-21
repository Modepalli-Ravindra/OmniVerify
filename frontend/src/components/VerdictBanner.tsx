import React from 'react';
import { ShieldCheck, AlertTriangle, HelpCircle, Download, FileText, CheckCircle2 } from 'lucide-react';
import { VideoAnalysisResult } from '../types';

interface VerdictBannerProps {
  analysis: VideoAnalysisResult;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({ analysis }) => {
  const isReal = analysis.verdict === 'REAL';
  const isManipulated = analysis.verdict === 'MANIPULATED';
  const isUncertain = analysis.verdict === 'UNCERTAIN';

  const verdictBg = isReal ? '#D1FAE5' : isManipulated ? '#FEE2E2' : '#FEF3C7';
  const verdictColor = isReal ? '#065F46' : isManipulated ? '#991B1B' : '#92400E';
  const verdictBorder = isReal ? '#0F766E' : isManipulated ? '#B91C1C' : '#B45309';

  const downloadJson = () => {
    window.open(`/api/reports/${encodeURIComponent(analysis.video_filename)}/json`, '_blank');
  };

  const downloadHtml = () => {
    window.open(`/api/reports/${encodeURIComponent(analysis.video_filename)}/html`, '_blank');
  };

  return (
    <div
      className="bento-card col-span-4"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: `6px solid ${verdictBorder}`,
      }}
    >
      <div>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">
            {isReal && <ShieldCheck size={20} color="#0F766E" />}
            {isManipulated && <AlertTriangle size={20} color="#B91C1C" />}
            {isUncertain && <HelpCircle size={20} color="#B45309" />}
            Forensic Verdict
          </h3>
          <span style={{ fontSize: '11px', color: '#64716D' }}>ISO/IEC 27037 Standard</span>
        </div>

        <div
          style={{
            backgroundColor: verdictBg,
            border: `1px solid ${verdictBorder}`,
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: verdictColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Multi-Signal Classification
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: verdictColor, margin: '4px 0' }}>
            {analysis.verdict}
          </div>
          <div style={{ fontSize: '13px', color: verdictColor }}>
            Calibrated Confidence: <b>{(analysis.calibrated_confidence * 100).toFixed(1)}%</b>
          </div>
        </div>

        {/* Executive Forensic Brief (Neon AI Gateway / Explainability Synthesis) */}
        {analysis.executive_brief && (
          <div style={{ backgroundColor: '#F0EDE4', borderRadius: '6px', padding: '10px 12px', marginBottom: '14px', border: '1px solid #E2DCD0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#004741', textTransform: 'uppercase' }}>
                Executive Forensic Brief
              </span>
              <span style={{ fontSize: '10px', backgroundColor: '#004741', color: '#F0EDE4', padding: '2px 6px', borderRadius: '4px' }}>
                {analysis.executive_brief.source === 'neon_ai_gateway' ? 'Neon AI Gateway' : 'Explainability Engine'}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#101816', margin: 0, lineHeight: '1.4' }}>
              {analysis.executive_brief.summary}
            </p>
          </div>
        )}

        {/* Traceable Rationale Summary */}
        <div style={{ marginBottom: '14px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#004741', textTransform: 'uppercase', marginBottom: '6px' }}>
            Traceable Findings
          </h4>
          <ul style={{ paddingLeft: '16px', fontSize: '12px', color: '#101816', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analysis.traceable_explanations.slice(0, 3).map((exp, idx) => (
              <li key={idx}>{exp}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={downloadHtml}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Download size={15} />
            <span>Forensic Dossier (HTML)</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={downloadJson}
            title="Download Raw JSON Machine Digest"
          >
            <FileText size={15} />
            <span>JSON</span>
          </button>

          {analysis.storage_report_url && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => window.open(analysis.storage_report_url, '_blank')}
              title="Download from Neon Private Object Storage"
              style={{ borderColor: '#004741', color: '#004741' }}
            >
              <CheckCircle2 size={14} color="#004741" />
              <span>S3 Vault</span>
            </button>
          )}
        </div>

        <div style={{ fontSize: '11px', color: '#64716D', marginTop: '10px', fontStyle: 'italic', lineHeight: '1.4' }}>
          Notice: Observed anomalies are probabilistic forensic signals and do not represent sole proof without examiner verification.
        </div>
      </div>
    </div>
  );
};
