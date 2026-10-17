// Siteyi yayına hazırlar (GitHub Actions'ta her yayından önce çalışır, repoya bir şey yazmaz):
//  1. Wix CMS'ten uygulama listesini okur (ulaşamazsa assets/site.js içindeki yedek listeyi kullanır).
//  2. Ana sayfayı önceden çizer: açılışta "yükleniyor" beklemesi olmaz.
//  3. Her uygulama için /<kısa-ad>/index.html üretir: kendi başlığı, açıklaması ve paylaşım görseliyle
//     (WhatsApp/Instagram'da link atılınca uygulamanın kartı görünür).
//  4. Paylaşım görseli olmayan uygulamalar için 1200x630 görsel çizer (Chrome varsa).
//  5. Ana ekran ikonlarını (PNG) SVG'lerden üretir: site için favicon tasarımından, her uygulama için apps/<ad>/icon.svg'den.
//  6. sitemap.xml ve robots.txt yazar.
// Yerelde denemek için: node scripts/build.mjs --offline   (CMS yerine yedek listeyi kullanır)
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OFFLINE = process.argv.includes('--offline');
const log = (...a) => console.log('[build]', ...a);

// assets/site.js'i (tarayıcı kodu) burada da kullan: aynı çizim fonksiyonları, aynı sonuç
const ctx = vm.createContext({ console, fetch, URL, URLSearchParams, setTimeout, clearTimeout, AbortController });
vm.runInContext(await fs.readFile(path.join(ROOT, 'assets/site.js'), 'utf8'), ctx);
const B = ctx.BK;

function withTimeout(p, ms) { return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('zaman aşımı')), ms))]); }

let apps;
if (OFFLINE) { apps = B.clean(B.FALLBACK); log('çevrimdışı: yedek liste'); }
else {
  try { apps = await withTimeout(B.queryApps(), 20000); log('CMS:', apps.length, 'uygulama'); }
  catch (e) { apps = B.clean(B.FALLBACK); log('CMS okunamadı, yedek liste:', e.message); }
}
apps = JSON.parse(JSON.stringify(apps)); // vm nesnelerini düz nesneye çevir

let stats = {};
if (!OFFLINE && B.SAYAC) {
  try { const r = await withTimeout(fetch(B.SAYAC + '/stats'), 8000); if (r.ok) stats = await r.json(); log('sayaç okundu'); }
  catch (e) { log('sayaç okunamadı:', e.message); }
}

const SITE = B.SITE;
const esc = B.esc;
const dataTag = () => '<script id="bk-data" type="application/json">' +
  JSON.stringify({ apps, stats, t: new Date().toISOString() }).replace(/</g, '\\u003c') + '</script>';

/* ---------- Paylaşım görselleri ---------- */
let browser = null;
async function getBrowser() {
  if (browser !== null) return browser;
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => existsSync(p));
  try {
    const { chromium } = await import('playwright-core');
    browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--allow-file-access-from-files'] });
  } catch (e) { log('Chrome yok, görseller üretilmeyecek:', e.message.split('\n')[0]); browser = false; }
  return browser;
}
const FONT_CSS = process.env.BK_FONT_FILE
  ? `@font-face{font-family:Archivo;src:url("${pathToFileURL(process.env.BK_FONT_FILE).href}") format("truetype");font-weight:100 900;font-stretch:62% 125%}`
  : '@import url("https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=block");';
function coverSrc(a, w, h) {
  if (!a.cover) return '';
  if (a.cover.charAt(0) === '/') return pathToFileURL(path.join(ROOT, a.cover)).href;
  return B.imgSrc(a.cover, w, h);
}
const BASE_CSS = `${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#F4F1E9;color:#17191C;font-family:Archivo,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.mark{display:flex;align-items:center;gap:12px;font-weight:800;font-stretch:125%;font-size:26px;letter-spacing:-.01em}
.mark i{width:16px;height:16px;border-radius:50%;background:#FF5B36}`;

