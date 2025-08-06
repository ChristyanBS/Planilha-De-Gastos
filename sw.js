// Arquivo: sw.js (CORRIGIDO)

const CACHE_NOME_ESTATICO = 'planilha-financeira-estatico-v6'; // Versão incrementada
const CACHE_NOME_DINAMICO = 'planilha-financeira-dinamico-v6';

// Lista de arquivos ATUALIZADA para a nova estrutura modular
const urlsToCache = [
  './',
  'index.html',
  'login.html',
  'style.css',
  'auth.js',
  'main.js',
  'ui.js',
  'core.js',
  'firestore.js',
  'calculator.js',
  'utils.js',
  'manifest.json',
  'images/icon-192x192.png',
  'images/icon-512x512.png'
];

// Evento de Instalação: Salva os arquivos estáticos principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NOME_ESTATICO)
      .then(cache => {
        console.log('Cache estático aberto e arquivos principais cacheados');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Ativação: Limpa caches antigos
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
  if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NOME_DINAMICO).then(cache => {
            cache.put(event.request.url, networkResponse.clone());
            return networkResponse;
          });
        });
      })
  );
});