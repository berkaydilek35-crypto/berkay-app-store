/* Berkay Yapıyor — katalog verisi Wix CMS'teki "apps" koleksiyonundan okunur.
   Yeni uygulama eklemek için koda dokunma: Wix panelinde CMS > Uygulamalar'a satır ekle. */
(function () {
  var WIX_CLIENT_ID = '3b59c050-da0d-4684-b49b-c60e9b27be89'; // herkese açık ziyaretçi kimliği, gizli değil
  var API = 'https://www.wixapis.com';
  var COLLECTION = 'apps';
  var TOKEN_KEY = 'bk-visitor-' + WIX_CLIENT_ID;
  var CACHE_KEY = 'bk-apps-v1';
  var IG = 'https://www.instagram.com/berkay.builds/';

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
    testNote: "Saha Testi 001, ilk sürüm. Tamamen tarayıcıda çalışıyor: yazdığın metin cihazından çıkmıyor, kayıt ya da hesap yok. Video telefonda/bilgisayarda üretilip indiriliyor. ZIP olarak indirip internetsiz de kullanılabiliyor."
  }];

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

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
  function dateOf(v) { if (!v) return ''; if (typeof v === 'object' && v.$date) return v.$date; return String(v); }

  function normalize(d) {
    var order = d.featuredOrder;
    return {
      title: d.title || '', slug: (d.slug || '').trim(), tagline: d.tagline || '',
      category: (d.category || '').trim(), status: (d.status || '').trim(),
      testNumber: Number(d.testNumber) || null,
      cover: rawOf(d.coverImage),
      screens: Array.isArray(d.screenshots) ? d.screenshots.map(rawOf).filter(Boolean) : [],
      appUrl: (d.appUrl || '').trim(), download: (d.downloadUrl || '').trim(), demo: (d.demoVideoUrl || '').trim(), ig: (d.instagramUrl || '').trim(),
      date: dateOf(d.publishDate), order: (order === 0 || order) ? Number(order) : null,
      description: d.description || '', audience: d.audience || '', testNote: d.testNote || ''
    };
  }
  function sortApps(list) {
    return list.slice().sort(function (a, b) {
      var ao = a.order == null ? Infinity : a.order, bo = b.order == null ? Infinity : b.order;
      if (ao !== bo) return ao - bo;
      return (b.date || '').localeCompare(a.date || '');
    });
  }
  async function queryApps() {
    var body = { dataCollectionId: COLLECTION, query: { filter: {}, paging: { limit: 100, offset: 0 } } };
    var r = await fetch(API + '/wix-data/v2/items/query', {
      method: 'POST',
      headers: { Authorization: await accessToken(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('query ' + r.status);
    var j = await r.json();
    return (j.dataItems || []).map(function (x) { return normalize(x.data || {}); });
  }
  async function getApps() {
    try {
      var c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.t < 300000) return c.list;
    } catch (e) {}
    try {
      var list = sortApps((await queryApps()).filter(function (a) { return a.slug && a.title; }));
      if (!list.length) throw new Error('boş liste');
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), list: list })); } catch (e) {}
      return list;
    } catch (e) {
      console.warn('CMS okunamadı, yedek liste kullanılıyor:', e);
      return sortApps(FALLBACK.map(normalize));
    }
  }

  function trLower(s) { return String(s || '').toLocaleLowerCase('tr-TR'); }
  function statusKey(s) {
    var v = trLower(s);
    if (v.indexOf('canl') === 0) return 'live';
    if (v.indexOf('beta') === 0) return 'beta';
    if (v.indexOf('yak') === 0) return 'soon';
    return 'other';
  }
  function testLabel(n) { return n ? 'TEST ' + String(n).padStart(3, '0') : ''; }
  function numLabel(n) { return n ? String(n).padStart(3, '0') : '—'; }
  function isInternal(url) {
    if (!url) return false;
    if (url.charAt(0) === '/') return true;
    try { return new URL(url, location.href).origin === location.origin; } catch (e) { return false; }
  }
  function canOpen(app) { return !!app.appUrl && statusKey(app.status) !== 'soon'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function detailUrl(app) { return 'app.html?a=' + encodeURIComponent(app.slug); }

  function openButton(app, cls) {
    if (!canOpen(app)) return '<span class="btn ' + (cls || '') + '" aria-disabled="true">Yakında</span>';
    var ext = !isInternal(app.appUrl);
    return '<a class="btn ' + (cls || '') + '" href="' + esc(app.appUrl) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>Uygulamayı Aç</a>';
  }
  function downloadButton(app, cls) {
    if (!app.download) return '';
    return '<a class="btn ghost ' + (cls || '') + '" href="' + esc(app.download) + '" download>İndir</a>';
  }
  function statusChip(app) {
    if (!app.status) return '';
    return '<span class="status ' + statusKey(app.status) + '">' + esc(app.status) + '</span>';
  }
  function coverHTML(app, w, h) {
    var inner = app.cover
      ? '<img src="' + esc(imgSrc(app.cover, w, h)) + '" alt="' + esc(app.title) + ' kapak görseli" loading="lazy" decoding="async">'
      : '<div class="poster" aria-hidden="true"><span class="pn">' + numLabel(app.testNumber) + '</span><span class="pt">' + esc(app.title) + '</span><span class="pl"></span></div>';
    return inner + (app.testNumber ? '<span class="badge">' + numLabel(app.testNumber) + '</span>' : '') + statusChip(app);
  }
  function formatDate(iso) {
    if (!iso) return '';
    var t = new Date(iso);
    return isNaN(t.getTime()) ? '' : new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(t);
  }

  window.BK = {
    IG: IG, getApps: getApps, imgSrc: imgSrc, statusKey: statusKey, testLabel: testLabel, numLabel: numLabel,
    isInternal: isInternal, canOpen: canOpen, esc: esc, detailUrl: detailUrl, openButton: openButton, downloadButton: downloadButton,
    statusChip: statusChip, coverHTML: coverHTML, formatDate: formatDate, trLower: trLower
  };
})();
