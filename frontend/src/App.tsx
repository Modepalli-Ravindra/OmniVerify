import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { VideoUploader } from './components/VideoUploader';
import { VideoPlayerTimeline } from './components/VideoPlayerTimeline';
import { VerdictBanner } from './components/VerdictBanner';
import { ForensicSignalsBento } from './components/ForensicSignalsBento';
import { EvaluationTab } from './components/EvaluationTab';
import { MethodologyTab } from './components/MethodologyTab';
import { VideoAnalysisResult } from './types';
import { AlertCircle, History, Clock } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'history' | 'evaluation' | 'methodology'>('analyze');
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisProgress('Ingesting video & decoding bounded frame budget...');
  };

  const handleAnalysisComplete = (result: VideoAnalysisResult) => {
    setAnalysisResult(result);
    setSelectedFrameIndex(0);
    setIsAnalyzing(false);
    setAnalysisProgress('');
    setHistoryList((prev) => [
      {
        filename: result.video_filename,
        verdict: result.verdict,
        confidence: result.calibrated_confidence,
        duration: result.duration_seconds,
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };

  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setIsAnalyzing(false);
    setAnalysisProgress('');
  };

  return (
    <div className="app-layout">
      {/* Brand Sidebar with Official Logo */}
      <Sidebar activeTab={activeTab} setActiveTab={(tab: any) => setActiveTab(tab)} />

      {/* Main Workspace */}
      <div className="main-wrapper">
        <Header
          title={
            activeTab === 'analyze'
              ? 'Multi-Dimensional Digital Video Forensics'
              : activeTab === 'history'
              ? 'Forensic Investigation History'
              : activeTab === 'evaluation'
              ? 'Model Evaluation & Benchmarking'
              : 'Theoretical Foundations & Methodology'
          }
        />

        <main className="content-body">
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #B91C1C',
                color: '#991B1B',
                borderRadius: '8px',
                padding: '12px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'analyze' && (
            <div className="bento-grid">
              {/* Uploader Card */}
              <VideoUploader
                onAnalysisStart={handleAnalysisStart}
                onAnalysisComplete={handleAnalysisComplete}
                onError={handleError}
                isAnalyzing={isAnalyzing}
                analysisProgress={analysisProgress}
              />

              {/* Analysis Results Display */}
              {analysisResult && (
                <>
                  {/* Video Player & Interactive Timeline */}
                  <VideoPlayerTimeline
                    analysis={analysisResult}
                    selectedFrameIndex={selectedFrameIndex}
                    onSelectFrame={setSelectedFrameIndex}
                  />

                  {/* Verdict & Confidence Banner */}
                  <VerdictBanner analysis={analysisResult} />

                  {/* Forensic Signals Bento Breakdown & Intervals */}
                  <ForensicSignalsBento analysis={analysisResult} />
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bento-grid">
              <div className="bento-card col-span-12">
                <div className="card-header">
                  <h3 className="card-title">
                    <History size={18} />
                    Recent Forensic Examinations
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64716D' }}>Local Investigation Session</span>
                </div>

                {historyList.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#004741', color: '#FFFFFF', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px' }}>Target Video</th>
                        <th style={{ padding: '10px 14px' }}>Determination</th>
                        <th style={{ padding: '10px 14px' }}>Confidence</th>
                        <th style={{ padding: '10px 14px' }}>Duration</th>
                        <th style={{ padding: '10px 14px' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((h, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #E2DED5' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{h.filename}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor:
                                  h.verdict === 'REAL'
                                    ? '#D1FAE5'
                                    : h.verdict === 'MANIPULATED'
                                    ? '#FEE2E2'
                                    : '#FEF3C7',
                                color:
                                  h.verdict === 'REAL'
                                    ? '#065F46'
                                    : h.verdict === 'MANIPULATED'
                                    ? '#991B1B'
                                    : '#92400E',
                              }}
                            >
                              {h.verdict}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                            {(h.confidence * 100).toFixed(1)}%
                          </td>
                          <td style={{ padding: '12px 14px' }}>{h.duration}s</td>
                          <td style={{ padding: '12px 14px', color: '#64716D' }}>{h.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#64716D', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                    No videos analyzed in this session yet. Upload a video on the Analyze tab to begin.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'evaluation' && <EvaluationTab />}
          {activeTab === 'methodology' && <MethodologyTab />}
        </main>
      </div>
    </div>
  );
};
