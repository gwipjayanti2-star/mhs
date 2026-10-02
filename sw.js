const CACHE_NAME = 'mhs-pro-cache-v6'; // Cache dinaikkan ke v6 untuk memicu pembaruan
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
        console.log('Opened cache v6');
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
          // Hapus cache versi lama (termasuk v5 yang bermasalah)
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

  // STRATEGI BARU: Network First, Fallback to Cache
  // 1. Selalu coba ambil file terbaru dari server/jaringan terlebih dahulu
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Jika berhasil mengambil dari jaringan, simpan versi terbarunya ke dalam Cache
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        // Kembalikan file terbaru ke tampilan aplikasi
        return networkResponse;
      })
      .catch(() => {
        // 2. Jika gagal (karena offline/tidak ada sinyal), barulah ambil dari Cache
        return caches.match(event.request)
          .then(cacheResponse => {
            if (cacheResponse) {
              return cacheResponse;
            }
            console.log('Offline dan file tidak ada di cache:', event.request.url);
          });
      })
  );
});
