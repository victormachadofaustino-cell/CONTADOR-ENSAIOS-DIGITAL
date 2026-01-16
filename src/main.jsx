import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Ajuste de caminho: Referência relativa correta saindo de /src
import './styles/index.css' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// REGISTRO DO SERVICE WORKER (PWA)
// Mantido apenas para produção para evitar erros de cache (Response error) no desenvolvimento local
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA: Service Worker Ativo', reg.scope))
      .catch(err => console.log('PWA: Falha no registro', err));
  });
}