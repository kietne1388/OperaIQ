import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

// ─── Types ──────────────────────────────────────────────────────────────────
interface SkillInfo { name: string; level: string; score: number; isPrimary: boolean; }
interface Certificate { name: string; issuer: string; issueDate?: string; }
interface WorkloadInfo { activeTaskCount: number; loadPercent: number; weeklyHours: number; level: string; }
interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  jobTitle?: string;
  departmentId?: string;
  departmentName?: string;
  managerId?: string;
  managerName?: string;
  hireDate?: string;
  yearsOfExperience: number;
  competencyScore: number;
  employmentStatus: string;
  roles: string[];
  skills: SkillInfo[];
  certificates: Certificate[];
  workload?: WorkloadInfo;
  recentProjects?: { taskTitle: string; projectName?: string; completedAt?: string }[];
}
interface Department { id: string; name: string; }

// ─── Org Chart types ────────────────────────────────────────────────────────
interface Member { id: number; name: string; role: string; avatar: string; children: Member[]; }

const INITIAL_TREE: Member = {
  id: 1, name: 'Trần Xuân Đạt', role: 'Tổng Giám đốc', avatar: 'TranXuanDat',
  children: [
    { id: 2, name: 'Lê Quốc Hưng', role: 'Phó TGĐ Kinh doanh', avatar: 'LeQuocHung',
      children: [
        { id: 7, name: 'Phan Thị Mỹ Hạnh', role: 'Trưởng phòng KD Miền Nam', avatar: 'PhanThiMyHanh', children: [] },
        { id: 8, name: 'Đỗ Mạnh Cường', role: 'Trưởng phòng KD Miền Bắc', avatar: 'DoManhCuong', children: [] },
      ]
    },
    { id: 3, name: 'Nguyễn Hoàng Anh', role: 'Phó TGĐ Kỹ thuật', avatar: 'NguyenHoangAnh',
      children: [
        { id: 9, name: 'Bùi Đình Khánh', role: 'Trưởng phòng Tự động hoá', avatar: 'BuiDinhKhanh', children: [] },
        { id: 10, name: 'Trương Văn Sơn', role: 'Trưởng phòng Dự án KT', avatar: 'TruongVanSon', children: [] },
      ]
    },
    { id: 4, name: 'Lý Thu Hà', role: 'Giám đốc Vận hành', avatar: 'LyThuHa',
      children: [
        { id: 11, name: 'Hoàng Văn Bằng', role: 'Trưởng phòng Kho vận', avatar: 'HoangVanBang', children: [] },
      ]
    },
    { id: 5, name: 'Nguyễn Thị Bích Ngọc', role: 'Giám đốc Tài chính', avatar: 'NguyenThiBichNgoc', children: [] },
    { id: 6, name: 'Mai Thị Lan Anh', role: 'Giám đốc Nhân sự', avatar: 'MaiThiLanAnh', children: [] },
  ],
};

function addMemberToNode(tree: Member, targetId: number, newMember: Member): Member {
  if (tree.id === targetId) return { ...tree, children: [...tree.children, newMember] };
  return { ...tree, children: tree.children.map(c => addMemberToNode(c, targetId, newMember)) };
}

