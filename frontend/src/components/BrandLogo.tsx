import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 36, className = '', style = {} }) => {
  return (
    <img
      src="/assets/omniverify_logo.png"
      alt="OmniVerify Official Logo"
      className={className}
      style={{
        height: `${size}px`,
        width: 'auto',
        maxHeight: `${size}px`,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    />
  );
};
