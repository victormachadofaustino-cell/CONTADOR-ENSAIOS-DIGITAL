import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { AuthProvider } from './context/AuthContext'
// IMPORTAÇÃO PARA O PWA: Utiliza o registro virtual do vite-plugin-pwa 
import { registerSW } from 'virtual:pwa-register'

/**
 * REPARO v8.9.8: Unificação do Service Worker.
 * Removemos o registro manual redundante para evitar conflitos de cache e erros de 404 no sw.js.
 * O Vite PWA agora gerencia o ciclo de vida do Offline de forma limpa.
 */
if (import.meta.env.PROD) {
  registerSW({ 
    immediate: true,
    onNeedRefresh() {
      console.log('Nova versão disponível. O app será atualizado no próximo carregamento.');
    },
    onOfflineReady() {
      console.log('App pronto para trabalhar offline!');
    }
  })
}

// Renderiza o App dentro do Provedor de Autenticação para habilitar as permissões 
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)