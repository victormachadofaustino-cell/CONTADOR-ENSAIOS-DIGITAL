import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // CORREÇÃO: Alterado de './' para '/' para garantir que o roteamento SPA 
  // localize os assets em qualquer nível de profundidade de URL no deploy.
  base: '/', 
  server: {
    host: '127.0.0.1', // Força o IPv4 para evitar o Connection Refused
    port: 5174,
    strictPort: true,
  }
})