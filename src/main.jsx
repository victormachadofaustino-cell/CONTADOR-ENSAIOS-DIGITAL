import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// O Vite já lida com o CSS global aqui se você criar um index.css, 
// mas manteremos o CDN no HTML por enquanto como você prefere.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)