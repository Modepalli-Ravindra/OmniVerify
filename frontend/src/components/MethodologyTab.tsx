import React from 'react';
import { BookOpen, Shield, Code2, AlertTriangle, Layers } from 'lucide-react';

export const MethodologyTab: React.FC = () => {
  return (
    <div className="bento-grid">
      <div className="bento-card col-span-12">
        <div className="card-header">
          <h3 className="card-title">
            <BookOpen size={18} />
            Digital Video Forensic Methodology & Theoretical Foundation
          </h3>
          <span style={{ fontSize: '12px', color: '#64716D' }}>ISO/IEC 27037 Digital Evidence Admissibility</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '13px', lineHeight: '1.7', color: '#101816' }}>
          <div>
            <h4 style={{ color: '#004741', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
              1. Entire Video & Scene Forensics (Beyond Face-Swap Bias)
            </h4>
            <p style={{ color: '#64716D' }}>
              Contemporary diffusion and world models (e.g., Sora, Kling, Runway Gen-3) synthesize entire visual scenes rather than
              merely superimposing facial crops. OmniVerify implements full-scene object detection across COCO 80 classes
              (people, vehicles, electronics, background architecture) to track physical object continuity and scene interaction
              dynamics over time.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#004741', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
              2. Sensor Pattern Noise (PRNU) Residual Analysis
            </h4>
            <p style={{ color: '#64716D' }}>
              Physical camera sensors (CMOS/CCD) leave a consistent microscopic Photo-Response Non-Uniformity (PRNU) across authentic frames.
              OmniVerify isolates the high-pass residual R(x, y) = I(x, y) - Gaussian(I) and evaluates spatial variance uniformity. Generative
              inpainting, facial reenactment, and diffusion smoothing inevitably collapse or unnaturally disperse this high-frequency noise floor.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#004741', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
              3. Gunnar-Farneback Dense Optical Flow & Temporal Continuity
            </h4>
            <p style={{ color: '#64716D' }}>
              Natural video obeys physical laws of inertia and fluid optical motion. Neural synthesis often produces high-frequency
              motion jitter, boundary tearing, and unnatural velocity spikes. OmniVerify computes pixel-level dense optical flow fields
              coupled with Structural Similarity (SSIM) to flag temporal velocity discontinuities with millisecond precision.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#004741', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
              4. 2D Fast Fourier Transform (FFT) Radial Spectral Forensics
            </h4>
            <p style={{ color: '#64716D' }}>
              Convolutional upsampling and latent diffusion decoders introduce periodic spatial checkerboard artifacts that appear as
              discrete harmonic spikes in the 2D Fourier power spectrum. By calculating the azimuthally averaged radial power distribution
              P(r), OmniVerify identifies synthetic high-frequency roll-off anomalies without relying on brittle facial classifiers.
            </p>
          </div>

          <div style={{ background: '#FAF9F5', border: '1px solid #E2DED5', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ color: '#004741', fontWeight: 700, fontSize: '14px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Code2 size={16} />
              Open-Source Upstream Attribution & Academic Lineage
            </h4>
            <ul style={{ paddingLeft: '18px', color: '#64716D', fontSize: '12px' }}>
              <li><b>veriFi (heisenberg1804):</b> Multi-signal forensic framework and two-pass bounded sampling philosophy (MIT License).</li>
              <li><b>Temporally Localized Video Manipulation (Okan Umur et al., arXiv:2606.07090):</b> Dense temporal interval boundary tracking.</li>
              <li><b>DeepfakeBench (SCLBD, NeurIPS 2023 D&B):</b> Standardized detection metric definitions and evaluation protocols.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
