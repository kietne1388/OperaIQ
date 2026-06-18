// operaiq.client/src/api/client.ts
import axios from "axios";

// ---------------------------------------------------------------------------
// Token storage (JWT or any auth token returned from backend)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "operaiq_token";
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// ---------------------------------------------------------------------------
// Determine the base URL for API calls.
// Development: Vite proxy to .NET backend via "/api".
// Production: call a deployed endpoint (e.g., Firebase Cloud Function).
// ---------------------------------------------------------------------------
// Production: reads VITE_API_URL from .env.production (Railway backend)
// Development: Vite proxy handles /api → localhost:5074
const isProd = import.meta.env.PROD;
const baseURL = isProd
  ? (import.meta.env.VITE_API_URL ?? "https://operaiq-backend.up.railway.app") + "/api"
  : "/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------------
// Request interceptor – attach Bearer token if present.
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor – handle 401 (unauthorized) globally.
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      tokenStore.clear();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ---------------------------------------------------------------------------
// Helper to extract a friendly error message from Axios errors.
// ---------------------------------------------------------------------------
export function getApiError(
  err: unknown,
  fallback = "Đã xảy ra lỗi. Vui lòng thử lại."
) {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data?.error ||
      err.response?.data?.title ||
      err.message ||
      fallback
    );
  }
  return fallback;
}
