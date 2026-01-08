import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Conecta o design e Tailwind v4

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// REGISTRO DO SERVICE WORKER (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA: Service Worker Ativo', reg.scope))
      .catch(err => console.log('PWA: Falha no registro', err));
  });
}