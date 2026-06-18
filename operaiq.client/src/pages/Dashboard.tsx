import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { projectsApi } from '../api/projects';
import { STATUS_LABELS } from '../components/Badges';
import type { DashboardSummary, ProjectDto, TaskStatus } from '../types';

const STATUS_DOT: Record<TaskStatus, string> = {
  Todo: '#6b7280',
  InProgress: '#2563eb',
  Review: '#d97706',
  Done: '#059669',
  Cancelled: '#9ca3af',
};

export function Dashboard() {
  const navigate = useNavigate();
  const [aiState, setAiState] = useState<'idle' | 'generating' | 'report' | 'chart'>('idle');
  const [aiReportText, setAiReportText] = useState<string>('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.summary().catch(() => null),
      projectsApi.all().catch(() => [] as ProjectDto[]),
    ])
      .then(([s, p]) => { setSummary(s); setProjects(p); })
      .finally(() => setLoading(false));
  }, []);

  const handleAiClick = async () => {
    if (aiState === 'idle') {
      setAiState('generating');
      try {
        const data = await dashboardApi.aiReport();
        setAiReportText(data.report);
        setAiState('report');
      } catch (error) {
        console.error('Error generating AI report:', error);
        setAiReportText('Không thể tạo báo cáo phân tích hoạt động lúc này. Vui lòng thử lại sau.');
        setAiState('report');
      }
    } else if (aiState === 'report') {
      setAiState('chart');
    } else {
      setAiState('idle');
    }
  };

  const parseBoldText = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="fw-bold" style={{ color: '#0f172a' }}>{part.slice(2, -2)}</strong>;
      }
      return part as unknown as React.ReactNode;
    });
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: React.ReactNode[] = [];
    let orderedBuffer: React.ReactNode[] = [];

    const flushBullets = () => {
      if (listBuffer.length > 0) {
        elements.push(<ul key={`ul-${elements.length}`} className="ps-3 mb-2" style={{ listStyleType: 'disc' }}>{listBuffer}</ul>);
        listBuffer = [];
      }
    };
    const flushOrdered = () => {
      if (orderedBuffer.length > 0) {
        elements.push(<ol key={`ol-${elements.length}`} className="ps-3 mb-2" style={{ listStyleType: 'decimal' }}>{orderedBuffer}</ol>);
        orderedBuffer = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Heading levels
      if (/^#{3,}\s/.test(trimmed)) {
        flushBullets(); flushOrdered();
        elements.push(
          <h5 key={idx} className="fw-bold mt-3 mb-2" style={{ color: 'var(--accent-green)', fontSize: '15px' }}>
            {parseBoldText(trimmed.replace(/^#{1,6}\s*/, ''))}
          </h5>
        );
        return;
      }
      if (/^#{1,2}\s/.test(trimmed)) {
        flushBullets(); flushOrdered();
        elements.push(
          <h4 key={idx} className="fw-bold mt-3 mb-2" style={{ color: '#1e293b', fontSize: '17px' }}>
            {parseBoldText(trimmed.replace(/^#{1,2}\s*/, ''))}
          </h4>
        );
        return;
      }

      // Bullet list
      if (/^[-*]\s/.test(trimmed)) {
        flushOrdered();
        const content = trimmed.replace(/^[-*]\s/, '');
        listBuffer.push(
          <li key={idx} className="small mb-1" style={{ lineHeight: 1.6, color: '#334155' }}>
            {parseBoldText(content)}
          </li>
        );
        return;
      }

      // Numbered list
      const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (orderedMatch) {
        flushBullets();
        orderedBuffer.push(
          <li key={idx} className="small mb-1" style={{ lineHeight: 1.6, color: '#334155' }}>
            {parseBoldText(orderedMatch[2])}
          </li>
        );
        return;
      }

      // Empty line
      if (trimmed === '') {
        flushBullets(); flushOrdered();
        elements.push(<div key={idx} style={{ height: '6px' }} />);
        return;
      }

      // Regular paragraph
      flushBullets(); flushOrdered();
      elements.push(
        <p key={idx} className="mb-2 small" style={{ lineHeight: 1.6, color: '#334155' }}>
          {parseBoldText(trimmed)}
        </p>
      );
    });

    flushBullets();
    flushOrdered();
    return elements;
  };

  // ── Số liệu thực (fallback 0 khi đang tải) ──
  const activeProjects = projects.filter((p) => p.status === 'Active');
  const taskCount = summary?.taskCount ?? 0;
  const completedCount = summary?.completedTaskCount ?? 0;
  const pendingCount = Math.max(taskCount - completedCount, 0);
  const projectCount = summary?.projectCount ?? projects.length;
  const recentTasks = summary?.recentTasks ?? [];

  // Điều hướng tới đúng nội dung đang được báo cáo.
  const goMyTasks = () => navigate('/tasks');
  const goProjects = () => navigate('/projects');
  const goProjectBoard = (projectId: string) => navigate(`/tasks?project=${projectId}`);

  return (
    <div className="container-fluid py-2">
      {/* ROW 1: KPIs — mỗi thẻ điều hướng tới nội dung tương ứng */}
      <div className="row g-4 mb-4">
        {/* KPI 1: Việc cần làm */}
        <div className="col-12 col-md-6 col-xl-3">
          <article
            className="dashboard-panel h-100 p-4 kpi-card"
            role="button" tabIndex={0}
            onClick={goMyTasks}
            onKeyDown={(e) => { if (e.key === 'Enter') goMyTasks(); }}
            title="Xem công việc của tôi"
          >
            <div className="avatar-sm mb-3 d-flex justify-content-center align-items-center rounded-circle" style={{ width: '48px', height: '48px', background: 'var(--accent-green-light)', color: 'var(--accent-green)', fontSize: '20px' }}>
              <i className="bi bi-list-task" />
            </div>
            <div className="text-secondary mb-1">Việc cần làm</div>
            <div className="fs-3 fw-bold">{loading ? '–' : pendingCount}</div>
          </article>
        </div>
        {/* KPI 2: Đã hoàn thành */}
        <div className="col-12 col-md-6 col-xl-3">
          <article
            className="dashboard-panel h-100 p-4 kpi-card"
            role="button" tabIndex={0}
            onClick={goMyTasks}
            onKeyDown={(e) => { if (e.key === 'Enter') goMyTasks(); }}
            title="Xem công việc của tôi"
          >
            <div className="avatar-sm mb-3 d-flex justify-content-center align-items-center rounded-circle" style={{ width: '48px', height: '48px', background: '#dcfce7', color: '#059669', fontSize: '20px' }}>
              <i className="bi bi-check2-circle" />
            </div>
            <div className="text-secondary mb-1">Việc đã hoàn thành</div>
            <div className="fs-3 fw-bold text-success">{loading ? '–' : completedCount}</div>
          </article>
        </div>
        {/* KPI 3: Dự án */}
        <div className="col-12 col-md-6 col-xl-3">
          <article
            className="dashboard-panel h-100 p-4 kpi-card"
            role="button" tabIndex={0}
            onClick={goProjects}
            onKeyDown={(e) => { if (e.key === 'Enter') goProjects(); }}
            title="Xem danh sách dự án"
          >
            <div className="avatar-sm mb-3 d-flex justify-content-center align-items-center rounded-circle" style={{ width: '48px', height: '48px', background: '#e0f2fe', color: '#0284c7', fontSize: '20px' }}>
              <i className="bi bi-folder" />
            </div>
            <div className="text-secondary mb-1">Dự án đang chạy</div>
            <div className="fs-3 fw-bold">{loading ? '–' : activeProjects.length}</div>
          </article>
        </div>
        {/* KPI 4: Tổng dự án */}
        <div className="col-12 col-md-6 col-xl-3">
          <article
            className="dashboard-panel h-100 p-4 text-white kpi-card"
            style={{ background: 'var(--accent-green)' }}
            role="button" tabIndex={0}
            onClick={goProjects}
            onKeyDown={(e) => { if (e.key === 'Enter') goProjects(); }}
            title="Xem danh sách dự án"
          >
            <div className="avatar-sm mb-3 d-flex justify-content-center align-items-center rounded-circle" style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '20px' }}>
              <i className="bi bi-collection" />
            </div>
            <div className="text-white-50 mb-1">Tổng số dự án</div>
            <div className="fs-3 fw-bold">{loading ? '–' : projectCount}</div>
          </article>
        </div>
      </div>

      {/* ROW 2: AI Report & Recent tasks & Projects */}
      <div className="row g-4">
        <div className="col-12 col-xl-8 d-flex flex-column gap-4">
          {/* AI REPORT BOX */}
          <article
            className="dashboard-panel p-4 position-relative"
            style={{
              minHeight: '220px',
              cursor: aiState === 'idle' ? 'pointer' : 'default',
              border: aiState === 'idle' ? '2px dashed var(--accent-green)' : '1px solid rgba(0,0,0,0.02)',
              transition: 'all 0.3s'
            }}
            onClick={aiState === 'idle' ? handleAiClick : undefined}
          >
            {aiState === 'idle' && (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center py-4">
                <i className="bi bi-stars animate-pulse mb-3" style={{ fontSize: '48px', color: 'var(--accent-green)' }} />
                <h3 className="fs-5 fw-bold" style={{ color: 'var(--accent-green)' }}>Tạo Báo Cáo AI</h3>
                <p className="text-secondary">Bấm vào đây để AI tổng hợp tình hình hoạt động của công ty</p>
              </div>
            )}

            {aiState === 'generating' && (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center py-5">
                <div className="spinner-border text-success mb-3" role="status" style={{ width: '3rem', height: '3rem' }} />
                <h3 className="fs-5 fw-bold text-secondary">AI đang phân tích dữ liệu...</h3>
              </div>
            )}

            {aiState === 'report' && (
              <div className="h-100 d-flex flex-column py-2" style={{ maxHeight: '450px' }}>
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-stars text-warning fs-4" />
                    <h3 className="fs-5 fw-bold m-0" style={{ color: 'var(--accent-green)' }}>OperaIQ AI Analyst</h3>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm border"
                      style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                      onClick={() => { setAiState('idle'); setTimeout(handleAiClick, 50); }}
                      title="Phân tích lại"
                    >
                      <i className="bi bi-arrow-clockwise me-1" />Làm mới
                    </button>
                    <button className="btn btn-sm btn-light border" onClick={() => setAiState('idle')}>Đóng</button>
                  </div>
                </div>
                <div className="flex-grow-1 mb-3 pe-2" style={{ overflowY: 'auto' }}>
                  {renderMarkdown(aiReportText)}
                </div>
                <div className="pt-2 border-top">
                  <button className="btn btn-dark rounded-pill btn-sm px-3" onClick={handleAiClick}>
                    <i className="bi bi-bar-chart-fill me-2" /> Xem tiến độ dự án
                  </button>
                </div>
              </div>
            )}

            {aiState === 'chart' && (
              <div className="h-100 d-flex flex-column py-2">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-pie-chart-fill text-primary fs-5" />
                    <h3 className="fs-5 fw-bold m-0">Tiến độ các dự án đang chạy</h3>
                  </div>
                  <button className="btn btn-sm btn-light border" onClick={() => setAiState('idle')}>Khôi phục</button>
                </div>
                <div className="flex-grow-1 d-flex flex-column gap-3" style={{ overflowY: 'auto' }}>
                  {activeProjects.slice(0, 5).map((p) => {
                    const pct = p.taskCount > 0 ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0;
                    return (
                      <div key={p.id} role="button" onClick={() => goProjectBoard(p.id)} title="Mở bảng công việc" style={{ cursor: 'pointer' }}>
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="fw-semibold text-truncate" style={{ maxWidth: '70%' }}>{p.name}</span>
                          <span className="text-secondary">{pct}%</span>
                        </div>
                        <div className="progress rounded-pill" style={{ height: '8px', background: '#f3f4f6' }}>
                          <div className="progress-bar rounded-pill" style={{ width: `${pct}%`, background: 'var(--accent-green)' }} />
                        </div>
                      </div>
                    );
                  })}
                  {activeProjects.length === 0 && <div className="text-secondary small">Chưa có dự án đang chạy.</div>}
                </div>
              </div>
            )}
          </article>

          {/* RECENT TASKS (real data, clickable) */}
          <article className="dashboard-panel p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="fs-5 fw-bold m-0">Công việc gần đây</h3>
              <button className="btn btn-sm btn-light border" onClick={goMyTasks}>
                Xem tất cả <i className="bi bi-arrow-right ms-1" />
              </button>
            </div>
            <div className="d-flex flex-column gap-2">
              {loading && <div className="text-secondary small">Đang tải…</div>}
              {!loading && recentTasks.length === 0 && (
                <div className="text-secondary small">Chưa có công việc nào.</div>
              )}
              {recentTasks.map((t) => (
                <div
                  key={t.id}
                  className="d-flex align-items-center gap-3 p-2 rounded-3 recent-task-row"
                  role="button" tabIndex={0}
                  onClick={() => goProjectBoard(t.projectId)}
                  onKeyDown={(e) => { if (e.key === 'Enter') goProjectBoard(t.projectId); }}
                  title={`Mở dự án ${t.projectName ?? ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_DOT[t.status] ?? '#9ca3af', flexShrink: 0 }} />
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-semibold text-truncate" style={{ fontSize: '14px' }}>{t.title}</div>
                    <div className="text-secondary text-truncate" style={{ fontSize: '12px' }}>
                      <i className="bi bi-folder2 me-1" />{t.projectName ?? '—'}
                      {t.assignedToName && <> · <i className="bi bi-person me-1" />{t.assignedToName}</>}
                    </div>
                  </div>
                  <span className="badge rounded-pill" style={{ background: '#f3f4f6', color: '#374151', fontSize: '11px' }}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* RIGHT COLUMN: Active projects shortcut list */}
        <div className="col-12 col-xl-4">
          <article className="dashboard-panel h-100 p-4 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="fs-5 fw-bold m-0">Dự án của bạn</h3>
              <button className="btn btn-sm btn-light border" onClick={goProjects}>
                <i className="bi bi-folder2-open" />
              </button>
            </div>

            <div className="d-flex flex-column gap-3 mb-auto">
              {loading && <div className="text-secondary small">Đang tải…</div>}
              {!loading && projects.length === 0 && (
                <div className="text-center py-4 text-secondary">
                  <i className="bi bi-folder-x mb-2 d-block" style={{ fontSize: '36px', color: '#d1d5db' }} />
                  <span className="small">Bạn chưa được phân vào dự án nào.</span>
                </div>
              )}
              {projects.slice(0, 6).map((p) => {
                const pct = p.taskCount > 0 ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0;
                return (
                  <div
                    key={p.id}
                    className="p-3 border rounded-3 bg-white shadow-sm recent-task-row"
                    role="button" tabIndex={0}
                    onClick={() => goProjectBoard(p.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') goProjectBoard(p.id); }}
                    title="Mở bảng công việc"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="fw-semibold text-truncate" style={{ fontSize: '14px' }}>{p.name}</div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="text-secondary" style={{ fontSize: '12px' }}>
                        <i className="bi bi-list-check me-1" />{p.completedTaskCount}/{p.taskCount}
                      </span>
                      <span className="fw-bold" style={{ fontSize: '12px', color: 'var(--accent-green)' }}>{pct}%</span>
                    </div>
                    <div className="progress rounded-pill mt-1" style={{ height: '5px', background: '#f3f4f6' }}>
                      <div className="progress-bar rounded-pill" style={{ width: `${pct}%`, background: 'var(--accent-green)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </div>

      <style>{`
        .kpi-card { cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,0.08); }
        .recent-task-row { transition: background 0.15s; }
        .recent-task-row:hover { background: rgba(0,0,0,0.03); }
      `}</style>
    </div>
  );
}
