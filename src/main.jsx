import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { AuthProvider } from './context/AuthContext'

// Renderiza o App dentro do Provedor de Autenticação para habilitar as permissões
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)

// Registro do Service Worker para suporte PWA/Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('Falha ao registrar PWA:', err);
    });
  });
}