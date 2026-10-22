import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, Mail, User, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { authService, AuthSession } from '../services/auth';
import { BrandLogo } from './BrandLogo';

interface AuthPagesProps {
  mode: 'login' | 'signup';
  onNavigate: (route: string) => void;
  onAuthSuccess: (session: AuthSession) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ mode, onNavigate, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validate form
  const validate = (): string | null => {
    if (!email.trim()) return 'Email address is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please provide a valid email address.';

    if (!password) return 'Password is required.';

    if (mode === 'signup') {
      if (password.length < 8) return 'Password must be at least 8 characters long.';
      if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter.';
      if (!/\d/.test(password)) return 'Password must contain at least one number.';
      if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must contain at least one special character (!@#$%^&* etc.).';
      if (!confirmPassword) return 'Please confirm your password.';
      if (password !== confirmPassword) return 'Passwords do not match. Please re-enter.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      let session: AuthSession;
      if (mode === 'signup') {
        session = await authService.signUp(email.trim(), password, name.trim());
      } else {
        session = await authService.signIn(email.trim(), password);
      }
      onAuthSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ position: 'relative' }}>
      {/* Top-Left Return to Landing Page Button */}
      <button
        type="button"
        onClick={() => onNavigate('/')}
        className="auth-top-back-btn"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(34, 11, 30, 0.85)',
          border: '1.5px solid rgba(220, 88, 109, 0.45)',
          color: 'var(--color-palette-peach)',
          borderRadius: '50px',
          padding: '8px 18px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 20,
        }}
      >
        <ArrowLeft size={16} color="var(--color-accent-mint)" />
        <span>Return to Landing Page</span>
      </button>

      <div className="auth-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            <BrandLogo size={48} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {mode === 'signup' ? 'Create Investigator Account' : 'Forensic Sign In'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
            {mode === 'signup'
              ? 'Access protected forensic workspace & private evidence vault'
              : 'Enter your credentials to access protected forensic workspace'}
          </p>
        </div>

        {/* Error / Alert Banner */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#FCA5A5',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="name">
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="name"
                  type="text"
                  className="auth-input"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                />
                <User size={16} color="var(--color-muted-teal)" style={{ position: 'absolute', right: '14px', top: '14px' }} />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                required
              />
              <Mail size={16} color="var(--color-muted-teal)" style={{ position: 'absolute', right: '14px', top: '14px' }} />
            </div>
          </div>

          <div className="auth-input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="auth-label" htmlFor="password" style={{ marginBottom: 0 }}>
                Password
              </label>
              {mode === 'signup' && (
                <span style={{ fontSize: '11px', color: 'var(--color-muted-teal)' }}>
                  Min 8 chars, letter, number & symbol
                </span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-muted-teal)',
                  cursor: 'pointer',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field (Signup mode only) */}
          {mode === 'signup' && (
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-muted-teal)',
                    cursor: 'pointer',
                  }}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '12px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying with Neon Auth...</span>
              </>
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account' : 'Authenticate & Enter'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Mode Toggle Link */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {mode === 'signup' ? (
            <div>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  onNavigate('/login');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-accent-mint)', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </div>
          ) : (
            <div>
              New to OmniVerify?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  onNavigate('/signup');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-accent-mint)', fontWeight: 600, cursor: 'pointer' }}
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
