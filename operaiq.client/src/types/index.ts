// Mirror các DTO/enum của backend OperaIQ. Enum serialize dạng string (JsonStringEnumConverter).

export type TaskStatus = 'Todo' | 'InProgress' | 'Review' | 'Done' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ProjectStatus = 'Active' | 'Completed' | 'Archived';

export const TASK_STATUSES: TaskStatus[] = ['Todo', 'InProgress', 'Review', 'Done', 'Cancelled'];

export interface UserDto {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  tenantId?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  isActive: boolean;
  role?: string | null;
}

export interface AuthResult {
  token: string;
  expiresAt: string;
  user: UserDto;
  roles: string[];
  permissions: string[];
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export interface TaskDto {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  projectId: string;
  projectName?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  isAiAssigned: boolean;
  aiReason?: string | null;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  priority: TaskPriority;
  dueDate?: string | null;
  assignedToId?: string | null;
  useAiAssignment: boolean;
}

export interface ProjectDto {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  status: ProjectStatus;
  createdById: string;
  createdByName?: string | null;
  taskCount: number;
  completedTaskCount: number;
  code?: string | null;
  customerName?: string | null;
  budget: number;
  progressPercent: number;
  approvalStatus: 'Approved' | 'DraftAI' | 'PendingDirector' | 'Rejected';
  rejectionReason?: string | null;
  aiProblemInput?: string | null;
}

export interface ProjectMemberDto {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

export interface MyProjectTaskDto {
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  progressPercent: number;
  isAiAssigned: boolean;
}

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  type: string;
  createdAt: string;
}

export interface DashboardSummary {
  projectCount: number;
  documentCount: number;
  taskCount: number;
  completedTaskCount: number;
  recentTasks: TaskDto[];
}
