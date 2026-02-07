import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza o app automaticamente quando houver nova versão
      // DESATIVAÇÃO EM DESENVOLVIMENTO: Evita conflitos com Firebase Auth e listeners assíncronos
      devOptions: {
        enabled: false 
      },
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        short_name: "Ensaio Local",
        name: "Ensaio Local CCB",
        description: "Contagem e gestão de ensaios musicais",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0F172A",
        background_color: "#F1F5F9",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        // CORREÇÃO CRÍTICA: Remove caches de versões anteriores do build para evitar erro de MIME type
        cleanupOutdatedCaches: true,
        // Cacheia automaticamente todos os arquivos gerados pelo build (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Fallback para SPA (Garante que rotas como /dash funcionem offline)
        navigateFallback: '/index.html',
        // Bloqueia o fallback para arquivos que deveriam ser estáticos (evita retornar HTML em vez de JS)
        navigateFallbackDenylist: [/^\/assets\//, /.*\.js$/, /.*\.css$/]
      }
    })
  ],
  base: '/', 
  server: {
    host: '127.0.0.1', // Evita o Connection Refused em ambiente local
    port: 3000,
    strictPort: true,
  }
})