function ogAppHTML(a) {
  const t = a.title, size = t.length <= 7 ? 168 : t.length <= 11 ? 132 : t.length <= 16 ? 100 : 78;
  const cover = coverSrc(a, 860, 1075);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
.l{position:absolute;left:64px;top:56px;bottom:56px;width:580px;display:flex;flex-direction:column}
.k{display:flex;gap:10px;align-items:center;margin-top:auto}
.k b{background:#17191C;color:#F4F1E9;font-weight:800;font-stretch:72%;font-size:24px;letter-spacing:.06em;border-radius:8px;padding:8px 12px}
.k span{background:#FF5B36;font-weight:800;font-stretch:72%;font-size:24px;letter-spacing:.06em;border-radius:8px;padding:8px 12px}
h1{font-weight:880;font-stretch:116%;font-size:${size}px;line-height:.95;letter-spacing:-.04em;margin-top:22px;white-space:nowrap;overflow:hidden;padding-bottom:.06em}
p{font-size:30px;line-height:1.25;color:#34373C;margin-top:20px;max-width:21ch}
.u{margin-top:auto;font-weight:750;font-size:24px;color:#34373C}
.u em{font-style:normal;color:#17191C;border-bottom:3px solid #FF5B36}
.r{position:absolute;right:58px;top:46px;width:430px;height:538px;border-radius:30px;overflow:hidden;background:#17191C;transform:rotate(2.5deg);box-shadow:0 40px 60px -30px rgba(23,25,28,.55)}
.r img{width:100%;height:100%;object-fit:cover}
.r .n{position:absolute;inset:0;display:grid;place-items:center;font-weight:900;font-stretch:62%;font-size:260px;color:#FF5B36}
.dot{position:absolute;right:-90px;bottom:-90px;width:300px;height:300px;border-radius:50%;border:44px solid #FF5B36;opacity:.95}
</style></head><body>
<div class="dot"></div>
<div class="l">
  <div class="mark"><i></i>Berkay Napıyor?</div>
  <div class="k">${a.testNumber ? `<b>SAHA TESTİ ${B.numLabel(a.testNumber)}</b>` : ''}<span>BAS, DENE</span></div>
  <h1 data-fit>${esc(t)}</h1>
  <p>${esc(a.tagline)}</p>
  <div class="u">berkay.instaassist.tr/<em>${esc(a.slug)}</em></div>
</div>
<div class="r">${cover ? `<img src="${esc(cover)}">` : `<div class="n">${B.numLabel(a.testNumber)}</div>`}</div>
</body></html>`;
}
function ogHomeHTML(list) {
  const shown = list.filter(a => !B.isSoon(a)).slice(0, 3);
  const cards = shown.map((a, i) => {
    const c = coverSrc(a, 640, 800);
    return `<div class="c c${i}">${c ? `<img src="${esc(c)}">` : `<div class="n">${B.numLabel(a.testNumber)}</div>`}<span>${B.numLabel(a.testNumber)}</span></div>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
.l{position:absolute;left:64px;top:56px;bottom:56px;width:640px;display:flex;flex-direction:column}
h1{font-weight:880;font-stretch:112%;font-size:92px;line-height:.95;letter-spacing:-.04em;margin-top:auto}
h1 span{display:block;white-space:nowrap;overflow:hidden;padding-bottom:.04em}
p{font-size:30px;line-height:1.25;color:#34373C;margin-top:22px}
.u{margin-top:34px;font-weight:750;font-size:24px;color:#34373C}
.u em{font-style:normal;color:#17191C;border-bottom:3px solid #FF5B36}
.c{position:absolute;width:300px;height:375px;border-radius:24px;overflow:hidden;background:#17191C;box-shadow:0 30px 50px -26px rgba(23,25,28,.6)}
.c img{width:100%;height:100%;object-fit:cover}
.c span{position:absolute;top:12px;left:12px;background:#F4F1E9;font-weight:800;font-stretch:72%;font-size:18px;letter-spacing:.05em;padding:4px 8px;border-radius:6px}
.c .n{position:absolute;inset:0;display:grid;place-items:center;font-weight:900;font-stretch:62%;font-size:150px;color:#FF5B36}
.c0{right:70px;top:110px;transform:rotate(4deg);z-index:3}
.c1{right:250px;top:150px;transform:rotate(-5deg);z-index:2}
.c2{right:400px;top:190px;transform:rotate(-12deg);z-index:1}
.dot{position:absolute;right:-110px;top:-110px;width:320px;height:320px;border-radius:50%;border:48px solid #FF5B36}
</style></head><body>
<div class="dot"></div>${cards}
<div class="l">
  <div class="mark"><i></i>Berkay Napıyor?</div>
  <h1 data-fit-all><span>Aklıma geleni</span><span>yapıp deniyorum.</span></h1>
  <p>Bas, aç, dene. Kayıt yok, ücret yok.</p>
  <div class="u">berkay.instaassist.tr · <em>@berkay.builds</em></div>
</div>
</body></html>`;
}
async function shot(html, outFile) {
  const br = await getBrowser();
  if (!br) return false;
  const page = await br.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  // Yerel kapak/yazı tipi dosyaları yüklenebilsin diye sayfa dosyadan açılır
  const tmp = path.join(os.tmpdir(), 'bk-og-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  try {
    await fs.writeFile(tmp, html);
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    // Başlık sığmıyorsa küçült
    await page.evaluate(() => {
      const fit = (el, box) => { let s = parseFloat(getComputedStyle(el).fontSize); while (box.scrollWidth > box.clientWidth + 1 && s > 36) { s -= 2; el.style.fontSize = s + 'px'; } };
      document.querySelectorAll('[data-fit]').forEach(el => fit(el, el));
      document.querySelectorAll('[data-fit-all]').forEach(el => el.querySelectorAll('span').forEach(sp => fit(el, sp)));
    });
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await page.screenshot({ path: outFile, type: 'jpeg', quality: 86 });
    return true;
  } catch (e) { log('görsel çizilemedi', outFile, e.message.split('\n')[0]); return false; }
  finally { await page.close(); fs.rm(tmp, { force: true }).catch(() => {}); }
}

/* ---------- Ana ekran ikonları ---------- */
// Repoda sadece SVG durur; PNG'ler her yayında buradan çizilir (Android/iPhone ana ekranı PNG ister).
const ICON_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wdth,wght@62..125,400..900&family=Big+Shoulders+Display:wght@700;900&family=Inter:wght@400;700;900&display=block" rel="stylesheet">';
async function renderPng(svg, size, outFile, transparent) {
  const br = await getBrowser();
  if (!br) return false;
  if (existsSync(outFile) && !process.env.BK_FORCE_ICONS) return true;
  const page = await br.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const tmp = path.join(os.tmpdir(), 'bk-ic-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  try {
    const sized = svg.replace(/<svg\b/, `<svg width="${size}" height="${size}"`);
    await fs.writeFile(tmp, `<!doctype html><html><head><meta charset="utf-8">${process.env.BK_ICON_FONT_CSS ? `<style>${process.env.BK_ICON_FONT_CSS}</style>` : ICON_FONTS}<style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${sized}</body></html>`);
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await page.screenshot({ path: outFile, type: 'png', omitBackground: !!transparent });
    return true;
  } catch (e) { log('ikon çizilemedi', outFile, e.message.split('\n')[0]); return false; }
  finally { await page.close(); fs.rm(tmp, { force: true }).catch(() => {}); }
}
function maskable(svg, scale) {
  // İçeriği güvenli alana küçült, kenarları ilk düz renkle doldur
  const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 512 512';
  const [, , w, h] = vb.split(/\s+/).map(Number);
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const defs = (inner.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
  const bg = (inner.replace(defs, '').match(/<rect[^>]*fill="(#[0-9a-fA-F]{3,8})"/) || [])[1] || '#17191C';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${defs}<rect width="${w}" height="${h}" fill="${bg}"/><g transform="translate(${w * (1 - scale) / 2} ${h * (1 - scale) / 2}) scale(${scale})">${inner.replace(defs, '')}</g></svg>`;
}
const HUB_ANY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#17191C"/><circle cx="32" cy="32" r="13" fill="#FF5B36"/></svg>';
const HUB_FULL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#17191C"/><circle cx="32" cy="32" r="11" fill="#FF5B36"/></svg>';
const iconJobs = [
  [HUB_ANY, 192, 'assets/icons/icon-192.png', true], [HUB_ANY, 512, 'assets/icons/icon-512.png', true],
  [HUB_FULL, 512, 'assets/icons/icon-maskable-512.png'], [HUB_FULL, 180, 'assets/icons/apple-touch-icon.png']
];
for (const d of await fs.readdir(path.join(ROOT, 'apps'), { withFileTypes: true })) {
  const svgFile = path.join(ROOT, 'apps', d.name, 'icon.svg');
  if (!d.isDirectory() || !existsSync(svgFile)) continue;
  const svg = await fs.readFile(svgFile, 'utf8');
  iconJobs.push([svg, 192, `apps/${d.name}/icon-192.png`], [svg, 512, `apps/${d.name}/icon-512.png`],
    [maskable(svg, 0.8), 512, `apps/${d.name}/icon-maskable-512.png`], [svg, 180, `apps/${d.name}/apple-touch-icon.png`]);
}
let made = 0;
for (const [svg, size, rel, transparent] of iconJobs) {
  await fs.mkdir(path.dirname(path.join(ROOT, rel)), { recursive: true });
  if (await renderPng(svg, size, path.join(ROOT, rel), transparent)) made++;
}
log('ikonlar hazır:', made + '/' + iconJobs.length);

/* ---------- Sayfalar ---------- */
const indexTpl = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
const detailTpl = await fs.readFile(path.join(ROOT, '404.html'), 'utf8');

// Ana sayfa
const f = B.pickFeatured(apps), parts = B.catalogParts(apps, f);
let grid = parts.live.map(a => B.cardHTML(a, stats)).join('') + parts.soon.map(a => B.cardHTML(a, stats)).join('') + (parts.next ? B.nextCard(parts.next) : '');
if (parts.showTools) grid = apps.filter(a => !B.isSoon(a)).map(a => B.cardHTML(a, stats)).join('');
let index = indexTpl
  .replace('<!--bk:featured-->', f ? B.featuredHTML(f, stats) : '')
  .replace('<!--bk:grid-->', grid)
  .replace('<span id="catName">Tüm uygulamalar</span>', `<span id="catName">${parts.live.length || parts.showTools ? 'Tüm uygulamalar' : 'Sıradakiler'}</span>`)
  .replace('<!--bk:data-->', dataTag());
if (parts.showTools) index = index.replace('<div class="tools" id="tools" hidden>', '<div class="tools" id="tools">');
if (await shot(ogHomeHTML(apps), path.join(ROOT, 'assets/og/home.jpg'))) log('ana sayfa görseli çizildi');
await fs.writeFile(path.join(ROOT, 'index.html'), index);

// Uygulama sayfaları
const pages = [];
for (const a of apps) {
  if (B.isSoon(a)) continue;
  const dir = path.join(ROOT, a.slug);
  const own = path.join(ROOT, 'assets/apps', a.slug, 'og.jpg');
  let og = '';
  if (existsSync(own)) og = `/assets/apps/${a.slug}/og.jpg`;
  else if (await shot(ogAppHTML(a), path.join(ROOT, 'assets/og', a.slug + '.jpg'))) og = `/assets/og/${a.slug}.jpg`;
  const ogUrl = og ? SITE + og : (a.cover ? B.absUrl(B.imgSrc(a.cover, 1200, 630)) : SITE + '/assets/og/home.jpg');
  const url = `${SITE}/${a.slug}/`;
  const title = `${a.title} — Berkay Napıyor?`;
  const desc = a.tagline || a.description.slice(0, 150);
  const ld = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: a.title, description: desc, url,
    applicationCategory: 'EntertainmentApplication', operatingSystem: 'Web, iOS, Android', image: ogUrl,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' }, author: { '@type': 'Person', name: 'Berkay Dilek', url: B.IG } };
  if (a.date) ld.datePublished = a.date.slice(0, 10);
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta name="bk-slug" content="${esc(a.slug)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:site_name" content="Berkay Napıyor?">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${esc(a.title)}${a.testNumber ? ' · Saha Testi ' + B.numLabel(a.testNumber) : ''}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(ogUrl)}">`,
    og ? `<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">` : '',
    `<meta property="og:locale" content="tr_TR">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`
  ].filter(Boolean).join('\n');
  const html = detailTpl
    .replace(/<!--bk:head-->[\s\S]*?<!--\/bk:head-->/, head)
    .replace(/<!--bk:detail-->[\s\S]*?<!--\/bk:detail-->/, B.detailHTML(a, stats))
    .replace('<!--bk:data-->', dataTag());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), html);
  pages.push(url);
  log('sayfa:', '/' + a.slug + '/', og ? '(görsel: ' + og + ')' : '(kapak görseli)');
}
if (browser) await browser.close();

// Arama motorları için
const today = new Date().toISOString().slice(0, 10);
await fs.writeFile(path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [SITE + '/', ...pages].map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');
await fs.writeFile(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
log('bitti:', pages.length, 'uygulama sayfası');
