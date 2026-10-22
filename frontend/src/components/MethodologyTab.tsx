import React, { useState } from 'react';
import {
  BookOpen,
  Layers,
  Sliders,
  Activity,
  Cpu,
  Waves,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
} from 'lucide-react';

export const MethodologyTab: React.FC = () => {
  // Interactive state for all 6 cards
  const [card1Mode, setCard1Mode] = useState<'real' | 'ai'>('real');
  const [card2Mode, setCard2Mode] = useState<'real' | 'ai'>('ai');
  const [card3Mode, setCard3Mode] = useState<'real' | 'ai'>('ai');
  const [card4Mode, setCard4Mode] = useState<'real' | 'ai'>('ai');
  const [card5Preset, setCard5Preset] = useState<'fake' | 'real'>('fake');
  const [card6Sample, setCard6Sample] = useState<1 | 2 | 3>(1);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
      {/* Top Header Card */}
      <div className="bento-card" style={{ flexShrink: 0, padding: '12px 20px' }}>
        <div className="card-header" style={{ marginBottom: '6px', paddingBottom: '6px' }}>
          <h3 className="card-title">
            <BookOpen size={18} color="var(--color-accent-mint)" />
            How OmniVerify Detects Fake Videos (Interactive Guide)
          </h3>
          <span
            style={{
              fontSize: '11.5px',
              background: 'var(--color-elevated)',
              color: 'var(--color-accent-mint)',
              padding: '3px 10px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              fontWeight: 600,
            }}
          >
            Click cards to test each detection clue
          </span>
        </div>
        <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
          OmniVerify checks 6 distinct clues across video frames. Click the interactive toggles below to see how our engine distinguishes real camera footage from AI-generated content.
        </p>
      </div>

      {/* 6 Core Interactive Pillars - 3x2 Bento Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: '12px',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Pillar 1: Object Stability */}
        <div
          className="bento-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-mint)', fontWeight: 700, fontSize: '13.5px' }}>
                <Layers size={16} />
                <span>1. Object Stability</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setCard1Mode('real')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card1Mode === 'real' ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
                    color: card1Mode === 'real' ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Real
                </button>
                <button
                  type="button"
                  onClick={() => setCard1Mode('ai')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card1Mode === 'ai' ? '#EF4444' : 'var(--color-secondary-bg)',
                    color: '#fff',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  AI Glitch
                </button>
              </div>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35, margin: 0 }}>
              Checks if people, items, and backgrounds stay stable without flickering, warping, or vanishing.
            </p>
          </div>

          {/* Interactive Visualizer */}
          <div
            style={{
              background: 'var(--color-secondary-bg)',
              border: `1px solid ${card1Mode === 'real' ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              margin: '8px 0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Live Scene Tracker:</span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: card1Mode === 'real' ? 'var(--color-accent-mint)' : '#EF4444',
                }}
              >
                {card1Mode === 'real' ? '● Stable Continuity' : '▲ Warping Detected'}
              </span>
            </div>

            <div
              style={{
                position: 'relative',
                height: '52px',
                background: '#090D0C',
                borderRadius: '6px',
                border: '1px dashed var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {card1Mode === 'real' ? (
                <div
                  style={{
                    border: '2px solid var(--color-accent-mint)',
                    borderRadius: '4px',
                    padding: '3px 14px',
                    backgroundColor: 'rgba(168, 230, 213, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={13} color="var(--color-accent-mint)" />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-accent-mint)' }}>
                    Person (98% match across 30 frames)
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    border: '2px dashed #EF4444',
                    borderRadius: '4px',
                    padding: '3px 14px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'pulse 1.2s infinite',
                  }}
                >
                  <AlertTriangle size={13} color="#EF4444" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#FCA5A5' }}>
                    Frame Jitter: Boundary shift at Frame 14!
                  </span>
                </div>
              )}
            </div>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)', fontWeight: 600 }}>
            {card1Mode === 'real' ? '✓ Physical objects obey inertia' : '⚠ Irregular shape morphing flagged'}
          </span>
        </div>

        {/* Pillar 2: Camera Grain (Noise) */}
        <div
          className="bento-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF4500', fontWeight: 700, fontSize: '13.5px' }}>
                <Sliders size={16} />
                <span>2. Camera Grain (Noise)</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setCard2Mode('real')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card2Mode === 'real' ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
                    color: card2Mode === 'real' ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Real Grain
                </button>
                <button
                  type="button"
                  onClick={() => setCard2Mode('ai')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card2Mode === 'ai' ? '#EF4444' : 'var(--color-secondary-bg)',
                    color: '#fff',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  AI Smoothed
                </button>
              </div>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35, margin: 0 }}>
              Physical camera sensors leave microscopic grain. AI video generators smooth this texture out.
            </p>
          </div>

          {/* Interactive Visualizer */}
          <div
            style={{
              background: 'var(--color-secondary-bg)',
              border: `1px solid ${card2Mode === 'real' ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              margin: '8px 0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Sensor Grain Scanner:</span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: card2Mode === 'real' ? 'var(--color-accent-mint)' : '#EF4444',
                }}
              >
                {card2Mode === 'real' ? 'Grain Variance: σ² = 0.88' : 'Noise Suppressed: σ² = 0.04'}
              </span>
            </div>

            <div
              style={{
                position: 'relative',
                height: '52px',
                borderRadius: '6px',
                background:
                  card2Mode === 'real'
                    ? 'radial-gradient(circle, #2A3B37 10%, transparent 11%), radial-gradient(circle, #3D4E4A 10%, transparent 11%) #090D0C'
                    : '#090D0C',
                backgroundSize: card2Mode === 'real' ? '8px 8px' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  background: card2Mode === 'real' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(239, 68, 68, 0.15)',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${card2Mode === 'real' ? 'var(--color-accent-mint)' : '#EF4444'}`,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: card2Mode === 'real' ? 'var(--color-accent-mint)' : '#FCA5A5',
                  }}
                >
                  {card2Mode === 'real' ? 'Natural CMOS sensor fingerprint' : 'Artificial smoothing detected!'}
                </span>
              </div>
            </div>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)', fontWeight: 600 }}>
            {card2Mode === 'real' ? '✓ Authentic sensor noise floor verified' : '⚠ Missing camera grain flags AI inpainting'}
          </span>
        </div>

        {/* Pillar 3: Natural Motion & Flow */}
        <div
          className="bento-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF7A45', fontWeight: 700, fontSize: '13.5px' }}>
                <Activity size={16} />
                <span>3. Motion & Movement</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setCard3Mode('real')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card3Mode === 'real' ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
                    color: card3Mode === 'real' ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Fluid
                </button>
                <button
                  type="button"
                  onClick={() => setCard3Mode('ai')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card3Mode === 'ai' ? '#EF4444' : 'var(--color-secondary-bg)',
                    color: '#fff',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Jitter Tear
                </button>
              </div>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35, margin: 0 }}>
              Genuine motion flows smoothly. AI videos often suffer from sudden micro-jitters and impossible speed spikes.
            </p>
          </div>

          {/* Interactive Visualizer */}
          <div
            style={{
              background: 'var(--color-secondary-bg)',
              border: `1px solid ${card3Mode === 'real' ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              margin: '8px 0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Pixel Velocity Field:</span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: card3Mode === 'real' ? 'var(--color-accent-mint)' : '#EF4444',
                }}
              >
                {card3Mode === 'real' ? 'Smooth Vector Flow' : 'Velocity Spike (0.94)'}
              </span>
            </div>

            <div
              style={{
                height: '52px',
                background: '#090D0C',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '0 12px',
              }}
            >
              {card3Mode === 'real' ? (
                <>
                  <div style={{ height: '14px', width: '22%', background: 'var(--color-accent-mint)', borderRadius: '3px', opacity: 0.6 }} />
                  <div style={{ height: '20px', width: '22%', background: 'var(--color-accent-mint)', borderRadius: '3px', opacity: 0.8 }} />
                  <div style={{ height: '24px', width: '22%', background: 'var(--color-accent-mint)', borderRadius: '3px' }} />
                  <div style={{ height: '18px', width: '22%', background: 'var(--color-accent-mint)', borderRadius: '3px', opacity: 0.7 }} />
                </>
              ) : (
                <>
                  <div style={{ height: '10px', width: '22%', background: 'var(--color-accent-mint)', borderRadius: '3px' }} />
                  <div style={{ height: '42px', width: '22%', background: '#EF4444', borderRadius: '3px', boxShadow: '0 0 8px #EF4444' }} />
                  <div style={{ height: '8px', width: '22%', background: '#EF4444', borderRadius: '3px' }} />
                  <div style={{ height: '12px', width: '22%', background: 'var(--color-accent-mint)', borderRadius: '3px' }} />
                </>
              )}
            </div>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)', fontWeight: 600 }}>
            {card3Mode === 'real' ? '✓ Realistic inter-frame inertia' : '⚠ Abrupt pixel acceleration detected'}
          </span>
        </div>

        {/* Pillar 4: AI Pixel Patterns */}
        <div
          className="bento-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-mint)', fontWeight: 700, fontSize: '13.5px' }}>
                <Waves size={16} />
                <span>4. AI Pixel Patterns</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setCard4Mode('real')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card4Mode === 'real' ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
                    color: card4Mode === 'real' ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Natural
                </button>
                <button
                  type="button"
                  onClick={() => setCard4Mode('ai')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card4Mode === 'ai' ? '#EF4444' : 'var(--color-secondary-bg)',
                    color: '#fff',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  AI Grid
                </button>
              </div>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35, margin: 0 }}>
              AI generators use math grids that leave faint repeating patterns. Frequency analysis exposes them.
            </p>
          </div>

          {/* Interactive Visualizer */}
          <div
            style={{
              background: 'var(--color-secondary-bg)',
              border: `1px solid ${card4Mode === 'real' ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              margin: '8px 0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Frequency Spectrum (FFT):</span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: card4Mode === 'real' ? 'var(--color-accent-mint)' : '#EF4444',
                }}
              >
                {card4Mode === 'real' ? 'Smooth Power Decay' : 'Harmonic Grid Spikes'}
              </span>
            </div>

            <div
              style={{
                height: '52px',
                background: '#090D0C',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: '6px 14px',
                gap: '6px',
              }}
            >
              {card4Mode === 'real' ? (
                <>
                  <div style={{ height: '85%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                  <div style={{ height: '65%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                  <div style={{ height: '48%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                  <div style={{ height: '32%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                  <div style={{ height: '20%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                  <div style={{ height: '10%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                </>
              ) : (
                <>
                  <div style={{ height: '80%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                  <div style={{ height: '30%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                  <div style={{ height: '90%', width: '12%', background: '#EF4444', borderRadius: '2px', boxShadow: '0 0 6px #EF4444' }} />
                  <div style={{ height: '25%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                  <div style={{ height: '88%', width: '12%', background: '#EF4444', borderRadius: '2px', boxShadow: '0 0 6px #EF4444' }} />
                  <div style={{ height: '15%', width: '12%', background: 'var(--color-accent-mint)', borderRadius: '2px' }} />
                </>
              )}
            </div>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)', fontWeight: 600 }}>
            {card4Mode === 'real' ? '✓ Natural optical decay verified' : '⚠ Repetitive AI upsampling lattice exposed'}
          </span>
        </div>

        {/* Pillar 5: Combined Scoring (Fusion) */}
        <div
          className="bento-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF4500', fontWeight: 700, fontSize: '13.5px' }}>
                <Cpu size={16} />
                <span>5. Combined Scoring (Fusion)</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setCard5Preset('fake')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card5Preset === 'fake' ? '#EF4444' : 'var(--color-secondary-bg)',
                    color: '#fff',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Test Fake
                </button>
                <button
                  type="button"
                  onClick={() => setCard5Preset('real')}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: card5Preset === 'real' ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
                    color: card5Preset === 'real' ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Test Real
                </button>
              </div>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35, margin: 0 }}>
              Combines results from all 4 tests with weighted importance, producing a reliable confidence score.
            </p>
          </div>

          {/* Interactive Visualizer */}
          <div
            style={{
              background: 'var(--color-secondary-bg)',
              border: `1px solid ${card5Preset === 'real' ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)'}`,
              borderRadius: '8px',
              padding: '10px 12px',
              margin: '8px 0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Evidence Fusion Output:</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: card5Preset === 'real' ? 'var(--color-accent-mint)' : '#EF4444',
                }}
              >
                {card5Preset === 'real' ? 'REAL (93.4%)' : 'MANIPULATED (75.3%)'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
              <div style={{ flex: 1, background: '#090D0C', padding: '4px', borderRadius: '4px', textAlign: 'center' }}>
                Noise: <b>{card5Preset === 'real' ? '0.08' : '1.00'}</b>
              </div>
              <div style={{ flex: 1, background: '#090D0C', padding: '4px', borderRadius: '4px', textAlign: 'center' }}>
                Motion: <b>{card5Preset === 'real' ? '0.12' : '0.94'}</b>
              </div>
              <div style={{ flex: 1, background: '#090D0C', padding: '4px', borderRadius: '4px', textAlign: 'center' }}>
                Pattern: <b>{card5Preset === 'real' ? '0.05' : '0.40'}</b>
              </div>
              <div style={{ flex: 1, background: '#090D0C', padding: '4px', borderRadius: '4px', textAlign: 'center' }}>
                Object: <b>{card5Preset === 'real' ? '0.10' : '0.11'}</b>
              </div>
            </div>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)', fontWeight: 600 }}>
            {card5Preset === 'real' ? '✓ Multiple tests confirm authenticity' : '⚠ Multiple independent signals corroborate edit'}
          </span>
        </div>

        {/* Pillar 6: Clear Explanations */}
        <div
          className="bento-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px 16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF7A45', fontWeight: 700, fontSize: '13.5px' }}>
                <ShieldCheck size={16} />
                <span>6. Clear Explanations</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setCard6Sample(1)}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    borderRadius: '12px',
                    background: card6Sample === 1 ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
                    color: card6Sample === 1 ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Clue 1
                </button>
                <button
                  type="button"
                  onClick={() => setCard6Sample(2)}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    borderRadius: '12px',
                    background: card6Sample === 2 ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
                    color: card6Sample === 2 ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  Clue 2
                </button>
                <button
                  type="button"
                  onClick={() => setCard6Sample(3)}
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 7px',
                    borderRadius: '12px',
                    background: card6Sample === 3 ? 'var(--color-primary)' : 'var(--color-secondary-bg)',
                    color: card6Sample === 3 ? 'var(--color-accent-mint)' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  All Clean
                </button>
              </div>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', lineHeight: 1.35, margin: 0 }}>
              Every verdict gives you exact timestamps, frame numbers, and plain-English reasons for why it was flagged.
            </p>
          </div>

          {/* Interactive Visualizer */}
          <div
            style={{
              background: 'var(--color-secondary-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '10px 12px',
              margin: '8px 0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Audit Trail Sample:</span>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--color-accent-mint)' }}>
                {card6Sample === 1 ? 'Frame 0 – 14' : card6Sample === 2 ? 'Frame 18 – 24' : 'Frames 0 – 30'}
              </span>
            </div>

            <div
              style={{
                fontSize: '11.5px',
                color: card6Sample === 3 ? 'var(--color-accent-mint)' : '#FCA5A5',
                background: '#090D0C',
                padding: '7px 10px',
                borderRadius: '6px',
                lineHeight: 1.35,
              }}
            >
              {card6Sample === 1 && '“Camera grain is missing between 00:00.000 and 00:00.933 (artificially smoothed).”'}
              {card6Sample === 2 && '“Unnatural motion tear detected: Hand movement shifted abruptly across 6 frames.”'}
              {card6Sample === 3 && '“All 30 frames verified authentic with smooth natural grain and fluid physics.”'}
            </div>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)', fontWeight: 600 }}>
            ✓ Complete transparency with no mystery black boxes
          </span>
        </div>
      </div>
    </div>
  );
};
