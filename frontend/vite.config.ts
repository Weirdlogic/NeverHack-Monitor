import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'
  const wsUrl = env.VITE_WS_URL?.replace('/ws', '') || 'ws://localhost:8000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: wsUrl,
          ws: true,
        }
      }
    }
  }
})
