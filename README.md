# Berkay'ın App Store'u

berkay.instaassist.tr — Berkay Dilek'in (@berkay.builds) yapıp sahada test ettiği uygulamalar.

- Katalog içeriği Wix CMS'teki **Uygulamalar** koleksiyonundan okunur (site: "Berkay Yapıyor").
- Bu depo sayfaları, uygulama dosyalarını ve yayın betiğini barındırır (GitHub Pages, `.github/workflows/pages.yml`).

## Yeni uygulama ekleme

1. Wix panelinde CMS → Uygulamalar'a yeni satır ekle: ad, kısa ad (slug), tek cümlelik açıklama, kategori, durum (Canlı / Beta / Yakında), TEST numarası, uygulama linki, kapak, ekran görüntüleri, yayın tarihi, öne çıkarma sırası.
   - **Kullanım videosu** → `demoVideoUrl` (YouTube/Shorts linki ya da .mp4)
   - **Saha Testi Reels'i** → `instagramUrl` (instagram.com/reel/… linki)
   - Durum **Yakında** olan satır, katalogda "Takip et, ilk sen dene" kartı olarak görünür.
2. Uygulama bu sitede duracaksa dosyalarını `apps/<klasor>/` altına koy, linke `/apps/<klasor>/index.html` yaz ve sayfaya şunu ekle
   (ana ekrana ekleme + isimsiz sayaç):
   `<script src="/assets/bk-app.js" data-app="<slug>" data-name="<Uygulama adı>" data-sw="sw.js" defer></script>`
   Örnek: `apps/acaba/` (manifest.json, ikonlar, sw.js).
3. Uygulama hemen `berkay.instaassist.tr/<slug>` adresinde açılır. Paylaşım görseli ve önizleme en geç 1 saat içinde
   (her saat başı yayın) ya da Actions → "Siteyi yayinla" → Run workflow ile hemen hazır olur.

## Nasıl çalışıyor

- `scripts/build.mjs` her yayında CMS'i okur: ana sayfayı önceden çizer, her uygulamaya `/<slug>/index.html` üretir
  (kendi başlığı, açıklaması, 1200×630 paylaşım görseli), `sitemap.xml` ve `robots.txt` yazar. Denemek için: `node scripts/build.mjs --offline`
- `404.html` uygulama sayfası şablonudur; henüz üretilmemiş bir kısa ad da bu sayfada çizilir. Eski `app.html?a=` linkleri kısa adrese yönlenir.
- `assets/site.js` veri + çizim kodu (tarayıcı ve derleme aynı kodu kullanır), `assets/bk-app.js` uygulamaların "İndir" penceresi ve sayacı.
- Sayaç: `worker/sayac.js` (Cloudflare Worker `bk-sayac` + D1 `bk-sayac`). Sadece "hangi uygulama, ne oldu, hangi gün" sayılır; IP, çerez, kişisel veri yok.
  "X kişi denedi" rozeti 10 kişiden sonra görünür (`MIN_TRIED`).
- Siteye giren: cihaz başına bir kez sayılır (uygulama sayfalarına doğrudan gelenler dahil). 10.000'i geçince ana sayfada
  "X kişi girdi" olarak kendiliğinden görünür (`PUBLIC_MIN`, `assets/site.js`). O zamana kadar rakamlar sadece panelde.
- Panel: `/panel-bffoj4j2/` (listede yok, arama motorlarına kapalı). Paneli açan cihazın girişleri sayılmaz.
