import { useState } from 'react';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { getApiError } from '../api/client';
import type { ProjectDto, TaskDto } from '../types';

interface DirectorPanelProps {
  projects: ProjectDto[];
  onRefresh: () => void;
}

function formatBudget(val: number) {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (val >= 1_000_000) return `${Math.round(val / 1_000_000)} tr`;
  return val.toLocaleString('vi-VN');
}

function getDaysLeft(dueDate?: string | null) {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  Todo:       { label: 'Cần làm',      color: '#6b7280', bg: '#f3f4f6' },
  InProgress: { label: 'Đang làm',     color: '#2563eb', bg: '#dbeafe' },
  Review:     { label: 'Đang duyệt',   color: '#d97706', bg: '#fef3c7' },
  Done:       { label: 'Hoàn thành',   color: '#16a34a', bg: '#dcfce7' },
  Cancelled:  { label: 'Hủy',          color: '#dc2626', bg: '#fee2e2' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  Low:      { label: 'Thấp',    color: '#6b7280' },
  Medium:   { label: 'Trung bình', color: '#d97706' },
  High:     { label: 'Cao',     color: '#dc2626' },
  Critical: { label: 'Khẩn cấp', color: '#7c3aed' },
};

/* ── Bar Chart Component ────────────────────────────────────── */
function TaskBarChart({ tasks }: { tasks: TaskDto[] }) {
  const statusOrder: TaskDto['status'][] = ['Todo', 'InProgress', 'Review', 'Done', 'Cancelled'];
  const counts = statusOrder.map(s => tasks.filter(t => t.status === s).length);
  const maxVal = Math.max(...counts, 1);

  const chartH = 130;
  const barW = 44;
  const gap = 20;
  const padLeft = 38;
  const padBottom = 44;
  const padTop = 16;
  const totalW = padLeft + statusOrder.length * (barW + gap) + 10;
  const innerH = chartH - padTop - padBottom;

  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];
  const uniqueTicks = [...new Set(yTicks)].sort((a, b) => a - b);

  const colors = ['#6b7280', '#3b82f6', '#f59e0b', '#22c55e', '#ef4444'];

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={totalW} height={chartH} style={{ fontFamily: 'Inter, sans-serif', display: 'block' }}>
        {/* Y axis grid lines + labels */}
        {uniqueTicks.map(tick => {
          const y = padTop + innerH - (tick / maxVal) * innerH;
          return (
            <g key={tick}>
              <line x1={padLeft} y1={y} x2={totalW - 8} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padLeft - 5} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{tick}</text>
            </g>
          );
        })}

        {/* Bars */}
        {statusOrder.map((s, i) => {
          const count = counts[i];
          const barH = (count / maxVal) * innerH;
          const x = padLeft + i * (barW + gap);
          const y = padTop + innerH - barH;
          const { label } = STATUS_LABELS[s];
          const color = colors[i];

          return (
            <g key={s}>
              {/* Bar */}
              <rect
                x={x} y={y}
                width={barW} height={Math.max(barH, 2)}
                rx={4} ry={4}
                fill={color}
                opacity={0.88}
              />
              {/* Value label on top */}
              {count > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
                  {count}
                </text>
              )}
              {/* X label */}
              <text
                x={x + barW / 2}
                y={padTop + innerH + 14}
                textAnchor="middle"
                fontSize={9}
                fill="#6b7280"
                style={{ whiteSpace: 'nowrap' }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Y axis line */}
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="#d1d5db" strokeWidth={1.5} />
        {/* X axis line */}
        <line x1={padLeft} y1={padTop + innerH} x2={totalW - 8} y2={padTop + innerH} stroke="#d1d5db" strokeWidth={1.5} />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
        {statusOrder.map((s, i) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#6b7280' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[i], display: 'inline-block' }} />
            {STATUS_LABELS[s].label}: <strong style={{ color: colors[i] }}>{counts[i]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Task List Component ────────────────────────────────────── */
function TaskList({ tasks }: { tasks: TaskDto[] }) {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '3px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            fontSize: '11px', fontWeight: 600,
            background: filterStatus === 'all' ? '#202220' : '#f3f4f6',
            color: filterStatus === 'all' ? 'white' : '#374151',
          }}
        >
          Tất cả ({tasks.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([key, cfg]) => {
          const cnt = tasks.filter(t => t.status === key).length;
          if (cnt === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              style={{
                padding: '3px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 600,
                background: filterStatus === key ? cfg.color : cfg.bg,
                color: filterStatus === key ? 'white' : cfg.color,
              }}
            >
              {cfg.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Task rows */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
          Không có công việc
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
          {filtered.map(task => {
            const sc = STATUS_LABELS[task.status] || STATUS_LABELS.Todo;
            const pc = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.Medium;
            const due = task.dueDate ? new Date(task.dueDate) : null;
            const overdue = due && due < new Date() && task.status !== 'Done';
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px',
                  background: overdue ? '#fff5f5' : '#f9fafb',
                  border: `1px solid ${overdue ? '#fecaca' : '#e5e7eb'}`,
                  fontSize: '12px',
                }}
              >
                {/* Status dot */}
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: sc.color, flexShrink: 0
                }} />

                {/* Title */}
                <span style={{ flex: 1, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
                  {task.title}
                  {task.isAiAssigned && (
                    <span style={{ marginLeft: 6, fontSize: '10px', color: '#16a34a' }}>
                      <i className="bi bi-stars" /> AI
                    </span>
                  )}
                </span>

                {/* Assignee */}
                {task.assignedToName && (
                  <span style={{ color: '#6b7280', fontSize: '11px', flexShrink: 0, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <i className="bi bi-person me-1" />{task.assignedToName}
                  </span>
                )}

                {/* Priority */}
                <span style={{
                  padding: '2px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                  color: pc.color, background: `${pc.color}18`, flexShrink: 0
                }}>
                  {pc.label}
                </span>

                {/* Status badge */}
                <span style={{
                  padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                  color: sc.color, background: sc.bg, flexShrink: 0
                }}>
                  {sc.label}
                </span>

                {/* Due date */}
                {due && (
                  <span style={{ fontSize: '10px', color: overdue ? '#dc2626' : '#6b7280', flexShrink: 0 }}>
                    <i className={`bi ${overdue ? 'bi-exclamation-triangle' : 'bi-calendar3'} me-1`} />
                    {due.toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main DirectorPanel ─────────────────────────────────────── */
export function DirectorPanel({ projects, onRefresh }: DirectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState<'chart' | 'tasks'>('chart');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [tasksByProject, setTasksByProject] = useState<Record<string, TaskDto[]>>({});
  const [loadingTasks, setLoadingTasks] = useState<string | null>(null);

  const pending  = projects.filter(p => p.approvalStatus === 'PendingDirector');
  const approved = projects.filter(p => p.approvalStatus === 'Approved');
  const rejected = projects.filter(p => p.approvalStatus === 'Rejected');
  const currentList = activeTab === 'pending' ? pending : activeTab === 'approved' ? approved : rejected;

  const handleApprove = async (id: string) => {
    setLoadingId(id); setError('');
    try { await projectsApi.approve(id); onRefresh(); }
    catch (err) { setError(getApiError(err, 'Không thể duyệt dự án.')); }
    finally { setLoadingId(null); }
  };

  const handleReject = async () => {
    if (!rejectModalId || !rejectReason.trim()) return;
    setLoadingId(rejectModalId); setError('');
    try {
      await projectsApi.reject(rejectModalId, rejectReason);
      setRejectModalId(null); setRejectReason(''); onRefresh();
    } catch (err) { setError(getApiError(err, 'Không thể từ chối dự án.')); }
    finally { setLoadingId(null); }
  };

  const toggleExpand = async (projectId: string, view: 'chart' | 'tasks') => {
    if (expandedProject === projectId && expandedView === view) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(projectId);
    setExpandedView(view);
    if (view === 'tasks' && !tasksByProject[projectId]) {
      setLoadingTasks(projectId);
      try {
        const tasks = await tasksApi.byProject(projectId);
        setTasksByProject(prev => ({ ...prev, [projectId]: tasks }));
      } catch { /* skip */ }
      finally { setLoadingTasks(null); }
    }
  };

  const tabConfig = [
    { key: 'pending'  as const, label: 'Chờ duyệt',   count: pending.length,  color: '#f59e0b', bg: '#fef9c3', icon: 'bi-hourglass-split'  },
    { key: 'approved' as const, label: 'Đã duyệt',    count: approved.length, color: '#16a34a', bg: '#dcfce7', icon: 'bi-check-circle-fill' },
    { key: 'rejected' as const, label: 'Đã từ chối',  count: rejected.length, color: '#dc2626', bg: '#fee2e2', icon: 'bi-x-circle-fill'     },
  ];

  return (
    <div>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
          <i className="bi bi-exclamation-triangle me-2" />{error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2a1e 0%, #2d4a35 100%)',
        borderRadius: '16px', padding: '20px 24px', marginBottom: '24px',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '13px', opacity: 0.75, marginBottom: '4px' }}>
            <i className="bi bi-shield-check me-2" />Bảng điều khiển Giám đốc
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Tổng quan Dự án</h2>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {tabConfig.map(t => (
            <div key={t.key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: t.key === 'pending' ? '#fde047' : t.key === 'approved' ? '#4ade80' : '#f87171' }}>
                {t.count}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>{t.label}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#60a5fa' }}>{projects.length}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Tổng dự án</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabConfig.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
            background: activeTab === t.key ? t.color : '#f3f4f6',
            color: activeTab === t.key ? 'white' : '#374151',
            transition: 'all 0.2s',
            boxShadow: activeTab === t.key ? `0 4px 12px ${t.color}40` : 'none'
          }}>
            <i className={`bi ${t.icon}`} />
            {t.label}
            <span style={{
              background: activeTab === t.key ? 'rgba(255,255,255,0.3)' : t.bg,
              color: activeTab === t.key ? 'white' : t.color,
              borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 700
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Project cards */}
      {currentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
          <i className="bi bi-folder-x" style={{ fontSize: '48px', display: 'block', marginBottom: '12px', color: '#d1d5db' }} />
          <p style={{ fontSize: '14px' }}>Không có dự án {activeTab === 'pending' ? 'chờ duyệt' : activeTab === 'approved' ? 'đã duyệt' : 'bị từ chối'}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {currentList.map(project => {
            const daysLeft   = getDaysLeft(project.dueDate);
            const isExpanded = expandedProject === project.id;
            const isLoading  = loadingId === project.id;
            const tasks      = tasksByProject[project.id] ?? [];
            const completedCount = tasks.filter(t => t.status === 'Done').length;
            const pendingCount   = tasks.length - completedCount;

            return (
              <div key={project.id} style={{
                background: 'white', borderRadius: '16px', overflow: 'hidden',
                border: project.approvalStatus === 'PendingDirector' ? '2px solid #fde68a'
                      : project.approvalStatus === 'Approved'        ? '1px solid #bbf7d0'
                      :                                                '1px solid #fecaca',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.2s'
              }}>
                {/* Header */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Status badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {project.approvalStatus === 'PendingDirector' && (
                          <span style={{ background: '#fef9c3', color: '#92400e', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                            <i className="bi bi-hourglass-split me-1" />Chờ duyệt
                          </span>
                        )}
                        {project.approvalStatus === 'Approved' && (
                          <span style={{ background: '#dcfce7', color: '#166534', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                            <i className="bi bi-check-circle me-1" />Đã duyệt
                          </span>
                        )}
                        {project.approvalStatus === 'Rejected' && (
                          <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                            <i className="bi bi-x-circle me-1" />Đã từ chối
                          </span>
                        )}
                        {project.code && (
                          <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: '20px', padding: '3px 10px', fontSize: '11px' }}>
                            #{project.code}
                          </span>
                        )}
                        {project.aiProblemInput && (
                          <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: '20px', padding: '3px 10px', fontSize: '11px' }}>
                            <i className="bi bi-stars me-1" />Tạo bởi AI
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontWeight: 700, fontSize: '17px', color: '#111827', margin: '0 0 6px' }}>
                        {project.name}
                      </h3>

                      {project.description && (
                        <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.5 }}>
                          {project.description}
                        </p>
                      )}

                      {project.approvalStatus === 'Rejected' && project.rejectionReason && (
                        <div style={{
                          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                          padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '12px'
                        }}>
                          <strong><i className="bi bi-x-octagon me-2" />Lý do từ chối:</strong> {project.rejectionReason}
                        </div>
                      )}

                      {/* Meta row */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#4b5563' }}>
                        {project.budget > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="bi bi-cash-coin" style={{ color: '#5ec47a' }} />
                            <strong>{formatBudget(project.budget)}</strong> VND
                          </span>
                        )}
                        {project.startDate && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="bi bi-play-circle" style={{ color: '#8b5cf6' }} />
                            {new Date(project.startDate).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                        {project.dueDate && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="bi bi-calendar-event" style={{ color: '#3b82f6' }} />
                            {new Date(project.dueDate).toLocaleDateString('vi-VN')}
                            {daysLeft !== null && (
                              <span style={{ color: daysLeft <= 7 ? '#dc2626' : '#6b7280', fontWeight: 500 }}>
                                ({daysLeft > 0 ? `còn ${daysLeft} ngày` : 'đã hết hạn'})
                              </span>
                            )}
                          </span>
                        )}
                        {project.customerName && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="bi bi-building" style={{ color: '#f59e0b' }} />
                            {project.customerName}
                          </span>
                        )}
                        {project.createdByName && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="bi bi-person-badge" style={{ color: '#06b6d4' }} />
                            {project.createdByName}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="bi bi-list-check" style={{ color: '#f59e0b' }} />
                          {project.completedTaskCount}/{project.taskCount} việc hoàn thành
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                      {project.approvalStatus === 'PendingDirector' && (
                        <>
                          <button
                            onClick={() => handleApprove(project.id)}
                            disabled={isLoading}
                            style={{
                              padding: '9px 20px', borderRadius: '10px', border: 'none',
                              background: 'linear-gradient(135deg, #5ec47a, #3da860)',
                              color: 'white', fontWeight: 700, fontSize: '13px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              opacity: isLoading ? 0.7 : 1,
                              display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                            }}
                          >
                            {isLoading ? <><span className="spinner-border spinner-border-sm" /> Đang xử lý…</> : <><i className="bi bi-check-lg" /> Duyệt</>}
                          </button>
                          <button
                            onClick={() => setRejectModalId(project.id)}
                            disabled={isLoading}
                            style={{
                              padding: '9px 20px', borderRadius: '10px',
                              border: '1px solid #fecaca', background: 'white',
                              color: '#dc2626', fontWeight: 700, fontSize: '13px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                            }}
                          >
                            <i className="bi bi-x-lg" /> Từ chối
                          </button>
                        </>
                      )}
                      {/* Chart button */}
                      <button
                        onClick={() => toggleExpand(project.id, 'chart')}
                        style={{
                          padding: '8px 14px', borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                          background: isExpanded && expandedView === 'chart' ? '#202220' : '#f9fafb',
                          color: isExpanded && expandedView === 'chart' ? 'white' : '#374151',
                          fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <i className="bi bi-bar-chart-fill" style={{ color: isExpanded && expandedView === 'chart' ? '#5ec47a' : '#5ec47a' }} />
                        Biểu đồ
                      </button>
                      {/* Tasks button */}
                      <button
                        onClick={() => toggleExpand(project.id, 'tasks')}
                        style={{
                          padding: '8px 14px', borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                          background: isExpanded && expandedView === 'tasks' ? '#202220' : '#f9fafb',
                          color: isExpanded && expandedView === 'tasks' ? 'white' : '#374151',
                          fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <i className="bi bi-kanban" style={{ color: '#3b82f6' }} />
                        Công việc
                        {project.taskCount > 0 && (
                          <span style={{
                            background: isExpanded && expandedView === 'tasks' ? 'rgba(255,255,255,0.2)' : '#dbeafe',
                            color: isExpanded && expandedView === 'tasks' ? 'white' : '#2563eb',
                            borderRadius: '8px', padding: '0 6px', fontSize: '10px', fontWeight: 700
                          }}>{project.taskCount}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar for approved projects */}
                  {project.approvalStatus === 'Approved' && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        <span>Tiến độ thực hiện</span>
                        <span style={{ fontWeight: 700 }}>{project.progressPercent}%</span>
                      </div>
                      <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${project.progressPercent}%`, height: '100%',
                          background: project.progressPercent === 100 ? '#16a34a' : 'linear-gradient(90deg, #5ec47a, #3da860)',
                          borderRadius: '4px', transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '20px 24px', background: '#fafafa' }}>

                    {/* Inline tab switcher */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <button
                        onClick={() => { setExpandedView('chart'); }}
                        style={{
                          padding: '5px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          fontSize: '12px', fontWeight: 600,
                          background: expandedView === 'chart' ? '#202220' : '#f3f4f6',
                          color: expandedView === 'chart' ? 'white' : '#374151',
                        }}
                      >
                        <i className="bi bi-bar-chart-fill me-1" style={{ color: '#5ec47a' }} />
                        Biểu đồ công việc
                      </button>
                      <button
                        onClick={() => { setExpandedView('tasks'); if (!tasksByProject[project.id]) toggleExpand(project.id, 'tasks'); }}
                        style={{
                          padding: '5px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                          fontSize: '12px', fontWeight: 600,
                          background: expandedView === 'tasks' ? '#202220' : '#f3f4f6',
                          color: expandedView === 'tasks' ? 'white' : '#374151',
                        }}
                      >
                        <i className="bi bi-list-task me-1" style={{ color: '#3b82f6' }} />
                        Chi tiết công việc
                      </button>
                    </div>

                    {expandedView === 'chart' && (
                      <div>
                        {/* Summary stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                          {[
                            { label: 'Tổng việc',    value: project.taskCount,                      color: '#374151', bg: '#f3f4f6' },
                            { label: 'Hoàn thành',   value: project.completedTaskCount,             color: '#16a34a', bg: '#dcfce7' },
                            { label: 'Còn lại',      value: project.taskCount - project.completedTaskCount, color: '#f59e0b', bg: '#fef9c3' },
                            { label: 'Tiến độ',      value: `${project.progressPercent}%`,          color: '#2563eb', bg: '#dbeafe' },
                          ].map(s => (
                            <div key={s.label} style={{
                              padding: '10px', borderRadius: '10px',
                              background: s.bg, textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Bar chart — uses actual tasks if loaded, else uses project aggregate */}
                        {loadingTasks === project.id ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
                            <span className="spinner-border spinner-border-sm me-2" />Đang tải biểu đồ…
                          </div>
                        ) : tasks.length > 0 ? (
                          <TaskBarChart tasks={tasks} />
                        ) : (
                          // Fallback synthetic chart from counts
                          <TaskBarChart tasks={[
                            ...Array(project.completedTaskCount).fill({ status: 'Done' } as any),
                            ...Array(Math.max(0, project.taskCount - project.completedTaskCount)).fill({ status: 'InProgress' } as any),
                          ]} />
                        )}
                      </div>
                    )}

                    {expandedView === 'tasks' && (
                      <div>
                        {loadingTasks === project.id ? (
                          <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px' }}>
                            <span className="spinner-border spinner-border-sm me-2" />Đang tải danh sách công việc…
                          </div>
                        ) : (
                          <>
                            {tasks.length > 0 ? (
                              <>
                                <div style={{ marginBottom: '10px', fontSize: '12px', color: '#6b7280' }}>
                                  <i className="bi bi-info-circle me-1" />
                                  Tổng <strong>{tasks.length}</strong> công việc —&nbsp;
                                  <span style={{ color: '#16a34a' }}>✔ {completedCount} hoàn thành</span>,&nbsp;
                                  <span style={{ color: '#f59e0b' }}>⏳ {pendingCount} chưa xong</span>
                                </div>
                                <TaskList tasks={tasks} />
                              </>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '13px' }}>
                                <i className="bi bi-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                                Chưa có công việc nào trong dự án này
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '28px',
            maxWidth: '460px', width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#dc2626' }}>
                  <i className="bi bi-x-circle" />
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Từ chối dự án</h3>
              </div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                Leader sẽ nhận thông báo với lý do bạn nhập. Hãy giải thích rõ để họ điều chỉnh.
              </p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '8px', display: 'block' }}>
                Lý do từ chối <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Ngân sách vượt hạn mức được phê duyệt, cần xem xét lại phương án thực hiện..."
                rows={4}
                style={{
                  width: '100%', borderRadius: '10px', border: '2px solid #e5e7eb',
                  padding: '12px', fontSize: '14px', fontFamily: 'inherit',
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = '#ef4444'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setRejectModalId(null); setRejectReason(''); }} style={{
                padding: '10px 20px', borderRadius: '10px', border: '1px solid #e5e7eb',
                background: 'white', color: '#374151', fontWeight: 600, cursor: 'pointer'
              }}>
                Hủy
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || !!loadingId}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  background: rejectReason.trim() ? '#dc2626' : '#f3f4f6',
                  color: rejectReason.trim() ? 'white' : '#9ca3af',
                  fontWeight: 700, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {loadingId ? <><span className="spinner-border spinner-border-sm" /> Đang xử lý…</> : <><i className="bi bi-x-lg" /> Xác nhận từ chối</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
