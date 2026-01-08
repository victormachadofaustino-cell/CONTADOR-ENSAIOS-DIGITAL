const CACHE_NAME = 'gestor-ccb-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png'
];

// Instalação e Cache de Ativos Estáticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Limpeza de Caches Antigos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

// Estratégia de busca: Tenta rede, se falhar busca no cache
self.addEventListener('fetch', (e) => {
  // EXCEÇÃO PARA DESENVOLVIMENTO (VITE HMR)
  // Impede que o Service Worker tente cachear ou interceptar arquivos do servidor de desenvolvimento
  if (
    e.request.url.includes('@vite') || 
    e.request.url.includes('@react-refresh') || 
    e.request.url.includes('hot-update') ||
    e.request.url.includes('node_modules')
  ) {
    return; 
  }

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});