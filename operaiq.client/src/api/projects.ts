import { api } from './client';
import type { ProjectDto, ProjectMemberDto, MyProjectTaskDto } from '../types';

export interface AiProjectTemplateDto {
  name: string;
  description: string;
  estimatedBudget: number;
  estimatedDurationDays: number;
  phases: {
    name: string;
    durationDays: number;
    tasks: string[];
  }[];
}

export const projectsApi = {
  all: () => api.get<ProjectDto[]>('/projects').then((r) => r.data),
  byId: (id: string) => api.get<ProjectDto>(`/projects/${id}`).then((r) => r.data),
  aiGenerate: (problemInput: string) => api.post<AiProjectTemplateDto>('/projects/ai-generate', { problemInput }).then((r) => r.data),
  createFromAi: (project: any, template: any) => api.post<{ projectId: string }>('/projects/from-ai', { project, template }).then((r) => r.data),
  submitToDirector: (id: string) => api.post(`/projects/${id}/submit-director`).then((r) => r.data),
  approve: (id: string) => api.post(`/projects/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason: string) => api.post(`/projects/${id}/reject`, { reason }).then((r) => r.data),
  update: (id: string, project: { name: string; description?: string | null; startDate?: string | null; dueDate?: string | null; budget: number }) => api.put(`/projects/${id}`, project).then((r) => r.data),
  pendingApproval: () => api.get<ProjectDto[]>('/projects/pending-approval').then((r) => r.data),
  getMembers: (id: string) => api.get<ProjectMemberDto[]>(`/projects/${id}/members`).then((r) => r.data),
  addMember: (id: string, userId: string, role: string) => api.post(`/projects/${id}/members`, { userId, role }).then((r) => r.data),
  removeMember: (id: string, userId: string) => api.delete(`/projects/${id}/members/${userId}`).then((r) => r.data),
  myTasks: () => api.get<MyProjectTaskDto[]>('/projects/my-tasks').then((r) => r.data),
};
