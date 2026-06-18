import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

/** OperaIQ skeleton logo mark */
function SkeletonLogoMark({ size = 43 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor">
      <path d="M 50 10 A 40 40 0 1 0 85 65 A 35 35 0 1 1 50 10 Z" />
      <circle cx="55" cy="45" r="14" fill="none" stroke="currentColor" strokeWidth="6" />
    </svg>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-shell d-flex flex-column flex-md-row" style={{ minHeight: '100vh', backgroundColor: '#EFEEEA' }}>
        
        {/* MOBILE HEADER SKELETON */}
        <div className="d-md-none d-flex justify-content-between align-items-center p-3 bg-white border-bottom sticky-top" style={{ zIndex: 1050 }}>
          <div className="d-flex align-items-center gap-2" style={{ color: 'var(--accent-green)' }}>
            <SkeletonLogoMark size={28} />
            <span className="fw-bold fs-5" style={{ color: '#202220' }}>OperaIQ</span>
          </div>
          <div className="animate-pulse bg-skeleton rounded" style={{ width: '32px', height: '32px' }} />
        </div>

        {/* LEFT COLUMN SKELETON */}
        <div
          className="d-none d-md-flex flex-column align-items-center"
          style={{ width: '110px', padding: '28px 0', position: 'fixed', height: '100vh', top: 0, left: '30px', zIndex: 1040 }}
        >
          <div className="mb-3 d-flex justify-content-center align-items-center" style={{ color: '#E2E1DD' }}>
            <SkeletonLogoMark size={43} />
          </div>
          <aside
            className="bg-white shadow-sm d-flex flex-column align-items-center py-4 w-100"
            style={{ maxWidth: '80px', borderRadius: '40px', flexGrow: 1, marginBottom: '16px' }}
          >
            <div className="d-flex flex-column gap-4 w-100 align-items-center mt-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-skeleton rounded-circle" style={{ width: '28px', height: '28px' }} />
              ))}
            </div>
            <div className="mt-auto d-flex flex-column align-items-center gap-3">
              <div className="animate-pulse bg-skeleton rounded-circle" style={{ width: '48px', height: '48px' }} />
            </div>
          </aside>
        </div>

        {/* RIGHT MAIN COLUMN SKELETON */}
        <div className="app-main flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
          <header className="shell-header d-flex align-items-center justify-content-between gap-3">
            <div className="header-copy d-flex flex-column gap-2" style={{ minWidth: 0, marginLeft: '10px' }}>
              <div className="animate-pulse bg-skeleton rounded-pill" style={{ width: '280px', height: '36px' }} />
              <div className="animate-pulse bg-skeleton rounded-pill mt-1" style={{ width: '320px', height: '18px' }} />
            </div>
            <div className="d-none d-md-flex align-items-center gap-3 flex-shrink-0">
              <div className="animate-pulse bg-skeleton rounded-pill shadow-sm" style={{ height: '44px', width: '260px' }} />
              <div className="animate-pulse bg-skeleton rounded-circle shadow-sm" style={{ width: '44px', height: '44px' }} />
              <div className="animate-pulse bg-skeleton rounded-circle shadow-sm" style={{ width: '44px', height: '44px' }} />
            </div>
          </header>
          
          <main className="app-content flex-grow-1">
            <div className="row g-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="col-12 col-md-4">
                  <div className="animate-pulse bg-white rounded-4 shadow-sm" style={{ height: '160px' }} />
                </div>
              ))}
              <div className="col-12 col-md-8">
                <div className="animate-pulse bg-white rounded-4 shadow-sm" style={{ height: '320px' }} />
              </div>
              <div className="col-12 col-md-4">
                <div className="animate-pulse bg-white rounded-4 shadow-sm" style={{ height: '320px' }} />
              </div>
            </div>
          </main>
        </div>

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
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
