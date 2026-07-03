/* ══════════════════════════════════════════════════════
   SubTrack — Auth Page (React + TypeScript)
   ══════════════════════════════════════════════════════ */

import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

export function AuthPage() {
  const { isAuthenticated, login, register } = useAuth();
  const { showToast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (isRegister && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (isRegister) {
        user = await register(email.trim(), name.trim(), password);
      } else {
        user = await login(email.trim(), password);
      }
      showToast(`Welcome${isRegister ? '' : ' back'}, ${user.name}!`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: 24,
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
        animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, var(--accent), #8B5CF6)',
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 700,
            borderRadius: 14,
            marginBottom: 16,
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
          }}>
            S
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            SubTrack
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
            {isRegister ? 'Create your account to get started' : 'Sign in to manage your subscriptions'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ padding: '12px 14px', fontSize: '0.9375rem', borderRadius: 10 }}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="you@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding: '12px 14px', fontSize: '0.9375rem', borderRadius: 10 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding: '12px 14px', fontSize: '0.9375rem', borderRadius: 10 }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 8,
              color: 'var(--danger)',
              fontSize: '0.8125rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              fontSize: '0.9375rem',
              fontWeight: 600,
              borderRadius: 10,
              marginTop: 4,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? (isRegister ? 'Creating...' : 'Signing in...')
              : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
          <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.8125rem',
              padding: 0,
              marginLeft: 4,
            }}
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  );
}
