import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Must match PORT in server/.env.
const API_PORT = 3001

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The API server (server/). `npm run dev` starts it together with Vite;
    // every page's data comes from /api.
    proxy: {
      '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: false },
    },
  },
})
