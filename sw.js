const CACHE_NOME_ESTATICO = 'planilha-financeira-estatico-v6';
const CACHE_NOME_DINAMICO = 'planilha-financeira-dinamico-v6';

// Lista de arquivos essenciais para o funcionamento offline
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
  'images/icons/icon-192x192.png',
  'images/icons/icon-512x512.png'
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

// Evento de Fetch: Intercepta requisições com a estratégia Stale-While-Revalidate
self.addEventListener('fetch', event => {
  // Ignora requisições para o Firebase para não interferir na sincronização em tempo real
  if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NOME_DINAMICO).then(cache => {
      // 1. Tenta pegar a resposta do cache
      return cache.match(event.request).then(cachedResponse => {
        // 2. Ao mesmo tempo, busca na rede para atualizar o cache (revalidate)
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Se a busca na rede for bem-sucedida, atualiza o cache com a nova versão
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });

        // 3. Retorna a resposta do cache imediatamente se existir (stale),
        // ou espera a resposta da rede se for a primeira vez (cache miss).
        return cachedResponse || fetchPromise;
      });
    })
  );
});