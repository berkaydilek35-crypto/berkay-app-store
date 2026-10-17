/* Berkay Napıyor? — ortak veri ve çizim kodu.
   Hem tarayıcıda hem de derleme sırasında (scripts/build.mjs, Node) çalışır; bu yüzden çizim fonksiyonları sadece metin üretir.
   Katalog verisi Wix CMS'teki "apps" koleksiyonundan gelir. Yeni uygulama eklemek için koda dokunma: Wix panelinde CMS > Uygulamalar'a satır ekle. */
(function (root) {
  var WIX_CLIENT_ID = '3b59c050-da0d-4684-b49b-c60e9b27be89'; // herkese açık ziyaretçi kimliği, gizli değil
  var API = 'https://www.wixapis.com';
  var COLLECTION = 'apps';
  var TOKEN_KEY = 'bk-visitor-' + WIX_CLIENT_ID;
  var CACHE_KEY = 'bk-apps-v2';
  var STATS_KEY = 'bk-stats-v1';
  var IG = 'https://www.instagram.com/berkay.builds/';
  var SITE = 'https://berkay.instaassist.tr';
  var SAYAC = 'https://bk-sayac.berkaydilekk.workers.dev'; // isimsiz sayaç (worker/sayac.js)
  var MIN_TRIED = 10;   // "X kişi denedi" rozeti bu sayıdan sonra görünür
  var SEARCH_MIN = 6;   // arama ve filtre bu kadar uygulama olunca açılır

  // CMS'e ulaşılamazsa sayfa boş kalmasın diye yedek kayıt (CMS'tekiyle aynı içerik)
  var FALLBACK = [{
    title: 'Acaba?', slug: 'acaba',
    tagline: 'Acaba dediğin her şeyin en enteresan cevabı.',
    category: 'Eğlence', status: 'Canlı', testNumber: 1, appUrl: '/apps/acaba/index.html', downloadUrl: '/downloads/acaba.zip',
    featuredOrder: 1, publishDate: '2026-10-13T00:00:00.000Z',
    coverImage: '/assets/apps/acaba/cover.jpg',
    screenshots: ['/assets/apps/acaba/ekran-1-kart.jpg', '/assets/apps/acaba/ekran-2-giris.jpg', '/assets/apps/acaba/ekran-3-video.jpg'],
    description: 'Maç, patron, hoca, anne, sevgili, ev sahibi… Kafana takılan "acaba"yı yazıyorsun. Uygulama konuyu ve rakibini tanıyıp abartılı, komik bir cevap kuruyor; bunu paylaşılabilir bir karta ve sesli, 17 saniyelik dikey bir videoya dönüştürüyor.',
    audience: 'Aklına takılana gülmek ve bunu hikâye ya da Reels olarak paylaşmak isteyen herkes.',
    testNote: 'Saha Testi 001, ilk sürüm. Tamamen tarayıcıda çalışıyor: yazdığın metin cihazından çıkmıyor, kayıt ya da hesap yok. Video telefonda/bilgisayarda üretilip indiriliyor. Ana ekrana ekleyince internetsiz de çalışıyor.'
  }, {
    title: 'Çöpİzmir', slug: 'copizmir', tagline: 'İzmir\'in çöpleri bir haritaya dökülüyor.',
    category: 'Şehir', status: 'Yakında', testNumber: 2, featuredOrder: 2, coverImage: '/assets/apps/copizmir/teaser.jpg'
  }, {
    title: 'Semt Ligi', slug: 'semt-ligi', tagline: 'Mahalleler arası spor ligi. Senin semtin kaçıncı?',
    category: 'Spor', status: 'Yakında', testNumber: 3, featuredOrder: 3, coverImage: '/assets/apps/semt-ligi/teaser.jpg'
  }];

  var hasDOM = typeof document !== 'undefined';
  function store(kind) { try { return root[kind] || null; } catch (e) { return null; } }
  function load(k, kind) { try { var s = store(kind || 'localStorage'); return s ? JSON.parse(s.getItem(k)) : null; } catch (e) { return null; } }
  function save(k, v, kind) { try { var s = store(kind || 'localStorage'); if (s) s.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- Wix CMS ---------- */
  async function mint(body) {
    var r = await fetch(API + '/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ clientId: WIX_CLIENT_ID }, body))
    });
    if (!r.ok) throw new Error('auth ' + r.status);
    var d = await r.json();
    return { a: d.access_token, r: d.refresh_token, e: Date.now() + d.expires_in * 1000 };
  }
  async function accessToken() {
    var t = load(TOKEN_KEY);
    if (t && t.e - 60000 > Date.now()) return t.a;
    var fresh = null;
    if (t && t.r) { try { fresh = await mint({ grantType: 'refresh_token', refreshToken: t.r }); } catch (e) {} }
    if (!fresh) fresh = await mint({ grantType: 'anonymous' });
    save(TOKEN_KEY, fresh);
    return fresh.a;
  }

  // Wix görsel değerleri (wix:image://, çıplak dosya kimliği, wixstatic adresi) → tarayıcının açabildiği adres
  var STATIC = 'https://static.wixstatic.com/media';
  function rawOf(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (v.src) return rawOf(v.src);
    if (v.image) return rawOf(v.image);
    return v.url || v.id || '';
  }
  function fileOf(v) {
    if (v.indexOf('wix:image://') === 0) return v.slice('wix:image://v1/'.length).split('/')[0].split('#')[0];
    if (/^[\w-]+~mv2\.[a-z0-9]+$/i.test(v)) return v;
    var m = v.match(/^https:\/\/static\.wixstatic\.com\/media\/([^/?#]+)/);
    return m ? m[1] : '';
  }
  function imgSrc(value, w, h, mode) {
    var v = rawOf(value);
    if (!v) return '';
    var f = fileOf(v);
    return f ? STATIC + '/' + f + '/v1/' + (mode || 'fill') + '/w_' + w + ',h_' + h + ',al_c,q_85/' + f : v;
  }
  function absUrl(u) { return !u ? '' : /^https?:\/\//.test(u) ? u : SITE + (u.charAt(0) === '/' ? '' : '/') + u; }
  function dateOf(v) { if (!v) return ''; if (typeof v === 'object' && v.$date) return v.$date; return String(v); }

  function normalize(d) {
    if (d && d._n) return d; // zaten çevrilmiş
    var order = d.featuredOrder;
    return {
      _n: 1,
      title: d.title || '', slug: String(d.slug || '').trim().toLowerCase(), tagline: d.tagline || '',
      category: (d.category || '').trim(), status: (d.status || '').trim(),
      testNumber: Number(d.testNumber) || null,
      cover: rawOf(d.coverImage),
      screens: Array.isArray(d.screenshots) ? d.screenshots.map(rawOf).filter(Boolean) : [],
      appUrl: (d.appUrl || '').trim(), download: (d.downloadUrl || '').trim(), demo: (d.demoVideoUrl || '').trim(), ig: (d.instagramUrl || '').trim(),
      date: dateOf(d.publishDate), order: (order === 0 || order) ? Number(order) : null,
      description: d.description || '', audience: d.audience || '', testNote: d.testNote || '',
      sticker: (d.sticker || '').trim()
    };
  }
  var RESERVED = ['apps', 'assets', 'downloads', 'scripts', 'worker', 'app', 'index'];
  function validSlug(s) { return /^[a-z0-9][a-z0-9-]{0,48}$/.test(s) && RESERVED.indexOf(s) < 0; }
  function sortApps(list) {
    return list.slice().sort(function (a, b) {
      var ao = a.order == null ? Infinity : a.order, bo = b.order == null ? Infinity : b.order;
      if (ao !== bo) return ao - bo;
      return (b.date || '').localeCompare(a.date || '');
    });
  }
  function clean(list) { return sortApps(list.map(normalize).filter(function (a) { return a.title && validSlug(a.slug); })); }

  async function queryApps() {
    var body = { dataCollectionId: COLLECTION, query: { filter: {}, paging: { limit: 100, offset: 0 } } };
    var r = await fetch(API + '/wix-data/v2/items/query', {
      method: 'POST',
      headers: { Authorization: await accessToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('query ' + r.status);
    var j = await r.json();
    var list = clean((j.dataItems || []).map(function (x) { return x.data || {}; }));
    if (!list.length) throw new Error('boş liste');
    return list;
  }

  // Sayfaya derlemede gömülen anlık görüntü (anında açılış için)
  function embedded() {
    if (!hasDOM) return null;
    var el = document.getElementById('bk-data');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  var fromCache = false;
  // Hızlı yol: önbellek → sayfaya gömülü liste → CMS → yedek
  async function getApps() {
    var c = load(CACHE_KEY, 'sessionStorage');
    if (c && Date.now() - c.t < 300000 && c.list && c.list.length) { fromCache = true; return c.list; }
    var e = embedded();
    if (e && e.apps && e.apps.length) return clean(e.apps);
    try { var list = await queryApps(); save(CACHE_KEY, { t: Date.now(), list: list }, 'sessionStorage'); fromCache = true; return list; }
    catch (err) { if (root.console) console.warn('CMS okunamadı, yedek liste kullanılıyor:', err); return clean(FALLBACK); }
  }
  // Arka planda CMS'ten tazele; liste değiştiyse yenisini döndür, değişmediyse null
  async function freshApps(current) {
    if (fromCache) return null;
    try {
      var list = await queryApps();
      save(CACHE_KEY, { t: Date.now(), list: list }, 'sessionStorage');
      fromCache = true;
      return JSON.stringify(list) === JSON.stringify(current) ? null : list;
    } catch (e) { return null; }
  }

  /* ---------- İsimsiz sayaç ---------- */
  // Kim olduğun tutulmaz: sadece "hangi uygulama, ne oldu, hangi gün" sayılır. Çerez yok.
  function track(slug, kind) {
    if (!hasDOM || !SAYAC || !slug || !kind) return;
    try {
      var body = JSON.stringify({ a: slug, t: kind });
      if (navigator.sendBeacon) navigator.sendBeacon(SAYAC + '/e', body);
      else fetch(SAYAC + '/e', { method: 'POST', body: body, keepalive: true, mode: 'no-cors' });
    } catch (e) {}
  }
  async function getStats() {
    var e = embedded();
    var c = load(STATS_KEY, 'sessionStorage');
    if (c && Date.now() - c.t < 300000) return c.s || {};
    if (!SAYAC) return (e && e.stats) || {};
    try {
      var r = await fetch(SAYAC + '/stats', { mode: 'cors' });
      if (!r.ok) throw new Error('stats ' + r.status);
      var s = await r.json();
      save(STATS_KEY, { t: Date.now(), s: s }, 'sessionStorage');
      return s;
    } catch (err) { return (e && e.stats) || {}; }
  }
  function tried(app, stats) { var s = stats && stats[app.slug]; return s ? (s.first || 0) : 0; }
  function installs(app, stats) { var s = stats && stats[app.slug]; return s ? (s.installed || 0) : 0; }

  /* ---------- Yardımcılar ---------- */
  function trLower(s) { return String(s || '').toLocaleLowerCase('tr-TR'); }
  function statusKey(s) {
    var v = trLower(s);
    if (v.indexOf('canl') === 0) return 'live';
    if (v.indexOf('beta') === 0) return 'beta';
    if (v.indexOf('yak') === 0) return 'soon';
    return 'other';
  }
  function testLabel(n) { return n ? 'SAHA TESTİ ' + String(n).padStart(3, '0') : ''; }
  function numLabel(n) { return n ? String(n).padStart(3, '0') : '—'; }
  function isInternal(url) {
    if (!url) return false;
    if (url.charAt(0) === '/') return true;
    try { return new URL(url, SITE).origin === SITE; } catch (e) { return false; }
  }
  function canOpen(app) { return !!app.appUrl && statusKey(app.status) !== 'soon'; }
  function isSoon(app) { return statusKey(app.status) === 'soon'; }
  // Sitedeki uygulamalar (/apps/...) ana ekrana eklenebilir: /assets/bk-app.js'i yüklerler
  function installable(app) { return canOpen(app) && isInternal(app.appUrl) && /^\/apps\//.test(app.appUrl.replace(SITE, '')); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function detailUrl(app) { return '/' + encodeURIComponent(app.slug) + '/'; }
  function shareUrl(app) { return SITE + '/' + app.slug; }
  function withParam(url, p) { var i = url.indexOf('#'), h = i >= 0 ? url.slice(i) : '', u = i >= 0 ? url.slice(0, i) : url; return u + (u.indexOf('?') >= 0 ? '&' : '?') + p + h; }
  function plural(n) { return n.toLocaleString('tr-TR'); }

  /* ---------- Parçalar ---------- */
  function ev(app, kind) { return ' data-ev="' + kind + '" data-a="' + esc(app.slug) + '"'; }
  function openButton(app, cls) {
    if (!canOpen(app)) return '<a class="btn ' + (cls || '') + '" href="' + IG + '" target="_blank" rel="noopener">Haber al</a>';
    var ext = !isInternal(app.appUrl);
    return '<a class="btn ' + (cls || '') + '" href="' + esc(app.appUrl) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + ev(app, 'open') + '>Uygulamayı Aç</a>';
  }
  function installButton(app, cls) {
    if (installable(app)) return '<a class="btn ghost ' + (cls || '') + '" href="' + esc(withParam(app.appUrl, 'yukle=1')) + '"' + ev(app, 'install') + '>İndir</a>';
    if (canOpen(app) && app.download && !/\.zip(\?|$)/i.test(app.download)) return '<a class="btn ghost ' + (cls || '') + '" href="' + esc(app.download) + '" target="_blank" rel="noopener"' + ev(app, 'install') + '>İndir</a>';
    return '';
  }
  function statusChip(app) {
    if (!app.status) return '';
    return '<span class="status ' + statusKey(app.status) + '">' + esc(app.status) + '</span>';
  }
  function triedChip(app, stats) {
    var n = tried(app, stats);
    return n >= MIN_TRIED ? '<span class="tried">' + plural(n) + ' kişi denedi</span>' : '';
  }
  function coverHTML(app, w, h, eager) {
    var inner = app.cover
      ? '<img src="' + esc(imgSrc(app.cover, w, h)) + '" alt="' + esc(app.title) + ' kapak görseli"' + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" width="' + w + '" height="' + h + '">'
      : '<div class="poster" aria-hidden="true"><span class="pn">' + numLabel(app.testNumber) + '</span><span class="pt">' + esc(app.title) + '</span><span class="pl"></span></div>';
    return inner + (app.testNumber ? '<span class="badge">' + numLabel(app.testNumber) + '</span>' : '') + statusChip(app);
  }

  function featuredHTML(f, stats) {
    return '<div class="text">' +
        '<div class="num" aria-hidden="true">' + numLabel(f.testNumber) + '</div>' +
        '<p class="kicker"><span>Yeni</span>' + (f.testNumber ? testLabel(f.testNumber) : 'Saha testi') + '</p>' +
        '<h2>' + esc(f.title) + '</h2>' +
        '<p class="lead">' + esc(f.tagline) + '</p>' +
        '<div class="actions">' + openButton(f, 'signal') + installButton(f) + '</div>' +
        '<div class="meta">' + statusChip(f).replace('class="status', 'class="tag status') + (f.category ? '<span class="tag">' + esc(f.category) + '</span>' : '') + triedChip(f, stats) +
          '<a class="link" href="' + detailUrl(f) + '">Nasıl yaptım, nasıl test ettim?</a></div>' +
      '</div>' +
      '<a class="cover" href="' + detailUrl(f) + '" aria-label="' + esc(f.title) + ' detayları">' + coverHTML(f, 960, 1200, true) + '</a>';
  }
  function cardHTML(a, stats) {
    if (isSoon(a)) return soonCard(a);
    return '<article class="card">' +
      '<a class="cover" href="' + detailUrl(a) + '" aria-label="' + esc(a.title) + ' detayları">' + coverHTML(a, 720, 900) + '</a>' +
      '<h3><a href="' + detailUrl(a) + '">' + esc(a.title) + '</a></h3>' +
      '<p>' + esc(a.tagline) + '</p>' +
      (triedChip(a, stats) ? '<div class="meta">' + triedChip(a, stats) + '</div>' : '') +
      '<div class="row">' + openButton(a, 'small') + installButton(a, 'small') + '<a class="link" href="' + detailUrl(a) + '">Detay</a></div>' +
    '</article>';
  }
  // CMS'te durumu "Yakında" olan uygulama: kapak bulanık, üstünde merak ettiren çıkartma.
  // Çıkartma yazısı CMS'teki "sticker" alanından gelir; boşsa test numarasına göre sırayla seçilir.
  var STICKERS = ['SIZDI 👀', 'PSST… 🤫', 'KİLİTLİ 🔒', 'GİZLİ TEST 🤐'];
  function stickerText(a) { return a.sticker || STICKERS[Math.max(0, (a.testNumber || 2) - 2) % STICKERS.length]; }
  function soonCard(a) {
    var img = a.cover ? '<img src="' + esc(imgSrc(a.cover, 720, 900)) + '" alt="" loading="lazy" decoding="async" width="720" height="900">' : '<div class="poster" aria-hidden="true"><span class="pn">' + numLabel(a.testNumber) + '</span></div>';
    var tilt = (a.testNumber || 0) % 2 ? 'l' : 'r';
    return '<article class="card soon">' +
      '<div class="cover teaser" aria-hidden="true">' + img + (a.testNumber ? '<span class="badge">' + numLabel(a.testNumber) + '</span>' : '') +
        '<span class="sticker ' + tilt + '"><b>' + esc(stickerText(a)) + '</b><small>' + (a.testNumber ? 'Saha Testi ' + numLabel(a.testNumber) : 'Yakında') + '</small></span></div>' +
      '<h3>' + esc(a.title) + '</h3>' +
      '<p>' + esc(a.tagline) + '</p>' +
      '<div class="row"><a class="btn small" href="' + esc(a.ig || IG) + '" target="_blank" rel="noopener">Takip et, ilk sen dene</a></div>' +
    '</article>';
  }
  // CMS'te hiç "Yakında" yoksa: isimsiz sıradaki test kartı
  function nextCard(n) {
    return '<article class="card soon next">' +
      '<div class="cover"><div class="poster" aria-hidden="true"><span class="pn">' + numLabel(n) + '</span><span class="pt">Sıradaki test yolda</span><span class="pl"></span></div><span class="status soon">Yakında</span></div>' +
      '<h3>Saha Testi ' + numLabel(n) + '</h3>' +
      '<p>Yeni uygulama önce Instagram\'da çıkıyor. Takip et, ilk deneyen sen ol.</p>' +
      '<div class="row"><a class="btn small" href="' + IG + '" target="_blank" rel="noopener">Takip et</a></div>' +
    '</article>';
  }
  // Öne çıkan hariç katalog: diğer uygulamalar + yakındakiler (hiç yoksa isimsiz "sıradaki" kartı)
  function catalogParts(apps, featured) {
    var others = apps.filter(function (a) { return a !== featured && (!featured || a.slug !== featured.slug); });
    var live = others.filter(function (a) { return !isSoon(a); });
    var soon = others.filter(isSoon);
    var maxN = apps.reduce(function (m, a) { return Math.max(m, a.testNumber || 0); }, 0);
    return { live: live, soon: soon, next: soon.length ? 0 : maxN + 1, showTools: apps.filter(function (a) { return !isSoon(a); }).length >= SEARCH_MIN };
  }
  function pickFeatured(apps) { return apps.find(canOpen) || apps[0] || null; }

  /* ---------- Video ---------- */
  function igCode(url) { var m = String(url || '').match(/instagram\.com\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]+)/); return m ? { kind: m[1] === 'reels' ? 'reel' : m[1], code: m[2] } : null; }
  function videoHTML(url, label) {
    if (!url) return '';
    var ig = igCode(url);
    if (ig) return '<div class="video ig" data-embed="https://www.instagram.com/' + ig.kind + '/' + ig.code + '/embed/"><button type="button" class="play" aria-label="' + esc(label) + ' oynat"><span class="pi" aria-hidden="true"></span><span>' + esc(label) + '</span><small>Instagram\'dan yüklenir</small></button></div>';
    var yt = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);
    if (yt) return '<div class="video yt" data-embed="https://www.youtube-nocookie.com/embed/' + yt[1] + '?autoplay=1"><button type="button" class="play" aria-label="' + esc(label) + ' oynat"><span class="pi" aria-hidden="true"></span><span>' + esc(label) + '</span><small>YouTube\'dan yüklenir</small></button></div>';
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || /video\.wixstatic\.com/.test(url)) return '<div class="video file"><video src="' + esc(url) + '" controls playsinline preload="metadata"></video></div>';
    return '<a class="btn ghost" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
  }
  // Tıklayınca yüklenen gömmeler (açılışta Instagram/YouTube'a bağlanmaz)
  function wireVideos(scope) {
    if (!hasDOM) return;
    (scope || document).querySelectorAll('.video[data-embed] .play').forEach(function (b) {
      b.addEventListener('click', function () {
        var box = b.parentNode, f = document.createElement('iframe');
        f.src = box.getAttribute('data-embed'); f.title = b.getAttribute('aria-label') || 'Video';
        f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; clipboard-write'); f.setAttribute('allowfullscreen', '');
        box.innerHTML = ''; box.appendChild(f); box.classList.add('on');
      });
    });
  }

  /* ---------- Detay ---------- */
  function fact(title, text, cls) { return text ? '<section class="fact ' + (cls || '') + '"><h2>' + title + '</h2><p>' + esc(text) + '</p></section>' : ''; }
  function formatDate(iso) {
    if (!iso) return '';
    var t = new Date(iso);
    if (isNaN(t.getTime())) return '';
    try { return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(t); } catch (e) { return t.toISOString().slice(0, 10); }
  }
  function detailHTML(a, stats) {
    var internal = canOpen(a) && isInternal(a.appUrl);
    var side = internal
      ? '<div class="side-col"><div class="phone" id="phone">' +
          '<div class="ph-cta"><span class="pn">' + numLabel(a.testNumber) + '</span><button type="button" class="btn signal small" id="prev">Canlı önizlemeyi aç</button></div>' +
        '</div><p class="side-note">Önizleme gerçek uygulamanın kendisi. Tam ekran için "Uygulamayı Aç".</p></div>'
      : '<div class="side-col"><div class="cover">' + coverHTML(a, 720, 900) + '</div></div>';

    var videos = '';
    if (a.demo) videos += '<section class="fact"><h2>Nasıl kullanılır?</h2>' + videoHTML(a.demo, 'Kullanım videosu') + '</section>';
    if (a.ig) videos += '<section class="fact"><h2>Saha Testi videosu</h2>' + videoHTML(a.ig, 'Saha Testi Reels') + '</section>';

    var n = tried(a, stats), k = installs(a, stats);
    var result = n >= MIN_TRIED
      ? '<section class="fact result"><h2>Sonuç</h2><p><b>' + plural(n) + '</b> kişi denedi' + (k ? ', <b>' + plural(k) + '</b> kişi ana ekrana ekledi' : '') + '.</p><p class="side-note">İsimsiz sayılır: kim olduğun tutulmaz, çerez yok.</p></section>'
      : '';

    var install = installable(a)
      ? '<section class="fact"><h2>Telefonuna indir</h2><p>"İndir"e bas, uygulama açılınca çıkan adımları izle. Ana ekranında kendi ikonuyla durur, internet olmadan da çalışır. Mağaza yok, kayıt yok, ücret yok.</p>' +
        '<p class="dl-row">' + installButton(a, 'small') + (a.download ? '<a class="link" href="' + esc(a.download) + '" download' + ev(a, 'source') + '>Kaynak kodu (ZIP, MIT)</a>' : '') + '</p></section>'
      : (a.download ? '<section class="fact"><h2>Kaynak kodu</h2><p><a class="link" href="' + esc(a.download) + '" download' + ev(a, 'source') + '>ZIP olarak indir</a></p></section>' : '');

    var shots = a.screens.length ? '<section class="fact"><h2>Ekran görüntüleri</h2><div class="shots">' +
      a.screens.map(function (s, i) { return '<img src="' + esc(imgSrc(s, 600, 1300, 'fit')) + '" alt="' + esc(a.title) + ' ekran görüntüsü ' + (i + 1) + '" loading="lazy" decoding="async">'; }).join('') +
      '</div></section>' : '';
    var date = formatDate(a.date);

    return '<div class="d-head">' +
        '<div class="meta">' + (a.testNumber ? '<span class="numtag">' + testLabel(a.testNumber) + '</span>' : '') + statusChip(a).replace('class="status', 'class="tag status') + (a.category ? '<span class="tag">' + esc(a.category) + '</span>' : '') + triedChip(a, stats) + '</div>' +
        '<h1>' + esc(a.title) + '</h1>' +
        '<p class="lead">' + esc(a.tagline) + '</p>' +
        '<div class="d-actions">' + openButton(a, 'signal') + installButton(a) + '<button type="button" class="btn ghost" id="share"' + ev(a, 'share') + '>Paylaş</button></div>' +
      '</div>' +
      '<div class="d-body">' +
        '<div class="facts">' +
          videos +
          fact('Ne işe yarıyor?', a.description) +
          fact('Kimin için?', a.audience) +
          fact('Saha notu', a.testNote, 'note') +
          result + install + shots +
          (date ? '<p class="side-note">Yayın tarihi: ' + date + '</p>' : '') +
        '</div>' + side +
      '</div>';
  }
  function notFoundHTML() {
    return '<div class="d-head"><h1>Bu test burada yok.</h1><p class="lead">Adres değişmiş ya da uygulama kaldırılmış olabilir. Canlı uygulamaların hepsi ana sayfada.</p><div class="d-actions"><a class="btn signal" href="/">Uygulamalara dön</a></div></div>';
  }

  // Sayfadaki data-ev tıklamalarını say
  if (hasDOM) {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-ev]');
      if (t) track(t.getAttribute('data-a'), t.getAttribute('data-ev') + '-click');
    }, true);
  }

  root.BK = {
    IG: IG, SITE: SITE, SAYAC: SAYAC, MIN_TRIED: MIN_TRIED, SEARCH_MIN: SEARCH_MIN, FALLBACK: FALLBACK,
    getApps: getApps, freshApps: freshApps, queryApps: queryApps, clean: clean, normalize: normalize, validSlug: validSlug,
    getStats: getStats, track: track, tried: tried, installs: installs,
    imgSrc: imgSrc, absUrl: absUrl, statusKey: statusKey, testLabel: testLabel, numLabel: numLabel,
    isInternal: isInternal, canOpen: canOpen, isSoon: isSoon, installable: installable, esc: esc,
    detailUrl: detailUrl, shareUrl: shareUrl, openButton: openButton, installButton: installButton,
    statusChip: statusChip, triedChip: triedChip, coverHTML: coverHTML, featuredHTML: featuredHTML, cardHTML: cardHTML,
    nextCard: nextCard, catalogParts: catalogParts, pickFeatured: pickFeatured,
    videoHTML: videoHTML, wireVideos: wireVideos, detailHTML: detailHTML, notFoundHTML: notFoundHTML,
    formatDate: formatDate, trLower: trLower
  };
})(typeof window !== 'undefined' ? window : globalThis);
