import { useEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../api/auth';
import { getApiError } from '../api/client';
import type { TenantOption } from '../types';

/* ── Clock hook ── */
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
const DAYS_VI = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/* ── Mirror Card with 3D tilt + glow ── */
function MirrorCard({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; const gl = glow.current;
    if (!el || !gl) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const rx = ((y - r.height / 2) / r.height) * -10;
    const ry = ((x - r.width  / 2) / r.width)  *  10;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.01,1.01,1.01)`;
    gl.style.left = `${x - 130}px`;
    gl.style.top  = `${y - 130}px`;
    gl.style.opacity = '1';
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current; const gl = glow.current;
    if (!el || !gl) return;
    el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)';
    gl.style.opacity = '0';
  }, []);

  return (
    <div ref={ref} className={`mirror-card ${className}`} style={style}
      onMouseMove={onMove} onMouseLeave={onLeave}>
      <div ref={glow} className="mirror-card__glow" />
      <div className="mirror-card__shine" />
      {children}
    </div>
  );
}

/* ══════════════ MAIN PAGE ══════════════ */
export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [tenantId, setTenantId]     = useState('');
  const [tenants, setTenants]       = useState<TenantOption[]>([]);
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeRoleGuide, setActiveRoleGuide] = useState<'admin' | 'director' | 'leader' | 'employee'>('admin');

  /* ── Display controls ── */
  const [brightness, setBrightness]   = useState(60);
  const [displayMode, setDisplayMode] = useState<'light' | 'auto' | 'dark'>('auto');

  /* Apply display mode to <body> so it cascades everywhere */
  useEffect(() => {
    document.body.setAttribute('data-theme', displayMode);
    return () => document.body.removeAttribute('data-theme');
  }, [displayMode]);

  /* Brightness: maps 0–100 → overlay opacity 0.5 → 0 (brighter = less dark) */
  const overlayOpacity = 0.5 - (brightness / 100) * 0.4;

  /* ── Clock ── */
  const now    = useClock();
  const h24    = now.getHours();
  const mins   = now.getMinutes().toString().padStart(2, '0');
  const secs   = now.getSeconds().toString().padStart(2, '0');
  const h12    = (h24 % 12 || 12).toString().padStart(2, '0');
  const ampm   = h24 < 12 ? 'SA' : 'CH';
  const day    = DAYS_VI[now.getDay()];
  const date   = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  /* Filter and auto-select Xuân Đạt tenant */
  useEffect(() => {
    authApi.tenants().then((list) => {
      // Only keep Xuan Dat
      const filtered = list.filter(t =>
        t.name.toLowerCase().includes('xuân đạt') ||
        t.name.toLowerCase().includes('xuan dat') ||
        t.slug.toLowerCase().includes('xuandat') ||
        t.slug.toLowerCase().includes('xuan-dat')
      );
      setTenants(filtered);
      if (filtered.length > 0) setTenantId(filtered[0].id);
    }).catch(() => setTenants([]));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      await login({ email, password, tenantId: tenantId || null });
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiError(err, 'Đăng nhập thất bại. Vui lòng kiểm tra lại.'));
    } finally { setSubmitting(false); }
  };

  return (
    <div className="login-bg" style={{ '--overlay-opacity': overlayOpacity } as React.CSSProperties}>
      <div className="login-bg__overlay" />

      <div className="login-layout">

        {/* ══ LEFT: Login Form ══ */}
        <MirrorCard className="login-form-card">
          {/* Brand header */}
          <div className="lf-brand">
            <svg width="44" height="44" viewBox="0 0 100 100" fill="#5ec47a">
              <path d="M 50 10 A 40 40 0 1 0 85 65 A 35 35 0 1 1 50 10 Z" />
              <circle cx="55" cy="45" r="14" fill="none" stroke="#5ec47a" strokeWidth="6" />
            </svg>
            <div>
              <div className="lf-brand__name">OperaIQ</div>
              <div className="lf-brand__tagline">Welcome back</div>
            </div>
          </div>

          <p className="lf-desc">Đăng nhập để truy cập không gian làm việc của bạn</p>

          <form onSubmit={onSubmit} className="lf-form">
            {error && <div className="lf-error">{error}</div>}

            {/* Email */}
            <div className="lf-field">
              <label className="lf-label" htmlFor="lf-email">Email</label>
              <div className="lf-input-wrap">
                <i className="bi bi-envelope lf-icon" />
                <input id="lf-email" type="email" className="lf-input"
                  placeholder="name@xuandat.vn" value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email" required />
              </div>
            </div>

            {/* Password */}
            <div className="lf-field">
              <label className="lf-label" htmlFor="lf-password">Mật khẩu</label>
              <div className="lf-input-wrap">
                <i className="bi bi-lock lf-icon" />
                <input id="lf-password" type={showPass ? 'text' : 'password'} className="lf-input"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password" required />
                <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'} lf-icon-right`}
                  onClick={() => setShowPass(p => !p)} />
              </div>
            </div>

            {/* Tenant */}
            <div className="lf-field">
              <label className="lf-label" htmlFor="lf-tenant">Không gian làm việc</label>
              <div className="lf-input-wrap">
                <i className="bi bi-building lf-icon" />
                <select id="lf-tenant" className="lf-input lf-select"
                  value={tenantId} onChange={e => setTenantId(e.target.value)}>
                  <option value="">— Toàn hệ thống —</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <i className="bi bi-chevron-down lf-icon-right" style={{ pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Roles description selector */}
            <div style={{ marginTop: '16px', background: 'var(--login-input-bg)', border: '1px solid var(--login-input-border)', borderRadius: '14px', padding: '12px 14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#5ec47a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <i className="bi bi-info-circle-fill" />
                Tìm hiểu các vai trò trong hệ thống:
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {(['admin', 'director', 'leader', 'employee'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRoleGuide(role)}
                    style={{
                      background: activeRoleGuide === role ? '#5ec47a' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: activeRoleGuide === role ? 'white' : 'var(--login-text-soft)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    {role === 'admin' && 'Admin'}
                    {role === 'director' && 'Giám đốc'}
                    {role === 'leader' && 'Leader'}
                    {role === 'employee' && 'Nhân viên'}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--login-text)', lineHeight: 1.5 }}>
                {activeRoleGuide === 'admin' && (
                  <div>
                    <strong>SuperAdmin (Quản trị hệ thống):</strong> Có quyền truy cập tối cao đối với toàn bộ hệ thống, quản lý tất cả các Không gian làm việc (Tenants), tài khoản, phân quyền và cấu hình tổng thể.
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#5ec47a' }}>Tài khoản: kietnttb01357@gmail.com | MK: 123</div>
                    <div style={{ marginTop: '2px', fontSize: '10.5px', color: '#f0c040' }}>⚠️ Có thể chọn bất kỳ workspace hoặc để "Toàn hệ thống"</div>
                  </div>
                )}
                {activeRoleGuide === 'director' && (
                  <div>
                    <strong>Giám đốc (Tài chính/Sản xuất):</strong> Người phê duyệt tối cao của không gian. Có quyền xem toàn bộ dự án hiện có, theo dõi tiến độ chi tiết qua <strong>Biểu đồ nhánh (Tree Chart)</strong>, kiểm soát <strong>Giá tiền</strong> (Ngân sách) và <strong>Thời gian</strong> (Thời hạn). Giám đốc thực hiện duyệt đề xuất hoặc từ chối kèm lý do bãi bỏ cụ thể.
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#5ec47a' }}>Tài khoản: director.finance@xuandat.vn | MK: Password123!</div>
                  </div>
                )}
                {activeRoleGuide === 'leader' && (
                  <div>
                    <strong>Trưởng dự án (Leader):</strong> Người tạo dự án mới qua AI (nhập vấn đề, AI sinh kế hoạch gồm các phase + tasks). Leader xem xét và gửi lên Giám đốc phê duyệt. Sau khi được duyệt, Leader có toàn quyền quản lý dự án (ADD nhân viên, phân công công việc, cài đặt giờ giấc). Nhận thông báo lý do bãi bỏ nếu dự án bị từ chối.
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#5ec47a' }}>Tài khoản: leader.sx@xuandat.vn | MK: Password123!</div>
                  </div>
                )}
                {activeRoleGuide === 'employee' && (
                  <div>
                    <strong>Nhân viên (Employee):</strong> Người trực tiếp thực thi công việc (Tasks). Báo cáo tiến độ hoàn thành các công việc được giao trong dự án. Có không gian riêng để quản lý và xem tất cả những việc mình đã làm xuyên suốt mọi dự án từng tham gia.
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#5ec47a' }}>Tài khoản: nv1@xuandat.vn | MK: Password123!</div>
                  </div>
                )}
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="lf-row-between">
              <label className="lf-remember">
                <input type="checkbox" className="lf-checkbox"
                  checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <a href="#" className="lf-forgot">Quên mật khẩu?</a>
            </div>

            <button type="submit" className="lf-btn-primary" disabled={submitting}>
              {submitting
                ? <><span className="lf-spinner" /> Đang đăng nhập…</>
                : <><i className="bi bi-box-arrow-in-right" /> Đăng nhập</>}
            </button>

            <div className="lf-divider">hoặc</div>

            <button type="button" className="lf-btn-sso">
              <i className="bi bi-shield-lock" /> Đăng nhập bằng SSO
            </button>
          </form>
        </MirrorCard>

        {/* ══ RIGHT: 3 Widgets ══ */}
        <div className="login-widgets-col">

          {/* 1. Display / Brightness */}
          <MirrorCard className="widget-card">
            <div className="w-header">
              <i className="bi bi-sun-fill" style={{ color: '#ffd166', fontSize: '20px' }} />
              <div>
                <div className="w-title">Hiển thị</div>
                <div className="w-sub">Điều chỉnh độ sáng</div>
              </div>
            </div>

            <div className="w-slider-wrap">
              <i className="bi bi-brightness-low" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }} />
              <input type="range" min={0} max={100} value={brightness}
                onChange={e => setBrightness(+e.target.value)}
                className="w-slider" />
              <i className="bi bi-brightness-high" style={{ color: '#ffd166', fontSize: '13px' }} />
              <span className="w-slider-val">{brightness}%</span>
            </div>

            <div className="w-mode-row">
              {(['light', 'auto', 'dark'] as const).map(mode => (
                <button key={mode} type="button"
                  className={`w-mode-btn${displayMode === mode ? ' active' : ''}`}
                  onClick={() => setDisplayMode(mode)}>
                  <i className={`bi ${mode === 'light' ? 'bi-sun' : mode === 'dark' ? 'bi-moon-stars' : 'bi-circle-half'}`} />
                  <span>{mode === 'light' ? 'Sáng' : mode === 'auto' ? 'Tự động' : 'Tối'}</span>
                </button>
              ))}
            </div>
          </MirrorCard>

          {/* 2. Weather */}
          <MirrorCard className="widget-card">
            <div className="w-header">
              <i className="bi bi-cloud-sun-fill" style={{ color: '#a8d8b9', fontSize: '20px' }} />
              <div>
                <div className="w-title">Thời tiết</div>
                <div className="w-sub">TP. Hồ Chí Minh, VN</div>
              </div>
            </div>
            <div className="w-weather-body">
              <div>
                <div className="w-temp">31°C</div>
                <div className="w-weather-desc">Nhiều mây</div>
              </div>
              <div className="w-weather-stats">
                <div className="w-stat"><span>Độ ẩm</span><strong>82%</strong></div>
                <div className="w-stat"><span>Gió</span><strong>12 km/h</strong></div>
                <div className="w-stat"><span>Cảm giác</span><strong>34°C</strong></div>
              </div>
            </div>
          </MirrorCard>

          {/* 3. Clock */}
          <MirrorCard className="widget-card">
            <div className="w-header">
              <i className="bi bi-clock-fill" style={{ color: '#a8d8b9', fontSize: '20px' }} />
              <div>
                <div className="w-title">Ngày &amp; Giờ</div>
                <div className="w-sub">Thời gian thực</div>
              </div>
            </div>
            <div className="w-clock">
              {h12}:{mins}:{secs}<span className="w-ampm">{ampm}</span>
            </div>
            <div className="w-date">
              <i className="bi bi-calendar2-event" />
              {day}, {date}
            </div>
          </MirrorCard>

        </div>

      </div>
    </div>
  );
}
