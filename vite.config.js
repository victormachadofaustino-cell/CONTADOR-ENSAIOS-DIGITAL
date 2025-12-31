import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '127.0.0.1', // Força o IPv4 para evitar o Connection Refused
    port: 5173,
    strictPort: true,
  }
})