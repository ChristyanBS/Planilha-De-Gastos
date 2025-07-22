const CACHE_NAME = 'planilha-financeira-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/style.css',
  '/script.js',
  '/auth.js'
  // Note que as URLs do tailwind e font-awesome foram removidas
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
