# Elektrik Pano Tasarım

Elektrik panosu yerleşimi (DIN rayı düzeni), eleman seçimi, yük/akım hesaplamaları ve malzeme listesi (BOM) oluşturmak için web tabanlı tasarım uygulaması.

## Teknolojiler

* **React** + **TypeScript**
* **Vite**

## Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Üretim (production) derlemesi al
npm run build
```

## Planlanan Özellikler

* [ ] DIN rayı ve pano kasası düzenleyici (sürükle-bırak)
* [ ] Pano eleman kütüphanesi (MCB sigorta, RCD kaçak akım, kontaktör, röle, klemens, güç kaynağı)
* [ ] Toplam güç, akım ve kablo kesiti hesaplamaları
* [ ] Otomatik malzeme listesi (BOM) ve PDF / CSV dışa aktarım
* [ ] Projeyi JSON olarak kaydetme ve tekrar yükleme

## Git Günlük Kullanım Özeti

```bash
git status                 # Değişen dosyaları gör
git add .                  # Değişiklikleri hazırla
git commit -m "açıklama"   # Yerelde kaydet
git push                   # GitHub'a gönder
```
