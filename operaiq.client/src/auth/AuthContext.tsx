import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { tokenStore } from '../api/client';
import { authApi, type LoginRequest } from '../api/auth';
import type { UserDto } from '../types';

interface AuthState {
  user: UserDto | null;
  roles: string[];
  permissions: string[];
  tenantSlug: string | null;
}

interface AuthContextValue extends AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  login: (body: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const empty: AuthState = { user: null, roles: [], permissions: [], tenantSlug: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(empty);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const data = await authApi.me();
      setState({
        user: data.user,
        roles: data.roles ?? [],
        permissions: data.permissions ?? [],
        tenantSlug: data.tenantSlug ?? null,
      });
    } catch {
      tokenStore.clear();
      setState(empty);
    }
  };

  // Khôi phục session từ token đã lưu (gọi /auth/me).
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    
    fetchProfile().finally(() => setLoading(false));
  }, []);

  const login = async (body: LoginRequest) => {
    const result = await authApi.login(body);
    tokenStore.set(result.token);

    let tenantSlug: string | null = null;
    try {
      const profile = await authApi.me();
      tenantSlug = profile.tenantSlug ?? null;
    } catch {
      tokenStore.clear();
      setState(empty);
      throw new Error('Không thể khôi phục phiên đăng nhập.');
    }

    setState({
      user: result.user,
      roles: result.roles ?? [],
      permissions: result.permissions ?? [],
      tenantSlug,
    });
  };

  const logout = () => {
    tokenStore.clear();
    setState(empty);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    if (!tokenStore.get()) return;
    await fetchProfile();
  };

  const value: AuthContextValue = {
    ...state,
    loading,
    isAuthenticated: !!state.user,
    login,
    logout,
    refreshProfile,
    hasPermission: (perm) => state.permissions.includes(perm),
    hasRole: (role) => state.roles.includes(role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
