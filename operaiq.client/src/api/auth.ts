import { api } from './client';
import type { AuthResult, TenantOption } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string | null;
}

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<AuthResult>('/auth/login', body).then((r) => r.data),

  tenants: () => api.get<TenantOption[]>('/auth/tenants').then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),

  switchRole: (role: string) =>
    api.post<AuthResult>('/auth/switch-role', { role }).then((r) => r.data),
};
