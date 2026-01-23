const CACHE_NAME = 'ensaio-local-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico' // Nome atual detectado na sua pasta public
];

// Instala o Service Worker e guarda os arquivos básicos
self.addEventListener('install', (event) => {
  // Força o SW a se tornar ativo imediatamente sem esperar recarregamento
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos cache.addAll mas envolvemos em um try/catch interno para evitar que 
      // um único arquivo ausente (ex: favicon) trave toda a instalação do App
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn("Aviso: Alguns ativos não foram cacheados na instalação", err));
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

  // DIRETRIZ DE SEGURANÇA: Ignora requisições de desenvolvimento (Vite HMR/Socket) e extensões
  // Isso evita que a tela fique branca em modo de desenvolvimento local
  if (
    url.includes('chrome-extension') || 
    url.includes('socket.io') || 
    url.includes('@vite') || 
    url.includes('src/') ||
    event.request.method !== 'GET' // Segurança: Só cacheia requisições de leitura
  ) {
    return;
  }

  event.respondWith(
    // ESTRATÉGIA: Cache First -> Network Fallback
    // Melhora a performance e evita tela branca por instabilidade de rede
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request)
        .then((networkResponse) => {
          // Opcional: Adicionar dinamicamente novos arquivos ao cache (JS/CSS do build)
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se for uma navegação de página (URL amigável) e falhar, retorna o index.html (SPA fallback)
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});