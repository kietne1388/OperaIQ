import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToasts } from './ToastContext';
import { useNotificationHub } from '../realtime/useNotificationHub';
import FloatingChatbox from './FloatingChatbox';

const navItems = [
  { to: '/', label: 'Tổng quan', icon: 'bi-grid-fill' },
  { to: '/projects', label: 'Dự án', icon: 'bi-folder-fill' },
  { to: '/tasks', label: 'Công việc', icon: 'bi-kanban' },
  { to: '/calendar', label: 'Lịch trình', icon: 'bi-calendar-event' },
  { to: '/team', label: 'Nhân sự', icon: 'bi-people-fill' },
  { to: '/documents', label: 'Tài liệu', icon: 'bi-file-earmark-text-fill' },
  { to: '/system', label: 'Hệ thống', icon: 'bi-gear-wide-connected' },
] as const;

/** OperaIQ brand mark – crescent + inner circle */
function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor">
      <path d="M 50 10 A 40 40 0 1 0 85 65 A 35 35 0 1 1 50 10 Z" />
      <circle cx="55" cy="45" r="14" fill="none" stroke="currentColor" strokeWidth="6" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const { push } = useToasts();
  const [badge, setBadge] = useState(1);
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useNotificationHub(!!user, (n) => {
    push(n.title, n.message, n.type);
    setBadge((b) => b + 1);
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const firstName = user?.fullName?.split(' ')[0] ?? 'Carlic';

  return (
    <div className="app-shell d-flex flex-column flex-md-row" style={{ minHeight: '100vh', backgroundColor: '#EFEEEA' }}>

      {/* ── MOBILE HEADER ── */}
      <div className="d-md-none d-flex justify-content-between align-items-center p-3 bg-white border-bottom sticky-top" style={{ zIndex: 1050 }}>
        <button
          className="border-0 bg-transparent p-0 d-flex align-items-center gap-2"
          style={{ color: 'var(--accent-green)', cursor: 'pointer' }}
          onClick={() => window.location.reload()}
          title="Làm mới trang"
        >
          <LogoMark size={28} />
          <span className="fw-bold fs-5" style={{ color: '#202220' }}>OperaIQ</span>
        </button>
        <button className="btn btn-light" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <i className={`bi ${sidebarOpen ? 'bi-x-lg' : 'bi-list'} fs-4`}></i>
        </button>
      </div>

      {/* ── LEFT FIXED COLUMN (LOGO + SIDEBAR PILL) ── */}
      <div
        className={`left-column ${sidebarOpen ? 'd-flex' : 'd-none d-md-flex'} flex-column align-items-center`}
        style={{
          width: '110px',
          padding: '28px 0',
          position: 'fixed',
          height: '100vh',
          top: 0,
          left: '30px',
          zIndex: 1040,
          backgroundColor: sidebarOpen ? 'rgba(239,238,234,0.96)' : 'transparent',
          backdropFilter: sidebarOpen ? 'blur(8px)' : 'none',
        }}
      >
        {/* ── Logo (clickable → reload) ── */}
        <button
          className="d-none d-md-flex mb-3 border-0 bg-transparent p-0 align-items-center justify-content-center"
          style={{ color: 'var(--accent-green)', cursor: 'pointer', transition: 'opacity 0.15s' }}
          onClick={() => window.location.reload()}
          title="OperaIQ – Làm mới trang"
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.75')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          <LogoMark size={43} />
        </button>

        {/* ── Sidebar Pill ── */}
        <aside
          className="app-sidebar bg-white shadow-sm d-flex flex-column align-items-center py-4 w-100"
          style={{ maxWidth: '80px', borderRadius: '40px', flexGrow: 1, overflowY: 'auto', marginBottom: '16px' }}
        >
          <nav className="sidebar-nav d-flex flex-column gap-3 w-100 mb-auto">
            {navItems.filter(item => item.to !== '/system' || hasRole('TenantAdmin') || hasRole('TenantOwner') || hasRole('SuperAdmin')).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''} position-relative d-flex justify-content-center align-items-center`
                }
                title={item.label}
                onClick={() => setSidebarOpen(false)}
              >
                <i className={`bi ${item.icon}`} />
                {/* @ts-ignore */}
                {item.isAI && (
                  <i
                    className="bi bi-stars position-absolute text-warning ai-sparkle"
                    style={{ top: '10px', right: '8px', fontSize: '10px' }}
                  />
                )}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-profile d-flex flex-column align-items-center gap-3" style={{ position: 'relative' }}>
            {/* Avatar – click to toggle menu */}
            <div
              className="mt-2"
              style={{ width: '48px', height: '48px', cursor: 'pointer', position: 'relative' }}
              onClick={() => setShowUserMenu((v) => !v)}
              title="Tài khoản"
            >
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullName || 'Carlic'}`}
                alt="avatar"
                style={{ width: '100%', height: '100%', borderRadius: '50%', border: showUserMenu ? '2px solid var(--accent-green)' : '2px solid transparent', transition: 'border-color 0.2s', objectFit: 'cover' }}
              />
            </div>

            {/* Popup menu – chỉ icon */}
            {showUserMenu && (
              <div
                className="bg-white shadow-sm d-flex flex-column align-items-center"
                style={{
                  position: 'absolute',
                  bottom: '58px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderRadius: '16px',
                  padding: '6px',
                  gap: '2px',
                  zIndex: 1060,
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <button
                  className="border-0 bg-transparent d-flex justify-content-center align-items-center rounded-circle"
                  style={{ width: '40px', height: '40px', color: '#555', cursor: 'pointer', fontSize: '18px', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0ec')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  title="Cài đặt"
                  onClick={() => window.location.href = '/settings'}
                >
                  <i className="bi bi-gear" />
                </button>
                <button
                  className="border-0 bg-transparent d-flex justify-content-center align-items-center rounded-circle"
                  style={{ width: '40px', height: '40px', color: '#dc3545', cursor: 'pointer', fontSize: '18px', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fff0f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  title="Đăng xuất"
                  onClick={logout}
                >
                  <i className="bi bi-box-arrow-right" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── RIGHT MAIN COLUMN ── */}
      <div className="app-main flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>

        {/* ── TOP HEADER ── */}
        <header className="shell-header d-flex align-items-center justify-content-between gap-3">
          {/* Greeting (left) */}
          <div className="header-copy" style={{ minWidth: 0, marginLeft: '10px' }}>
            <h1 className="m-0 fw-bold" style={{ fontSize: '32px', color: '#202220', lineHeight: 1.2 }}>
              {greeting},{' '}
              <span style={{ color: 'var(--accent-green)' }}>{firstName}!</span>
            </h1>
            <p className="m-0 mt-1" style={{ fontSize: '13px', color: '#888' }}>
              Khám phá thông tin và báo cáo hoạt động của bạn
            </p>
          </div>

          {/* Actions (right) */}
          <div className="d-flex align-items-center gap-3 flex-shrink-0">
            {/* Search bar */}
            <div
              className="bg-white rounded-pill d-flex align-items-center px-3 shadow-sm"
              style={{ height: '44px', width: '260px' }}
            >
              <input
                type="text"
                className="border-0 bg-transparent flex-grow-1"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                style={{ outline: 'none', color: '#202220', fontSize: '14px' }}
              />
              <button
                className="border-0 text-white rounded-circle d-flex justify-content-center align-items-center flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  marginRight: '-6px',
                  background: '#202220',
                  cursor: 'pointer',
                }}
              >
                <i className="bi bi-search" style={{ fontSize: '13px' }} />
              </button>
            </div>

            {/* Chat */}
            <button
              className="bg-white border-0 rounded-circle d-flex justify-content-center align-items-center position-relative shadow-sm"
              style={{ width: '44px', height: '44px', color: '#202220', cursor: 'pointer' }}
            >
              <i className="bi bi-chat fs-5" />
              {badge > 0 && (
                <span
                  className="position-absolute bg-danger border border-white rounded-circle"
                  style={{ width: '10px', height: '10px', top: '8px', right: '8px' }}
                />
              )}
            </button>

            {/* Bell */}
            <button
              className="bg-white border-0 rounded-circle d-flex justify-content-center align-items-center shadow-sm"
              style={{ width: '44px', height: '44px', color: '#202220', cursor: 'pointer' }}
              onClick={() => setBadge(0)}
            >
              <i className="bi bi-bell fs-5" />
            </button>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main className="app-content flex-grow-1">
          {children}
        </main>
      </div>

      <FloatingChatbox />

      <style>{`
        /* Desktop main column offset */
        @media (min-width: 768px) {
          .app-main {
            margin-left: 150px;
            padding: 0;
          }
          .shell-header {
            padding: 28px 28px 20px 0;
          }
          .app-content {
            padding: 0 28px 32px 0;
          }
        }
        /* Mobile */
        @media (max-width: 767.98px) {
          .app-main {
            margin-left: 0;
          }
          .shell-header {
            flex-wrap: wrap;
            padding: 20px 16px 12px 16px;
            gap: 12px;
          }
          .app-content {
            padding: 0 16px 24px 16px;
          }
          .left-column {
            width: 100% !important;
            height: auto !important;
            position: relative !important;
            padding: 16px !important;
            align-items: center;
            flex-direction: row;
            justify-content: center;
          }
          .app-sidebar {
            max-width: none !important;
            flex-direction: row !important;
            border-radius: 24px !important;
            height: auto !important;
            padding: 12px 16px !important;
          }
          .sidebar-nav {
            flex-direction: row !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