// ─── Org Node Component ─────────────────────────────────────────────────────
function OrgNode({ member, isRoot = false, onAddClick }: { member: Member; isRoot?: boolean; onAddClick: (id: number, name: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = member.children.length > 0;

  return (
    <div className="d-flex flex-column align-items-center" style={{ position: 'relative' }}>
      {!isRoot && <div style={{ width: '2px', height: '24px', background: '#D1D5DB' }} />}
      <div
        className="bg-white rounded-4 shadow-sm p-3 d-flex flex-column align-items-center text-center"
        style={{ width: '140px', border: isRoot ? '2px solid var(--accent-green)' : '1px solid rgba(0,0,0,0.07)', transition: 'box-shadow 0.2s, transform 0.2s', position: 'relative' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
      >
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatar}`} alt={member.name} style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#f0efea', marginBottom: '8px' }} />
        <div className="fw-semibold" style={{ fontSize: '12px', lineHeight: 1.3, color: '#202220' }}>{member.name}</div>
        <div className="text-secondary" style={{ fontSize: '10px', marginTop: '3px' }}>{member.role}</div>
        <button onClick={() => onAddClick(member.id, member.name)} className="d-flex justify-content-center align-items-center border-0 rounded-circle position-absolute text-white" style={{ width: '22px', height: '22px', bottom: '-11px', right: '-8px', background: 'var(--accent-green)', fontSize: '15px', lineHeight: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', zIndex: 10 }} title={`Thêm vào nhánh ${member.name}`}>+</button>
        {hasChildren && (
          <button onClick={() => setCollapsed(v => !v)} className="d-flex justify-content-center align-items-center border-0 rounded-circle position-absolute text-white" style={{ width: '22px', height: '22px', bottom: '-11px', left: '-8px', background: collapsed ? '#6b7280' : '#3b82f6', fontSize: '13px', lineHeight: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', zIndex: 10 }}>
            <i className={`bi ${collapsed ? 'bi-plus' : 'bi-dash'}`} style={{ fontSize: '13px' }} />
          </button>
        )}
      </div>
      {hasChildren && !collapsed && (
        <>
          <div style={{ width: '2px', height: '24px', background: '#D1D5DB' }} />
          {member.children.length > 1 ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ position: 'absolute', top: 0, left: `calc(50% - ${(member.children.length - 1) * 84}px)`, width: `${(member.children.length - 1) * 168}px`, height: '2px', background: '#D1D5DB' }} />
              <div className="d-flex gap-4">{member.children.map(c => <OrgNode key={c.id} member={c} onAddClick={onAddClick} />)}</div>
            </div>
          ) : (
            <OrgNode member={member.children[0]} onAddClick={onAddClick} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Employee Profile Modal ─────────────────────────────────────────────────
function EmployeeProfileModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const getSkillColor = (level: string) => {
    switch (level) {
      case 'Expert': return { bg: '#dcfce7', text: '#166534' };
      case 'Advanced': return { bg: '#dbeafe', text: '#1e40af' };
      case 'Intermediate': return { bg: '#fef3c7', text: '#92400e' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };
  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'VeryHigh': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      default: return '#22c55e';
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, {bg: string; text: string; label: string}> = {
      Active: { bg: '#dcfce7', text: '#166534', label: 'Đang làm việc' },
      Probation: { bg: '#fef3c7', text: '#92400e', label: 'Thử việc' },
      Maternity: { bg: '#e0e7ff', text: '#3730a3', label: 'Nghỉ thai sản' },
      Inactive: { bg: '#fee2e2', text: '#dc2626', label: 'Ngừng làm' },
    };
    return map[status] ?? { bg: '#f3f4f6', text: '#374151', label: status };
  };
  const statusMeta = getStatusBadge(emp.employmentStatus);
  const primarySkills = emp.skills.filter(s => s.isPrimary);
  const otherSkills = emp.skills.filter(s => !s.isPrimary);

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 3000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="bg-white rounded-4 shadow-lg d-flex flex-column" style={{ width: '680px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 d-flex align-items-center gap-4" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderRadius: '16px 16px 0 0' }}>
          <img src={emp.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`} alt={emp.fullName} style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', background: '#334155' }} />
          <div className="flex-grow-1">
            <h2 className="fw-bold m-0" style={{ fontSize: '22px' }}>{emp.fullName}</h2>
            <p className="m-0 mt-1 opacity-75" style={{ fontSize: '14px' }}>{emp.jobTitle || 'Nhân viên'}</p>
            <div className="d-flex gap-2 mt-2 flex-wrap">
              <span className="badge rounded-pill px-2 py-1" style={{ background: statusMeta.bg, color: statusMeta.text, fontSize: '11px' }}>{statusMeta.label}</span>
              {emp.employeeCode && <span className="badge rounded-pill px-2 py-1" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '11px' }}>#{emp.employeeCode}</span>}
            </div>
          </div>
          <div className="text-center">
            <div className="fw-bold" style={{ fontSize: '28px', color: `hsl(${emp.competencyScore * 1.2}, 70%, 60%)` }}>{emp.competencyScore}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>Năng lực</div>
          </div>
          <button className="btn-close btn-close-white" onClick={onClose} />
        </div>

        <div className="p-4 flex-grow-1" style={{ overflowY: 'auto' }}>
          {/* Basic Info */}
          <div className="row g-3 mb-4">
            {[
              { icon: 'bi-envelope', label: 'Email', value: emp.email },
              { icon: 'bi-telephone', label: 'Điện thoại', value: emp.phone || '—' },
              { icon: 'bi-building', label: 'Phòng ban', value: emp.departmentName || '—' },
              { icon: 'bi-person-badge', label: 'Quản lý trực tiếp', value: emp.managerName || '—' },
              { icon: 'bi-calendar-check', label: 'Ngày vào làm', value: emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('vi-VN') : '—' },
              { icon: 'bi-award', label: 'Kinh nghiệm', value: `${emp.yearsOfExperience} năm` },
            ].map(item => (
              <div key={item.label} className="col-12 col-sm-6">
                <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <i className={`bi ${item.icon} text-secondary`} style={{ fontSize: '15px', width: '20px', textAlign: 'center' }} />
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{item.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Workload */}
          {emp.workload && (
            <div className="mb-4 p-3 rounded-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '14px', color: '#334155' }}>
                <i className="bi bi-activity" style={{ color: getWorkloadColor(emp.workload.level) }} /> Khối lượng công việc hiện tại
              </h4>
              <div className="row g-2 mb-2">
                <div className="col-4 text-center">
                  <div className="fw-bold" style={{ fontSize: '20px', color: getWorkloadColor(emp.workload.level) }}>{emp.workload.activeTaskCount}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Task đang làm</div>
                </div>
                <div className="col-4 text-center">
                  <div className="fw-bold" style={{ fontSize: '20px', color: getWorkloadColor(emp.workload.level) }}>{emp.workload.loadPercent}%</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Tải công việc</div>
                </div>
                <div className="col-4 text-center">
                  <div className="fw-bold" style={{ fontSize: '20px', color: '#475569' }}>{emp.workload.weeklyHours}h</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Giờ/tuần</div>
                </div>
              </div>
              <div className="progress rounded-pill" style={{ height: '8px', background: '#e2e8f0' }}>
                <div className="progress-bar rounded-pill" style={{ width: `${emp.workload.loadPercent}%`, background: getWorkloadColor(emp.workload.level), transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}

          {/* Skills */}
          {emp.skills.length > 0 && (
            <div className="mb-4">
              <h4 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '14px', color: '#334155' }}>
                <i className="bi bi-lightning-charge-fill text-warning" /> Kỹ năng chuyên môn
              </h4>
              {primarySkills.length > 0 && (
                <div className="mb-2">
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Kỹ năng chính</div>
                  <div className="d-flex flex-wrap gap-2">
                    {primarySkills.map(s => {
                      const colors = getSkillColor(s.level);
                      return (
                        <div key={s.name} className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill" style={{ background: colors.bg, color: colors.text, fontSize: '12px', fontWeight: 600, border: `1px solid ${colors.text}30` }}>
                          <i className="bi bi-star-fill" style={{ fontSize: '10px' }} />
                          {s.name}
                          <span style={{ fontSize: '10px', opacity: 0.8 }}>({s.score})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {otherSkills.length > 0 && (
                <div className="d-flex flex-wrap gap-2">
                  {otherSkills.map(s => {
                    const colors = getSkillColor(s.level);
                    return (
                      <span key={s.name} className="badge rounded-pill px-3 py-1" style={{ background: colors.bg, color: colors.text, fontSize: '11px', fontWeight: 500 }}>
                        {s.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Certificates */}
          {emp.certificates.length > 0 && (
            <div className="mb-4">
              <h4 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '14px', color: '#334155' }}>
                <i className="bi bi-patch-check-fill text-primary" /> Chứng chỉ chuyên môn
              </h4>
              <div className="d-flex flex-wrap gap-2">
                {emp.certificates.map(c => (
                  <div key={c.name} className="d-flex align-items-center gap-2 px-3 py-2 rounded-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '12px' }}>
                    <i className="bi bi-award-fill text-primary" style={{ fontSize: '14px' }} />
                    <div>
                      <div className="fw-semibold" style={{ color: '#1e40af' }}>{c.name}</div>
                      {c.issuer && <div style={{ fontSize: '10px', color: '#64748b' }}>{c.issuer}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Projects */}
          {emp.recentProjects && emp.recentProjects.length > 0 && (
            <div>
              <h4 className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ fontSize: '14px', color: '#334155' }}>
                <i className="bi bi-clock-history text-success" /> Dự án / Công việc gần đây
              </h4>
              <div className="d-flex flex-column gap-2">
                {emp.recentProjects.slice(0, 5).map((p, i) => (
                  <div key={i} className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '14px' }} />
                    <div className="flex-grow-1">
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}>{p.taskTitle}</div>
                      {p.projectName && <div style={{ fontSize: '11px', color: '#4ade80' }}>{p.projectName}</div>}
                    </div>
                    {p.completedAt && <div style={{ fontSize: '10px', color: '#4ade80' }}>{new Date(p.completedAt).toLocaleDateString('vi-VN')}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Employee Card ───────────────────────────────────────────────────────────
function EmployeeCard({ emp, onClick }: { emp: Employee; onClick: () => void }) {
  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'VeryHigh': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      default: return '#22c55e';
    }
  };
  const getStatusDot = (status: string) => {
    const map: Record<string, string> = { Active: '#22c55e', Probation: '#f59e0b', Maternity: '#6366f1', Inactive: '#ef4444' };
    return map[status] ?? '#94a3b8';
  };

  return (
    <div
      className="bg-white rounded-4 p-3 shadow-sm d-flex flex-column"
      style={{ border: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      {/* Status dot */}
      <div className="position-absolute rounded-circle" style={{ width: '10px', height: '10px', background: getStatusDot(emp.employmentStatus), top: '16px', right: '16px', border: '2px solid white', boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }} title={emp.employmentStatus} />

      <div className="d-flex align-items-center gap-3 mb-2">
        <img
          src={emp.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.fullName}`}
          alt={emp.fullName}
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f3f4f6', border: '2px solid #f0f0f0' }}
        />
        <div className="overflow-hidden">
          <div className="fw-semibold text-truncate" style={{ fontSize: '14px', color: '#111827' }}>{emp.fullName}</div>
          <div className="text-truncate" style={{ fontSize: '12px', color: '#6b7280' }}>{emp.jobTitle || '—'}</div>
        </div>
      </div>

      {/* Skills preview */}
      {emp.skills.filter(s => s.isPrimary).slice(0, 2).map(s => (
        <span key={s.name} className="badge rounded-pill mb-1 me-1" style={{ background: '#f0fdf4', color: '#166534', fontSize: '10px', fontWeight: 600 }}>
          {s.name}
        </span>
      ))}

      <div className="mt-auto pt-2 border-top d-flex align-items-center justify-content-between">
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
          <i className="bi bi-award me-1" />Score: <strong style={{ color: '#374151' }}>{emp.competencyScore}</strong>
        </div>
        {emp.workload && (
          <div style={{ fontSize: '10px', fontWeight: 600, color: getWorkloadColor(emp.workload.level) }}>
            {emp.workload.loadPercent}% tải
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Team Page ──────────────────────────────────────────────────────────
export function Team() {
  const { hasRole } = useAuth();
  const canManage = hasRole('TenantAdmin') || hasRole('TenantOwner') || hasRole('SuperAdmin');

  const [activeTab, setActiveTab] = useState<'orgchart' | 'employees'>('orgchart');
  const [tree, setTree] = useState<Member>(INITIAL_TREE);
  const [modal, setModal] = useState<{ parentId: number; parentName: string } | null>(null);
  const [nextId, setNextId] = useState(200);

  // Employee management state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [searchEmp, setSearchEmp] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (activeTab === 'employees') {
      setLoadingEmp(true);
      setEmpError(null);
      Promise.all([
        api.get<Employee[]>('/employees').then(r => r.data),
        api.get<Department[]>('/employees/departments').then(r => r.data).catch(() => [] as Department[]),
      ]).then(([emps, depts]) => {
        setEmployees(emps);
        setDepartments(depts);
      }).catch((err: any) => {
        const msg = err?.response?.data?.error || err?.response?.data?.title || err?.message || 'Lỗi kết nối API';
        setEmpError(`Lỗi: ${msg} (Status: ${err?.response?.status ?? 'N/A'})`);
        setEmployees([]);
      }).finally(() => setLoadingEmp(false));
    }
  }, [activeTab]);

  const filteredEmployees = employees.filter(e => {
    const matchDept = selectedDept === 'all' || e.departmentId === selectedDept;
    const matchSearch = !searchEmp || e.fullName.toLowerCase().includes(searchEmp.toLowerCase()) || e.jobTitle?.toLowerCase().includes(searchEmp.toLowerCase()) || e.skills.some(s => s.name.toLowerCase().includes(searchEmp.toLowerCase()));
    return matchDept && matchSearch;
  });

  // Group by department
  const grouped = filteredEmployees.reduce<Record<string, Employee[]>>((acc, emp) => {
    const deptName = emp.departmentName || 'Chưa phân phòng';
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(emp);
    return acc;
  }, {});

  const tabStyle = (tab: string) => ({
    background: 'transparent',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--accent-green)' : '2px solid transparent',
    borderRadius: 0,
    padding: '10px 20px',
    fontWeight: activeTab === tab ? 700 : 500,
    fontSize: '14px',
    color: activeTab === tab ? '#111827' : '#6b7280',
    cursor: 'pointer',
    transition: 'color 0.2s',
  });

  return (
    <div className="container-fluid py-2 d-flex flex-column" style={{ height: '100%', gap: '16px' }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h2 className="fw-bold m-0" style={{ fontSize: '24px' }}>Nhân sự</h2>
          <p className="text-secondary m-0 mt-1" style={{ fontSize: '14px' }}>Sơ đồ tổ chức và quản lý nhân viên</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="d-flex border-bottom bg-white rounded-top-3" style={{ borderRadius: '12px 12px 0 0' }}>
        <button style={tabStyle('orgchart')} onClick={() => setActiveTab('orgchart')}>
          <i className="bi bi-diagram-3 me-2" />Sơ đồ tổ chức
        </button>
        {canManage && (
          <button style={tabStyle('employees')} onClick={() => setActiveTab('employees')}>
            <i className="bi bi-people me-2" />Quản lý nhân viên
            <span className="ms-2 badge rounded-pill" style={{ background: '#f3f4f6', color: '#374151', fontSize: '11px' }}>{employees.length || '—'}</span>
          </button>
        )}
      </div>

      {/* Org Chart Tab */}
      {activeTab === 'orgchart' && (
        <>
          <div className="bg-white rounded-4 shadow-sm flex-grow-1" style={{ minHeight: '480px', overflowX: 'auto', padding: '48px 32px 64px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="d-flex justify-content-center">
              <OrgNode member={tree} isRoot onAddClick={(id, name) => setModal({ parentId: id, parentName: name })} />
            </div>
          </div>
          <div className="d-flex gap-4 flex-wrap" style={{ fontSize: '12px', color: '#888' }}>
            <span><i className="bi bi-plus-circle-fill me-1" style={{ color: 'var(--accent-green)' }} />Thêm nhân viên vào nhánh</span>
            <span><i className="bi bi-dash-circle-fill me-1 text-primary" />Thu gọn nhánh</span>
          </div>
          {modal && (
            <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 2000, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} onClick={() => setModal(null)}>
              <AddMemberForm parentName={modal.parentName} onClose={() => setModal(null)} onAdd={(name, role) => {
                const newMember: Member = { id: nextId, name, role, avatar: name.replace(/\s+/g, ''), children: [] };
                setTree(prev => addMemberToNode(prev, modal.parentId, newMember));
                setNextId(n => n + 1);
                setModal(null);
              }} />
            </div>
          )}
        </>
      )}

      {/* Employee Management Tab */}
      {activeTab === 'employees' && canManage && (
        <>
          {/* Filter row */}
          <div className="d-flex gap-3 flex-wrap align-items-center">
            <div className="position-relative flex-grow-1" style={{ maxWidth: '300px' }}>
              <i className="bi bi-search position-absolute text-secondary" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control rounded-pill border-0 shadow-sm"
                placeholder="Tìm theo tên, chức vụ, kỹ năng..."
                style={{ paddingLeft: '36px', fontSize: '13px' }}
                value={searchEmp}
                onChange={e => setSearchEmp(e.target.value)}
              />
            </div>
            <select
              className="form-select rounded-pill border-0 shadow-sm"
              style={{ width: 'auto', fontSize: '13px', paddingRight: '32px' }}
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <span className="text-secondary" style={{ fontSize: '13px' }}>{filteredEmployees.length} nhân viên</span>
          </div>

          <div className="flex-grow-1" style={{ overflowY: 'auto', paddingBottom: '32px' }}>
            {loadingEmp ? (
              <div className="row g-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="col-12 col-sm-6 col-md-4 col-xl-3">
                    <div className="bg-white rounded-4 shadow-sm" style={{ height: '150px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  </div>
                ))}
              </div>
            ) : empError ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <i className="bi bi-exclamation-triangle mb-3" style={{ fontSize: '48px', color: '#f59e0b' }} />
                <p className="text-secondary text-center" style={{ maxWidth: '400px' }}>{empError}</p>
                <p className="text-secondary small">Hãy chắc chắn backend đã được khởi động lại sau khi thêm EmployeesController.</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="d-flex flex-column align-items-center justify-content-center py-5 text-secondary">
                <i className="bi bi-people mb-3" style={{ fontSize: '48px', color: '#d1d5db' }} />
                <p>Không có dữ liệu nhân viên.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-5">
                {Object.entries(grouped).map(([deptName, emps]) => (
                  <div key={deptName}>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <h3 className="fw-bold m-0" style={{ fontSize: '16px', color: '#374151' }}>{deptName}</h3>
                      <span className="badge rounded-pill px-2 py-1" style={{ background: '#f3f4f6', color: '#374151', fontSize: '11px' }}>{emps.length} người</span>
                      <div className="flex-grow-1 border-top" />
                    </div>
                    <div className="row g-3">
                      {emps.map(emp => (
                        <div key={emp.id} className="col-12 col-sm-6 col-md-4 col-xl-3">
                          <EmployeeCard emp={emp} onClick={() => setSelectedEmployee(emp)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selectedEmployee && (
        <EmployeeProfileModal emp={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}
    </div>
  );
}

// ─── Add Member Form ─────────────────────────────────────────────────────────
function AddMemberForm({ parentName, onClose, onAdd }: { parentName: string; onClose: () => void; onAdd: (name: string, role: string) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  return (
    <div className="bg-white rounded-4 shadow-lg p-4" style={{ width: '420px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fs-5 fw-bold m-0">Thêm nhân viên</h2>
          <p className="text-secondary small m-0 mt-1">Vào nhánh: <strong>{parentName}</strong></p>
        </div>
        <button className="btn-close" onClick={onClose} />
      </div>
      <form onSubmit={e => { e.preventDefault(); if (name.trim() && role.trim()) onAdd(name.trim(), role.trim()); }}>
        <div className="mb-3">
          <label className="form-label fw-semibold small">Họ và tên</label>
          <input className="form-control rounded-3" placeholder="Ví dụ: Nguyễn Văn A" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="mb-4">
          <label className="form-label fw-semibold small">Chức vụ</label>
          <input className="form-control rounded-3" placeholder="Ví dụ: Lập trình viên" value={role} onChange={e => setRole(e.target.value)} />
        </div>
        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-light border rounded-3 px-4" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn rounded-3 px-4 fw-semibold text-white" style={{ background: 'var(--accent-green)' }} disabled={!name.trim() || !role.trim()}>Thêm</button>
        </div>
      </form>
    </div>
  );
}
