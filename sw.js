const CACHE_NOME_ESTATICO = 'planilha-financeira-estatico-v4'; // Versão incrementada
const CACHE_NOME_DINAMICO = 'planilha-financeira-dinamico-v4';
const NOME_DO_REPOSITORIO = '/Planilha-De-Gastos';

const urlsToCache = [
  `${NOME_DO_REPOSITORIO}/`,
  `${NOME_DO_REPOSITORIO}/index.html`,
  `${NOME_DO_REPOSITORIO}/login.html`,
  `${NOME_DO_REPOSITORIO}/style.css`,
  `${NOME_DO_REPOSITORIO}/script.js`,
  `${NOME_DO_REPOSITORIO}/auth.js`,
  `${NOME_DO_REPOSITORIO}/manifest.json`,
  `${NOME_DO_REPOSITORIO}/images/icon-192x192.png`,
  `${NOME_DO_REPOSITORIO}/images/icon-512x512.png`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NOME_ESTATICO)
      .then(cache => {
        console.log('Cache estático aberto e arquivos principais cacheados');
        return cache.addAll(urlsToCache);
      })
  );
});

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

self.addEventListener('fetch', event => {
  if (event.request.url.indexOf('firebase') > -1 || event.request.url.indexOf('googleapis') > -1) {
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