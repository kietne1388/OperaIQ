import { api } from './client';
import type { UserDto } from '../types';

export interface UpdateProfileRequest {
  fullName: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

export const usersApi = {
  getProfile: () => api.get<UserDto>('/users/profile').then(r => r.data),
  updateProfile: (body: UpdateProfileRequest) => api.put<{ message: string }>('/users/profile', body).then(r => r.data),
  changePassword: (body: ChangePasswordRequest) => api.put<{ message: string }>('/users/change-password', body).then(r => r.data),
};
