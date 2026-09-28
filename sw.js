const CACHE_NAME = 'mhs-pro-cache-v5';
// Hanya cache file lokal yang dijamin ada agar proses install tidak pernah gagal
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Memaksa SW baru untuk segera aktif
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache install error:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Hapus cache versi lama
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Segera kontrol semua halaman terbuka
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Jangan pernah cache permintaan ke API Google Script agar data selalu real-time
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Kembalikan dari cache jika ada
        if (response) {
          return response;
        }

        // Jika tidak ada di cache, ambil dari jaringan
        return fetch(event.request).then(networkResponse => {
          // Pastikan response valid sebelum di-cache
          // Status 0 diizinkan untuk gambar external (Opaque response)
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
            return networkResponse;
          }

          // Simpan hasil jaringan ke cache untuk request berikutnya
          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(() => {
          // Fallback opsional jika sedang offline dan file tidak ada di cache
          console.log('Fetch failed; returning offline page instead.', event.request.url);
        });
      })
  );
});
