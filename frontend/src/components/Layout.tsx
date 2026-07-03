/* ══════════════════════════════════════════════════════
   SubTrack — App Layout (React)
   ══════════════════════════════════════════════════════ */

import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';

export function Layout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'linear-gradient(135deg, var(--accent), #8B5CF6)',
          borderRadius: 10,
          animation: 'pulse 1.5s infinite',
        }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div id="app" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main
        id="main-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '28px 32px',
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
