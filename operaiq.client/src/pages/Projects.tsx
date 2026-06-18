import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { projectsApi } from '../api/projects';
import { employeesApi, type EmployeeDto } from '../api/employees';
import type { ProjectDto, ProjectMemberDto } from '../types';
import { AiProjectWizard } from '../components/AiProjectWizard';
import { DirectorPanel } from '../components/DirectorPanel';
import { MyTasksView } from '../components/MyTasksView';
import { useToasts } from '../components/ToastContext';

/* ─── Project Management Modal (For Leaders) ─── */
function ProjectManagementModal({
  project,
  onClose,
  onSuccess
}: {
  project: ProjectDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { push } = useToasts();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [startDate, setStartDate] = useState(project.startDate ? project.startDate.split('T')[0] : '');
  const [dueDate, setDueDate] = useState(project.dueDate ? project.dueDate.split('T')[0] : '');
  const [budget, setBudget] = useState(project.budget);
  
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Member');
  
  const [savingDetails, setSavingDetails] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const loadMembers = () => {
    setLoadingMembers(true);
    projectsApi.getMembers(project.id)
      .then(setMembers)
      .catch(() => push('Lỗi', 'Không thể tải danh sách thành viên.', 'ProjectUpdate'))
      .finally(() => setLoadingMembers(false));
  };

  useEffect(() => {
    loadMembers();
    employeesApi.all()
      .then(setEmployees)
      .catch(() => {});
  }, [project.id]);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      await projectsApi.update(project.id, {
        name,
        description,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        budget
      });
      push('Thành công', 'Đã cập nhật thông tin và giờ giấc dự án.', 'ProjectUpdate');
      onSuccess();
    } catch (err) {
      push('Lỗi', 'Không thể cập nhật thông tin dự án.', 'ProjectUpdate');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    try {
      await projectsApi.addMember(project.id, selectedEmpId, selectedRole);
      push('Thành công', 'Đã thêm thành viên vào dự án.', 'ProjectUpdate');
      setSelectedEmpId('');
      loadMembers();
    } catch (err) {
      push('Lỗi', 'Không thể thêm thành viên.', 'ProjectUpdate');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa thành viên này khỏi dự án?')) return;
    try {
      await projectsApi.removeMember(project.id, userId);
      push('Thành công', 'Đã xóa thành viên khỏi dự án.', 'ProjectUpdate');
      loadMembers();
    } catch (err) {
      push('Lỗi', 'Không thể xóa thành viên.', 'ProjectUpdate');
    }
  };

  const nonMemberEmployees = employees.filter(
    emp => !members.some(m => m.userId === emp.id)
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '780px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1a2a1e 0%, #2d4a35 100%)', color: 'white'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            <i className="bi bi-gear-fill me-2" />
            Cài đặt &amp; Nhân sự: {project.name}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer'
          }}>×</button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Project Details (Giờ giấc & Ngân sách) */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              <i className="bi bi-clock-history me-2" style={{ color: '#5ec47a' }} />
              Cài đặt giờ giấc &amp; Ngân sách
            </h4>
            <form onSubmit={handleUpdateDetails} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>Tên dự án</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px'
                  }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>Ngân sách (VND)</label>
                  <input type="number" value={budget} onChange={e => setBudget(+e.target.value)} required style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px'
                  }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>Ngày bắt đầu</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px'
                  }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>Ngày kết thúc</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px'
                  }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>Mô tả dự án</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', resize: 'vertical'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={savingDetails} style={{
                  padding: '8px 18px', border: 'none', background: 'var(--accent-green)', color: 'white',
                  borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}>
                  {savingDetails ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Members Management (ADD nhân viên) */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
              <i className="bi bi-people-fill me-2" style={{ color: '#5ec47a' }} />
              Quản lý thành viên &amp; Phân công nhân viên
            </h4>

            {/* Add member form */}
            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px', background: '#f9fafb', padding: '12px', borderRadius: '10px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>Chọn nhân viên</label>
                <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} required style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', background: 'white'
                }}>
                  <option value="">— Chọn nhân viên muốn thêm —</option>
                  {nonMemberEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.departmentName || 'Không có phòng ban'})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563', marginBottom: '4px', display: 'block' }}>Vai trò dự án</label>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', background: 'white'
                }}>
                  <option value="Member">Thành viên</option>
                  <option value="Developer">Lập trình viên</option>
                  <option value="Designer">Thiết kế</option>
                  <option value="QA">Kiểm thử</option>
                  <option value="Manager">Quản lý</option>
                </select>
              </div>
              <button type="submit" disabled={!selectedEmpId} style={{
                padding: '9px 18px', border: 'none', background: '#1a2a1e', color: 'white',
                borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: selectedEmpId ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <i className="bi bi-person-plus" /> Thêm
              </button>
            </form>

            {/* Members List */}
            {loadingMembers ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#9ca3af' }}>Đang tải thành viên...</div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', border: '1px dashed #e5e7eb', borderRadius: '10px' }}>
                Chưa có thành viên nào trong dự án này.
              </div>
            ) : (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 14px' }}>Họ và tên</th>
                      <th style={{ padding: '10px 14px' }}>Email</th>
                      <th style={{ padding: '10px 14px' }}>Vai trò</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.userId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.fullName}`} alt="Avatar" style={{ width: '22px', height: '22px', borderRadius: '50%' }} />
                            {member.fullName}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#4b5563' }}>{member.email}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            background: member.role === 'Manager' ? '#fef3c7' : '#e0f2fe',
                            color: member.role === 'Manager' ? '#d97706' : '#0369a1',
                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600
                          }}>{member.role}</span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          {member.role !== 'Manager' && (
                            <button onClick={() => handleRemoveMember(member.userId)} style={{
                              background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 600
                            }}>
                              <i className="bi bi-trash me-1" />Xóa
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ MAIN PROJECTS PAGE ══════════════ */
export function Projects() {
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const { push } = useToasts();

  const isSuperAdmin = hasRole('SuperAdmin');
  const isDirector = hasRole('TenantOwner');
  const isLeader = hasRole('TenantAdmin');
  const isEmployee = hasRole('Employee');

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [showAiWizard, setShowAiWizard] = useState(false);
  const [manageProject, setManageProject] = useState<ProjectDto | null>(null);

  // Tabs for Employee
  const [employeeTab, setEmployeeTab] = useState<'tasks' | 'projects'>('tasks');

  // Dismissed rejection notices local state
  const [dismissedRejections, setDismissedRejections] = useState<string[]>([]);

  const openProject = (id: string) => navigate(`/tasks?project=${id}`);

  const refreshProjects = () => {
    setLoading(true);
    projectsApi.all()
      .then(setProjects)
      .catch(() => push('Lỗi', 'Không thể tải danh sách dự án.', 'ProjectUpdate'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && 
    (isLeader ? true : p.approvalStatus === 'Approved')
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return { bg: '#dcfce7', text: '#166534', label: 'Đang chạy' };
      case 'Completed': return { bg: '#dbeafe', text: '#1e40af', label: 'Hoàn thành' };
      case 'Archived': return { bg: '#f3f4f6', text: '#374151', label: 'Lưu trữ' };
      default: return { bg: '#f3f4f6', text: '#374151', label: status };
    }
  };

  const handleDismissRejection = (id: string) => {
    setDismissedRejections(prev => [...prev, id]);
  };

  // Rejections for this specific Leader
  const activeRejectedProjects = projects.filter(p => 
    p.approvalStatus === 'Rejected' && 
    p.createdById === user?.id && 
    !dismissedRejections.includes(p.id)
  );

  // 1. GIÁM ĐỐC & SUPERADMIN VIEW (DIRECTOR PANEL)
  if (isDirector || isSuperAdmin) {
    return (
      <div className="container-fluid py-2 d-flex flex-column" style={{ height: '100%', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="fw-bold m-0" style={{ fontSize: '24px' }}>Duyệt &amp; Quản lý Dự án</h2>
            <p className="text-secondary m-0 mt-1" style={{ fontSize: '14px' }}>Toàn quyền xem tất cả dự án hiện có, phê duyệt đề xuất từ Leader và giám sát tiến độ qua biểu đồ nhánh</p>
          </div>
        </div>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: '12px', height: '140px', animation: 'pulse 1.5s infinite' } as React.CSSProperties} />
            ))}
          </div>
        ) : (
          <DirectorPanel projects={projects} onRefresh={refreshProjects} />
        )}
      </div>
    );
  }

  // 2. NHÂN VIÊN VIEW (TABBED: TASKS VS PARTICIPATED PROJECTS)
  if (isEmployee) {
    return (
      <div className="container-fluid py-2 d-flex flex-column" style={{ height: '100%', gap: '16px' }}>
        {/* Header & Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="fw-bold m-0" style={{ fontSize: '24px' }}>Không gian làm việc Nhân viên</h2>
            <p className="text-secondary m-0 mt-1" style={{ fontSize: '14px' }}>Theo dõi công việc cá nhân và tiến độ các dự án đang tham gia</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: '#e5e7eb', padding: '4px', borderRadius: '24px' }}>
            <button 
              onClick={() => setEmployeeTab('tasks')}
              style={{
                border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: employeeTab === 'tasks' ? 'white' : 'transparent',
                color: employeeTab === 'tasks' ? '#111827' : '#4b5563',
                boxShadow: employeeTab === 'tasks' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <i className="bi bi-person-check me-2" />
              Công việc của tôi
            </button>
            <button 
              onClick={() => setEmployeeTab('projects')}
              style={{
                border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                background: employeeTab === 'projects' ? 'white' : 'transparent',
                color: employeeTab === 'projects' ? '#111827' : '#4b5563',
                boxShadow: employeeTab === 'projects' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <i className="bi bi-folder-fill me-2" />
              Dự án tham gia
            </button>
          </div>
        </div>

        {employeeTab === 'tasks' ? (
          <div style={{ marginTop: '8px' }}>
            <MyTasksView />
          </div>
        ) : (
          /* Projects grid */
          loading ? (
            <div className="row g-4 mt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="col-12 col-md-6 col-xl-4">
                  <div className="bg-white rounded-4 p-4 shadow-sm animate-pulse" style={{ height: '200px' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="row g-4 mt-2" style={{ overflowY: 'auto', paddingBottom: '32px' }}>
              {filteredProjects.map(project => {
                const statusMeta = getStatusColor(project.status);
                const progress = project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
                
                return (
                  <div key={project.id} className="col-12 col-md-6 col-xl-4">
                    <div 
                      className="bg-white rounded-4 p-4 shadow-sm d-flex flex-column h-100" 
                      style={{ border: '1px solid rgba(0,0,0,0.04)', transition: 'transform 0.2s', cursor: 'pointer' }}
                      onClick={() => openProject(project.id)}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <span className="badge rounded-pill fw-semibold px-3 py-1" style={{ background: statusMeta.bg, color: statusMeta.text, fontSize: '12px' }}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <h3 className="fw-bold mb-2" style={{ fontSize: '18px', color: '#111827' }}>{project.name}</h3>
                      <p className="text-secondary mb-4" style={{ fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {project.description || 'Chưa có mô tả chi tiết.'}
                      </p>
                      <div className="mt-auto">
                        <div className="d-flex justify-content-between align-items-end mb-2" style={{ fontSize: '12px' }}>
                          <span className="text-secondary"><i className="bi bi-list-check me-1" /> {project.completedTaskCount}/{project.taskCount} việc</span>
                          <span className="fw-bold">{progress}%</span>
                        </div>
                        <div className="progress rounded-pill" style={{ height: '6px', background: '#f3f4f6' }}>
                          <div className="progress-bar rounded-pill" style={{ width: `${progress}%`, background: 'var(--accent-green)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredProjects.length === 0 && (
                <div className="col-12 text-center py-5 text-secondary">
                  <i className="bi bi-folder-x mb-2" style={{ fontSize: '48px', color: '#d1d5db' }} />
                  <p>Bạn chưa được gán vào dự án nào.</p>
                </div>
              )}
            </div>
          )
        )}
      </div>
    );
  }

  // 3. LEADER VIEW (PROJECTS GRID + REJECTION BANNERS + AI GENERATION + MANAGEMENT CAPABILITY)
  return (
    <div className="container-fluid py-2 d-flex flex-column" style={{ height: '100%', gap: '16px' }}>
      
      {/* ── Active Rejection Banner ── */}
      {activeRejectedProjects.map(p => (
        <div key={p.id} style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '5px solid #dc2626',
          borderRadius: '12px', padding: '14px 20px', marginBottom: '12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 12px rgba(220,38,38,0.08)'
        }}>
          <div>
            <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '14px' }}>
              <i className="bi bi-x-octagon-fill me-2" />
              DỰ ÁN BỊ BÃI BỎ: "{p.name}"
            </div>
            <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
              Dự án này đã bị Giám đốc từ chối phê duyệt. Lý do cụ thể: <strong>{p.rejectionReason || 'Vượt hạn mức tài chính hoặc tốn quá nhiều thời gian'}</strong>. Bạn hãy tạo kế hoạch mới phù hợp hơn.
            </div>
          </div>
          <button 
            onClick={() => handleDismissRejection(p.id)} 
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
          >
            ×
          </button>
        </div>
      ))}

      {/* ── Header ── */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h2 className="fw-bold m-0" style={{ fontSize: '24px' }}>Dự án</h2>
          <p className="text-secondary m-0 mt-1" style={{ fontSize: '14px' }}>Quản lý tiến độ các dự án, thêm nhân sự và cài đặt giờ giấc</p>
        </div>
        <div className="d-flex gap-3 align-items-center">
          <div className="position-relative">
            <i className="bi bi-search position-absolute text-secondary" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control rounded-pill border-0 shadow-sm"
              placeholder="Tìm kiếm dự án..."
              style={{ paddingLeft: '36px', width: '250px', fontSize: '14px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {isLeader && (
            <button 
              onClick={() => setShowAiWizard(true)}
              className="btn rounded-pill fw-bold text-white d-flex align-items-center gap-2" 
              style={{ background: 'linear-gradient(135deg, #5ec47a 0%, #3da860 100%)', padding: '10px 22px', fontSize: '13px', border: 'none', boxShadow: '0 4px 14px rgba(94,196,122,0.3)' }}
            >
              <i className="bi bi-stars" />
              Tạo dự án với AI
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="row g-4 mt-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="col-12 col-md-6 col-xl-4">
              <div className="bg-white rounded-4 p-4 shadow-sm animate-pulse" style={{ height: '200px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-4 mt-2" style={{ overflowY: 'auto', paddingBottom: '32px' }}>
          {filteredProjects.map(project => {
            const statusMeta = getStatusColor(project.status);
            const progress = project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
            const daysLeft = project.dueDate ? Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
            
            // Check if user is the creator of this project
            const isCreator = project.createdById === user?.id;

            return (
              <div key={project.id} className="col-12 col-md-6 col-xl-4">
                <div
                  className="bg-white rounded-4 p-4 shadow-sm d-flex flex-column h-100"
                  style={{ border: '1px solid rgba(0,0,0,0.04)', transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.04)';
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge rounded-pill fw-semibold px-3 py-1" style={{ background: statusMeta.bg, color: statusMeta.text, fontSize: '12px' }}>
                        {statusMeta.label}
                      </span>
                      {isLeader && (
                        <span className="badge rounded-pill fw-semibold px-3 py-1" style={{
                          background: project.approvalStatus === 'Approved' ? '#dcfce7' 
                                    : project.approvalStatus === 'PendingDirector' ? '#fef9c3' 
                                    : project.approvalStatus === 'Rejected' ? '#fee2e2' : '#f3f4f6',
                          color: project.approvalStatus === 'Approved' ? '#166534' 
                               : project.approvalStatus === 'PendingDirector' ? '#92400e' 
                               : project.approvalStatus === 'Rejected' ? '#dc2626' : '#374151',
                          fontSize: '12px'
                        }}>
                          {project.approvalStatus === 'Approved' ? 'Đã duyệt' 
                           : project.approvalStatus === 'PendingDirector' ? 'Chờ duyệt' 
                           : project.approvalStatus === 'Rejected' ? 'Bị từ chối' : 'Nháp'}
                        </span>
                      )}
                    </div>
                    {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && project.status === 'Active' && (
                      <span className="badge rounded-pill px-2 py-1 ms-2" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '11px' }}>
                        <i className="bi bi-fire me-1" /> Sắp đến hạn
                      </span>
                    )}
                    
                    {/* Settings button for Leader/Creator */}
                    {isCreator && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setManageProject(project); }}
                        style={{
                          background: '#f3f4f6', border: 'none', width: '32px', height: '32px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        title="Quản lý nhân viên và thời gian"
                      >
                        <i className="bi bi-gear-fill" />
                      </button>
                    )}
                  </div>
                  
                  <div onClick={() => openProject(project.id)} style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 className="fw-bold mb-2" style={{ fontSize: '17px', lineHeight: 1.4, color: '#111827' }}>
                      {project.name}
                    </h3>
                    
                    <p className="text-secondary mb-4" style={{ fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.description || 'Chưa có mô tả chi tiết.'}
                    </p>

                    <div className="mt-auto">
                      <div className="d-flex justify-content-between align-items-end mb-2">
                        <div className="d-flex flex-column gap-1 text-secondary" style={{ fontSize: '12px' }}>
                          <span><i className="bi bi-list-check me-1" /> {project.completedTaskCount} / {project.taskCount} việc</span>
                        </div>
                        <span className="fw-bold" style={{ fontSize: '13px', color: '#111827' }}>{progress}%</span>
                      </div>
                      <div className="progress rounded-pill" style={{ height: '6px', background: '#f3f4f6' }}>
                        <div 
                          className="progress-bar rounded-pill" 
                          style={{ width: `${progress}%`, background: progress === 100 ? '#059669' : 'var(--accent-green)' }}
                        />
                      </div>
                    </div>
                    
                    <hr className="my-3 opacity-10" />
                    
                    <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '12px' }}>
                      <div className="d-flex align-items-center gap-2">
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${project.createdByName}`} 
                          alt="Creator" 
                          style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f3f4f6' }}
                        />
                        <span style={{ color: '#4b5563', fontWeight: 500 }}>{project.createdByName}</span>
                      </div>
                      {project.dueDate && (
                        <span className="text-secondary">
                          <i className="bi bi-calendar-event me-1" />
                          {new Date(project.dueDate).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredProjects.length === 0 && (
            <div className="col-12 text-center py-5 text-secondary">
              <i className="bi bi-folder-x mb-2" style={{ fontSize: '48px', color: '#d1d5db' }} />
              <p>Chưa có dự án nào được phê duyệt.</p>
            </div>
          )}
        </div>
      )}

      {/* AI Wizard Modal */}
      {showAiWizard && (
        <AiProjectWizard 
          onClose={() => setShowAiWizard(false)} 
          onSuccess={() => {
            setShowAiWizard(false);
            refreshProjects();
            push('Tạo dự án thành công', 'Đề xuất dự án đã được gửi tới Giám đốc.', 'ProjectUpdate');
          }} 
        />
      )}

      {/* Project Management Modal */}
      {manageProject && (
        <ProjectManagementModal 
          project={manageProject}
          onClose={() => setManageProject(null)}
          onSuccess={() => {
            setManageProject(null);
            refreshProjects();
          }}
        />
      )}
    </div>
  );
}
