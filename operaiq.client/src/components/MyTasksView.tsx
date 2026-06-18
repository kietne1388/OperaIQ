import { useEffect, useState } from 'react';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { getApiError } from '../api/client';
import type { MyProjectTaskDto, TaskStatus } from '../types';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Low:      { label: 'Thấp',   color: '#16a34a', bg: '#dcfce7' },
  Medium:   { label: 'Trung bình', color: '#ca8a04', bg: '#fef9c3' },
  High:     { label: 'Cao',    color: '#d97706', bg: '#fef3c7' },
  Critical: { label: 'Khẩn cấp', color: '#dc2626', bg: '#fee2e2' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  Backlog:    { label: 'Tồn đọng', color: '#9ca3af', icon: 'bi-inbox' },
  Todo:       { label: 'Chưa làm', color: '#6b7280', icon: 'bi-circle' },
  InProgress: { label: 'Đang làm', color: '#2563eb', icon: 'bi-play-circle-fill' },
  Review:     { label: 'Đang kiểm tra', color: '#d97706', icon: 'bi-search' },
  Done:       { label: 'Hoàn thành', color: '#059669', icon: 'bi-check-circle-fill' },
  Cancelled:  { label: 'Hủy bỏ', color: '#9ca3af', icon: 'bi-x-circle' },
};

interface UpdateStatusPayload {
  taskId: string;
  newStatus: TaskStatus;
}

