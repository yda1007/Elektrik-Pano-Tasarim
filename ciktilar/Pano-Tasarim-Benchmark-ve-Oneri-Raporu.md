# Elektrik Pano Tasarım Aracı — Web Benchmark ve İyileştirme Raporu

**Tarih:** 25.11.2026  
**Proje:** `/home/yakup/Gemini-Projeler/Elektrik-Pano-Tasarim`  
**Amaç:** Mevcut pano tasarım aracımızı sektördeki önde gelen web/masaüstü elektrik pano CAD yazılımlarıyla karşılaştırmak ve en yüksek faydayı sağlayacak iyileştirme yol haritasını belirlemek.

---

## 1. İncelenen Sektör Örnekleri ve Web Araçları

| Araç / Platform | Tür | Öne Çıkan Güçlü Özellikler | Bizim Araca Taşınabilir Fikirler |
| :--- | :--- | :--- | :--- |
| **EPLAN Pro Panel** | Endüstriyel 3D ECAD | 3D dijital ikiz, çakışma kontrolü, kablo kanalı/demet doluluğu, tahmini kablo boyu, klemens bağlantı planı, CNC delme çıktısı | Kablo boyu tahmini, klemens bağlantı planı, kablo kanalı/rakor doluluğu |
| **Capital Electra X (Siemens)** | Tarayıcı tabanlı ECAD | Şema ↔ Pano çift yönlü senkronizasyon, hazır devre makroları (prefab circuits), başlık anteti (title block), sürüm/proje yönetimi | Hazır devre blokları (yön değiştirmeli motor vb.), çoklu proje + antet, şema-pano senkronu |
| **SkyCAD Electrical** | Modüler ECAD | Nesne tabanlı katalog, akıllı klemens bloğu (iç pano ↔ saha kablosu + köprü/jumper), tek tıkla tam proje PDF derleme | Klemens iç/dış bağlantı tablosu, özel parça kataloğu |
| **WAGO Smart Designer** | Web DIN rayı yapılandırıcı | Kurulumsuz web arayüzü, sürükle-bırak DIN rayı dizilimi, otomatik aksesuar (son kapak, durdurucu), etiket baskı | Sürükle-bırak ray dizilimi, otomatik ray aksesuarı ve tutarlılık kontrolü |
| **Phoenix Contact PROJECT complete** | DIN rayı & markalama | Akıllı aksesuar seçimi, klemens ve kablo yüksük markalama şablonu üretimi | Yazdırılabilir yüksük/klemens etiket şeridi çıktısı |
| **Weidmüller Configurator (WMC)** | Web + Masaüstü | **Assembly Assist (Montaj Asistanı):** Sahada adım adım görsel montaj/kablolama rehberi; tek tıkla ray optimizasyonu | Tablet/telefon uyumlu adım adım kablolama & montaj tik listesi |
| **Siemens SIMARIS therm / Rittal RiTherm** | IEC 61439 / IEC 60890 Isıl Hesap | Kapalı panolarda (ABS/sac) eleman güç kaybı (W) toplamına göre iç sıcaklık artışı ($\Delta T$) ve soğutma uyarısı | IP66 ABS kutularda (özellikle sıcak sera ortamında 40–45°C!) ısıl uyarı hesabı |
| **Electro Planner / `din-rail-planner` / `electrical-panel-label`** | Web / Açık Kaynak | 18 mm modül ızgarası, yük/koruma kontrolü, yazdırılabilir pano kapak/sigorta şerit etiketi | 18 mm modül göstergesi, yazdırılabilir kapak/sigorta etiketi |

---

## 2. Mevcut Aracımızın Konumu (Güçlü Yönler vs. Boşluklar)

