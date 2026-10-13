# Berkay'ın App Store'u

berkay.instaassist.tr — Berkay Dilek'in (@berkay.builds) yapıp sahada test ettiği uygulamalar.

- Katalog içeriği Wix CMS'teki **Uygulamalar** koleksiyonundan okunur (site: "Berkay Yapıyor").
- Bu depo yalnızca sayfaları ve uygulama dosyalarını barındırır (GitHub Pages).

## Yeni uygulama ekleme

1. Wix panelinde CMS → Uygulamalar'a yeni satır ekle: ad, slug, tek cümlelik açıklama, kategori, durum (Canlı / Beta / Yakında), TEST numarası, uygulama linki, kapak, ekran görüntüleri, demo videosu, Instagram gönderisi, yayın tarihi, öne çıkarma sırası.
2. Uygulama başka bir adresteyse linke o adresi (`https://…`) yaz.
3. Uygulama bu sitede duracaksa dosyalarını `apps/<klasor>/` altına koy, linke `/apps/<klasor>/index.html` yaz.
4. Katalog en geç 5 dakika içinde güncellenir; detay sayfası `app.html?a=<slug>` adresinde kendiliğinden oluşur.
