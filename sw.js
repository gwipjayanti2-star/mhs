const CACHE_NAME = 'mhs-pro-cache-v8'; // WAJIB NAIK ANGKA (v9, v10, dst) SETIAP KALI UPDATE INDEX.HTML

const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Memaksa SW baru untuk segera aktif tanpa menunggu
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache di-install:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Hapus semua cache lama yang tidak sama dengan CACHE_NAME saat ini
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama secara otomatis:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Langsung kontrol semua tab/halaman yang terbuka
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Jangan cache request ke Google Script
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    (async () => {
      // 1. STRATEGI ANTI-NYANGKUT (Khusus untuk file HTML / Tampilan Utama)
      // Mendeteksi saat user membuka aplikasi (mode navigate)
      if (event.request.mode === 'navigate') {
        try {
          // PAKSA ambil dari server internet, abaikan cache bawaan browser HP (cache: 'reload')
          const networkResponse = await fetch(event.request.url, { cache: 'reload' });
          
          // Simpan versi paling baru ke dalam cache
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
        } catch (error) {
          // Jika HP benar-benar offline (tidak ada sinyal internet sama sekali), buka dari cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
        }
      }

      // 2. STRATEGI UNTUK FILE LAIN (Gambar, Icon, Manifest) -> Network First, Fallback Cache
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        console.log('Offline dan tidak ada di cache:', event.request.url);
      }
    })()
  );
});
