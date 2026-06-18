import type { TaskPriority, TaskStatus } from '../types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  Todo: 'Cần làm',
  InProgress: 'Đang làm',
  Review: 'Đang duyệt',
  Done: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  Todo: 'var(--status-todo)',
  InProgress: 'var(--status-progress)',
  Review: 'var(--status-review)',
  Done: 'var(--status-done)',
  Cancelled: 'var(--status-cancelled)',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
  Critical: 'Khẩn cấp',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Low: 'var(--priority-low)',
  Medium: 'var(--priority-medium)',
  High: 'var(--priority-high)',
  Critical: 'var(--priority-critical)',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className="badge" style={{ background: STATUS_COLORS[status] }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className="badge" style={{ background: PRIORITY_COLORS[priority] }}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export { STATUS_LABELS, PRIORITY_LABELS };
