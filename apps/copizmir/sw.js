/* Çöpİzmir — ana ekrandan açılsın, internet gidip gelirken kabuk yüklensin diye uygulama dosyalarını saklar.
   Tutanaklar, fotoğraflar ve harita (copizmir.pages.dev API'si, harita sunucusu) hiç önbelleğe alınmaz: hep canlı gelir. */
const V = 'copizmir-v1';
const SHELL = ['./', './index.html', './icon.svg', './icon-192.png', './icon-512.png', './manifest.json', '/assets/bk-app.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('copizmir-') && k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const own = u.origin === self.location.origin && (u.pathname.startsWith('/apps/copizmir/') || u.pathname === '/assets/bk-app.js');
  if (!own) return; // API, harita, yazı tipleri, sayaç: doğrudan ağa

  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Uygulama dosyaları: önce ağ (güncelleme hemen gelsin), ağ yoksa önbellek
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r))
  );
});
