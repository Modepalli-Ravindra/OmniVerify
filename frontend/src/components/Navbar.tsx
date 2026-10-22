import React from 'react';
import { Video, History, BarChart3, BookOpen, LogOut, User, Home } from 'lucide-react';
import { AuthSession } from '../services/auth';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: AuthSession | null;
  onSignOut: () => void;
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  session,
  onSignOut,
  onNavigateHome,
}) => {
  const navItems = [
    { id: 'analyze', label: 'Video Analysis', icon: Video },
    { id: 'history', label: 'Past Investigations', icon: History },
    { id: 'evaluation', label: 'Accuracy & Tests', icon: BarChart3 },
    { id: 'methodology', label: 'How It Works', icon: BookOpen },
  ];

  return (
    <header className="top-navbar">
      {/* Left: Brand Logo & Title (clickable to return home) */}
      <div
        className="navbar-brand"
        onClick={onNavigateHome}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
        title="Go to Home"
      >
        <BrandLogo size={36} />
        <div className="brand-text">
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
            OmniVerify
          </h1>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-teal)', display: 'block' }}>
            AI Video Verification
          </span>
        </div>
      </div>

      {/* Center: Main Navigation Tabs */}
      <nav className="navbar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`navbar-item ${isActive ? 'active' : ''}`}
              type="button"
            >
              <Icon size={16} color={isActive ? 'var(--color-accent-mint)' : 'var(--color-muted-teal)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: User Profile & Quick Actions */}
      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {session && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'var(--color-elevated)',
                border: '1px solid var(--color-border)',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
            >
              <User size={14} color="var(--color-accent-mint)" />
              <span style={{ fontWeight: 600 }}>{session.user.name || session.user.email}</span>
            </div>

            <button
              onClick={onNavigateHome}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11.5px', gap: '5px' }}
              title="Return to Landing Page"
            >
              <Home size={14} />
              <span>Landing</span>
            </button>

            <button
              onClick={onSignOut}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11.5px', gap: '5px' }}
              title="Sign Out"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