### Zaten Çok Güçlü Olduğumuz Alanlar
- **Gerçek mm ölçekli 2D CAD + 3D AABB çakışma motoru** (`src/utils/geometry.ts`): Ray elemanları, yan butonlar, rakorlar ve taban baraları arasında 3 eksende (`X, Y, Z`) çakışma ve kablo bükülme payı kontrolü.
- **Ön İç + Sol/Sağ/Alt Duvar Delme Şablonları** (`src/components/PanelCanvas.tsx`).
- **2 Sayfalık Temiz Şema (Güç + Kumanda) ve 10 px A* Otorouter** (`src/utils/schematicRouter.ts`, `src/utils/twoPageSchematic.ts`): Barycenter sıralama, Left-Edge çakışmasız kanallar, EPLAN köprü yayları, 20 sabit kablo rengi.
- **Resmi ODA AutoCAD 2013 DWG + Katmanlı DXF + Çok Sayfalı PDF Üretici** (`scripts/generate_pdf_and_dxf.py`, `scripts/convert_dxf_to_dwg_oda.sh`).

### Kritik Eksikler (Sektör Standartlarına Göre)
1. **Tek Pano Sabitlemesi:** Uygulama şu an yalnızca `Bemis BH6-6000-0000` (245×325×138 mm) ve sabit 2 DIN rayına kilitli (`App.tsx`). Farklı pano gövdeleri (Bemis V18/V24, sac panolar, özel ölçü) ve 1–4 arası DIN rayı + kablo kanalı eklenemiyor.
2. **Proje / Şablon Yönetimi Yok:** Birden fazla proje kaydedip aralarında geçiş yapılamıyor; hazır şablon seçici ve proje anteti (proje adı, müşteri, revizyon, tarih) bulunmuyor.
3. **CAD Etkileşim Eksikleri:** Geri Al / Yinele (`Ctrl+Z` / `Ctrl+Y`), ray üzerinde sürükle-bırak ile eleman sıralama ve kopyala-yapıştır yok.
4. **Saha Mühendislik Hesapları Eksik:**
   - Dış kablo listesi ve **rakor / spiral boru doluluk oranı (%)** hesabı arayüzde yok.
   - Kapalı IP66 ABS panolarda kritik olan **ısıl kayıp / sıcaklık artışı ($\Delta T$)** hesabı yok.
   - Ray dışı aksesuarlar (mekanik kilit VM4, köprü tarağı, son kapak, ek DIN rayı) dinamik BOM'a eklenemiyor (CSV çıktısında `DIN-2 226 mm` sabit kodlanmış).
5. **Klemens Bağlantı Planı & Üretim Etiketleri Yok:** Pano montajcısının sahada en çok kullandığı *Klemens Tablosu (İç ↔ Saha)*, *Kablo Kesim / Yüksük Listesi*, *Pano Kapak Etiketi* ve *1:1 Gerçek Ölçekli A4 Delme Şablonu* henüz yok.
6. **Şema ↔ Pano Senkronizasyonu Kısmi:** Yeni tip elemanlar/panolar eklendiğinde şema pin haritası ve hazır devre makroları dinamik olarak beslenmeli.
7. **Dışa Aktarım Akışı:** PDF / DXF / DWG üretimi şu an terminalden Python/ODA scriptiyle çalışıyor; web arayüzünden doğrudan tek tıkla indirilebilir (en azından istemci içi DXF/SVG/1:1 PDF + yerel geliştirme modunda tek tıkla tam paket) değil.

---

## 3. Önerilen 4 Fazlı İyileştirme Yol Haritası

### Faz 1 — Temel Mimari & Kullanılabilirlik (En Yüksek Öncelik)
- **Pano Gövdesi & Şablon (Preset) Kütüphanesi:**
  - Hazır kutular: Bemis `BH6-6000` (V12), Bemis V18 / V24, standart sac panolar (`300×400×200`, `400×500×200`, `500×700×250` mm) + kullanıcı tanımlı özel `G×Y×D` ölçüsü.
  - Hazır proje şablonları: *Bemis İkili Motor + Röle*, *Tekli Yön Değiştirmeli Redüktör (ABB)*, *Sera İklimlendirme Kontrol Panosu*, *Boş Pano*.
  - Dinamik DIN rayı (1–4 ray ekle/sil) + yatay/dikey **kablo kanalı (wiring duct)** elemanları.
- **Çoklu Proje & Antet (Title Block):** Proje listesi (kaydet, kopyala, sil, geçiş yap), proje adı/müşteri/revizyon/çizen alanları (dosya adlarına ve PDF/DXF antetine otomatik yansır).
- **CAD Konforu:** `Ctrl+Z` / `Ctrl+Y` (Undo/Redo geçmişi), DIN rayı üzerinde doğrudan sürükle-bırak sıralama, klavye ile silme/çoğaltma.

