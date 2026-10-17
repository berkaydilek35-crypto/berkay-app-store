/* Berkay Napıyor? — site servis çalışanı. Sadece sitenin kendi sayfalarını ve dosyalarını önbelleğe alır.
   /apps/ altındaki uygulamalara dokunmaz (her birinin kendi çalışanı var); CMS, sayaç ve yazı tipleri doğrudan ağdan gelir. */
const V = 'bk-hub-v2';
const SHELL = ['/', '/assets/site.css', '/assets/site.js', '/favicon.svg', '/assets/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('bk-hub-') && k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (/^\/(apps|downloads)\//.test(u.pathname)) return;

  // Sayfalar: önce ağ (her zaman güncel), ağ yoksa önbellek
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); }
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match('/')))
    );
    return;
  }
  // Site dosyaları: önce ağ (yeni sürüm hemen gelsin), ağ yoksa önbellek
  if (u.pathname.startsWith('/assets/') || u.pathname === '/favicon.svg') {
    e.respondWith(
      fetch(r).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); }
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }))
    );
  }
});
