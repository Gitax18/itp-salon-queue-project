import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Local dev: /api/* goes to the Express server when VITE_API_URL is not set.
  server: { proxy: { '/api': 'http://localhost:4000' } },
})
