import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  Video,
  Activity,
  Layers,
  Cpu,
  FileText,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Search,
  Sliders,
  Menu,
  X,
  ExternalLink,
  Home,
  BookOpen,
  HelpCircle,
  User,
  ChevronDown,
  Eye,
  Scan,
  Zap,
  Radio,
  Check,
  Sparkles,
  Target,
  ChevronRight
} from 'lucide-react';
import { AuthSession } from '../services/auth';
import { BrandLogo } from './BrandLogo';

interface LandingPageProps {
  session: AuthSession | null;
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ session, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0); // First question open by default
  const [samplePlaying, setSamplePlaying] = useState(true);
  const [scrubberSec, setScrubberSec] = useState(12);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play on mount with robust browser policy fallback
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setSamplePlaying(true))
          .catch(() => setSamplePlaying(false));
      }
    }
  }, []);

  // Play / pause toggle handler
  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => setSamplePlaying(true)).catch(() => {});
      } else {
        videoRef.current.pause();
        setSamplePlaying(false);
      }
    } else {
      setSamplePlaying(!samplePlaying);
    }
  };

  // Live motion playback timer synced with scrubber
  useEffect(() => {
    if (!samplePlaying) return;
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.duration) {
        const cur = Math.round(videoRef.current.currentTime);
        setScrubberSec(cur);
      } else {
        setScrubberSec((prev) => (prev >= 7 ? 0 : prev + 1));
      }
    }, 400);
    return () => clearInterval(interval);
  }, [samplePlaying]);

  return (
    <div style={{ backgroundColor: 'var(--color-main-bg)', color: 'var(--color-text-primary)', minHeight: '100vh' }}>
      {/* 1. Global Floating Glassmorphism Navbar */}
      <header className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => onNavigate('/')}>
          <BrandLogo size={36} />
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--color-text-primary)' }}>
              OmniVerify
            </h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-teal)', display: 'block' }}>
              Multi-Dimensional Video Forensics
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links with Icons and Rounded Hover Pills */}
        <nav style={{ display: 'none', alignItems: 'center', gap: '6px' }} className="desktop-links">
          <button
            onClick={() => { onNavigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="nav-pill-item"
          >
            <Home size={14} color="var(--color-accent-mint)" />
            <span>Home</span>
          </button>
          <a href="#platform" className="nav-pill-item">
            <Layers size={14} />
            <span>Platform</span>
          </a>
          <a href="#methodology" className="nav-pill-item">
            <BookOpen size={14} />
            <span>Methodology</span>
          </a>
          <a href="#pipeline" className="nav-pill-item">
            <Activity size={14} />
            <span>Pipeline</span>
          </a>
          <a href="#limitations" className="nav-pill-item">
            <AlertTriangle size={14} />
            <span>Limitations</span>
          </a>
          <a href="#faq" className="nav-pill-item">
            <HelpCircle size={14} />
            <span>Q&A</span>
          </a>
        </nav>

        {/* Auth CTA Actions & User Session Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="nav-pill-item"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-elevated)',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  gap: '6px',
                  cursor: 'default',
                }}
              >
                <User size={13} color="var(--color-accent-mint)" />
                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.user.name || session.user.email}
                </span>
              </div>
              <button
                onClick={() => onNavigate('/dashboard')}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                <span>Launch Dashboard</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onNavigate('/login')}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('/signup')}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                <span>Create Account</span>
                <ArrowRight size={15} />
              </button>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', display: 'flex' }}
            className="mobile-toggle"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div style={{ backgroundColor: 'var(--color-secondary-bg)', border: '2px solid var(--color-border)', borderRadius: '30px', margin: '8px 14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => { setMobileMenuOpen(false); onNavigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="nav-pill-item"
            style={{ width: 'fit-content' }}
          >
            <Home size={16} color="var(--color-accent-mint)" />
            <span>Home</span>
          </button>
          <a href="#platform" className="nav-pill-item" onClick={() => setMobileMenuOpen(false)}>
            <Layers size={16} />
            <span>Platform</span>
          </a>
          <a href="#methodology" className="nav-pill-item" onClick={() => setMobileMenuOpen(false)}>
            <BookOpen size={16} />
            <span>Forensic Methodology</span>
          </a>
          <a href="#pipeline" className="nav-pill-item" onClick={() => setMobileMenuOpen(false)}>
            <Activity size={16} />
            <span>Pipeline Workflow</span>
          </a>
          <a href="#limitations" className="nav-pill-item" onClick={() => setMobileMenuOpen(false)}>
            <AlertTriangle size={16} />
            <span>Research & Limitations</span>
          </a>
          <a href="#faq" className="nav-pill-item" onClick={() => setMobileMenuOpen(false)}>
            <HelpCircle size={16} />
            <span>Forensic Q&A</span>
          </a>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {session ? (
              <button onClick={() => { setMobileMenuOpen(false); onNavigate('/dashboard'); }} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Open Dashboard
              </button>
            ) : (
              <>
                <button onClick={() => { setMobileMenuOpen(false); onNavigate('/login'); }} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Sign In
                </button>
                <button onClick={() => { setMobileMenuOpen(false); onNavigate('/signup'); }} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. Hero Section - Two-Column Forensic Suite (Visual Reference Match) */}
      <section className="landing-hero">
        {/* Dynamic Theme-Colored Forensic Background Animations (Non-intrusive) */}
        <div className="hero-cyber-bg" aria-hidden="true">
          {/* Pulsing Ember Glow Nebulae */}
          <div className="cyber-glow-orb orb-1" />
          <div className="cyber-glow-orb orb-2" />
          <div className="cyber-glow-orb orb-3" />

          {/* Digital Forensic Grid Matrix */}
          <div className="cyber-grid-overlay" />

          {/* Dual Laser Scanning Sweep Beams */}
          <div className="cyber-laser-beam horizontal" />
          <div className="cyber-laser-beam vertical" />

          {/* Ambient Rotating Radar Compass */}
          <div className="cyber-radar-compass">
            <div className="radar-sweep-beam" />
            <div className="radar-ring ring-outer" />
            <div className="radar-ring ring-middle" />
            <div className="radar-ring ring-inner" />
            <div className="radar-crosshair h" />
            <div className="radar-crosshair v" />
          </div>

          {/* Floating Ember Particles */}
          <div className="cyber-ember-particles">
            {[...Array(12)].map((_, i) => (
              <span key={i} className={`ember-dot ember-${i + 1}`} />
            ))}
          </div>

          {/* Flowing Waveform Stream in Ember Theme */}
          <svg className="cyber-waveform-stream" viewBox="0 0 1400 160" preserveAspectRatio="none">
            <path
              d="M 0 80 Q 175 20, 350 80 T 700 80 T 1050 80 T 1400 80"
              fill="none"
              stroke="url(#orangeWaveGrad)"
              strokeWidth="1.5"
              className="wave-line wave-1"
            />
            <path
              d="M 0 80 Q 175 140, 350 80 T 700 80 T 1050 80 T 1400 80"
              fill="none"
              stroke="url(#orangeWaveGrad2)"
              strokeWidth="1"
              className="wave-line wave-2"
            />
            <defs>
              <linearGradient id="orangeWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF4500" stopOpacity="0" />
                <stop offset="50%" stopColor="#FF5E1E" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="orangeWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF5E1E" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFA07A" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#FF5E1E" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="hero-two-column-layout">
          {/* Left Column: Trust Badge, Headline, Subtext, and CTAs */}
          <div className="hero-left-col">
            <div className="hero-trust-badge">
              <Shield size={13} color="#FF5E1E" />
              <span>Trusted by Researchers &amp; Forensic Experts</span>
            </div>

            <h1 className="hero-reference-title">
              Uncover the Truth Behind<br />Every Frame.
            </h1>

            <p className="hero-reference-subtext">
              Investigate video authenticity through visual, temporal, and frequency-based forensic signals.
              OmniVerify analyzes multi-dimensional evidence to help you spot manipulation and understand what&apos;s real.
            </p>

            <div className="hero-cta-row">
              <button
                onClick={() => onNavigate(session ? '/dashboard' : '/signup')}
                className="hero-btn-primary"
              >
                <span>Get Started — Analyze Video</span>
                <ArrowRight size={16} />
              </button>
              <a href="#methodology" className="hero-btn-secondary">
                Explore Methodology
              </a>
            </div>
          </div>

          {/* Right Column: Polished Video Forensics Suite */}
          <div className="hero-forensic-visual-wrap">
            {/* Concentric Forensic Radar Grid in Background */}
            <svg className="hero-concentric-circles" viewBox="0 0 600 600" aria-hidden="true">
              <circle cx="300" cy="300" r="120" stroke="rgba(255, 69, 0, 0.18)" strokeWidth="1" strokeDasharray="3 3" fill="none" />
              <circle cx="300" cy="300" r="190" stroke="rgba(255, 69, 0, 0.12)" strokeWidth="1" fill="none" />
              <circle cx="300" cy="300" r="260" stroke="rgba(255, 69, 0, 0.07)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
              <circle cx="300" cy="300" r="320" stroke="rgba(255, 69, 0, 0.04)" strokeWidth="1" fill="none" />
            </svg>

            {/* Restrained Ambient Glow */}
            <div className="hero-visual-glow" />

            {/* Main Stage: Video Player + 3 Right-Hand Panels */}
            <div className="hero-forensic-stage">
              {/* Ghost Layered Depth Cards (Left Offset) */}
              <div className="ghost-card ghost-card-2" />
              <div className="ghost-card ghost-card-1" />

              {/* Video Player Card */}
              <div className="hero-video-card">
                {/* Floating "Suspected Manipulation" Callout Badge */}
                <div className="suspected-callout-wrap">
                  <div className="suspected-callout-badge">
                    <Shield size={13} color="#FF5E1E" style={{ flexShrink: 0 }} />
                    <span className="beacon-alert-dot" />
                    <div>
                      <strong>Suspected Manipulation</strong>
                      <span>Inconsistent facial region</span>
                    </div>
                  </div>
                  {/* SVG Angled Connector Line down to the Face Reticle */}
                  <svg className="callout-line-svg" viewBox="0 0 50 35" fill="none" aria-hidden="true">
                    <path d="M 8 0 L 16 14 L 24 22" stroke="#FF5E1E" strokeWidth="1.5" className="callout-line-path" />
                    <circle cx="24" cy="22" r="3" fill="#FF5E1E" />
                  </svg>
                </div>

                {/* Video Screen Viewport */}
                <div
                  className="hero-video-viewport"
                  onClick={handleTogglePlay}
                  style={{ cursor: 'pointer' }}
                  title="Click to play / pause video"
                >
                  {/* Laser Scanning Beam Sweep */}
                  <div className="hero-scanline-beam" />

                  {/* High Definition Forensic Loop Video */}
                  <video
                    ref={videoRef}
                    src="/assets/hero_forensic_video.mp4"
                    poster="/assets/hero_video_frame.jpg"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="hero-video-img"
                    onPlay={() => setSamplePlaying(true)}
                    onPause={() => setSamplePlaying(false)}
                  />

                  {/* Paused Overlay with glowing play button */}
                  {!samplePlaying && (
                    <div className="video-paused-overlay">
                      <div className="center-play-circle">
                        <Play size={20} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '2px' }} />
                      </div>
                      <span>Click to Play Live Forensic Stream</span>
                    </div>
                  )}

                  {/* Facial Detection Reticle with Biometric Landmarks */}
                  <div className="hero-face-reticle">
                    <span className="reticle-bracket top-left" />
                    <span className="reticle-bracket top-right" />
                    <span className="reticle-bracket bottom-left" />
                    <span className="reticle-bracket bottom-right" />
                    <div className="reticle-landmarks">
                      <span className="reticle-dot dot-eye-left" />
                      <span className="reticle-dot dot-eye-right" />
                      <span className="reticle-dot dot-nose" />
                      <span className="reticle-dot dot-mouth" />
                    </div>
                    <div className="reticle-id-badge">CONF: 98.4%</div>
                  </div>

                  {/* Illustrative Preview Badge (Req 9: Scientific Transparency) */}
                  <div className="illustrative-tag">
                    Illustrative Demo Preview
                  </div>
                </div>

                {/* Video Controls Bottom Bar with Live Interactive Scrubber */}
                <div className="hero-video-controls">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="video-play-btn"
                    aria-label={samplePlaying ? 'Pause video' : 'Play video'}
                  >
                    {samplePlaying ? (
                      <Pause size={11} fill="#FFFFFF" color="#FFFFFF" />
                    ) : (
                      <Play size={11} fill="#FFFFFF" color="#FFFFFF" />
                    )}
                  </button>
                  <div
                    className="video-scrubber-track"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      if (videoRef.current && videoRef.current.duration) {
                        videoRef.current.currentTime = ratio * videoRef.current.duration;
                        setScrubberSec(Math.round(videoRef.current.currentTime));
                      }
                    }}
                  >
                    <div
                      className="video-scrubber-fill"
                      style={{ width: `${Math.min(100, Math.max(0, (scrubberSec / 40) * 100))}%`, transition: 'width 0.3s linear' }}
                    />
                    <div
                      className="video-scrubber-thumb"
                      style={{ left: `${Math.min(100, Math.max(0, (scrubberSec / 40) * 100))}%`, transition: 'left 0.3s linear' }}
                    />
                  </div>
                  <span className="video-timecode">
                    00:{scrubberSec < 10 ? `0${scrubberSec}` : scrubberSec} / 00:40
                  </span>
                </div>
              </div>

              {/* Right-Side Forensic Signal Panels (3 Vertical Cards) */}
              <div className="hero-signal-panels">
                {/* Connector Lines */}
                <svg className="signal-connector-lines" viewBox="0 0 24 200" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M 0 35 L 24 35" stroke="rgba(255, 69, 0, 0.45)" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                  <path d="M 0 100 L 24 100" stroke="rgba(255, 69, 0, 0.45)" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                  <path d="M 0 165 L 24 165" stroke="rgba(255, 69, 0, 0.45)" strokeWidth="1" fill="none" strokeDasharray="2 2" />
                </svg>

                {/* 1. Object Detection Panel */}
                <div className="signal-card-row">
                  <div className="signal-thumb-box">
                    <img src="/assets/face_wireframe_thumb.jpg" alt="Object Detection" className="signal-thumb-img" />
                  </div>
                  <div className="signal-card-meta">
                    <h4>Object Detection</h4>
                    <p>Scene coherence analysis</p>
                  </div>
                </div>

                {/* 2. Motion Analysis Panel with Dynamic Oscillating Waveform */}
                <div className="signal-card-row">
                  <div className="signal-thumb-box motion-wave-box">
                    <div className="motion-vector-wave">
                      {[12, 24, 16, 30, 8, 26, 34, 14, 28, 20, 32, 16, 26, 10, 22, 16, 28, 14].map((h, i) => (
                        <span
                          key={i}
                          className="motion-wave-bar"
                          style={{
                            height: `${h}px`,
                            animationDelay: `${(i * 0.08).toFixed(2)}s`,
                            animationDuration: `${(0.75 + (i % 5) * 0.15).toFixed(2)}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="signal-card-meta">
                    <h4>Motion Analysis</h4>
                    <p>Optical flow &amp; SSIM</p>
                  </div>
                </div>

                {/* 3. Frequency Spectrum Panel */}
                <div className="signal-card-row">
                  <div className="signal-thumb-box">
                    <img src="/assets/fft_spectrum_thumb.jpg" alt="Frequency Spectrum" className="signal-thumb-img" />
                  </div>
                  <div className="signal-card-meta">
                    <h4>Frequency Spectrum</h4>
                    <p>2D FFT radial decay</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Suspicious-Frame Timeline Filmstrip */}
            <div className="hero-timeline-wrap">
              <div className="hero-filmstrip-row">
                {[
                  { id: 1, suspicious: false },
                  { id: 2, suspicious: true },
                  { id: 3, suspicious: false },
                  { id: 4, suspicious: true },
                  { id: 5, suspicious: false },
                  { id: 6, suspicious: true },
                  { id: 7, suspicious: false },
                  { id: 8, suspicious: false }
                ].map((frame) => (
                  <div
                    key={frame.id}
                    className={`timeline-frame-cell ${frame.suspicious ? 'is-suspicious' : ''}`}
                    title={`Examine Frame #${frame.id}`}
                    onClick={() => {
                      if (videoRef.current && videoRef.current.duration) {
                        videoRef.current.currentTime = ((frame.id - 1) / 8) * videoRef.current.duration;
                        setScrubberSec(Math.round(videoRef.current.currentTime));
                      }
                    }}
                  >
                    <img
                      src={`/assets/timeline_frame_${frame.id}.jpg`}
                      alt={`Forensic Frame ${frame.id}`}
                      className="timeline-frame-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/hero_video_frame.jpg';
                      }}
                    />
                    {frame.suspicious && <span className="suspicious-marker-dot">▲</span>}
                  </div>
                ))}
                <div className="filmstrip-nav-arrow" aria-label="Next frames">
                  <ChevronRight size={14} color="#FF5E1E" />
                </div>
              </div>

              {/* Suspicious Frames Bracket Legend */}
              <div className="suspicious-bracket-legend">
                <div className="bracket-line" />
                <span>Suspicious Frames</span>
                <div className="bracket-line right" />
                <div className="timeline-mini-progress">
                  <div className="mini-progress-fill" style={{ width: '48%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Feature Cards Below Hero (Visual Reference Match) */}
        <div className="reference-feature-grid">
          <a href="#platform" className="ref-feature-card">
            <div className="ref-card-icon-wrap">
              <Target size={22} color="#FF5E1E" />
            </div>
            <div className="ref-card-content">
              <div className="ref-card-header">
                <h3>Full-Scene Intelligence</h3>
                <ArrowRight size={15} className="ref-card-arrow" />
              </div>
              <p>Detects objects, context and background coherence across the entire frame.</p>
            </div>
          </a>

          <a href="#methodology" className="ref-feature-card">
            <div className="ref-card-icon-wrap">
              <Activity size={22} color="#FF5E1E" />
            </div>
            <div className="ref-card-content">
              <div className="ref-card-header">
                <h3>Optical Flow &amp; SSIM</h3>
                <ArrowRight size={15} className="ref-card-arrow" />
              </div>
              <p>Tracks motion patterns and structural consistency between frames.</p>
            </div>
          </a>

          <a href="#methodology" className="ref-feature-card">
            <div className="ref-card-icon-wrap">
              <Cpu size={22} color="#FF5E1E" />
            </div>
            <div className="ref-card-content">
              <div className="ref-card-header">
                <h3>Sensor Noise Analysis</h3>
                <ArrowRight size={15} className="ref-card-arrow" />
              </div>
              <p>Examines PRNU and noise residuals for sensor-level inconsistencies.</p>
            </div>
          </a>

          <a href="#methodology" className="ref-feature-card">
            <div className="ref-card-icon-wrap">
              <Sliders size={22} color="#FF5E1E" />
            </div>
            <div className="ref-card-content">
              <div className="ref-card-header">
                <h3>Frequency Analysis</h3>
                <ArrowRight size={15} className="ref-card-arrow" />
              </div>
              <p>Identifies generative artifacts through 2D FFT and spectral patterns.</p>
            </div>
          </a>
        </div>

        {/* Subtle Cyber Topography Dot-Wave Background */}
        <div className="hero-bottom-topography" aria-hidden="true">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="topography-svg">
            <path d="M0,40 C320,110 520,10 720,50 C920,90 1120,20 1440,70" fill="none" stroke="rgba(255, 69, 0, 0.12)" strokeWidth="1" strokeDasharray="3 4" />
            <path d="M0,60 C300,10 560,90 800,40 C1040,0 1240,80 1440,50" fill="none" stroke="rgba(255, 69, 0, 0.08)" strokeWidth="1" strokeDasharray="2 3" />
            <path d="M0,80 C260,110 600,30 900,70 C1200,110 1320,40 1440,90" fill="none" stroke="rgba(255, 69, 0, 0.04)" strokeWidth="1" strokeDasharray="4 5" />
          </svg>
        </div>
      </section>

      {/* 3. Platform Capabilities Bento Grid */}
      <section id="platform" style={{ padding: '80px 24px', maxWidth: '1240px', margin: '0 auto', position: 'relative' }}>
        <div id="methodology" style={{ position: 'absolute', top: '-70px', left: 0 }} />
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="section-pill-outline">
            <Layers size={13} color="var(--color-accent-mint)" />
            <span>Forensic Capabilities</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '8px' }}>
            Multi-Signal Forensic Architecture
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '640px', margin: '10px auto 0', fontSize: '15px' }}>
            Unlike black-box neural networks that overfit to specific generation models, OmniVerify inspects
            intrinsic physical, sensor, and optical invariants.
          </p>
        </div>

        <div className="bento-grid">
          {/* Card 1 */}
          <div className="bento-card col-span-4">
            <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'var(--color-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid var(--color-border)' }}>
              <Layers size={20} color="var(--color-accent-mint)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              2D Fourier FFT Spectral Analysis
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Generative upsamplers and autoencoders leave distinct high-frequency radial power drop-offs.
              OmniVerify computes azimuthally averaged 2D FFT spectra to flag unnatural frequency decay.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bento-card col-span-4">
            <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'var(--color-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid var(--color-border)' }}>
              <Activity size={20} color="var(--color-accent-mint)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              Dense Optical Flow Continuity
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Deepfake facial swaps flicker at inter-frame boundary transitions. Using Gunnar-Farneback
              dense vector fields and Structural Similarity (SSIM), motion irregularities are mapped to exact frame intervals.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bento-card col-span-4">
            <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'var(--color-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid var(--color-border)' }}>
              <Sliders size={20} color="var(--color-accent-mint)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              Sensor Noise Residuals (PRNU)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Physical camera sensors impart unique microscopic Photo-Response Non-Uniformity patterns.
              Synthetic image synthesis replaces natural sensor fingerprinting with uniform Gaussian noise.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bento-card col-span-4">
            <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'var(--color-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid var(--color-border)' }}>
              <Video size={20} color="var(--color-accent-mint)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              SSDLite Face & Spatial Tracking
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Continuous spatial region tracking isolates facial boundaries from background camera motion,
              ensuring optical flow and sensor noise analysis target true facial manipulation zones.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bento-card col-span-4">
            <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'var(--color-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid var(--color-border)' }}>
              <Cpu size={20} color="var(--color-accent-mint)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              Heuristic Log-Odds Evidence Fusion
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Individual signals are weighted through a mathematically calibrated log-odds voting head.
              OmniVerify produces an anomaly score between 0.0 and 1.0, accompanied by human-readable
              evidence rationales explaining which signals contributed to the final verdict.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bento-card col-span-4">
            <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'var(--color-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: '1px solid var(--color-border)' }}>
              <FileText size={20} color="var(--color-accent-mint)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              Tamper-Evident Chain-of-Custody Dossiers
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Every examination computes a SHA-256 digital fingerprint, persisting records in Neon Lakebase
              Postgres and exporting structured JSON audit logs alongside executive-ready HTML forensic dossiers.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Forensic Workflow Pipeline */}
      <section id="pipeline" style={{ padding: '90px 24px', maxWidth: '1240px', margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div className="section-pill-outline">
            <Activity size={13} color="var(--color-accent-mint)" />
            <span>End-to-End Execution</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '8px' }}>
            The Four-Stage Forensic Pipeline
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {[
            {
              step: '01',
              title: 'Ingestion & Fingerprint',
              desc: 'Client uploads video; backend sanitizes filename, extracts FPS and resolution, and calculates immutable SHA-256 hash.',
            },
            {
              step: '02',
              title: 'Bounded Sampling',
              desc: 'Uniformly samples frames within a bounded budget (15–30 frames) to maintain predictable <40MB memory usage.',
            },
            {
              step: '03',
              title: 'Multi-Signal Extraction',
              desc: 'Parallel computation of Gunnar-Farneback optical flow, SSIM, PRNU residuals, and 2D Fourier spectrum power decay.',
            },
            {
              step: '04',
              title: 'Fusion & Dossier Export',
              desc: 'Scores combined into REAL, MANIPULATED, or UNCERTAIN determination with signed exportable reports.',
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: 'var(--color-card-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '32px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 28px rgba(20, 5, 18, 0.6)',
              }}
            >
              <div>
                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--color-palette-coral)', display: 'block', marginBottom: '12px' }}>
                  {s.step}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Scientific Grounding, Research & Limitations */}
      <section id="limitations" style={{ padding: '80px 24px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="section-pill-outline">
            <ShieldCheck size={13} color="var(--color-accent-mint)" />
            <span>Academic Rigor & Transparency</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '8px' }}>
            Responsible Disclosure & Limitations
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '680px', margin: '10px auto 0', fontSize: '15px' }}>
            OmniVerify strictly disclaims certainty. Automated forensic tools must never be treated as sole legal proof of fabrication.
          </p>
        </div>

        <div style={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: '40px', padding: '36px', boxShadow: '0 8px 30px rgba(0, 1, 13, 0.5)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            <div style={{ gridColumn: 'span 6' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-mint)' }}>
                <CheckCircle2 size={18} />
                Methodological Strengths
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <li>• <b>Explainable Signals:</b> Every finding points to tangible physical metrics (motion jump, sensor drift, spectral cutoff).</li>
                <li>• <b>Deterministic Pipeline:</b> Constant execution time and memory bounds on edge CPU devices without GPU requirements.</li>
                <li>• <b>Cryptographic Isolation:</b> Built on serverless Neon PostgreSQL with multi-tenant row isolation and signed JWTs.</li>
              </ul>
            </div>

            <div style={{ gridColumn: 'span 6' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B' }}>
                <AlertTriangle size={18} />
                Known Operational Limitations
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <li>• <b>Heavy Social Media Compression:</b> H.264/H.265 re-encoding can attenuate PRNU sensor noise and high-frequency spectral cues.</li>
                <li>• <b>Cross-Domain Invariance:</b> Complex adversarial synthesis requires cross-validation over noise residuals, optical flow, and spectral decay.</li>
                <li>• <b>Heuristic Voting:</b> High scores indicate signal anomalies, which can occur due to legitimate video cuts or sensor quirks.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Forensic Q&A Section */}
      <section id="faq" style={{ padding: '80px 24px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="section-pill-outline">
            <HelpCircle size={13} color="var(--color-accent-mint)" />
            <span>Forensic Q&A</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: '8px' }}>
            Frequently Addressed Inquiries
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '640px', margin: '10px auto 0', fontSize: '15px' }}>
            Essential answers on multi-dimensional signal extraction, verification methodologies, and evidence validation.
          </p>
        </div>

        <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            {
              q: 'How does 2D Fourier FFT spectral analysis identify synthetic generation?',
              a: 'Generative diffusion models and neural upsamplers leave unnatural radial high-frequency power decay curves and periodic grid artifacts that differ fundamentally from the continuous natural spectra of real optical camera lenses.'
            },
            {
              q: 'Why does OmniVerify use dense Gunnar-Farneback optical flow over basic frame differencing?',
              a: 'Dense optical flow tracks full-field 2D velocity vector fields across adjacent frames. When face-swapping models insert fake faces, boundary flickering and velocity field discontinuities occur that simple color subtraction cannot detect.'
            },
            {
              q: 'What is Sensor PRNU noise fingerprinting?',
              a: 'Every physical CMOS or CCD camera sensor has microscopic silicon manufacturing irregularities known as Photo-Response Non-Uniformity. Real camera footage retains this unique high-frequency sensor noise, whereas synthetic image synthesis overwrites it with uniform noise.'
            },
            {
              q: 'Can OmniVerify run on edge CPU environments without expensive GPUs?',
              a: 'Yes. OmniVerify is engineered with a strict CPU inference budget (<40MB RAM usage) and bounded sampling (15–30 frames), making it readily deployable on standard server and laptop CPU environments without GPU reliance.'
            },
            {
              q: 'How is the forensic chain of custody cryptographically secured?',
              a: 'Upon ingestion, an immutable SHA-256 digital fingerprint of the video is calculated and persisted in serverless Neon Lakebase PostgreSQL. Every analysis record includes verifiable audit logs and signed exportable dossiers.'
            },
            {
              q: 'Can social media compression affect detection confidence?',
              a: 'Aggressive lossy re-encoding (e.g. WhatsApp or Twitter H.264 compression) can attenuate microscopic PRNU and high-frequency FFT cues. OmniVerify factors compression artifacts into its calibrated log-odds voting head to prevent false accusations.'
            }
          ].map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                style={{
                  background: 'var(--color-card-bg)',
                  border: `1.5px solid ${isOpen ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
                  borderRadius: '24px',
                  padding: '18px 22px',
                  cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isOpen ? '0 8px 30px rgba(220, 88, 109, 0.22)' : '0 4px 16px rgba(20, 5, 18, 0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isOpen ? 'linear-gradient(135deg, var(--color-primary), var(--color-palette-wine))' : 'var(--color-elevated)',
                      color: '#FFF5F2',
                      fontWeight: 800,
                      fontSize: '12px',
                      flexShrink: 0,
                      border: '1px solid var(--color-border)',
                      transition: 'all 0.2s ease',
                    }}>
                      Q
                    </span>
                    <h3 style={{
                      fontSize: '1.02rem',
                      fontWeight: 700,
                      color: isOpen ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      margin: 0,
                      transition: 'color 0.2s ease',
                      textAlign: 'left',
                    }}>
                      {item.q}
                    </h3>
                  </div>

                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--color-elevated)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease',
                    }}
                  >
                    <ChevronDown size={16} color="var(--color-accent-mint)" />
                  </div>
                </div>

                {isOpen && (
                  <div
                    style={{
                      paddingTop: '16px',
                      marginTop: '14px',
                      borderTop: '1px solid rgba(220, 88, 109, 0.20)',
                      fontSize: '13.5px',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.65,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(251, 149, 144, 0.15)',
                      color: 'var(--color-accent-mint)',
                      fontWeight: 800,
                      fontSize: '12px',
                      flexShrink: 0,
                      border: '1px solid var(--color-border-hover)',
                    }}>
                      A
                    </span>
                    <p style={{ margin: 0, paddingTop: '3px' }}>
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Minimal Clean Dark Footer */}
      <footer style={{ padding: '32px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-main-bg)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BrandLogo size={28} />
            <div>
              <b style={{ color: 'var(--color-text-primary)' }}>OmniVerify</b>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-muted-teal)' }}>
                Intelligent Multi-Dimensional Video Identification
              </span>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--color-muted-teal)' }}>
            Multi-Signal Forensic Chain of Custody
          </div>
        </div>
      </footer>

      {/* Inline styles for desktop / mobile media queries */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-links { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </div>
  );
};
