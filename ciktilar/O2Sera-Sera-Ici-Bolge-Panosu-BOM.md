# O2Sera — Sera İçi Bölge Panosu Teknik Şartname & Malzeme Listesi (BOM)

**Proje:** O2Sera Sera İçi Bölge (Sektör) Güç ve Kumanda Panosu  
**Sistem Gerilimi:** 3~ 400V / 230V AC, 50 Hz (TN-S)  
**Tasarım Kapasitesi:** 36× Havalandırma Motoru (18× O2Sera İkili Motor Panosu) + 2× Perde Motoru + 36× Sirkülasyon Fanı (2×18 Kademeli) + 80A Isıtma Hattı + 63A Kaçak Akımlı Kombinasyon Prizi  
**Tarih:** 28.11.2026

---

## 1. Ana Güç Dağıtım Mimarisi

1. **Ana Giriş Klemensleri (`X0`):**
   - `3× 50 mm²` Yüksek Akım Geçiş Klemensi (`L1`, `L2`, `L3` — 150A sınıfı)
   - `1× 35 mm²` Nötr Klemensi (`N` — Mavi)
   - `1× 50 mm²` Toprak Klemensi (`PE` — Sarı-Yeşil)
2. **Ana Kesme ve Dağıtım:**
   - `Q0`: `160A 3P` Ana Yük Ayırıcı / Şalter (bakım ve acil enerji kesme)
   - `DB1`: `4×160A` 4 Kutuplu Şeffaf Kapaklı Dağıtım Bloğu (`L1, L2, L3, N`)
3. **Çıkış Devreleri:**
   - **Isıtma (`Q1`):** `80A 3P` Otomat (Yüksek akım MCB / kompakt koruma) → Isıtma ünitesi / sıcak su pompa ve fan grubu beslemesi.
   - **Havalandırma + Perde Ortak (`Q2`):** `63A 3P` Otomat → Bölgedeki 36 adet havalandırma motoru (18× O2Sera ikili motor panosu) ve 2 adet perde motorunun ortak 3 faz güç dağıtımı.
   - **Sirkülasyon Fanları (`Q3`, `KM-F1`, `KM-F2`, `KT1`):** `63A 3P` Ana Otomat → 36 fan **2 eşit gruba (18 + 18)** bölünerek `KM-F1` (`40A 3P` kontaktör) ve `KM-F2` (`40A 3P` kontaktör) ile sürülür. `KT1` (3 sn gecikme zaman rölesi) sayesinde 2. grup fanlar 3 saniye sonra devreye girerek kalkış (demeraj) akımı yarıya düşürülür.
   - **Kombinasyon Prizi (`QF1`, `Q4`, `Q5`):** `63A 4P (3P+N) 30 mA` Kaçak Akım Koruma Şalteri → arkasında kısa devre/aşırı akım koruması için `Q4 (32A 3P)` CEE 3P+N+PE priz otomatı ve `Q5 (16A 1P)` 230V Schuko priz otomatı.
4. **Kumanda & Koruma Katı:**
   - `F1`: `10A 1P` C-tipi Kumanda Sigortası
   - `FK1`: 3 Faz + Nötr Faz/Gerilim Koruma Rölesi (faz kopması, ters faz ve düşük/yüksek gerilimde kumanda fazını keser)

---

## 2. O2Sera İkili Motor Panosu ile Sektör Kumanda Uyumu

