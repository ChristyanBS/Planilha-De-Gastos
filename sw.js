const CACHE_NOME_ESTATICO = 'planilha-financeira-estatico-v2';
const CACHE_NOME_DINAMICO = 'planilha-financeira-dinamico-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/style.css',
  '/script.js',
  '/auth.js',
  '/manifest.json'
  // Adicionamos o manifest.json para garantir que ele esteja sempre disponível
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

// Evento de Fetch: Intercepta todas as requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se a resposta estiver no cache, retorna do cache
        if (response) {
          return response;
        }
        // Se não, busca na rede
        return fetch(event.request)
          .then(networkResponse => {
            // E salva uma cópia no cache dinâmico para uso offline futuro
            return caches.open(CACHE_NOME_DINAMICO)
              .then(cache => {
                // Clona a resposta, pois ela só pode ser consumida uma vez
                cache.put(event.request.url, networkResponse.clone());
                return networkResponse;
              });
          });
      })
      .catch(() => {
        // Se a busca na rede falhar (offline) e não houver nada no cache, 
        // você pode retornar uma página de fallback offline aqui, se tiver uma.
        // Ex: return caches.match('/offline.html');
      })
  );
});