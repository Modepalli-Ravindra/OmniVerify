import { Video, History, BarChart3, BookOpen, ExternalLink, LogOut, ArrowLeft, Shield } from 'lucide-react';
import { AuthSession } from '../services/auth';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: AuthSession | null;
  onSignOut: () => void;
  onNavigateHome: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <BrandLogo size={36} />
        <div className="brand-text">
          <h1>OmniVerify</h1>
          <span>AI Video Verification</span>
        </div>
      </div>

      {/* Navigation List */}
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
              <Icon size={18} color={isActive ? 'var(--color-accent-mint)' : 'var(--color-muted-teal)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Session & Quick Home Link Footer */}
      <div className="sidebar-user">
        <button
          onClick={onNavigateHome}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-muted-teal)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 0 12px',
            width: '100%',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Landing Page</span>
        </button>

        {session && (
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                {session.user.name || session.user.email}
              </div>
              <button
                onClick={onSignOut}
                style={{ background: 'transparent', border: 'none', color: '#F87171', cursor: 'pointer', display: 'flex', padding: '2px' }}
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)', display: 'block' }}>
              {session.user.email}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
