import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, HelpCircle, Download, FileText, Loader2 } from 'lucide-react';
import { VideoAnalysisResult } from '../types';
import { authService } from '../services/auth';

interface VerdictBannerProps {
  analysis: VideoAnalysisResult;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({ analysis }) => {
  const [isDownloadingJson, setIsDownloadingJson] = useState(false);
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);

  const isReal = analysis.verdict === 'REAL';
  const isManipulated = analysis.verdict === 'MANIPULATED';
  const isUncertain = analysis.verdict === 'UNCERTAIN';

  const verdictBg = isReal ? 'var(--verdict-real-bg)' : isManipulated ? 'var(--verdict-fake-bg)' : 'var(--verdict-uncertain-bg)';
  const verdictColor = isReal ? 'var(--verdict-real-text)' : isManipulated ? 'var(--verdict-fake-text)' : 'var(--verdict-uncertain-text)';
  const verdictBorder = isReal ? 'var(--verdict-real-border)' : isManipulated ? 'var(--verdict-fake-border)' : 'var(--verdict-uncertain-border)';

  const downloadJson = async () => {
    setIsDownloadingJson(true);
    try {
      const res = await authService.authenticatedFetch(`/api/reports/${encodeURIComponent(analysis.video_filename)}/json`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OmniVerify_Report_${analysis.video_filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('[VerdictBanner] Authenticated JSON fetch fallback:', e);
    } finally {
      setIsDownloadingJson(false);
    }

    // Direct fallback from analysis state if API requires authorization or server is unreachable
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniVerify_Report_${analysis.video_filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadHtml = async () => {
    setIsDownloadingHtml(true);
    try {
      const res = await authService.authenticatedFetch(`/api/reports/${encodeURIComponent(analysis.video_filename)}/html`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OmniVerify_Dossier_${analysis.video_filename}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('[VerdictBanner] Authenticated HTML fetch fallback:', e);
    } finally {
      setIsDownloadingHtml(false);
    }

    const token = authService.getToken();
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    window.open(`/api/reports/${encodeURIComponent(analysis.video_filename)}/html${query}`, '_blank');
  };

  // Convert technical output into simple, everyday English
  const getSimpleExplanation = () => {
    if (isManipulated) {
      return `This video shows clear signs of AI manipulation or digital editing (${(analysis.calibrated_confidence * 100).toFixed(0)}% confidence). Camera grain looks artificially smoothed and movement across frames appears unnatural.`;
    }
    if (isReal) {
      return `This video looks authentic and unedited (${(analysis.calibrated_confidence * 100).toFixed(0)}% confidence). Natural camera textures, lighting, and realistic movement were found throughout.`;
    }
    return `The analysis is inconclusive (${(analysis.calibrated_confidence * 100).toFixed(0)}% confidence). High video compression or motion blur makes it difficult to detect clear clues.`;
  };

  const getSimpleClues = () => {
    if (analysis.traceable_explanations && analysis.traceable_explanations.length > 0) {
      return analysis.traceable_explanations.slice(0, 2).map((exp) => {
        return exp
          .replace(/PRNU sensor noise/gi, 'camera grain')
          .replace(/2D FFT frequency radial decay/gi, 'pixel pattern analysis')
          .replace(/optical flow vector continuity/gi, 'smooth natural movement')
          .replace(/transposed convolution grid harmonics/gi, 'repeating AI pixel patterns')
          .replace(/calibrated confidence/gi, 'confidence')
          .replace(/fusion anomaly score: \d+\.\d+\.?/gi, '')
          .replace(/Evaluated \d+ multi-spectral sensor and temporal signals\./gi, '')
          .trim();
      });
    }
    if (isManipulated) {
      return [
        'Detected artificial smoothing in camera sensor grain.',
        'Movement between consecutive frames looks edited or distorted.'
      ];
    }
    if (isReal) {
      return [
        'Natural camera sensor grain verified across frames.',
        'Physical movements and lighting flow realistically.'
      ];
    }
    return ['Mixed indicators detected due to video compression.'];
  };

  return (
    <div
      className="bento-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: `5px solid ${verdictColor}`,
        padding: '10px 14px',
        gap: '6px',
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div>
        <div className="card-header" style={{ marginBottom: '6px', paddingBottom: '6px' }}>
          <h3 className="card-title" style={{ fontSize: '13.5px' }}>
            {isReal && <ShieldCheck size={18} color="var(--color-accent-mint)" />}
            {isManipulated && <AlertTriangle size={18} color="#F87171" />}
            {isUncertain && <HelpCircle size={18} color="#FCD34D" />}
            Analysis Verdict
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            {isReal ? 'Authentic Video' : isManipulated ? 'AI / Modified Video' : 'Needs Review'}
          </span>
        </div>

        <div
          style={{
            backgroundColor: verdictBg,
            border: `1px solid ${verdictBorder}`,
            borderRadius: '8px',
            padding: '6px 10px',
            textAlign: 'center',
            marginBottom: '6px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: verdictColor, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Overall Result
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: verdictColor, margin: '1px 0' }}>
            {isReal ? 'REAL / ORIGINAL' : isManipulated ? 'FAKE / MANIPULATED' : 'UNCERTAIN'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-text-primary)' }}>
            Confidence: <b>{(analysis.calibrated_confidence * 100).toFixed(1)}%</b>
          </div>
        </div>

        {/* Plain-English Explanation */}
        <div style={{ backgroundColor: 'var(--color-elevated)', borderRadius: '8px', padding: '6px 10px', marginBottom: '6px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-accent-mint)', textTransform: 'uppercase' }}>
              What This Means
            </span>
            <span style={{ fontSize: '9.5px', backgroundColor: 'var(--color-primary)', color: 'var(--color-text-primary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
              Summary
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.35 }}>
            {getSimpleExplanation()}
          </p>
        </div>

        {/* Plain-English Clues Summary */}
        <div style={{ marginBottom: '4px' }}>
          <h4 style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-accent-mint)', textTransform: 'uppercase', marginBottom: '3px' }}>
            Key Clues Found
          </h4>
          <ul style={{ paddingLeft: '16px', fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', margin: 0, lineHeight: 1.3 }}>
            {getSimpleClues().map((clue, idx) => (
              <li key={idx}>{clue}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={downloadHtml}
            disabled={isDownloadingHtml}
            style={{ flex: 1, justifyContent: 'center', padding: '5px 10px', fontSize: '11.5px' }}
          >
            {isDownloadingHtml ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{isDownloadingHtml ? 'Generating...' : 'Download Report'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={downloadJson}
            disabled={isDownloadingJson}
            title="Download Raw Forensic JSON Data"
            style={{ padding: '5px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isDownloadingJson ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            <span>{isDownloadingJson ? 'Exporting...' : 'Raw Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
