import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usersApi } from '../api/users';
import { useToasts } from '../components/ToastContext';

export function Settings() {
  const { user, refreshProfile } = useAuth();
  const { push } = useToasts();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setLoading(true);
    usersApi.getProfile()
      .then(data => {
        setFullName(data.fullName || '');
        setAvatarUrl(data.avatarUrl || '');
      })
      .catch(() => {
        push('Lỗi', 'Không thể lấy thông tin trang cá nhân.', 'error');
      })
      .finally(() => setLoading(false));
  }, [push]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      push('Lỗi', 'Họ tên không được để trống.', 'error');
      return;
    }

    setSaving(true);
    try {
      await usersApi.updateProfile({ fullName, avatarUrl });
      await refreshProfile(); // Refresh AuthContext to update UI instantly
      push('Thành công', 'Đã cập nhật thông tin cá nhân.', 'success');
    } catch (err: any) {
      push('Lỗi', err.message || 'Cập nhật thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      push('Lỗi', 'Vui lòng nhập đầy đủ thông tin.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      push('Lỗi', 'Mật khẩu mới không khớp.', 'error');
      return;
    }

    setSaving(true);
    try {
      await usersApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword
      });
      push('Thành công', 'Đã đổi mật khẩu.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      push('Lỗi', err.message || 'Đổi mật khẩu thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  return (
    <div className="container-fluid" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-4">
        <h2 className="fw-bold" style={{ color: '#202220' }}>Cài đặt</h2>
        <p className="text-muted">Quản lý tài khoản cá nhân và bảo mật của bạn</p>
      </div>

      <div className="glass-card mb-4" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div className="d-flex border-bottom border-light">
          <button
            className={`btn border-0 py-3 px-4 flex-grow-1 flex-md-grow-0 text-start ${activeTab === 'profile' ? 'fw-bold' : 'text-muted'}`}
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'profile' ? '3px solid var(--accent-green)' : '3px solid transparent',
              background: activeTab === 'profile' ? 'rgba(255,255,255,0.4)' : 'transparent',
              color: activeTab === 'profile' ? '#202220' : 'inherit'
            }}
            onClick={() => setActiveTab('profile')}
          >
            <i className="bi bi-person me-2"></i> Hồ sơ
          </button>
          <button
            className={`btn border-0 py-3 px-4 flex-grow-1 flex-md-grow-0 text-start ${activeTab === 'security' ? 'fw-bold' : 'text-muted'}`}
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'security' ? '3px solid var(--accent-green)' : '3px solid transparent',
              background: activeTab === 'security' ? 'rgba(255,255,255,0.4)' : 'transparent',
              color: activeTab === 'security' ? '#202220' : 'inherit'
            }}
            onClick={() => setActiveTab('security')}
          >
            <i className="bi bi-shield-lock me-2"></i> Bảo mật
          </button>
        </div>

        <div className="p-4 p-md-5">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile}>
              <div className="d-flex align-items-center mb-4 gap-4">
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f0f0ec' }}>
                  <img
                    src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName || user?.fullName || 'Avatar'}`}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <h5 className="mb-1 fw-bold">{user?.email}</h5>
                  <span className="badge bg-light text-dark border">{user?.role || 'User'}</span>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-bold text-uppercase">Họ và tên</label>
                <input
                  type="text"
                  className="form-control"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px' }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label text-muted small fw-bold text-uppercase">Ảnh đại diện (URL)</label>
                <input
                  type="text"
                  className="form-control"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px' }}
                />
              </div>

              <button
                type="submit"
                className="btn text-white px-4 py-2"
                style={{ backgroundColor: 'var(--accent-green)', borderRadius: '12px' }}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold text-uppercase">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px' }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted small fw-bold text-uppercase">Mật khẩu mới</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px' }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label text-muted small fw-bold text-uppercase">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px' }}
                />
              </div>

              <button
                type="submit"
                className="btn text-white px-4 py-2"
                style={{ backgroundColor: 'var(--accent-green)', borderRadius: '12px' }}
                disabled={saving}
              >
                {saving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}