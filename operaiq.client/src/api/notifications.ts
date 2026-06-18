import { api } from './client';
import type { NotificationDto } from '../types';

export const notificationsApi = {
  all: () => api.get<NotificationDto[]>('/notifications').then((r) => r.data),
  markRead: (id: string) => api.put(`/notifications/${id}/read`).then((r) => r.data),
};
