const CACHE_NAME = 'ensaio-local-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico'
];

// Instala o Service Worker e guarda os arquivos básicos
self.addEventListener('install', (event) => {
  // Força o SW a se tornar ativo imediatamente sem esperar o fechamento das abas
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Remove caches antigos ao atualizar o app
self.addEventListener('activate', (event) => {
  // Permite que o SW tome controle das abas abertas imediatamente
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
});

// Responde com cache quando estiver offline
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // DIRETRIZ DE SEGURANÇA: Ignora requisições de desenvolvimento e extensões
  // Impede que o Service Worker trave o HMR do Vite ou ferramentas de debug
  if (
    url.includes('chrome-extension') || 
    url.includes('socket.io') || 
    url.includes('@vite') || 
    url.includes('src/') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // Fallback para navegação (SPA Mode): Se não encontrar a rota offline, serve o index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});