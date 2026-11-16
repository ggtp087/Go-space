import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Must match PORT in server/.env.
const API_PORT = 3001

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The API server (server/, `npm run dev:api` starts both). Only used
    // when VITE_DATA_SOURCE=api; mock mode never calls /api.
    proxy: {
      '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: false },
    },
  },
})
