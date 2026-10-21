/* Berkay Napıyor? — uygulama yardımcısı.
   Sitedeki her uygulama (/apps/<ad>/) bunu yükler:
     <script src="/assets/bk-app.js" data-app="acaba" data-name="Acaba?" data-sw="sw.js" defer></script>
   Yaptıkları:
   1. "İndir" (ana ekrana ekle) penceresi: Android'de tek dokunuşla yükler; iPhone'da adımları gösterir;
      Instagram/Facebook tarayıcısındaysa önce gerçek tarayıcıda açtırır. Adreste ?yukle=1 varsa kendiliğinden açılır.
   2. Servis çalışanını kaydeder (data-sw verilirse): ana ekrandan internetsiz açılır.
   3. İsimsiz sayaç: kim olduğun tutulmaz, sadece "açıldı / ilk kez açıldı / ana ekrana eklendi" sayılır. Çerez yok.
   Uygulamanın kendi butonları için: BKApp.install() */
(function () {
  var me = document.currentScript || document.querySelector('script[data-app]');
  var D = (me && me.dataset) || {};
  var slug = D.app || '';
  var appName = D.name || document.title || 'Uygulama';
  var SAYAC = 'https://bk-sayac.berkaydilekk.workers.dev';
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(ua);
  var inApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|musical_ly|BytedanceWebview|Twitter|Snapchat/i.test(ua);
  var appLabel = /Instagram/i.test(ua) ? 'Instagram' : /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua) ? 'Facebook' : /TikTok|musical_ly|Bytedance/i.test(ua) ? 'TikTok' : 'uygulama';
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var isMobile = isIOS || isAndroid;
  var deferred = null;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function send(a, kind) {
    if (!SAYAC || !a || location.protocol !== 'https:') return;
    if (store('bk-me')) return; // Berkay'ın kendi cihazları (paneli açtığı cihazlar) sayılmaz
    try {
      var body = JSON.stringify({ a: a, t: kind });
      if (navigator.sendBeacon) navigator.sendBeacon(SAYAC + '/e', body);
      else fetch(SAYAC + '/e', { method: 'POST', body: body, keepalive: true, mode: 'no-cors' });
    } catch (e) {}
  }
  function track(kind) { send(slug, kind); }

  // Sayaç: her açılış + cihazda ilk açılış + ana ekrandan ilk açılış (iPhone'da yükleme ancak böyle anlaşılır).
  // Sitedeki canlı önizleme penceresinde (iframe) sayılmaz: orada kimse uygulamayı kendisi açmadı.
  var framed = false; try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (!framed) {
    // Siteye giren (uygulamaya doğrudan gelenler de siteye girmiş sayılır; ana sayfayla aynı işaretler, çift sayım yok)
    if (location.hostname === 'berkay.instaassist.tr') {
      if (!isStandalone && !store('bk-v')) { store('bk-v', '1'); if (store('bk-v')) send('site', 'visitor'); }
      try { if (!sessionStorage.getItem('bk-s')) { sessionStorage.setItem('bk-s', '1'); send('site', 'visit'); } } catch (e) {}
    }
    track(isStandalone ? 'open-home' : 'open');
    if (!store('bk-seen-' + slug)) { store('bk-seen-' + slug, '1'); track('first'); }
    if (isStandalone && !store('bk-inst-' + slug)) { store('bk-inst-' + slug, '1'); track('installed'); }
  }

  if (D.sw && 'serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register(new URL(D.sw, location.href).href).catch(function () {}); });
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; if (sheet) render(); });
  window.addEventListener('appinstalled', function () {
    if (!store('bk-inst-' + slug)) { store('bk-inst-' + slug, '1'); track('installed'); }
    deferred = null; if (sheet) render('done');
  });

  /* ---------- Pencere ---------- */
  var css = '' +
    '.bkx-wrap{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,16,18,.55);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#17191C;-webkit-font-smoothing:antialiased;animation:bkx-f .18s ease}' +
    '@media (min-width:640px){.bkx-wrap{align-items:center}}' +
    '.bkx{position:relative;width:100%;max-width:440px;max-height:92vh;overflow:auto;background:#F4F1E9;border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.25);animation:bkx-u .25s cubic-bezier(.2,.8,.2,1)}' +
    '@media (min-width:640px){.bkx{border-radius:22px}}' +
    '.bkx h2{font-size:23px;line-height:1.1;font-weight:800;letter-spacing:-.01em;margin:0 36px 6px 0}' +
    '.bkx p{margin:0 0 12px;color:#34373C;font-size:15.5px}' +
    '.bkx ol{list-style:none;margin:14px 0 4px;padding:0;display:grid;gap:10px}' +
    '.bkx li{display:flex;gap:12px;align-items:flex-start;background:#fff;border-radius:14px;padding:12px 14px;font-size:15.5px}' +
    '.bkx li strong{font-weight:750}' +
    '.bkx li b{flex:0 0 26px;height:26px;border-radius:50%;background:#FF5B36;color:#17191C;display:grid;place-items:center;font-size:14px;font-weight:800}' +
    '.bkx .ic{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:6px;background:#E7E3D8;vertical-align:-6px;margin:0 2px}' +
    '.bkx .ic svg{width:16px;height:16px}' +
    '.bkx .go{display:flex;width:100%;justify-content:center;align-items:center;gap:8px;margin-top:14px;padding:16px;border-radius:999px;border:0;background:#FF5B36;color:#17191C;font:inherit;font-weight:800;font-size:17px;cursor:pointer;text-decoration:none}' +
    '.bkx .sec{background:transparent;border:2px solid #17191C}' +
    '.bkx .x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;border:0;background:#E7E3D8;color:#17191C;font-size:20px;line-height:1;cursor:pointer}' +
    '.bkx .note{font-size:13px;color:#6A675F;margin:12px 0 0}' +
    '.bkx .perk{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 6px}' +
    '.bkx .perk span{font-size:12.5px;font-weight:700;background:#fff;border-radius:999px;padding:4px 10px}' +
    '@keyframes bkx-f{from{opacity:0}}@keyframes bkx-u{from{transform:translateY(30px);opacity:0}}' +
    '.bkx:focus{outline:none}' +
    '@media (prefers-reduced-motion:reduce){.bkx-wrap,.bkx{animation:none}}';
  var ICON = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="#0A84FF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="#17191C" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="#17191C"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    vdots: '<svg viewBox="0 0 24 24" fill="#17191C"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>'
  };
  function ic(n) { return '<span class="ic">' + ICON[n] + '</span>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function installUrl() { var u = new URL(location.href); u.hash = ''; u.searchParams.set('yukle', '1'); return u.href; }

  var sheet = null, styleEl = null;
  function body(state) {
    var perks = '<div class="perk"><span>Kendi ikonu</span><span>Tam ekran</span><span>İnternetsiz çalışır</span><span>Ücretsiz</span></div>';
    var name = esc(appName);
    if (state === 'done' || isStandalone) {
      return '<h2>' + name + ' ana ekranında 🎉</h2><p>Artık ikonuna dokunup açabilirsin. İnternet olmasa da çalışır.</p><button class="go" data-x>Tamam</button>';
    }
    if (inApp) {
      var steps = isIOS
        ? '<li><b>1</b><span>Sağ üstteki ' + ic('dots') + ' menüsüne dokun.</span></li><li><b>2</b><span><strong>"Dış tarayıcıda aç"</strong> ya da <strong>"Safari\'de aç"</strong> seçeneğine dokun.</span></li><li><b>3</b><span>Açılan sayfada çıkan adımlarla ana ekrana ekle.</span></li>'
        : '<li><b>1</b><span>Sağ üstteki ' + ic('vdots') + ' menüsüne dokun.</span></li><li><b>2</b><span><strong>"Tarayıcıda aç"</strong> seçeneğine dokun.</span></li><li><b>3</b><span>Açılan sayfada "Yükle"ye dokun.</span></li>';
      var chrome = isAndroid ? '<a class="go" href="intent://' + esc(location.host + location.pathname) + '?yukle=1#Intent;scheme=https;package=com.android.chrome;end">Chrome\'da aç</a>' : '';
      return '<h2>Önce tarayıcıda aç</h2><p>' + appLabel + '\'ın içinden ana ekrana eklenemiyor. Bir kere gerçek tarayıcıda aç, gerisi 2 dokunuş.</p><ol>' + steps + '</ol>' + chrome +
        '<button class="go sec" data-copy>Bağlantıyı kopyala</button><p class="note">Kopyalayıp ' + (isIOS ? 'Safari' : 'Chrome') + '\'ye yapıştırabilirsin de.</p>';
    }
    if (deferred) {
      return '<h2>Ana ekranına indir</h2><p>' + name + ' telefonuna uygulama gibi kurulur, mağazaya gerek yok.</p>' + perks + '<button class="go" data-install>Yükle</button>';
    }
    if (isIOS) {
      var safari = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
      return '<h2>Ana ekranına ekle</h2><p>' + name + ' için mağazaya gerek yok, 3 dokunuş.</p>' + perks + '<ol>' +
        (safari
          ? '<li><b>1</b><span>Alttaki ' + ic('share') + ' Paylaş simgesine dokun. Görmüyorsan önce ' + ic('dots') + ' menüsünü aç.</span></li>'
          : '<li><b>1</b><span>Adres çubuğundaki ' + ic('share') + ' Paylaş simgesine dokun.</span></li>') +
        '<li><b>2</b><span>Listeyi kaydır, ' + ic('plus') + ' <strong>"Ana Ekrana Ekle"</strong> seçeneğine dokun.</span></li>' +
        '<li><b>3</b><span>Sağ üstten "Ekle"ye dokun. Bitti.</span></li></ol>';
    }
    if (isAndroid) {
      return '<h2>Ana ekranına ekle</h2><p>' + name + ' için mağazaya gerek yok.</p>' + perks + '<ol>' +
        '<li><b>1</b><span>Tarayıcının ' + ic('vdots') + ' menüsüne dokun.</span></li>' +
        '<li><b>2</b><span><strong>"Uygulamayı yükle"</strong> ya da <strong>"Ana ekrana ekle"</strong> seçeneğine dokun.</span></li>' +
        '<li><b>3</b><span>"Yükle"ye dokun.</span></li></ol><p class="note">Chrome kullanıyorsan birkaç saniye içinde burada tek dokunuşluk "Yükle" butonu da çıkabilir.</p>';
    }
    return '<h2>' + name + ' telefonda daha güzel</h2><p>Telefonundan bu adresi aç, "İndir"e dokun; ana ekranına uygulama gibi eklenir.</p><p style="font-weight:800;font-size:18px;color:#17191C">' + esc(location.host + location.pathname.replace(/index\.html$/, '')) + '</p>' +
      '<button class="go sec" data-copy>Bağlantıyı kopyala</button><p class="note">Bilgisayarda Chrome ya da Edge kullanıyorsan adres çubuğundaki yükle simgesiyle de kurabilirsin.</p>';
  }
  function render(state) {
    if (!sheet) return;
    sheet.querySelector('.bkx-in').innerHTML = body(state);
  }
  function close() {
    if (!sheet) return;
    sheet.remove(); sheet = null;
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open() {
    if (sheet) return;
    track('install-sheet');
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.textContent = css; document.head.appendChild(styleEl); }
    sheet = document.createElement('div');
    sheet.className = 'bkx-wrap';
    sheet.innerHTML = '<div class="bkx" role="dialog" aria-modal="true" aria-label="Ana ekrana ekle" tabindex="-1"><button class="x" type="button" aria-label="Kapat" data-x>×</button><div class="bkx-in"></div></div>';
    document.body.appendChild(sheet);
    render();
    sheet.addEventListener('click', async function (e) {
      if (e.target === sheet || e.target.closest('[data-x]')) { close(); return; }
      if (e.target.closest('[data-install]') && deferred) {
        var d = deferred; deferred = null;
        try { d.prompt(); var c = await d.userChoice; if (c && c.outcome === 'accepted') { render('done'); return; } } catch (err) {}
        render();
      }
      var cp = e.target.closest('[data-copy]');
      if (cp) {
        try { await navigator.clipboard.writeText(installUrl()); cp.textContent = 'Kopyalandı ✓'; }
        catch (err) { window.prompt('Bağlantıyı kopyala:', installUrl()); }
      }
    });
    document.addEventListener('keydown', onKey);
    try { sheet.querySelector('.bkx').focus({ preventScroll: true }); } catch (e) {}
  }

  // Adres ?yukle=1 (ya da #yukle) ise pencere kendiliğinden açılır; adres temizlenir
  var auto = /[?&]yukle=1/.test(location.search) || location.hash === '#yukle';
  if (auto) {
    try { var u = new URL(location.href); u.searchParams.delete('yukle'); if (u.hash === '#yukle') u.hash = ''; history.replaceState(history.state, '', u.href); } catch (e) {}
    var go = function () { setTimeout(function () { if (isStandalone) return; open(); }, deferred ? 0 : 600); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  window.BKApp = { install: open, close: close, track: track, canPrompt: function () { return !!deferred; }, isStandalone: isStandalone };
})();
