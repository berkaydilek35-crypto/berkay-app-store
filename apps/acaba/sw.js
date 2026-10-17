/* Acaba? — ana ekrandan internetsiz açılsın diye uygulama dosyalarını saklar. */
const V = 'acaba-v2';
const SHELL = ['./', './index.html', './app.js', './data.js', './icon.svg', './icon-192.png', './icon-512.png', './manifest.json', '/assets/bk-app.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('acaba-') && k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const fonts = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  const own = u.origin === self.location.origin && (u.pathname.startsWith('/apps/acaba/') || u.pathname === '/assets/bk-app.js');
  if (!fonts && !own) return; // yapay zekâ servisleri, sayaç vb. doğrudan ağa gider

  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Dosyalar ve yazı tipleri: önbellekten hemen, arkada tazele
  e.respondWith(
    caches.open(V).then((c) => c.match(r, { ignoreSearch: own }).then((hit) => {
      const net = fetch(r).then((res) => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }))
  );
});
