const CACHE_NOME_ESTATICO = 'planilha-financeira-estatico-v19';
const CACHE_NOME_DINAMICO = 'planilha-financeira-dinamico-v19';
// Lista de arquivos essenciais para o funcionamento offline
const urlsToCache = [
  './',
  'index.html',
  'login.html',
  'style.css',
  'dashboard-futuristic.css',
  'manifest.json',
  'auth.js',
  'main.js',
  'dashboard-animations.js',
  'ui.js',
  'core.js',
  'firebaseService.js',
  'calculator.js',
  'utils.js',
  'pwa-handler.js',
  'csvImporter.js',
  'images/icons/icon-192x192.png',
  'images/icons/icon-512x512.png',
  'images/icons/favicon-32x32.png'
];

// Evento de Instalação: Salva os arquivos estáticos principais no cache
self.addEventListener('install', event => {
  // Força o novo SW a assumir o controle imediatamente (sem esperar a aba fechar)
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NOME_ESTATICO)
      .then(cache => {
        console.log('Cache estático aberto e arquivos principais cacheados');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Ativação: Limpa caches antigos para evitar conflitos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== CACHE_NOME_ESTATICO && key !== CACHE_NOME_DINAMICO)
        .map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

// Evento de Fetch: Intercepta requisições
self.addEventListener('fetch', event => {
  // Ignora requisições para o Firebase
  if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isCriticalAsset = ['document', 'script', 'style'].includes(event.request.destination);

  // Para HTML/JS/CSS do próprio app, usa Network First para evitar servir versão antiga.
  if (isSameOrigin && isCriticalAsset) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NOME_DINAMICO).then(cache => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Para os demais assets, mantém Cache First.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NOME_DINAMICO).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        });
      })
  );
});
