import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Navigate } from 'react-router-dom';

// ─── Mock Data for System Permissions ──────────────────────────────────────────
const MOCK_USERS = [
  { id: 'u1', name: 'Trần Xuân Đạt', email: 'dat.tran@xuandat.vn', role: 'Admin', avatar: 'TranXuanDat' },
  { id: 'u2', name: 'Nguyễn Thị Mai', email: 'mai.nguyen@operaiq.vn', role: 'Trưởng phòng Kỹ thuật', avatar: 'NguyenThiMai' },
  { id: 'u3', name: 'Lê Văn Tuấn', email: 'tuan.le@operaiq.vn', role: 'Lập trình viên', avatar: 'LeVanTuan' },
  { id: 'u4', name: 'Trịnh Ngọc Diệu', email: 'dieu.trinh@operaiq.vn', role: 'UI/UX Designer', avatar: 'TrinhNgocDieu' },
];

const PERMISSION_GROUPS = [
  {
    group: 'Dự án (Projects)',
    permissions: [
      { id: 'project.create', label: 'Tạo dự án mới' },
      { id: 'project.edit', label: 'Chỉnh sửa dự án' },
      { id: 'project.delete', label: 'Xóa dự án' },
    ]
  },
  {
    group: 'Công việc (Tasks)',
    permissions: [
      { id: 'task.create', label: 'Tạo công việc' },
      { id: 'task.assign', label: 'Phân công / Dùng AI Assign' },
      { id: 'task.delete', label: 'Xóa công việc' },
    ]
  },
  {
    group: 'Hệ thống (System)',
    permissions: [
      { id: 'system.settings', label: 'Cài đặt hệ thống' },
      { id: 'system.users', label: 'Quản lý nhân sự' },
      { id: 'system.billing', label: 'Quản lý thanh toán' },
    ]
  }
];

// Initial mock permission state (User ID -> array of permission IDs)
const INITIAL_PERMISSIONS: Record<string, string[]> = {
  'u1': ['project.create', 'project.edit', 'project.delete', 'task.create', 'task.assign', 'task.delete', 'system.settings', 'system.users', 'system.billing'],
  'u2': ['project.create', 'project.edit', 'task.create', 'task.assign', 'system.users'],
  'u3': ['task.create'],
  'u4': ['task.create', 'project.create'],
};