Bu bölge panosunun **Havalandırma Sektör Kumanda Çıkışı (`X-HAV: D1–D5`)**, [O2Sera-Ikili-Motor-Baglanti-Diyagrami.pdf](file:///home/yakup/Gemini-Projeler/Elektrik-Pano-Tasarim/ciktilar/O2Sera-Ikili-Motor-Baglanti-Diyagrami.pdf) ile **birebir uyumludur**:

| Klemens | Damar | İşlev | Saha Motor Panosu Karşılığı |
| :--- | :--- | :--- | :--- |
| `D1` | Mor | Havalandırma 1 Kapat (`M1 ↓`) | `X6 → R1:32 (NC)` |
| `D2` | İndigo | Havalandırma 1 Aç (`M1 ↑`) | `X7 → R1:42 (NC)` |
| `D3` | Teal | Havalandırma 2 Kapat (`M2 ↓`) | `X8 → R1:12 (NC)` |
| `D4` | Turkuaz | Havalandırma 2 Aç (`M2 ↑`) | `X9 → R1:22 (NC)` |
| `D5` | Macenta | Saha Yerel Buton İzni (`230V = Yerel`) | `X10 → R1:A1 (Bobin)` |

- **Perde Kumanda Çıkışı (`X-PER: P1–P3`):** `P1` Topla (`▼`), `P2` Ser (`▲`), `P3` Saha Yerel İzin.
- **Fan Kumanda (`S-FAN`):** `OTO` (merkez otomasyon komutu) / `0` (kapalı) / `AÇ` (bölge manuel) → `KM-F1` (18 Fan) anında, `KM-F2` (18 Fan) 3 sn sonra devreye girer.

---

## 3. Malzeme Listesi (BOM — ABB Şalt Referanslı)

| Kod | Adet | Malzeme / Tanım | Teknik Özellik / Referans |
| :--- | :---: | :--- | :--- |
| `X0-L` | 3 | 50 mm² Faz Giriş Klemensi | 150A, DIN ray / vidalı güç klemensi (Gri/Kahve/Siyah) |
| `X0-N` | 1 | 35 mm² Nötr Giriş Klemensi | 125A, Mavi yüksek akım klemensi |
| `X0-PE` | 1 | 50 mm² Toprak Giriş Klemensi | Sarı-Yeşil PE geçiş klemensi |
| `Q0` | 1 | 160A 3P Ana Yük Ayırıcı | ABB OT160G03 veya 160A TMŞ *(opsiyonel)* |
| `DB1` | 1 | 4×160A Dağıtım Bloğu | 4 kutuplu (L1-L2-L3-N), şeffaf kapaklı |
| `Q1` | 1 | 80A 3P Isıtma Otomatı | ABB S803S-C80 (80A 3P, 50 kA) |
| `Q2` | 1 | 63A 3P Havalandırma + Perde Otomatı | ABB S203-C63 (63A 3P) |
| `Q3` | 1 | 63A 3P Fan Ana Otomatı | ABB S203-C63 (63A 3P) |
| `QF1` | 1 | 63A 4P (3P+N) 30mA Kaçak Akım | ABB FH204 AC-63/0.03 (Kombinasyon prizi koruması) |
| `Q4` | 1 | 32A 3P CEE Priz Otomatı | ABB S203-C32 (3P+N+PE 32A CEE priz için) |
| `Q5` | 1 | 16A 1P Schuko Priz Otomatı | ABB S201-C16 (2× 230V Schuko priz için) |
| `F1` | 1 | 10A 1P Kumanda Sigortası | ABB S201-C10 |
| `FK1` | 1 | 3 Faz Koruma Rölesi | ABB CM-PFS.S / Entes GKM-02 (3~ 400V, 1 C/O) |
| `KM-F1` | 1 | 40A 3P Fan Grup 1 Kontaktörü | ABB AF38-30-00-13 (230V AC bobin, 18 Fan) |
| `KM-F2` | 1 | 40A 3P Fan Grup 2 Kontaktörü | ABB AF38-30-00-13 (230V AC bobin, 18 Fan) |
| `KT1` | 1 | Çekmede Gecikmeli Zaman Rölesi | ABB CT-ERD.12 (0–30 sn, 3 sn kademe ayarı) |
| `S-MOD` | 1 | 3 Konumlu Seçici Şalter (OTO-0-EL) | 22 mm, 2NO (Bölge Otomatik / Manuel seçimi) |
| `S-HAV1/2` | 2 | 3 Konumlu Seçici (AÇ-0-KAPAT) | 22 mm, 2NO (Havalandırma Grup 1 & 2) |
| `S-PER` | 1 | 3 Konumlu Seçici (SER-0-TOPLA) | 22 mm, 2NO (Perde Grup) |
| `S-FAN` | 1 | 3 Konumlu Seçici (OTO-0-AÇ) | 22 mm, 2NO (36 Fan 2×18 kontrol) |
| `S-SAHA` | 1 | 2 Konumlu Seçici (Saha Yerel İzni) | 22 mm, 1NO (Saha motor kutusu D5=230V izni) |
| `KP1` | 1 | Kombinasyon Priz Kutusu (IP54/65) | 1× 32A 3P+N+PE CEE + 2× 16A 230V Schuko |
| `N/PE` | 2 | Alt Nötr & Toprak Pirinç Baraları | 125A N-BARA (35 mm² girişli) + PE-BARA (50 mm² girişli) |
| `X-SAHA` | 1 set | Çıkış & Kumanda Ray Klemensleri | 16/25 mm² güç + 2,5 mm² kumanda klemens dizisi |

> **Mühendislik Notu (Önerilen Pano Boyutu):** 160A giriş klemensleri (`50 mm²` bükülme yarıçapı), 4×160A dağıtım bloğu, 80A/63A şalterler, 2× 40A kontaktör ve alt baralar için minimum **600 × 800 × 250 mm IP65** polyester veya elektrostatik boyalı sac duvar tipi pano önerilir.