### Faz 2 — Mühendislik Kontrolleri & Akıllı Katalog
- **Kablo Giriş & Rakor Doluluk Hesabı:** Pano bazlı dış kablo listesi (ör. `4×2,5`, `5×1`, `6×1 LiYCY` vb.) → seçili PG/Metrik rakorun iç çapına göre gerçek alan doluluğu (`%`), yeşil/sarı/kırmızı uyarı ve uygun rakor boyu önerisi.
- **IEC 60890 Basitleştirilmiş Isıl Hesap:** Katalog elemanlarında güç kaybı (`W`) alanı + ortam sıcaklığı girişi (örn. sera içi `40°C`) → pano yüzey alanı ve malzeme (ABS vs. Sac) katsayısıyla iç sıcaklık tahmini ($\Delta T$) ve havalandırma/fan uyarısı.
- **Zenginleştirilmiş Gerçek Marka Kataloğu & Ray Dışı Aksesuarlar:** ABB (`MS132`, `AF09-30-01`, `VM4`), Schneider, Chint, Finder/Omron röle, 2,5/4/6 mm² + PE klemensler, ray durdurucu, köprü tarağı, son kapak; dinamik BOM (adet, kodlar, opsiyonel birim fiyat/maliyet özeti).

### Faz 3 — Saha Üretim Çıktıları & Şema Senkronizasyonu
- **Klemens Bağlantı Planı (Terminal Strip View):** Her klemens (`X1..Xn`, `PE`) için sol/üst = pano içi bağlantı, sağ/alt = saha kablosu + damar rengi + köprü (jumper) gösterimi.
- **Üretim & Markalama Çıktıları:**
  - **1:1 Gerçek Ölçekli Delme Şablonu PDF:** A4/A3 sayfaya 1:1 ölçek + 50 mm kalibrasyon cetveli ile basılıp kasa duvarına yapıştırılarak panç/matkap delme.
  - **Kablo Kesim & Yüksük Etiket Listesi:** Pano yerleşimindeki gerçek `(X, Y)` mesafelerinden tahmini kablo boyu (cm) + renk + kesit + yüksük kodu.
  - **Pano Kapak / Sigorta Şerit Etiketi:** 18 mm modül ölçüsünde yazdırılabilir etiket şeridi.
- **Hazır Devre Makroları & Şema Senkronu:** "Yön Değiştirmeli Motor (MKŞ + 2 Kontaktör + Elektriksel Kilit)" gibi hazır devre bloklarını tek tıkla ekleme; şemadan eleman seçince panoda, panodan seçince şemada vurgulama.

### Faz 4 — Tek Tıkla Dışa Aktarım & Montaj Asistanı
- **Tarayıcıdan Doğrudan DXF + Teknik PDF Paketi:** Kurulumsuz şekilde doğrudan tarayıcıdan katmanlı DXF ve çok sayfalı teknik proje PDF'i indirme (yerel çalışma sırasında tek tıkla ODA DWG tetikleme desteğiyle).
- **İnteraktif Montaj Asistanı (Weidmüller WMC tarzı):** Telefon/tabletten açıp pano toplarken kabloları tek tek "Bağlandı ✓" diye işaretleyebilme ve ilgili kabloyu şemada/panoda canlı parlatma.

---

## 4. Hızlı Kazanım Önerisi (İlk Adım)

İlk geliştirme turunda en hızlı ve somut farkı yaratacak başlangıç paketi:
1. **Faz 1 çekirdeği:** Çoklu pano/şablon seçici (mevcut Bemis + özel pano ölçüsü + dinamik ray), proje anteti, `Ctrl+Z / Ctrl+Y` Undo/Redo ve ray üzerinde sürükle-bırak sıralama.
2. **Faz 2'den iki kritik mühendislik kartı:** Canlı **Rakor Doluluk (%) Hesabı** + **Isıl Kayıp / Sıcaklık ($\Delta T$) Kontrolü** + ray dışı aksesuar destekli dinamik BOM.
