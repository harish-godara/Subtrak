/* ══════════════════════════════════════════════════════
   SubTrack — Sidebar Component (React)
   ══════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Link,
  Receipt,
  BarChart3,
  Settings,
  Shield,
  FileCode,
  PanelLeft,
  LogOut,
  Leaf,
  Palette,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSettings, saveSettings, applyAesthetic } from '@/utils/helpers';
import type { AppSettings } from '@/types';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutGrid size={20} /> },
  { path: '/invoices', label: 'Invoices', icon: <Receipt size={20} /> },
  { path: '/integrate', label: 'Integrate', icon: <Link size={20} /> },
  { path: '/scripts', label: 'Scripts & API', icon: <FileCode size={20} /> },
  { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  { path: '/admin', label: 'Admin', icon: <Shield size={20} />, adminOnly: true },
];

export function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [aesthetic, setAesthetic] = useState<AppSettings['aesthetic']>(() => getSettings().aesthetic || 'professional');

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  const toggleAesthetic = () => {
    const next = aesthetic === 'professional' ? 'cozy' : 'professional';
    setAesthetic(next);
    saveSettings({ aesthetic: next });
    applyAesthetic(next);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        minWidth: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        transition: 'width var(--transition-slow), min-width var(--transition-slow)',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'var(--sidebar-active-bg)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--sidebar-accent)',
          fontWeight: 700,
          fontSize: '1rem',
          flexShrink: 0,
          position: 'relative'
        }}>
          S
          <Leaf size={14} style={{ position: 'absolute', bottom: -4, right: -4, transform: 'rotate(45deg)' }} />
        </div>
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--sidebar-text)', whiteSpace: 'nowrap' }}>
            SubTrack
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems
          .filter(item => !item.adminOnly || isAdmin)
          .map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  color: isActive ? 'var(--sidebar-text)' : 'var(--sidebar-text-muted)',
                  border: 'none',
                  borderLeft: isActive && !collapsed ? '4px solid var(--sidebar-accent)' : '4px solid transparent',
                  borderTopRightRadius: 'var(--radius-md)',
                  borderBottomRightRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.icon}
                {!collapsed && item.label}
              </button>
            );
          })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {/* User */}
        {!collapsed && user && (
          <div style={{
            padding: '8px 12px',
            fontSize: '0.75rem',
            color: 'var(--sidebar-text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {user.name}
          </div>
        )}

        {/* Aesthetic Toggle */}
        <button
          onClick={toggleAesthetic}
          title={aesthetic === 'professional' ? 'Switch to Cozy Theme' : 'Switch to Pro Theme'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '10px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            color: 'var(--sidebar-text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <Palette size={20} />
          {!collapsed && (aesthetic === 'professional' ? 'Pro Theme' : 'Cozy Theme')}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '10px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            color: 'var(--sidebar-text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <PanelLeft size={20} style={{ transform: collapsed ? 'scaleX(-1)' : 'none' }} />
          {!collapsed && 'Collapse'}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '10px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            color: 'var(--sidebar-text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <LogOut size={20} />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
}
