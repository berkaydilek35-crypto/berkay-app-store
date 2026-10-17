// Berkay Napıyor? — isimsiz sayaç (Cloudflare Worker + D1, ücretsiz katman).
// Saklanan tek şey: (uygulama kısa adı, olay, gün) → sayı. IP, tarayıcı bilgisi, çerez saklanmaz.
// Bağlantı: D1 veritabanı "bk-sayac", değişken adı DB. Tablo: worker/schema.sql
//   POST /e      {"a":"acaba","t":"open"}  → bir olay say (navigator.sendBeacon ile gelir)
//   GET  /stats  → {"acaba":{"open":12,"first":9,...}}  (5 dk önbellekli)
const SITES = /^https:\/\/berkay\.instaassist\.tr$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const hits = new Map(); // taşma koruması, sadece bellekte, 1 dk

function cors(origin) {
  return { 'Access-Control-Allow-Origin': SITES.test(origin) ? origin : 'https://berkay.instaassist.tr', 'Vary': 'Origin' };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const h = cors(origin);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { ...h, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    }

    if (url.pathname === '/e' && req.method === 'POST') {
      if (!SITES.test(origin)) return new Response(null, { status: 204, headers: h });
      const now = Date.now(), ip = req.headers.get('CF-Connecting-IP') || '';
      const w = hits.get(ip);
      if (w && now - w.t < 60000) { if (++w.n > 60) return new Response(null, { status: 429, headers: h }); }
      else { hits.set(ip, { t: now, n: 1 }); if (hits.size > 5000) hits.clear(); }

      let b;
      try { b = JSON.parse((await req.text()).slice(0, 500)); } catch (e) { return new Response(null, { status: 400, headers: h }); }
      const a = String(b.a || ''), t = String(b.t || '');
      if (!/^[a-z0-9][a-z0-9-]{0,48}$/.test(a) || !/^[a-z][a-z-]{1,23}$/.test(t)) return new Response(null, { status: 400, headers: h });
      const gun = new Date(now + 3 * 3600e3).toISOString().slice(0, 10); // İstanbul günü
      ctx.waitUntil(env.DB.prepare('INSERT INTO sayac (a, t, gun, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(a, t, gun) DO UPDATE SET n = n + 1').bind(a, t, gun).run());
      return new Response(null, { status: 204, headers: h });
    }

    if (url.pathname === '/stats' && req.method === 'GET') {
      const cache = caches.default, key = new Request(url.origin + '/stats');
      let res = await cache.match(key);
      if (!res) {
        const { results } = await env.DB.prepare('SELECT a, t, SUM(n) AS n FROM sayac GROUP BY a, t').all();
        const out = {};
        for (const r of results) (out[r.a] = out[r.a] || {})[r.t] = r.n;
        res = new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
        ctx.waitUntil(cache.put(key, res.clone()));
      }
      res = new Response(res.body, res);
      for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
      return res;
    }

    if (url.pathname === '/') return new Response('Berkay Napıyor? isimsiz sayaç. Kişisel veri tutulmaz.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    return new Response(null, { status: 404 });
  }
};
