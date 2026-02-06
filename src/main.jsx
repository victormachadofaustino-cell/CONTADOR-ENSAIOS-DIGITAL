import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { AuthProvider } from './context/AuthContext'
// IMPORTAÇÃO PARA O PWA: Utiliza o registro virtual do vite-plugin-pwa 
import { registerSW } from 'virtual:pwa-register'

// Registra o Service Worker e define o comportamento de atualização automática [cite: 1959, 1986]
// Isso garante que o cache seja atualizado sempre que houver um novo deploy na Vercel
registerSW({ immediate: true })

// Renderiza o App dentro do Provedor de Autenticação para habilitar as permissões 
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)

// Registro do Service Worker para suporte PWA/Offline 
// Nota: O bloco abaixo é mantido para compatibilidade, mas o registerSW acima é o motor principal no Vite
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      // Erro esperado em ambiente de desenvolvimento Vite se o arquivo físico não existir
      console.warn('Registro PWA via arquivo físico ignorado (Vite utiliza virtual:pwa-register):', err);
    });
  });
}