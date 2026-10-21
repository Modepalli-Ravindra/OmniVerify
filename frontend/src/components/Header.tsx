import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 className="header-title">{title}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64716D' }}>
          <Activity size={16} color="#004741" />
          <span>Engine Status: <b>Online</b></span>
        </div>
        <span className="header-badge">Academic Year 2026–27</span>
      </div>
    </header>
  );
};
