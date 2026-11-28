# O2Sera — Bemis BD1-6130-2020 (V5) Kombinasyon Priz Kutusu Tasarımı & BOM

**Proje:** O2Sera Sera İçi Kombinasyon Priz Kutusu *(İç bağlantısı saha/atölye montajlı)*  
**Kutu Modeli:** Bemis **BD1-6130-2020** (V5 Serisi — ABS, **IP66**)  
**Kutu Ölçüleri:** `120 × 255 × 122 mm` (G × Y × D), **5 Modül** şeffaf sigorta penceresi (`BAK-3000-1000`)  
**Üst Koruma (Bölge Panosu):** `QF1 — 63A 4P (3P+N) 30 mA` Kaçak Akım Koruma Şalteri  
**Tarih:** 28.11.2026

---

## 1. 5 Modül DIN Ray Dizilimi

| Modül | Kod | Eleman | Görev / Beslenen Priz | İç Kablo Kesiti |
| :---: | :--- | :--- | :--- | :---: |
| 1–3 | `Q1` | `ABB S203-C25` (**3P 25A** Otomat) | **P1 — Ön Yüz:** `1× 5/32A 380V` (3P+N+PE, 6h, IP67) | `4 mm²` H07V-K (`L1, L2, L3`) |
| 4 | `Q2` | `ABB S201-C16` (**1P 16A** Otomat) | **P2 (Sol Yan) + P3 (Sağ Yan):** `2× 16A 220V` (IP68) ortak | `2,5 mm²` H07V-K (`L1`) |
| 5 | `XN` | **3× `2,5 mm²` Mavi Ray Klemensi** *(köprülü)* | Nötr dağıtım bloğu (`N Giriş`, `P1:N`, `P2:N`, `P3:N`) | `2,5 mm²` *(Mavi)* |
| Alt | `PE-BARA` | Topraklama Pirinç Barası / PE Klemensi | Toprak dağıtımı (`PE Giriş`, `P1:PE`, `P2:PE`, `P3:PE`) | `4 / 2,5 mm²` *(Sr-Yşl)* |

> **Mühendislik Notu:** 5. modül genişliği (`17,5 mm`) içine 3 adet `5,2 mm` eninde **`2,5 mm²` mavi ray klemensi** (`15,6 mm`) köprü tarağıyla tam sığar. Ön 32A CEE prizde yüksek tek fazlı (dengesiz) nötr akımı çekilecekse giriş nötrü ile `P1:N` bağlantısının `4 mm²` klemens/çift yüksük üzerinden geçirilmesi önerilir.

---

## 2. Malzeme Listesi (BOM)

| Kod | Adet | Malzeme | Özellik / Referans |
| :--- | :---: | :--- | :--- |
| `KP1` | 1 | **Bemis BD1-6130-2020** V5 Kombinasyon Kutusu | IP66 ABS (`120×255×122 mm`), `1× 5/32A IP67` ön + `2× 1/16A IP68` yan prizler + 5M şeffaf kapak |
| `Q1` | 1 | **`3P 25A`** C-Tipi Otomat | ABB `S203-C25` (3 modül) |
| `Q2` | 1 | **`1P 16A`** C-Tipi Otomat | ABB `S201-C16` (1 modül) |
| `XN` | 3 | **`2,5 mm²` Mavi DIN Ray Klemensi** + 3'lü Köprü + Son Kapak | Mavi Nötr geçiş klemensi (3× 5,2 mm = 15,6 mm → 1 modüle tam oturur) |
| `PE-BARA` | 1 | Toprak Pirinç Klemens Barası (Yeşil izolatörlü) | 4–5'li PE dağıtım barası (veya 2× PE ray klemensi) |
| `RK1` | 1–2 | PG 21 veya M32 IP68 Kablo Rakoru + Kontra Somun | Alttan su sızdırmaz giriş (`5×4` veya `5×6 mm²`) |
| `KBL` | 1 set | `4 mm²` (Q1/CEE) & `2,5 mm²` (Q2/Schuko/N) H07V-K NYAF + Yüksükler | `Q1:1 → Q2:1` üst faz köprüsü ve `Q2:2 → P2 & P3` için ikiz yüksük |

---

## 3. Hızlı Montaj Adımları
1. **Rakor:** Sadece kutunun **alt yüzeyinden** PG21/M32 rakor açın (sera içi nem/yoğuşma güvenliği).
2. **Üst Besleme:** Gelen `L1-L2-L3` fazlarını `Q1` üstüne (`1-3-5`) girin; `Q1:1 (L1)` ucundan ikiz yüksükle `Q2:1` üstüne köprü atın.
3. **Priz Fazları:** `Q1` alt (`2-4-6`) → `P1` (Ön CEE `L1-L2-L3`); `Q2` alt (`2`) → ikiz yüksükle `P2 (Sol L)` ve `P3 (Sağ L)`.
4. **Nötr (`XN`) & Toprak (`PE`):** Gelen `N` → `XN1` (köprülü `2,5 mm²` mavi klemens) → `P1:N`, `P2:N`, `P3:N`; Gelen `PE` → `PE-BARA` → `P1:PE`, `P2:PE`, `P3:PE`.
5. **Test:** Bölge Panosundaki `QF1 (63A 4P 30mA)` **Test (T)** butonu ile kaçak akım açma testini doğrulayın.
