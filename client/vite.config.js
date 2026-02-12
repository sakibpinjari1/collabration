import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,          // allows external access
    port: 5173,          // keep your dev port (change if different)
    strictPort: true,
    allowedHosts: true   // allows Cloudflare tunnel hosts
  }
})