export function System() {
  const { hasRole } = useAuth();
  
  // Security check: Only Admins can access this page
  if (!hasRole('TenantAdmin') && !hasRole('TenantOwner') && !hasRole('SuperAdmin')) {
    return <Navigate to="/" replace />;
  }

  const [activeUserId, setActiveUserId] = useState<string>(MOCK_USERS[0].id);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>(INITIAL_PERMISSIONS);
  const [search, setSearch] = useState('');

  const activeUser = MOCK_USERS.find(u => u.id === activeUserId);
  const filteredUsers = MOCK_USERS.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = (permId: string) => {
    setUserPermissions(prev => {
      const currentPerms = prev[activeUserId] || [];
      const hasPerm = currentPerms.includes(permId);
      
      return {
        ...prev,
        [activeUserId]: hasPerm 
          ? currentPerms.filter(p => p !== permId) 
          : [...currentPerms, permId]
      };
    });
  };

  return (
    <div className="container-fluid py-2 d-flex flex-column" style={{ height: '100%', gap: '24px' }}>
      {/* ── Header ── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h2 className="fw-bold m-0" style={{ fontSize: '24px' }}>Quản trị Hệ thống</h2>
          <p className="text-secondary m-0 mt-1" style={{ fontSize: '14px' }}>Quản lý người dùng và phân quyền chi tiết</p>
        </div>
      </div>

      {/* ── Main Layout (2 columns) ── */}
      <div className="row flex-grow-1 g-4" style={{ minHeight: 0 }}>
        
        {/* Left Column: Users List */}
        <div className="col-12 col-md-4 col-xl-3 d-flex flex-column h-100">
          <div className="bg-white rounded-4 shadow-sm p-3 d-flex flex-column h-100" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="position-relative mb-3">
              <i className="bi bi-search position-absolute text-secondary" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control rounded-pill border-0 bg-light"
                placeholder="Tìm nhân viên..."
                style={{ paddingLeft: '36px', fontSize: '13px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex-grow-1" style={{ overflowY: 'auto' }}>
              <div className="d-flex flex-column gap-2">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    className={`btn text-start p-2 rounded-3 border-0 d-flex align-items-center gap-2 ${activeUserId === user.id ? 'shadow-sm' : ''}`}
                    style={{ 
                      background: activeUserId === user.id ? '#1e1e1e' : 'transparent',
                      color: activeUserId === user.id ? 'white' : '#374151',
                      transition: 'background 0.2s, color 0.2s'
                    }}
                    onClick={() => setActiveUserId(user.id)}
                    onMouseEnter={e => {
                      if (activeUserId !== user.id) e.currentTarget.style.background = '#f3f4f6';
                    }}
                    onMouseLeave={e => {
                      if (activeUserId !== user.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar}`} 
                      alt={user.name} 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', background: activeUserId === user.id ? '#4b5563' : '#e5e7eb' }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div className="fw-semibold text-truncate" style={{ fontSize: '14px' }}>{user.name}</div>
                      <div className="text-truncate" style={{ fontSize: '11px', color: activeUserId === user.id ? '#9ca3af' : '#6b7280' }}>{user.role}</div>
                    </div>
                  </button>
                ))}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center text-secondary mt-4" style={{ fontSize: '13px' }}>
                    Không tìm thấy nhân viên.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Permission Matrix */}
        <div className="col-12 col-md-8 col-xl-9 d-flex flex-column h-100">
          <div className="bg-white rounded-4 shadow-sm p-4 d-flex flex-column h-100" style={{ border: '1px solid rgba(0,0,0,0.04)' }}>
            
            {activeUser ? (
              <>
                <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeUser.avatar}`} 
                    alt={activeUser.name} 
                    style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f3f4f6' }}
                  />
                  <div>
                    <h3 className="fw-bold m-0" style={{ fontSize: '20px', color: '#111827' }}>Phân quyền: {activeUser.name}</h3>
                    <p className="text-secondary m-0 mt-1" style={{ fontSize: '13px' }}>{activeUser.email} · <span className="badge bg-light text-dark border">{activeUser.role}</span></p>
                  </div>
                </div>

                <div className="flex-grow-1" style={{ overflowY: 'auto', paddingRight: '8px' }}>
                  <div className="row g-4">
                    {PERMISSION_GROUPS.map(group => (
                      <div key={group.group} className="col-12 col-xl-6">
                        <div className="rounded-4 p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <h4 className="fw-bold mb-3" style={{ fontSize: '15px', color: '#334155' }}>{group.group}</h4>
                          <div className="d-flex flex-column gap-3">
                            {group.permissions.map(perm => {
                              const isChecked = (userPermissions[activeUserId] || []).includes(perm.id);
                              
                              return (
                                <div key={perm.id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
                                  <div>
                                    <div className="fw-semibold" style={{ fontSize: '14px', color: isChecked ? '#0f172a' : '#64748b' }}>{perm.label}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{perm.id}</div>
                                  </div>
                                  
                                  {/* Toggle Switch */}
                                  <div 
                                    className="d-flex align-items-center rounded-pill p-1"
                                    style={{ 
                                      width: '44px', height: '24px', cursor: 'pointer',
                                      background: isChecked ? 'var(--accent-green)' : '#cbd5e1',
                                      transition: 'background 0.3s'
                                    }}
                                    onClick={() => handleToggle(perm.id)}
                                  >
                                    <div 
                                      className="bg-white rounded-circle shadow-sm"
                                      style={{ 
                                        width: '18px', height: '18px',
                                        transform: isChecked ? 'translateX(20px)' : 'translateX(0)',
                                        transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)'
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary">
                <i className="bi bi-shield-lock mb-3" style={{ fontSize: '48px', color: '#cbd5e1' }} />
                <p>Chọn một nhân viên để xem và quản lý quyền</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
