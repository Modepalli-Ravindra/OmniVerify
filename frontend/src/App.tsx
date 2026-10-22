import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VideoUploader } from './components/VideoUploader';
import { VideoPlayerTimeline } from './components/VideoPlayerTimeline';
import { VerdictBanner } from './components/VerdictBanner';
import { ForensicSignalsBento } from './components/ForensicSignalsBento';
import { EvaluationTab } from './components/EvaluationTab';
import { MethodologyTab } from './components/MethodologyTab';
import { InvestigationHistory } from './components/InvestigationHistory';
import { LandingPage } from './components/LandingPage';
import { AuthPages } from './components/AuthPages';
import { authService, AuthSession } from './services/auth';
import { VideoAnalysisResult } from './types';
import { AlertCircle, Film, UploadCloud } from 'lucide-react';

export const App: React.FC = () => {
  // Authentication session state
  const [session, setSession] = useState<AuthSession | null>(authService.getSession());

  // URL / Route routing state
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash.replace('#', '');
      return hash || path || '/';
    }
    return '/';
  });

  // Dashboard active view tab state
  const [activeTab, setActiveTab] = useState<'analyze' | 'history' | 'evaluation' | 'methodology'>('analyze');

  // Video Analysis state
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to auth changes
  useEffect(() => {
    const unsubscribe = authService.subscribe((sess) => {
      setSession(sess);
    });
    return unsubscribe;
  }, []);

  // Listen to popstate / hashchange for browser back/forward buttons
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.replace('#', '');
      const path = window.location.pathname;
      setCurrentRoute(hash || path || '/');
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Navigation handler updating URL
  const navigate = (route: string) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      window.location.hash = route;
    }
  };

  // Auth Guard: Gated Navigation Enforcement
  useEffect(() => {
    const isAuth = authService.isAuthenticated();

    if (currentRoute.startsWith('/dashboard') && !isAuth) {
      // Unauthenticated access to dashboard -> redirect to /login
      navigate('/login');
    } else if ((currentRoute === '/login' || currentRoute === '/signup') && isAuth) {
      // Authenticated user accessing login/signup -> redirect to /dashboard
      navigate('/dashboard');
    }
  }, [currentRoute, session]);

  const handleAuthSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    navigate('/dashboard');
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setAnalysisResult(null);
    navigate('/');
  };

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
  };

  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setIsAnalyzing(false);
    setAnalysisProgress('');
  };

  // Computed authentication state
  const isAuth = Boolean(session && authService.isAuthenticated());

  // 1. Render Landing Page at '/'
  if (currentRoute === '/' || currentRoute === '') {
    return <LandingPage session={session} onNavigate={navigate} />;
  }

  // 2. Render Login at '/login'
  if (currentRoute.startsWith('/login')) {
    if (isAuth) {
      // Authenticated users are redirected to the application
      navigate('/dashboard');
      return null;
    }
    return (
      <AuthPages
        mode="login"
        onNavigate={navigate}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // 3. Render Signup at '/signup'
  if (currentRoute.startsWith('/signup')) {
    if (isAuth) {
      navigate('/dashboard');
      return null;
    }
    return (
      <AuthPages
        mode="signup"
        onNavigate={navigate}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // 4. Strict Protected Route Guard:
  // If user is NOT authenticated, NEVER render application dashboard.
  // Redirect to login page immediately.
  if (!isAuth) {
    return (
      <AuthPages
        mode="login"
        onNavigate={navigate}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // 5. Render Protected Application Dashboard ONLY after successful authentication
  return (
    <div className="app-layout">
      {/* Sleek Top Navbar with Brand, Full-Width Navigation & User Session */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab: any) => setActiveTab(tab)}
        session={session}
        onSignOut={handleSignOut}
        onNavigateHome={() => navigate('/')}
      />

      {/* Main Workspace (Full Width) */}
      <div className="main-wrapper">
        <main className="content-body">
          {errorMessage && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#FCA5A5',
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

          {/* Tab 1: Forensic Analysis */}
          {activeTab === 'analyze' && !analysisResult && (
            <VideoUploader
              onAnalysisStart={handleAnalysisStart}
              onAnalysisComplete={handleAnalysisComplete}
              onError={handleError}
              isAnalyzing={isAnalyzing}
              analysisProgress={analysisProgress}
            />
          )}

          {activeTab === 'analyze' && analysisResult && (
            <div
              className="analysis-results-workspace"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: '100%',
                minHeight: 0,
              }}
            >
              {/* Top Video Header Strip */}
              <div
                className="bento-card"
                style={{
                  padding: '10px 18px',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Film size={18} color="var(--color-accent-mint)" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {analysisResult.video_filename}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--color-muted-teal)' }}>
                    <span>&bull; {analysisResult.frames.length} Analyzed Frames</span>
                    <span>&bull; {(analysisResult.duration_seconds || 0).toFixed(1)}s Duration</span>
                    {analysisResult.video_hash_sha256 && (
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', background: 'var(--color-elevated)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                        SHA: {analysisResult.video_hash_sha256.slice(0, 12)}...
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <UploadCloud size={14} />
                  <span>Analyze Another Video</span>
                </button>
              </div>

              {/* 2-Column Split Forensic Command View */}
              <div
                className="analysis-split-view"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(380px, 440px) 1fr',
                  gap: '14px',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  paddingRight: '2px',
                  paddingBottom: '10px',
                }}
              >
                {/* Left Column: Dedicated Square Video Monitor & Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <VideoPlayerTimeline
                    analysis={analysisResult}
                    selectedFrameIndex={selectedFrameIndex}
                    onSelectFrame={setSelectedFrameIndex}
                  />
                </div>

                {/* Right Column: Analysis Verdict Dossier & Signal Checks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                  <VerdictBanner analysis={analysisResult} />
                  <ForensicSignalsBento analysis={analysisResult} />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Investigation History */}
          {activeTab === 'history' && <InvestigationHistory />}

          {/* Tab 3: Model Evaluation */}
          {activeTab === 'evaluation' && <EvaluationTab />}

          {/* Tab 4: Forensic Methodology */}
          {activeTab === 'methodology' && <MethodologyTab />}
        </main>
      </div>
    </div>
  );
};