export function MyTasksView() {
  const [tasks, setTasks] = useState<MyProjectTaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('active');

  const fetchTasks = () => {
    setLoading(true);
    projectsApi.myTasks()
      .then(setTasks)
      .catch(err => setError(getApiError(err, 'Không thể tải công việc.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleUpdateStatus = async ({ taskId, newStatus }: UpdateStatusPayload) => {
    setUpdating(taskId);
    try {
      await tasksApi.updateStatus(taskId, newStatus);
      fetchTasks();
    } catch (err) {
      setError(getApiError(err, 'Không thể cập nhật trạng thái.'));
    } finally {
      setUpdating(null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'active') return t.status !== 'Done' && t.status !== 'Cancelled';
    if (filter === 'done') return t.status === 'Done';
    return true;
  });

  // Group by project
  const byProject = filteredTasks.reduce<Record<string, { projectName: string; tasks: MyProjectTaskDto[] }>>((acc, t) => {
    if (!acc[t.projectId]) acc[t.projectId] = { projectName: t.projectName, tasks: [] };
    acc[t.projectId].tasks.push(t);
    return acc;
  }, {});

  const getDaysLeft = (dueDate?: string | null) => {
    if (!dueDate) return null;
    return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  };

  const nextStatus: Record<string, TaskStatus> = {
    Todo: 'InProgress',
    InProgress: 'Review',
    Review: 'Done',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '20px', margin: '0 0 4px', color: '#111827' }}>
              <i className="bi bi-person-check me-2" style={{ color: '#5ec47a' }} />
              Công việc của tôi
            </h2>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
              Tất cả công việc bạn đã và đang tham gia xuyên suốt các dự án
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'active', 'done'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '12px',
                background: filter === f ? '#1a2a1e' : '#f3f4f6',
                color: filter === f ? 'white' : '#374151',
                transition: 'all 0.2s'
              }}>
                {f === 'all' ? 'Tất cả' : f === 'active' ? 'Đang thực hiện' : 'Đã hoàn thành'}
                <span style={{ marginLeft: '6px', opacity: 0.7, fontSize: '11px' }}>
                  ({f === 'all' ? tasks.length : f === 'active' ? tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled').length : tasks.filter(t => t.status === 'Done').length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Tổng việc', value: tasks.length, color: '#5ec47a', icon: 'bi-list-task' },
            { label: 'Đang làm', value: tasks.filter(t => t.status === 'InProgress').length, color: '#2563eb', icon: 'bi-play-circle' },
            { label: 'Chờ kiểm tra', value: tasks.filter(t => t.status === 'Review').length, color: '#d97706', icon: 'bi-search' },
            { label: 'Hoàn thành', value: tasks.filter(t => t.status === 'Done').length, color: '#059669', icon: 'bi-check2-all' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', border: '1px solid #f3f4f6', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: s.color, flexShrink: 0 }}>
                <i className={`bi ${s.icon}`} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '18px', color: '#111827' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
          <i className="bi bi-exclamation-triangle me-2" />{error}
        </div>
      )}

      {/* Task groups by project */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#f9fafb', borderRadius: '12px', height: '100px', animation: 'pulse 1.5s infinite' } as React.CSSProperties} />
          ))}
        </div>
      ) : Object.keys(byProject).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af' }}>
          <i className="bi bi-inbox" style={{ fontSize: '48px', display: 'block', marginBottom: '12px', color: '#d1d5db' }} />
          <p style={{ fontSize: '14px' }}>
            {filter === 'done' ? 'Chưa có công việc nào hoàn thành.' : 'Bạn không có công việc nào đang thực hiện.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(byProject).map(([projectId, { projectName, tasks: pTasks }]) => {
            const doneCount = pTasks.filter(t => t.status === 'Done').length;
            const pct = pTasks.length > 0 ? Math.round((doneCount / pTasks.length) * 100) : 0;

            return (
              <div key={projectId} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                {/* Project header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f9fafb', background: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#16a34a' }}>
                        <i className="bi bi-folder-fill" />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>{projectName}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {doneCount}/{pTasks.length} việc · <strong style={{ color: '#5ec47a' }}>{pct}%</strong>
                    </span>
                  </div>
                  <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #5ec47a, #3da860)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {/* Tasks */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pTasks.map(task => {
                    const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.Todo;
                    const priCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.Medium;
                    const daysLeft = getDaysLeft(task.dueDate);
                    const nextSt = nextStatus[task.status];
                    const isUpdating = updating === task.taskId;

                    return (
                      <div key={task.taskId} style={{
                        border: '1px solid #f3f4f6', borderRadius: '10px', padding: '12px 14px',
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                        transition: 'background 0.15s',
                        background: task.status === 'Done' ? '#fafafa' : 'white'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = task.status === 'Done' ? '#fafafa' : 'white'; }}
                      >
                        {/* Status icon */}
                        <i className={`bi ${statusCfg.icon}`} style={{ color: statusCfg.color, fontSize: '18px', marginTop: '2px', flexShrink: 0 }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: task.status === 'Done' ? '#9ca3af' : '#111827', textDecoration: task.status === 'Done' ? 'line-through' : 'none', marginBottom: '4px', lineHeight: 1.4 }}>
                            {task.isAiAssigned && <i className="bi bi-stars me-1" style={{ color: '#5ec47a', fontSize: '12px' }} />}
                            {task.taskTitle}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ background: priCfg.bg, color: priCfg.color, borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                              {priCfg.label}
                            </span>
                            <span style={{ background: '#f3f4f6', color: statusCfg.color, borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                              {statusCfg.label}
                            </span>
                            {daysLeft !== null && task.status !== 'Done' && (
                              <span style={{ fontSize: '11px', color: daysLeft <= 0 ? '#dc2626' : daysLeft <= 3 ? '#d97706' : '#6b7280' }}>
                                <i className="bi bi-calendar-event me-1" />
                                {daysLeft > 0 ? `còn ${daysLeft} ngày` : daysLeft === 0 ? 'Hết hạn hôm nay' : `Quá hạn ${Math.abs(daysLeft)} ngày`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick update status */}
                        {nextSt && task.status !== 'Done' && (
                          <button
                            onClick={() => handleUpdateStatus({ taskId: task.taskId, newStatus: nextSt })}
                            disabled={isUpdating}
                            title={`Chuyển sang: ${STATUS_CONFIG[nextSt]?.label}`}
                            style={{
                              padding: '6px 12px', borderRadius: '8px', border: 'none',
                              background: '#f0fdf4', color: '#16a34a', fontWeight: 600,
                              fontSize: '11px', cursor: isUpdating ? 'not-allowed' : 'pointer',
                              flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
                              opacity: isUpdating ? 0.6 : 1, transition: 'all 0.2s'
                            }}
                          >
                            {isUpdating ? (
                              <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }} />
                            ) : (
                              <><i className={`bi ${STATUS_CONFIG[nextSt]?.icon}`} /> {STATUS_CONFIG[nextSt]?.label}</>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
