# Elektrik Pano Tasarım — Bemis BH6-6000-0000

**Bemis BH6-6000-0000** (V12, IP66, `245 × 325 × 138 mm`) elektrik panosu için milimetre ölçekli 2D/3D çakışma kontrollü pano yerleşim, yan duvar delik delme şablonu ve malzeme listesi (BOM) tasarım uygulaması.

## Ön Yüklü Pano Yerleşimi

* **Pano Gövdesi:** Bemis `BH6-6000-0000` (`245 × 325 × 138 mm`, IP66, Halojen Free ABS)
* **Üst DIN Rayı (12 Modül / 216 mm):**
  * 2× `1–1,6A` Motor Koruma Şalteri (MKŞ) — `45 mm`
  * 3× `14 Pin` Mini Röle + Soket — `27 mm` *(düzenlenebilir, PYF14A için 29,5 mm)*
  * 6× `5 mm` Ray Klemensi (`2,5 mm²`)
* **Alt DIN Rayı (Ek 35 mm Ray / 216 mm):**
  * 4× Mini Kontaktör — `45 mm`
  * 1× `2,5 mm²` Toprak / Giriş Klemensi + 5× `5 mm` Ray Klemensi
* **Sol & Sağ Yan Duvarlar:**
  * 2× **Mutlusan SW-BL4252** (`010 104 000081`) Ø22 mm Yukarı-Aşağı Ters Yönlü İkiz Buton (`1NO+1NO`)

## Özellikler

* **Çok Açılı CAD Görünüşü:** Ön İç Yerleşim, Sol Yan / Sağ Yan Delme Şablonu (`Y`, `Z` mm koordinatları) ve Üstten Derinlik Kesiti
* **Canlı 3D Çakışma Kontrolü:** Yan duvar butonlarının pano içi derinliği (`54 mm` + `10 mm` kablo payı) ile DIN rayı elemanlarının çakışma ve sığma analizi
* **Etkileşimli Düzenleme:** Yan butonları çizim üzerinde sürükleme, ray sıralaması, ölçü/model düzenleme, katalogdan yeni eleman ekleme
* **Dışa Aktarım:** Gruplanmış Malzeme Listesi (**CSV**), proje **JSON** kaydet/yükle ve **Yazdır / PDF**

## Kurulum ve Çalıştırma

```bash
npm install
npm run dev
npm run build
```
