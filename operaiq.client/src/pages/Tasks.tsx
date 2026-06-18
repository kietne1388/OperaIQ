import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasksApi } from '../api/tasks';
import { projectsApi } from '../api/projects';
import { getApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToasts } from '../components/ToastContext';
import { STATUS_LABELS } from '../components/Badges';
import {
  TASK_STATUSES,
  type CreateTaskDto,
  type ProjectDto,
  type TaskDto,
  type TaskPriority,
  type TaskStatus,
} from '../types';

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_META: Record<TaskPriority, { color: string; bg: string; label: string }> = {
  Low:      { color: '#059669', bg: '#d1fae5', label: 'Thấp' },
  Medium:   { color: '#d97706', bg: '#fef3c7', label: 'Trung bình' },
  High:     { color: '#dc2626', bg: '#fee2e2', label: 'Cao' },
  Critical: { color: '#7c3aed', bg: '#ede9fe', label: 'Khẩn cấp' },
};

// ─── Column config ────────────────────────────────────────────────────────────
const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'Todo',       label: '📋 Cần làm',    accent: '#6b7280' },
  { status: 'InProgress', label: '🔄 Đang làm',   accent: '#2563eb' },
  { status: 'Review',     label: '👀 Đang duyệt', accent: '#d97706' },
  { status: 'Done',       label: '✅ Hoàn thành', accent: '#059669' },
];

