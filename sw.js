const CACHE_NOME_ESTATICO = 'planilha-financeira-estatico-v8';
const CACHE_NOME_DINAMICO = 'planilha-financeira-dinamico-v8';
// Lista de arquivos essenciais para o funcionamento offline
const urlsToCache = [
  './',
  'index.html',
  'login.html',
  'style.css',
  'manifest.json',
  'auth.js',
  'main.js',
  'ui.js',
  'core.js',
  'firestore.js',
  'calculator.js',
  'utils.js',
  'pwa-handler.js',
  'images/icons/icon-192x192.png',
  'images/icons/icon-512x512.png',
  'images/icons/favicon-32x32.png'
];

// Evento de Instalação: Salva os arquivos estáticos principais no cache
self.addEventListener('install', event => {
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

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NOME_DINAMICO).then(cache => {
            cache.put(event.request.url, fetchRes.clone());
            return fetchRes;
          });
        });
      })
  );
});
