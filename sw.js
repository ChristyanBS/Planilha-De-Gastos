const CACHE_NOME_ESTATICO = 'planilha-financeira-estatico-v5'; // Versão incrementada para forçar a atualização
const CACHE_NOME_DINAMICO = 'planilha-financeira-dinamico-v5';

// Lista de arquivos com caminhos relativos para funcionar em qualquer ambiente
const urlsToCache = [
  './',
  'index.html',
  'login.html',
  'style.css',
  'script.js',
  'auth.js',
  'manifest.json',
  'images/icon-192x192.png',
  'images/icon-512x512.png'
];

// Evento de Instalação: Salva os arquivos estáticos principais
self.addEventListener('install', event => {
  // Garante que o service worker não ative até que o cache esteja completo
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
  // Força o novo service worker a assumir o controle da página imediatamente
  return self.clients.claim();
});

// Evento de Fetch: Intercepta todas as requisições
self.addEventListener('fetch', event => {
  // Ignora requisições do Firebase e Google APIs para evitar problemas com o cache
  if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) {
    return;
  }

  // Estratégia: Cache first, depois network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se a resposta estiver no cache, retorna do cache.
        // Se não, busca na rede.
        return response || fetch(event.request).then(networkResponse => {
          // Após buscar na rede, salva uma cópia no cache dinâmico para uso offline futuro
          return caches.open(CACHE_NOME_DINAMICO).then(cache => {
            // Clona a resposta, pois ela só pode ser consumida uma vez
            cache.put(event.request.url, networkResponse.clone());
            // Retorna a resposta original da rede para o navegador
            return networkResponse;
          });
        });
      })
  );
});