// ─── Card Detail Modal ────────────────────────────────────────────────────────
function CardModal({
  task,
  onClose,
  onStatusChange,
  onAiAssign,
  canAssign,
}: {
  task: TaskDto;
  onClose: () => void;
  onStatusChange: (task: TaskDto, status: TaskStatus) => Promise<void>;
  onAiAssign: (task: TaskDto) => Promise<void>;
  canAssign: boolean;
}) {
  const pm = PRIORITY_META[task.priority as TaskPriority] ?? PRIORITY_META.Medium;
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 2000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-4 shadow-lg"
        style={{ width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header accent bar */}
        <div style={{ height: '6px', background: pm.color, borderRadius: '16px 16px 0 0' }} />

        <div className="p-4">
          <div className="d-flex align-items-start justify-content-between mb-3 gap-3">
            <h2 className="fs-5 fw-bold m-0" style={{ lineHeight: 1.4 }}>{task.title}</h2>
            <button className="btn-close flex-shrink-0" onClick={onClose} />
          </div>

          {task.description && (
            <p className="text-secondary mb-4" style={{ fontSize: '14px', lineHeight: 1.6 }}>
              {task.description}
            </p>
          )}

          {task.aiReason && (
            <div className="rounded-3 p-3 mb-4 d-flex gap-2" style={{ background: '#fffbeb', border: '1px solid #fde68a', fontSize: '13px' }}>
              <i className="bi bi-stars text-warning flex-shrink-0 mt-1" />
              <span>{task.aiReason}</span>
            </div>
          )}

          <div className="row g-3 mb-4">
            <div className="col-6">
              <div className="text-secondary mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ưu tiên</div>
              <span className="badge rounded-pill fw-semibold px-3 py-1" style={{ background: pm.bg, color: pm.color }}>
                {pm.label}
              </span>
            </div>
            <div className="col-6">
              <div className="text-secondary mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái</div>
              <select
                className="form-select form-select-sm rounded-3"
                value={task.status}
                onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
                style={{ fontSize: '13px' }}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="col-6">
              <div className="text-secondary mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dự án</div>
              <div className="fw-semibold" style={{ fontSize: '14px' }}>{task.projectName ?? '—'}</div>
            </div>
            <div className="col-6">
              <div className="text-secondary mb-1" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nhân viên</div>
              <div className="d-flex align-items-center gap-2">
                {task.assignedToName ? (
                  <>
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`}
                      alt={task.assignedToName}
                      style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{task.assignedToName}</span>
                  </>
                ) : (
                  <span className="text-secondary" style={{ fontSize: '13px' }}>Chưa giao</span>
                )}
              </div>
            </div>
          </div>

          {canAssign && !task.assignedToId && (
            <button
              className="btn w-100 rounded-3 d-flex align-items-center justify-content-center gap-2 fw-semibold"
              style={{ background: '#1e1e1e', color: 'white', fontSize: '14px' }}
              onClick={() => onAiAssign(task)}
            >
              <i className="bi bi-stars text-warning" /> Phân công bằng AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add Card Form ────────────────────────────────────────────────────────────
function AddCardForm({
  projectId,
  status,
  onAdd,
  onCancel,
}: {
  projectId: string;
  status: TaskStatus;
  onAdd: (dto: CreateTaskDto & { status: TaskStatus }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    await onAdd({ title: title.trim(), projectId, priority, useAiAssignment: false, status });
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-3 shadow-sm p-3" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
      <textarea
        ref={ref}
        className="form-control border-0 p-0 mb-2 resize-none"
        rows={2}
        placeholder="Nhập tiêu đề thẻ..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === 'Escape') onCancel(); }}
        style={{ fontSize: '14px', outline: 'none', boxShadow: 'none' }}
      />
      <div className="d-flex gap-2 align-items-center">
        <select
          className="form-select form-select-sm rounded-pill flex-shrink-0"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          style={{ width: 'auto', fontSize: '12px' }}
        >
          {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button
          className="btn btn-sm rounded-pill text-white fw-semibold px-3"
          style={{ background: 'var(--accent-green)', fontSize: '12px' }}
          onClick={submit}
          disabled={!title.trim() || submitting}
        >
          {submitting ? <span className="spinner-border spinner-border-sm" /> : 'Thêm'}
        </button>
        <button className="btn-close" style={{ fontSize: '10px' }} onClick={onCancel} />
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({
  task,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  task: TaskDto;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const pm = PRIORITY_META[task.priority as TaskPriority] ?? PRIORITY_META.Medium;
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => { setDragging(true); onDragStart(); }}
      onDragEnd={() => { setDragging(false); onDragEnd(); }}
      onClick={onClick}
      className="bg-white rounded-3 p-3 mb-2"
      style={{
        cursor: 'grab',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
        opacity: dragging ? 0.5 : 1,
        transform: dragging ? 'rotate(2deg)' : 'none',
        transition: 'box-shadow 0.15s, opacity 0.15s',
        userSelect: 'none',
      }}
    >
      {/* Priority tag */}
      <div className="mb-2">
        <span className="badge rounded-pill" style={{ background: pm.bg, color: pm.color, fontSize: '11px', fontWeight: 600 }}>
          {pm.label}
        </span>
      </div>

      <div className="fw-semibold mb-2" style={{ fontSize: '14px', lineHeight: 1.4, color: '#202220' }}>
        {task.title}
      </div>

      {task.projectName && (
        <div className="text-secondary mb-2" style={{ fontSize: '11px' }}>
          <i className="bi bi-folder2 me-1" />{task.projectName}
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between mt-2">
        {task.assignedToName ? (
          <div className="d-flex align-items-center gap-1">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignedToName}`}
              alt={task.assignedToName}
              style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #e5e7eb' }}
            />
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{task.assignedToName.split(' ').pop()}</span>
          </div>
        ) : (
          <span className="text-muted" style={{ fontSize: '11px' }}>Chưa giao</span>
        )}
        {task.aiReason && <i className="bi bi-stars text-warning" title="Phân công bởi AI" />}
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({
  col,
  tasks,
  projectId,
  canCreate,
  dragOverStatus,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onCardClick,
  onAddCard,
}: {
  col: { status: TaskStatus; label: string; accent: string };
  tasks: TaskDto[];
  projectId: string | null;
  canCreate: boolean;
  dragOverStatus: TaskStatus | null;
  onDragStart: (task: TaskDto) => void;
  onDragEnd: () => void;
  onDragOver: (status: TaskStatus) => void;
  onDrop: (status: TaskStatus) => void;
  onCardClick: (task: TaskDto) => void;
  onAddCard: (dto: CreateTaskDto & { status: TaskStatus }) => Promise<void>;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const isOver = dragOverStatus === col.status;

  return (
    <div
      className="d-flex flex-column"
      style={{ minWidth: '280px', flex: '0 0 280px' }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(col.status); }}
      onDrop={() => onDrop(col.status)}
    >
      {/* Column Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 px-1">
        <div className="d-flex align-items-center gap-2">
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.accent, flexShrink: 0 }} />
          <span className="fw-semibold" style={{ fontSize: '14px' }}>{col.label}</span>
          <span
            className="d-inline-flex justify-content-center align-items-center rounded-circle text-white fw-bold"
            style={{ width: '20px', height: '20px', background: col.accent, fontSize: '11px' }}
          >
            {tasks.length}
          </span>
        </div>
        {canCreate && projectId && (
          <button
            onClick={() => setAddingCard(true)}
            className="btn p-0 d-flex justify-content-center align-items-center border-0 rounded-circle"
            style={{ width: '26px', height: '26px', color: col.accent, background: 'rgba(0,0,0,0.04)', fontSize: '16px' }}
            title="Thêm thẻ"
          >
            +
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className="d-flex flex-column flex-grow-1 rounded-4 p-2"
        style={{
          background: isOver ? 'rgba(0,0,0,0.04)' : '#f4f3ef',
          minHeight: '120px',
          border: isOver ? `2px dashed ${col.accent}` : '2px solid transparent',
          transition: 'background 0.15s, border 0.15s',
        }}
      >
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onDragStart={() => onDragStart(task)}
            onDragEnd={onDragEnd}
            onClick={() => onCardClick(task)}
          />
        ))}

        {tasks.length === 0 && !addingCard && (
          <div className="d-flex flex-column align-items-center justify-content-center text-center py-4" style={{ color: '#c4c3bf', fontSize: '13px' }}>
            <i className="bi bi-inbox mb-1" style={{ fontSize: '24px' }} />
            Kéo thả thẻ vào đây
          </div>
        )}

        {addingCard && projectId && (
          <AddCardForm
            projectId={projectId}
            status={col.status}
            onAdd={async (dto) => { await onAddCard(dto); setAddingCard(false); }}
            onCancel={() => setAddingCard(false)}
          />
        )}

        {canCreate && projectId && !addingCard && (
          <button
            onClick={() => setAddingCard(true)}
            className="btn w-100 text-start mt-1 rounded-3 border-0 text-secondary d-flex align-items-center gap-2"
            style={{ fontSize: '13px', background: 'transparent', padding: '6px 8px' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <i className="bi bi-plus" /> Thêm thẻ
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Tasks Page ──────────────────────────────────────────────────────────
export function Tasks() {
  const { hasPermission } = useAuth();
  const { push } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  // Khởi tạo scope từ ?project=<id> trên URL (điều hướng từ trang Dự án), nếu không thì "my".
  const [scope, setScope] = useState<string>(() => searchParams.get('project') ?? 'my');
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null);
  const [dragTask, setDragTask] = useState<TaskDto | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const canCreate = hasPermission('task.create');
  const canAssign = hasPermission('task.assign');

  const currentProjectId = scope !== 'my' ? scope : null;

  // Đổi scope: cập nhật state + đồng bộ URL để chia sẻ/back giữ nguyên dự án đang xem.
  const changeScope = (next: string) => {
    setScope(next);
    if (next === 'my') {
      searchParams.delete('project');
    } else {
      searchParams.set('project', next);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Nếu URL ?project= đổi (vd điều hướng từ Dự án khi đang ở trang Tasks), đồng bộ lại scope.
  useEffect(() => {
    const p = searchParams.get('project');
    setScope(p ?? 'my');
  }, [searchParams]);

  const loadTasks = async (currentScope: string) => {
    setLoading(true);
    try {
      const data = currentScope === 'my'
        ? await tasksApi.my()
        : await tasksApi.byProject(currentScope);
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { projectsApi.all().then(setProjects).catch(() => {}); }, []);
  useEffect(() => { loadTasks(scope); }, [scope]);

  const onStatusChange = async (task: TaskDto, status: TaskStatus) => {
    try {
      await tasksApi.updateStatus(task.id, status);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
      if (activeTask?.id === task.id) setActiveTask((p) => p ? { ...p, status } : null);
      push('Cập nhật xong', `${task.title} → ${STATUS_LABELS[status]}`, 'ProjectUpdate');
    } catch (err) {
      push('Lỗi', getApiError(err), 'TaskAssigned');
    }
  };

  const onAiAssign = async (task: TaskDto) => {
    try {
      const res = await tasksApi.aiAssign(task.id);
      if (res.success) {
        push('AI đã phân công', `${task.title} → ${res.assigneeName}`, 'TaskAssigned');
        await loadTasks(scope);
        if (activeTask?.id === task.id) setActiveTask(null);
      }
    } catch (err) {
      push('Lỗi', getApiError(err), 'TaskAssigned');
    }
  };

  const onAddCard = async (dto: CreateTaskDto & { status: TaskStatus }) => {
    try {
      const { status, ...createDto } = dto;
      const created = await tasksApi.create(createDto);
      if (status !== 'Todo') {
        await tasksApi.updateStatus(created.id, status);
      }
      push('Đã thêm thẻ', `"${dto.title}" được tạo`, 'TaskAssigned');
      await loadTasks(scope);
    } catch (err) {
      push('Lỗi', getApiError(err), 'TaskAssigned');
    }
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const onDragStart = (task: TaskDto) => setDragTask(task);
  const onDragEnd = () => { setDragTask(null); setDragOverStatus(null); };
  const onDragOver = (status: TaskStatus) => setDragOverStatus(status);
  const onDrop = async (status: TaskStatus) => {
    if (dragTask && dragTask.status !== status) {
      await onStatusChange(dragTask, status);
    }
    setDragTask(null);
    setDragOverStatus(null);
  };

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  return (
    <div className="container-fluid py-2 d-flex flex-column" style={{ height: '100%', gap: '16px' }}>
      {/* ── Top bar ── */}
      <div className="d-flex align-items-center gap-3 flex-wrap">
        <div>
          <h2 className="fw-bold m-0" style={{ fontSize: '20px' }}>
            {currentProjectId
              ? (projects.find((p) => p.id === currentProjectId)?.name ?? 'Bảng Công Việc')
              : 'Bảng Công Việc'}
          </h2>
          <p className="text-secondary m-0 mt-1" style={{ fontSize: '13px' }}>
            {currentProjectId
              ? 'Công việc của dự án · Kéo thẻ để cập nhật trạng thái · Click thẻ để xem chi tiết'
              : 'Kéo thẻ giữa các cột để cập nhật trạng thái · Click thẻ để xem chi tiết'}
          </p>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2 flex-wrap">
          <select
            className="form-select rounded-pill border-0 shadow-sm"
            value={scope}
            onChange={(e) => changeScope(e.target.value)}
            style={{ width: 'auto', fontSize: '13px', background: 'white', cursor: 'pointer' }}
          >
            <option value="my">Việc của tôi</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>📁 {p.name}</option>
            ))}
          </select>
          <span className="badge rounded-pill fw-semibold" style={{ background: '#1e1e1e', color: 'white', fontSize: '13px', padding: '6px 14px' }}>
            {tasks.length} tasks
          </span>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      {loading ? (
        <div className="d-flex gap-4" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          {COLUMNS.map((col) => (
            <div key={col.status} style={{ minWidth: '280px', flex: '0 0 280px' }}>
              <div className="animate-pulse bg-skeleton rounded-pill mb-3" style={{ height: '24px', width: '140px' }} />
              <div className="bg-skeleton rounded-4 d-flex flex-column gap-3 p-3" style={{ minHeight: '400px' }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-3" style={{ height: '80px' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="d-flex gap-3"
          style={{ overflowX: 'auto', paddingBottom: '16px', flexGrow: 1, alignItems: 'flex-start' }}
        >
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              col={col}
              tasks={tasksByStatus(col.status)}
              projectId={currentProjectId}
              canCreate={canCreate}
              dragOverStatus={dragOverStatus}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onCardClick={setActiveTask}
              onAddCard={onAddCard}
            />
          ))}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {activeTask && (
        <CardModal
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onStatusChange={onStatusChange}
          onAiAssign={onAiAssign}
          canAssign={canAssign}
        />
      )}
    </div>
  );
}
