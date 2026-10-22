import React from 'react';
import { ShieldCheck, LogOut, User } from 'lucide-react';
import { AuthSession } from '../services/auth';

interface HeaderProps {
  title: string;
  session: AuthSession | null;
  onSignOut: () => void;
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, session, onSignOut, onNavigateHome }) => {
  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 className="header-title">{title}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '6px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '20px',
                backgroundColor: 'var(--color-elevated)',
                border: '1px solid var(--color-border)',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
            >
              <User size={13} color="var(--color-accent-mint)" />
              <span>{session.user.name || session.user.email}</span>
            </div>

            <button
              onClick={onSignOut}
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '11px', gap: '4px' }}
              title="Sign Out"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
