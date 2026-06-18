import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api và /notificationHub sang backend .NET (http://localhost:5074)
// để tránh CORS trong môi trường dev (cùng origin từ góc nhìn trình duyệt).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5074',
        changeOrigin: true,
      },
      '/notificationHub': {
        target: 'http://localhost:5074',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
