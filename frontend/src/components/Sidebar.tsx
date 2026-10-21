import React from 'react';
import { Shield, Video, History, BarChart3, BookOpen, ExternalLink } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'analyze', label: 'Analyze Video', icon: Video },
    { id: 'history', label: 'Analysis History', icon: History },
    { id: 'evaluation', label: 'Model Evaluation', icon: BarChart3 },
    { id: 'methodology', label: 'Forensic Methodology', icon: BookOpen },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <img
          src="/assets/omniverify_logo.png"
          alt="OmniVerify Official Logo"
          className="brand-logo-img"
        />
        <div className="brand-text">
          <h1>OmniVerify</h1>
          <span>Digital Video Forensics</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', color: '#6D9A91' }}>
        <div><b>Academic Year:</b> 2026–27</div>
        <div style={{ marginTop: '4px' }}>CPU Optimized Inference</div>
      </div>
    </aside>
  );
};
