import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 36, className = '', style = {} }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: 'drop-shadow(0 2px 12px rgba(255, 69, 0, 0.45))',
        flexShrink: 0,
        ...style,
      }}
    >
      <defs>
        {/* Midnight Ash (#1C1C1E) & Ember Orange (#FF4500) Dual Palette */}
        <linearGradient id="omniShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1C1C1E" />
          <stop offset="100%" stopColor="#2A2A2E" />
        </linearGradient>
        <linearGradient id="omniCoreGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF4500" />
          <stop offset="100%" stopColor="#FFA07A" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Container (#1C1C1E Midnight Ash with #FF4500 Ember Orange border) */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill="url(#omniShieldGrad)"
        stroke="#FF4500"
        strokeWidth="2"
      />

      {/* Forensic Focus Corners (Ember Orange) */}
      <path
        d="M10 16V11H15"
        stroke="#FF4500"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M38 16V11H33"
        stroke="#FF4500"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M10 32V37H15"
        stroke="#FF4500"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M38 32V37H33"
        stroke="#FF4500"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Center Forensic Optical Aperture Diamond */}
      <polygon
        points="24,13 34,24 24,35 14,24"
        fill="rgba(255, 69, 0, 0.22)"
        stroke="#FF5E1E"
        strokeWidth="1.8"
      />

      {/* Internal Multi-Signal Sensor Core */}
      <circle cx="24" cy="24" r="5" fill="url(#omniCoreGrad)" />
      <circle cx="24" cy="24" r="2.2" fill="#141416" />

      {/* Scanning Reticle Crosshairs */}
      <line x1="20" y1="24" x2="28" y2="24" stroke="#141416" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="20" x2="24" y2="28" stroke="#141416" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};
