import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { AuthProvider } from './context/AuthContext'
// IMPORTAÇÃO PARA O PWA: Utiliza o registro virtual do vite-plugin-pwa 
import { registerSW } from 'virtual:pwa-register'

// Registra o Service Worker apenas em PRODUÇÃO para evitar conflitos de login no localhost
// Isso garante que o cache seja atualizado sempre que houver um novo deploy na Vercel
if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}

// Renderiza o App dentro do Provedor de Autenticação para habilitar as permissões 
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)

// Registro do Service Worker para suporte PWA/Offline 
// BLINDAGEM LOCAL: O bloco abaixo só deve rodar em produção para não travar o Firebase Auth localmente
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      // Erro esperado em ambiente de desenvolvimento Vite se o arquivo físico não existir
      console.warn('Registro PWA via arquivo físico ignorado (Vite utiliza virtual:pwa-register):', err);
    });
  });
}