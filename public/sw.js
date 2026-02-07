const CACHE_NAME = 'ensaio-local-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // BLOQUEIO DE SEGURANÇA: Ignorar ferramentas de desenvolvimento e extensões
  // ADICIONADO: Proteção contra travamento de login no Localhost (VS Code)
  if (
    url.includes('chrome-extension') || 
    url.includes('socket.io') || 
    url.includes('@vite') || 
    url.includes('@react-refresh') || 
    url.includes('node_modules') ||    
    url.includes('src/') ||
    url.includes('127.0.0.1') || // Impede o SW de travar o Auth localmente [cite: 1913]
    url.includes('localhost') ||   // Blindagem para ambiente de desenvolvimento [cite: 1913]
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Estratégia: Cache First, fallback para Network
      if (response) {
        return response;
      }

      return fetch(event.request).catch(() => {
        // Se falhar a rede e for navegação de página, entrega o index.html (SPA)
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        
        // CORREÇÃO CRÍTICA: Garante que sempre retorne uma Response válida para evitar TypeError
        return new Response('Offline: Recurso não disponível no cache.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      });
    })
  );
});