const CACHE_NAME = 'mhs-pro-cache-v4'; // Naikkan versi cache
const urlsToCache = [
'./',
'./index.html',
'./manifest.json'
];

self.addEventListener('install', event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => {
// 1. Cache file utama lokal
cache.addAll(urlsToCache);

    // 2. Cache file ikon eksternal secara aman (no-cors) agar SW tidak gagal install
    const iconUrl = 'https://www.image2url.com/r2/default/files/1790301105424-7b6b60f2-4ebe-41f8-a0d1-384221bc41ad.png';
    const req = new Request(iconUrl, { mode: 'no-cors' });
    fetch(req).then(res => cache.put(req, res)).catch(() => {});
  })
  .then(() => self.skipWaiting())


);
});

self.addEventListener('activate', event => {
event.waitUntil(
caches.keys().then(cacheNames => {
return Promise.all(
cacheNames.map(cacheName => {
if (cacheName !== CACHE_NAME) {
return caches.delete(cacheName);
}
})
);
}).then(() => self.clients.claim())
);
});

self.addEventListener('fetch', event => {
if (event.request.method !== 'GET') return;

// PENTING: Jangan cache request ke Google Script API agar data selalu fresh
if (event.request.url.includes('script.google.com')) {
return;
}

event.respondWith(
caches.match(event.request)
.then(response => {
if (response) return response;
return fetch(event.request).then(
function(networkResponse) {
// Izinkan cache untuk status 0 (Opaque response / no-cors image eksternal)
if(!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
return networkResponse;
}
var responseToCache = networkResponse.clone();
caches.open(CACHE_NAME)
.then(function(cache) {
cache.put(event.request, responseToCache);
});
return networkResponse;
}
).catch(() => {
// Abaikan error jaringan agar tidak memutus eksekusi SW
});
})
);
});
