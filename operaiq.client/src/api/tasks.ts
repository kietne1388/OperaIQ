import { api } from './client';
import type { CreateTaskDto, TaskDto, TaskStatus } from '../types';

export interface AiAssignResult {
  success: boolean;
  assigneeName?: string | null;
  reason?: string | null;
}

export const tasksApi = {
  my: () => api.get<TaskDto[]>('/tasks/my').then((r) => r.data),

  byProject: (projectId: string) =>
    api.get<TaskDto[]>(`/tasks/by-project/${projectId}`).then((r) => r.data),

  create: (body: CreateTaskDto) =>
    api.post<TaskDto>('/tasks', body).then((r) => r.data),

  updateStatus: (id: string, status: TaskStatus) =>
    api.put(`/tasks/${id}/status`, { id, status }).then((r) => r.data),

  aiAssign: (id: string) =>
    api.post<AiAssignResult>(`/tasks/${id}/ai-assign`).then((r) => r.data),
};
