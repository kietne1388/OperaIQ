import { api } from './client';
import type { DashboardSummary } from '../types';

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
  aiReport: () => api.get<{ report: string }>('/dashboard/ai-report').then((r) => r.data),
};
