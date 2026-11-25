# Elektrik Pano Tasarım — Bemis BH6-6000-0000

**Bemis BH6-6000-0000** (V12, IP66, `245 × 325 × 138 mm`) elektrik panosu için milimetre ölçekli 2D/3D çakışma kontrollü pano yerleşim, delik delme şablonu, **manuel kumanda şeması çizim editörü** ve malzeme listesi (BOM) uygulaması.

## Ön Yüklü Pano Yerleşimi

* **Pano Gövdesi:** Bemis `BH6-6000-0000` (`245 × 325 × 138 mm`, IP66, Halojen Free ABS — dahili ayrı **Nötr (N)** ve **Toprak (PE)** klemens baralı)
* **Üst DIN Rayı (12 Modül / 216 mm):**
  * 2× `1–1,6A` Motor Koruma Şalteri (MKŞ) — `45 mm`
  * 1× `14 Pin` Mini Röle + Soket — `27 mm` *(PYF14A için 29,5 mm olarak ayarlanabilir)*
  * 3× `2,5 mm²` Ray Klemensi (`5 mm` kalınlık)
* **Alt DIN Rayı (Ek 35 mm Ray / 226 mm):**
  * 4× Mini Kontaktör — `45 mm`
  * 9× `2,5 mm²` Ray Klemensi (`5 mm` kalınlık)
* **Sol & Sağ Yan Duvarlar:**
  * 2× **Mutlusan SW-BL4252** (`010 104 000081`) Ø22 mm Yukarı-Aşağı Ters Yönlü İkiz Buton (`1NO+1NO`)
* **Alt Duvar:**
  * 1× **Ortaç ODB-42** PG 36 Geçmeli Tip Polyamid Spiral Rakoru (`Ø47,5 mm` panç deliği, `36×42,5 mm` spiral)

## Özellikler

* **Pano Yerleşimi (CAD):** Ön İç Yerleşim, Sol/Sağ Yan ve Alt Duvar delme şablonları (`X`, `Y`, `Z` koordinatları) ve canlı 3D çakışma kontrolü
* **Manuel Kumanda Şeması:** Tüm pano elemanlarının gerçek terminal uçlarıyla (`Q1/Q2`, `R1–R3` 14 pin, `KM1–KM4`, `S1/S2`, `X1–X12`, dahili `N/PE` baraları, `M1/M2`) elle kablo çekme, 90° dik açı modu, renk/kesit/etiket seçimi, sürükle-bırak yerleşim, **SVG** ve **Kablo Listesi CSV** dışa aktarımı
* **Malzeme Listesi (BOM):** Gruplanmış CSV, tam proje JSON kaydet/yükle (`localStorage` otomatik kayıtlı) ve Yazdır/PDF

## Kurulum ve Çalıştırma

```bash
npm install
npm run dev
npm run build
```
