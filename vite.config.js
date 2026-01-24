import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Define caminho absoluto para garantir funcionamento do roteamento SPA
  base: '/', 
  server: {
    host: '127.0.0.1', // Evita o Connection Refused em ambiente local
    port: 5174,
    strictPort: true,
  }
})