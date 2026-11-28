#!/usr/bin/env python3
"""
O2Sera — Bemis BD1-6130-2020 (V5) Kombinasyon Priz Kutusu (Rev. 2)
Ölçülü Fiziksel Görünüş + İç Kablolama Bağlantı Diyagramı (SVG + PNG + Vektörel PDF).

Kullanıcı Konfigürasyonu (5 Modül DIN Ray):
- Modül 1-3: Q1 — 1× 3P 25A Otomat (ABB S203-C25) → Ön 1× 5/32A 380V (IP67) CEE Priz
- Modül 4:   Q2 — 1× 1P 16A Otomat (ABB S201-C16) → Sol + Sağ 2× 16A 220V (IP68) Schuko Prizler
- Modül 5:   XN — 3× 2,5 mm² Mavi DIN Ray Klemensi (köprülü Nötr dağıtımı)
- Alt Bara:  PE-BARA — Topraklama Barası (PE1 Giriş, PE2 CEE, PE3 Sol, PE4 Sağ, PE5 Loop)
"""
from pathlib import Path

BASE_DIR = Path("/home/yakup/Gemini-Projeler/kayitlar/Elektrik-Pano-Tasarim")
OUT_SVG = BASE_DIR / "O2Sera-Kombinasyon-Priz-BD1-6130-2020.svg"


def wire_path(
    pts: list[tuple[float, float]],
    color: str,
    width: float = 4.2,
    dashed: bool = False,
    stripe: str | None = None,
    radius: float = 9.0,
) -> str:
    """Yuvarlatılmış köşeli, hafif beyaz konturlu gerçekçi kablo çizer."""
    if len(pts) < 2:
        return ""
    d_parts = [f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i - 1]
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        v1x, v1y = x1 - x0, y1 - y0
        v2x, v2y = x2 - x1, y2 - y1
        l1 = (v1x**2 + v1y**2) ** 0.5
        l2 = (v2x**2 + v2y**2) ** 0.5
        r = min(radius, l1 / 2.2, l2 / 2.2)
        if r < 1:
            d_parts.append(f"L {x1:.1f} {y1:.1f}")
        else:
            bx, by = x1 - v1x / l1 * r, y1 - v1y / l1 * r
            ax, ay = x1 + v2x / l2 * r, y1 + v2y / l2 * r
            d_parts.append(f"L {bx:.1f} {by:.1f} Q {x1:.1f} {y1:.1f} {ax:.1f} {ay:.1f}")
    d_parts.append(f"L {pts[-1][0]:.1f} {pts[-1][1]:.1f}")
    d = " ".join(d_parts)
    dash_attr = ' stroke-dasharray="9 6"' if dashed else ""
    out = [
        f'<path d="{d}" fill="none" stroke="#ffffff" stroke-width="{width + 2.6:.1f}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.92"/>',
        f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width:.1f}" stroke-linecap="round" stroke-linejoin="round"{dash_attr}/>',
    ]
    if stripe:
        out.append(
            f'<path d="{d}" fill="none" stroke="{stripe}" stroke-width="{width:.1f}" stroke-dasharray="8 8" stroke-linecap="butt" stroke-linejoin="round"/>'
        )
    return "\n".join(out)


def draw_mcb(
    x: float, y: float, poles: int, w_per_pole: float, h: float,
    model: str, rating: str, top_labels: list[str], bot_labels: list[str],
    toggle_color: str = "#1e293b",
) -> tuple[str, list[tuple[float, float]], list[tuple[float, float]]]:
    w = poles * w_per_pole
    tops, bots, pole_lines, screws = [], [], [], []
    for p in range(poles):
        px = x + p * w_per_pole
        cx = px + w_per_pole / 2.0
        tops.append((cx, y + 20.0))
        bots.append((cx, y + h - 20.0))
        if p > 0:
            pole_lines.append(f'<line x1="{px:.1f}" y1="{y+4:.1f}" x2="{px:.1f}" y2="{y+h-4:.1f}" stroke="#cbd5e1" stroke-width="1.1"/>')
        screws.append(f"""
          <circle cx="{cx:.1f}" cy="{y+20:.1f}" r="7.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.4"/>
          <line x1="{cx-4.5:.1f}" y1="{y+20:.1f}" x2="{cx+4.5:.1f}" y2="{y+20:.1f}" stroke="#1e293b" stroke-width="1.4"/>
          <text x="{cx:.1f}" y="{y+39:.1f}" text-anchor="middle" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="9.5" font-weight="800" fill="#334155">{top_labels[p]}</text>
          <circle cx="{cx:.1f}" cy="{y+h-20:.1f}" r="7.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.4"/>
          <line x1="{cx-4.5:.1f}" y1="{y+h-20:.1f}" x2="{cx+4.5:.1f}" y2="{y+h-20:.1f}" stroke="#1e293b" stroke-width="1.4"/>
          <text x="{cx:.1f}" y="{y+h-32:.1f}" text-anchor="middle" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="9.5" font-weight="800" fill="#334155">{bot_labels[p]}</text>
        """)
    mid_y = y + h / 2.0
    if poles == 1:
        hdr = f"""
          <text x="{x+w/2:.1f}" y="{y+57:.1f}" text-anchor="middle" font-size="11.5" font-weight="900" fill="#e2231a">ABB</text>
          <text x="{x+w/2:.1f}" y="{y+71:.1f}" text-anchor="middle" font-size="9.2" font-weight="800" fill="#334155">{model}</text>
          <text x="{x+w/2:.1f}" y="{y+87:.1f}" text-anchor="middle" font-size="12" font-weight="900" fill="#0f172a">{rating}</text>"""
    else:
        hdr = f"""
          <text x="{x+12:.1f}" y="{y+60:.1f}" font-size="12.5" font-weight="900" fill="#e2231a">ABB</text>
          <text x="{x+w-12:.1f}" y="{y+60:.1f}" text-anchor="end" font-size="10.2" font-weight="800" fill="#334155">{model}</text>
          <text x="{x+w/2:.1f}" y="{y+80:.1f}" text-anchor="middle" font-size="13.5" font-weight="900" fill="#0f172a">{rating}</text>"""
    svg = f"""
    <g>
      <rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="7" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
      <rect x="{x+4:.1f}" y="{y+4:.1f}" width="{w-8:.1f}" height="40" rx="3" fill="#e6ebef"/>
      <rect x="{x+4:.1f}" y="{y+h-44:.1f}" width="{w-8:.1f}" height="40" rx="3" fill="#e6ebef"/>
      {"".join(pole_lines)}
      {hdr}
      <rect x="{x+14:.1f}" y="{mid_y+4:.1f}" width="{w-28:.1f}" height="24" rx="4" fill="#cbd5e1" stroke="#64748b" stroke-width="1.1"/>
      <rect x="{x+18:.1f}" y="{mid_y+8:.1f}" width="{w-36:.1f}" height="16" rx="3" fill="{toggle_color}"/>
      <rect x="{x+w/2-11:.1f}" y="{mid_y-8:.1f}" width="22" height="9" rx="2" fill="#dc2626"/>
      <text x="{x+w/2:.1f}" y="{mid_y-1:.1f}" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffffff">I</text>
      {"".join(screws)}
    </g>"""
    return svg, tops, bots


def draw_blue_neutral_terminals(x: float, y: float, count: int = 3, w_unit: float = 40.0, h: float = 190.0) -> tuple[str, list[tuple[float, float]], list[tuple[float, float]]]:
    """2,5 mm² Mavi DIN Ray Klemens Bloğu (köprülü nötr dağıtım klemensleri)."""
    tops, bots, units = [], [], []
    labels = ["N1", "N2", "N3"]
    roles_t = ["Giriş", "P2 Sol", "P3 Sağ"]
    roles_b = ["P1 CEE", "Köprü", "Loop"]
    for i in range(count):
        ux = x + i * w_unit
        cx = ux + w_unit / 2.0
        tops.append((cx, y + 18.0))
        bots.append((cx, y + h - 18.0))
        units.append(f"""
        <g>
          <rect x="{ux:.1f}" y="{y:.1f}" width="{w_unit:.1f}" height="{h:.1f}" rx="4" fill="#3b82f6" stroke="#1e3a8a" stroke-width="1.6"/>
          <rect x="{ux+4:.1f}" y="{y+5:.1f}" width="{w_unit-8:.1f}" height="28" rx="3" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1"/>
          <rect x="{ux+4:.1f}" y="{y+h-33:.1f}" width="{w_unit-8:.1f}" height="28" rx="3" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1"/>
          <circle cx="{cx:.1f}" cy="{y+18:.1f}" r="6.4" fill="#e2e8f0" stroke="#1e293b" stroke-width="1.3"/>
          <line x1="{cx-3.8:.1f}" y1="{y+18:.1f}" x2="{cx+3.8:.1f}" y2="{y+18:.1f}" stroke="#1e293b" stroke-width="1.3"/>
          <circle cx="{cx:.1f}" cy="{y+h-18:.1f}" r="6.4" fill="#e2e8f0" stroke="#1e293b" stroke-width="1.3"/>
          <line x1="{cx-3.8:.1f}" y1="{y+h-18:.1f}" x2="{cx+3.8:.1f}" y2="{y+h-18:.1f}" stroke="#1e293b" stroke-width="1.3"/>
          <rect x="{ux+4:.1f}" y="{y+54:.1f}" width="{w_unit-8:.1f}" height="82" rx="3" fill="#ffffff" stroke="#1d4ed8" stroke-width="1.4"/>
          <text x="{cx:.1f}" y="{y+74:.1f}" text-anchor="middle" font-size="11" font-weight="900" fill="#1e3a8a">{labels[i]}</text>
          <text x="{cx:.1f}" y="{y+90:.1f}" text-anchor="middle" font-size="8.2" font-weight="800" fill="#2563eb">2,5 mm²</text>
          <text x="{cx:.1f}" y="{y+108:.1f}" text-anchor="middle" font-size="7.6" font-weight="700" fill="#475569">{roles_t[i]}</text>
          <text x="{cx:.1f}" y="{y+124:.1f}" text-anchor="middle" font-size="7.6" font-weight="700" fill="#1d4ed8">{roles_b[i]}</text>
        </g>""")
    # Ortada köprü tarağı çubuğu (3 mavi klemensi elektriksel olarak birleştirir!)
    bridge = (
        f'<rect x="{x+14:.1f}" y="{y+39:.1f}" width="{(count-1)*w_unit+12:.1f}" height="8" rx="3" fill="#f59e0b" stroke="#92400e" stroke-width="1.2"/>'
        f'<text x="{x+count*w_unit/2:.1f}" y="{y+150:.1f}" text-anchor="middle" font-size="8.5" font-weight="900" fill="#ffffff">KÖPRÜLÜ</text>'
    )
    return "\n".join(units) + "\n" + bridge, tops, bots


def build_svg() -> str:
    W, H = 2200, 1860

    C_L1 = "#8B4513"   # Kahverengi — Faz L1
    C_L2 = "#1E293B"   # Siyah — Faz L2
    C_L3 = "#64748B"   # Gri — Faz L3
    C_N = "#1D4ED8"    # Koyu Mavi — Nötr
    C_PE = "#16A34A"   # Yeşil + Sarı Şerit — Toprak
    C_PE_S = "#FACC15"

    parts: list[str] = []
    parts.append(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <style>
      text {{ font-family: 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif; }}
    </style>
    <filter id="cardShadow" x="-8%" y="-8%" width="118%" height="118%">
      <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.10"/>
    </filter>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
    <linearGradient id="dinRail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="22%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="82%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="v5Body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="50%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="smokeWin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#334155" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.34"/>
    </linearGradient>
    <marker id="dimArr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#b4572a"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>
''')

    # =========================================================================
    # 1. O2SERA KURUMSAL BAŞLIK BANDI
    # =========================================================================
    parts.append('''
  <g>
    <rect x="56" y="30" width="10" height="58" rx="4" fill="#1F9D6B"/>
    <text x="82" y="58" font-size="27.5" font-weight="800" fill="#0B2540"><tspan fill="#1F9D6B">O2Sera</tspan> — BEMİS BD1-6130-2020 (V5) KOMBİNASYON PRİZ KUTUSU TASARIMI</text>
    <text x="82" y="84" font-size="15" font-weight="500" fill="#475569">IP66 ABS Gövde (120 × 255 × 122 mm) • 5 Modül Ray: 1× 3P 25A + 1× 1P 16A + 2,5 mm² Mavi Klemens • Ön: 5/32A IP67 • Yan: 2× 16A IP68</text>
    <rect x="1874" y="34" width="270" height="52" rx="8" fill="#0B2540" stroke="#1F9D6B" stroke-width="2"/>
    <text x="2009" y="56" text-anchor="middle" font-size="14" font-weight="800" fill="#ffffff"><tspan fill="#34D399">O2Sera</tspan> • KOMBİNASYON PRİZ</text>
    <text x="2009" y="75" text-anchor="middle" font-size="11.5" font-weight="600" fill="#cbd5e1">Bemis BD1-6130-2020 • V5 IP66</text>
    <line x1="56" y1="104" x2="2144" y2="104" stroke="#e2e8f0" stroke-width="2"/>
  </g>
''')

    # =========================================================================
    # 2. ÜST TEKNİK ÖZET BANDI (3 BLOK)
    # =========================================================================
    parts.append(f'''
  <g id="top-summary">
    <text x="64" y="134" font-size="13.5" font-weight="800" fill="#0B2540">1) BESLEME GİRİŞİ (BÖLGE PANOSU QF1 ÇIKIŞI)</text>
    <rect x="64" y="148" width="640" height="122" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="82" y="174" font-size="12.5" font-weight="800" fill="#1d4ed8">• Üst Koruma (Bölge Panosunda): QF1 — 63A 4P (3P+N) 30 mA Kaçak Akım</text>
    <text x="82" y="198" font-size="12.2" font-weight="700" fill="#334155">• Giriş Kablosu: 5×4 mm² / 5×6 mm² (Seri loop için 5×6 veya 5×10 mm²)</text>
    <text x="82" y="222" font-size="12.2" font-weight="700" fill="#334155">• Rakor: Alttan PG 21 / M32 IP68 (yoğuşma/damlama suyuna karşı alttan giriş)</text>
    <text x="82" y="248" font-size="11.8" font-weight="700" fill="#1F9D6B">• İç Montaj: 3P 25A + 1P 16A + 2,5 mm² Mavi Nötr Ray Klemensi (5M tam dolu)</text>

    <text x="734" y="134" font-size="13.5" font-weight="800" fill="#0B2540">2) 5 MODÜL DIN RAY DİZİLİMİ (3 + 1 + 1 = 5M)</text>
    <rect x="734" y="148" width="690" height="122" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="752" y="174" font-size="12.5" font-weight="800" fill="#b91c1c">• Modül 1–3 (Q1 — ABB S203-C25):</text>
    <text x="988" y="174" font-size="12.2" font-weight="700" fill="#334155">3P 25A Otomat → Ön 5/32A 380V CEE (4 mm²)</text>
    <text x="752" y="200" font-size="12.5" font-weight="800" fill="{C_L1}">• Modül 4   (Q2 — ABB S201-C16):</text>
    <text x="988" y="200" font-size="12.2" font-weight="700" fill="#334155">1P 16A Otomat → Sol &amp; Sağ 220V Ortak (2,5 mm²)</text>
    <text x="752" y="226" font-size="12.5" font-weight="800" fill="{C_N}">• Modül 5   (XN — Mavi Klemens):</text>
    <text x="988" y="226" font-size="12.2" font-weight="700" fill="#334155">3× 2,5 mm² Köprülü Mavi Nötr Ray Klemensi</text>
    <text x="752" y="252" font-size="11.5" font-weight="700" fill="#64748b">* Q1:1 → Q2:1 üst faz köprüsü ve Q2:2 → P2 &amp; P3 çıkışında ikiz yüksük kullan.</text>

    <text x="1454" y="134" font-size="13.5" font-weight="800" fill="#0B2540">3) BEMİS BD1-6130-2020 (V5) GÖVDE &amp; PRİZLER</text>
    <rect x="1454" y="148" width="688" height="122" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="1472" y="174" font-size="12.4" font-weight="800" fill="#0B2540">• Gövde:</text>
    <text x="1552" y="174" font-size="12.2" fill="#334155">120 × 255 × 122 mm • Darbeye dayanıklı ABS • IP66 Dış Ortam</text>
    <text x="1472" y="198" font-size="12.4" font-weight="800" fill="#b91c1c">• Ön Priz:</text>
    <text x="1552" y="198" font-size="12.2" fill="#334155">1× 5/32A 380–415V (3P+N+PE, 6h) — IP67 Vidalı Kapaklı</text>
    <text x="1472" y="222" font-size="12.4" font-weight="800" fill="#1d4ed8">• Yan Priz:</text>
    <text x="1552" y="222" font-size="12.2" fill="#334155">2× 1/16A 220–250V (2P+E Schuko) — IP68 Yaylı Kapaklı (Sol+Sağ)</text>
    <text x="1472" y="248" font-size="12.2" font-weight="700" fill="#475569">• Pencere: BAK-3000-1000 Poliamid-6 Şeffaf 5 Modül Sigorta Kapağı</text>
  </g>
''')
    parts.append('<line x1="56" y1="292" x2="2144" y2="292" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6 4"/>')

    # =========================================================================
    # 3. SOL PANEL: BEMİS BD1-6130-2020 (V5) ÖLÇÜLÜ ÖN GÖRÜNÜŞ
    # =========================================================================
    FX, FY, FW, FH = 64.0, 324.0, 620.0, 1140.0
    BX, BY, BW, BH = FX + 154.0, FY + 108.0, 312.0, 663.0
    parts.append(f'''
  <g id="physical-front-view" filter="url(#cardShadow)">
    <rect x="{FX:.1f}" y="{FY:.1f}" width="{FW:.1f}" height="{FH:.1f}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="{FX:.1f}" y="{FY:.1f}" width="{FW:.1f}" height="56" rx="18" fill="#0B2540"/>
    <text x="{FX+FW/2:.1f}" y="{FY+26:.1f}" text-anchor="middle" font-size="16" font-weight="800" fill="#ffffff">ÖLÇÜLÜ ÖN GÖRÜNÜŞ (BEMİS V5)</text>
    <text x="{FX+FW/2:.1f}" y="{FY+45:.1f}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#34D399">BD1-6130-2020 • 120 × 255 × 122 mm • IP66 ABS</text>

    <!-- Sol Yan Priz (P2) -->
    <rect x="{BX-52:.1f}" y="{BY+420:.1f}" width="54" height="128" rx="8" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
    <rect x="{BX-62:.1f}" y="{BY+428:.1f}" width="16" height="112" rx="5" fill="#2563eb" stroke="#1e3a8a" stroke-width="1.6"/>
    <text x="{BX-74:.1f}" y="{BY+478:.1f}" text-anchor="end" font-size="11.5" font-weight="800" fill="#1d4ed8">P2 (SOL)</text>
    <text x="{BX-74:.1f}" y="{BY+495:.1f}" text-anchor="end" font-size="10" font-weight="700" fill="#475569">16A 220V</text>
    <text x="{BX-74:.1f}" y="{BY+510:.1f}" text-anchor="end" font-size="9.5" font-weight="700" fill="#64748b">Q2 (16A)</text>

    <!-- Sağ Yan Priz (P3) -->
    <rect x="{BX+BW-2:.1f}" y="{BY+420:.1f}" width="54" height="128" rx="8" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
    <rect x="{BX+BW+46:.1f}" y="{BY+428:.1f}" width="16" height="112" rx="5" fill="#2563eb" stroke="#1e3a8a" stroke-width="1.6"/>
    <text x="{BX+BW+72:.1f}" y="{BY+478:.1f}" text-anchor="start" font-size="11.5" font-weight="800" fill="#1d4ed8">P3 (SAĞ)</text>
    <text x="{BX+BW+72:.1f}" y="{BY+495:.1f}" text-anchor="start" font-size="10" font-weight="700" fill="#475569">16A 220V</text>
    <text x="{BX+BW+72:.1f}" y="{BY+510:.1f}" text-anchor="start" font-size="9.5" font-weight="700" fill="#64748b">Q2 (16A)</text>

    <!-- Ana V5 Gövde -->
    <rect x="{BX:.1f}" y="{BY:.1f}" width="{BW:.1f}" height="{BH:.1f}" rx="20" fill="url(#v5Body)" stroke="#475569" stroke-width="2.5"/>
    <rect x="{BX+14:.1f}" y="{BY+14:.1f}" width="{BW-28:.1f}" height="{BH-28:.1f}" rx="13" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.6"/>
    {"".join(f'<circle cx="{vx:.1f}" cy="{vy:.1f}" r="9" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/><line x1="{vx-4.5:.1f}" y1="{vy:.1f}" x2="{vx+4.5:.1f}" y2="{vy:.1f}" stroke="#334155" stroke-width="1.6"/><line x1="{vx:.1f}" y1="{vy-4.5:.1f}" x2="{vx:.1f}" y2="{vy+4.5:.1f}" stroke="#334155" stroke-width="1.6"/>' for vx, vy in [(BX+26, BY+26), (BX+BW-26, BY+26), (BX+26, BY+BH-26), (BX+BW-26, BY+BH-26)])}
    <text x="{BX+BW/2:.1f}" y="{BY+44:.1f}" text-anchor="middle" font-size="13" font-weight="900" fill="#0B2540" letter-spacing="1.5">BEMİS V5 • IP66</text>

    <!-- 5 Modül Penceresi: Q1 (3P 25A) + Q2 (1P 16A) + XN (3× 2,5 mm² Mavi Klemens) -->
    <rect x="{BX+28:.1f}" y="{BY+64:.1f}" width="{BW-56:.1f}" height="218" rx="10" fill="#ffffff" stroke="#334155" stroke-width="2.2"/>
    <rect x="{BX+42:.1f}" y="{BY+82:.1f}" width="132" height="176" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/>
    <line x1="{BX+86:.1f}" y1="{BY+82:.1f}" x2="{BX+86:.1f}" y2="{BY+258:.1f}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="{BX+130:.1f}" y1="{BY+82:.1f}" x2="{BX+130:.1f}" y2="{BY+258:.1f}" stroke="#cbd5e1" stroke-width="1"/>
    <text x="{BX+108:.1f}" y="{BY+114:.1f}" text-anchor="middle" font-size="11.5" font-weight="900" fill="#b91c1c">Q1 • 25A 3P</text>
    <rect x="{BX+56:.1f}" y="{BY+156:.1f}" width="104" height="22" rx="4" fill="#b91c1c"/>
    <text x="{BX+108:.1f}" y="{BY+210:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#475569">3 Modül (CEE)</text>

    <rect x="{BX+178:.1f}" y="{BY+82:.1f}" width="44" height="176" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/>
    <text x="{BX+200:.1f}" y="{BY+114:.1f}" text-anchor="middle" font-size="10" font-weight="900" fill="{C_L1}">Q2</text>
    <text x="{BX+200:.1f}" y="{BY+130:.1f}" text-anchor="middle" font-size="9" font-weight="800" fill="#334155">16A</text>
    <rect x="{BX+186:.1f}" y="{BY+156:.1f}" width="28" height="22" rx="4" fill="#1e293b"/>
    <text x="{BX+200:.1f}" y="{BY+208:.1f}" text-anchor="middle" font-size="8.2" font-weight="700" fill="#475569">2×220V</text>

    <!-- 5. Modül: 3× 2,5 mm² Mavi Klemens -->
    <rect x="{BX+226:.1f}" y="{BY+92:.1f}" width="14" height="156" rx="2" fill="#3b82f6" stroke="#1e3a8a" stroke-width="1"/>
    <rect x="{BX+241:.1f}" y="{BY+92:.1f}" width="14" height="156" rx="2" fill="#3b82f6" stroke="#1e3a8a" stroke-width="1"/>
    <rect x="{BX+256:.1f}" y="{BY+92:.1f}" width="14" height="156" rx="2" fill="#3b82f6" stroke="#1e3a8a" stroke-width="1"/>
    <text x="{BX+248:.1f}" y="{BY+172:.1f}" text-anchor="middle" font-size="8.5" font-weight="900" fill="#ffffff" transform="rotate(-90 {BX+248:.1f} {BY+172:.1f})">XN 2,5mm²</text>

    <rect x="{BX+28:.1f}" y="{BY+64:.1f}" width="{BW-56:.1f}" height="218" rx="10" fill="url(#smokeWin)" stroke="#475569" stroke-width="2"/>
    <text x="{BX+BW/2:.1f}" y="{BY+273:.1f}" text-anchor="middle" font-size="9.2" font-weight="800" fill="#0f172a">5 Modül: 3P 25A + 1P 16A + Mavi Klemens</text>

    <!-- Ön Yüz 1× 5/32A 380V (IP67) Kırmızı CEE Priz (P1) -->
    <rect x="{BX+56:.1f}" y="{BY+332:.1f}" width="200" height="240" rx="18" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
    <circle cx="{BX+BW/2:.1f}" cy="{BY+452:.1f}" r="88" fill="#dc2626" stroke="#7f1d1d" stroke-width="3"/>
    <circle cx="{BX+BW/2:.1f}" cy="{BY+452:.1f}" r="70" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>
    <circle cx="{BX+BW/2:.1f}" cy="{BY+452:.1f}" r="54" fill="#fef2f2" stroke="#b91c1c" stroke-width="1.8"/>
    <circle cx="{BX+BW/2:.1f}" cy="{BY+486:.1f}" r="9.5" fill="#16a34a" stroke="#facc15" stroke-width="2.2"/>
    <text x="{BX+BW/2:.1f}" y="{BY+490:.1f}" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffffff">PE</text>
    <circle cx="{BX+BW/2+32:.1f}" cy="{BY+464:.1f}" r="8" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="1.5"/>
    <text x="{BX+BW/2+32:.1f}" y="{BY+467:.1f}" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffffff">N</text>
    <circle cx="{BX+BW/2-32:.1f}" cy="{BY+464:.1f}" r="8" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
    <text x="{BX+BW/2-32:.1f}" y="{BY+467:.1f}" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffffff">L3</text>
    <circle cx="{BX+BW/2-22:.1f}" cy="{BY+426:.1f}" r="8" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
    <text x="{BX+BW/2-22:.1f}" y="{BY+429:.1f}" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffffff">L2</text>
    <circle cx="{BX+BW/2+22:.1f}" cy="{BY+426:.1f}" r="8" fill="#8B4513" stroke="#451a03" stroke-width="1.5"/>
    <text x="{BX+BW/2+22:.1f}" y="{BY+429:.1f}" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffffff">L1</text>
    <text x="{BX+BW/2:.1f}" y="{BY+562:.1f}" text-anchor="middle" font-size="11.5" font-weight="900" fill="#991b1b">P1 • 5/32A 380V (6h • IP67)</text>

    <!-- Alt Rakorlar -->
    <rect x="{BX+78:.1f}" y="{BY+BH:.1f}" width="46" height="36" rx="5" fill="#64748b" stroke="#1e293b" stroke-width="1.6"/>
    <rect x="{BX+84:.1f}" y="{BY+BH+36:.1f}" width="34" height="18" rx="4" fill="#475569" stroke="#1e293b" stroke-width="1.4"/>
    <text x="{BX+101:.1f}" y="{BY+BH+70:.1f}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#0B2540">PG21 / M32</text>
    <text x="{BX+101:.1f}" y="{BY+BH+83:.1f}" text-anchor="middle" font-size="9" font-weight="700" fill="#1F9D6B">Giriş (5×4/6)</text>

    <rect x="{BX+188:.1f}" y="{BY+BH:.1f}" width="46" height="36" rx="5" fill="#94a3b8" stroke="#475569" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="{BX+211:.1f}" y="{BY+BH+70:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#64748b">Ops. Loop</text>
    <text x="{BX+211:.1f}" y="{BY+BH+83:.1f}" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">Sonraki Kutu</text>

    <!-- Ölçüler -->
    <g stroke="#b4572a" stroke-width="1.4">
      <line x1="{BX:.1f}" y1="{BY-24:.1f}" x2="{BX:.1f}" y2="{BY-4:.1f}"/>
      <line x1="{BX+BW:.1f}" y1="{BY-24:.1f}" x2="{BX+BW:.1f}" y2="{BY-4:.1f}"/>
      <line x1="{BX+4:.1f}" y1="{BY-16:.1f}" x2="{BX+BW-4:.1f}" y2="{BY-16:.1f}" marker-start="url(#dimArr)" marker-end="url(#dimArr)"/>
      <line x1="{BX-36:.1f}" y1="{BY:.1f}" x2="{BX-6:.1f}" y2="{BY:.1f}"/>
      <line x1="{BX-36:.1f}" y1="{BY+BH:.1f}" x2="{BX-6:.1f}" y2="{BY+BH:.1f}"/>
      <line x1="{BX-26:.1f}" y1="{BY+4:.1f}" x2="{BX-26:.1f}" y2="{BY+BH-4:.1f}" marker-start="url(#dimArr)" marker-end="url(#dimArr)"/>
    </g>
    <text x="{BX+BW/2:.1f}" y="{BY-22:.1f}" text-anchor="middle" font-size="13" font-weight="800" fill="#b4572a">120 mm</text>
    <text x="{BX-38:.1f}" y="{BY+BH/2:.1f}" text-anchor="middle" font-size="13" font-weight="800" fill="#b4572a" transform="rotate(-90 {BX-38:.1f} {BY+BH/2:.1f})">255 mm</text>

    <!-- Alt Teknik Bilgi Kutusu -->
    <rect x="{FX+24:.1f}" y="{FY+884:.1f}" width="{FW-48:.1f}" height="232" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.4"/>
    <text x="{FX+FW/2:.1f}" y="{FY+910:.1f}" text-anchor="middle" font-size="13.5" font-weight="800" fill="#0B2540">Saha Montaj &amp; Uygulama Notları</text>
    <text x="{FX+42:.1f}" y="{FY+938:.1f}" font-size="12" font-weight="700" fill="#334155">• Dış Ölçüler: 120 (G) × 255 (Y) × 122 (D) mm • Koruma: IP66</text>
    <text x="{FX+42:.1f}" y="{FY+964:.1f}" font-size="12" font-weight="700" fill="#1d4ed8">• Kaçak Akım: Bölge Panosundaki QF1 (63A 4P 30mA) korur</text>
    <text x="{FX+42:.1f}" y="{FY+990:.1f}" font-size="12" font-weight="700" fill="#b91c1c">• Q1 (3P 25A): 4 mm² NYAF • Q2 (1P 16A): 2,5 mm² NYAF</text>
    <text x="{FX+42:.1f}" y="{FY+1016:.1f}" font-size="12" font-weight="700" fill="#2563eb">• 5. Modül: 3× 2,5 mm² köprülü mavi ray klemensi (15,6 mm)</text>
    <text x="{FX+42:.1f}" y="{FY+1042:.1f}" font-size="12" font-weight="700" fill="#059669">• Rakorlar sadece ALT duvardan açılır (sera nem/yoğuşma)</text>
    <text x="{FX+42:.1f}" y="{FY+1068:.1f}" font-size="12" font-weight="700" fill="#7c3aed">• Q1:1→Q2:1 ve Q2:2→P2/P3 bağlantılarında ikiz yüksük kullan</text>
    <text x="{FX+42:.1f}" y="{FY+1094:.1f}" font-size="11.5" font-weight="600" fill="#64748b">• Devreye almadan önce QF1 "T" test butonuyla açma testi yap.</text>
  </g>
''')

    # =========================================================================
    # 4. SAĞ ANA ALAN: KUTU İÇİ AÇIK BAĞLANTI DİYAGRAMI (PIN-TO-PIN)
    # =========================================================================
    SX, SY, SW, SH = 720.0, 324.0, 1424.0, 1140.0
    parts.append(f'''
  <g id="internal-schematic-frame">
    <rect x="{SX:.1f}" y="{SY:.1f}" width="{SW:.1f}" height="{SH:.1f}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="{SX:.1f}" y="{SY:.1f}" width="{SW:.1f}" height="56" rx="18" fill="#f8fafc"/>
    <line x1="{SX:.1f}" y1="{SY+56:.1f}" x2="{SX+SW:.1f}" y2="{SY+56:.1f}" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="{SX+SW/2:.1f}" y="{SY+26:.1f}" text-anchor="middle" font-size="16" font-weight="800" fill="#0B2540">KUTU İÇİ BAĞLANTI ŞEMASI (3P 25A + 1P 16A + 2,5 mm² MAVİ KLEMENS)</text>
    <text x="{SX+SW/2:.1f}" y="{SY+45:.1f}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#475569">Atölye / saha montajına hazır birebir vida ve pin bağlantı planı</text>
  </g>
''')

    # 4A. 5 Modül DIN Rayı: Q1 (3P 25A) + Q2 (1P 16A) + XN (3× 2,5 mm² Mavi Klemens)
    RAIL_CY = 605.0
    RAIL_X, RAIL_W = SX + 180.0, SW - 360.0
    slots = "".join(
        f'<rect x="{RAIL_X + 26 + k*84}" y="{RAIL_CY - 5}" width="40" height="10" rx="5" fill="#64748b"/>'
        for k in range(12)
    )
    parts.append(f'''
  <g id="din-rail">
    <rect x="{RAIL_X:.1f}" y="{RAIL_CY - 26:.1f}" width="{RAIL_W:.1f}" height="52" rx="3" fill="url(#dinRail)" stroke="#475569" stroke-width="1.4"/>
    {slots}
  </g>''')

    M_Y, M_H = 492.0, 226.0
    q1_svg, q1_top, q1_bot = draw_mcb(1060.0, M_Y, 3, 72.0, M_H, "S203-C25", "25A 3P", ["1 (L1)", "3 (L2)", "5 (L3)"], ["2", "4", "6"], "#b91c1c")
    q2_svg, q2_top, q2_bot = draw_mcb(1335.0, M_Y, 1, 76.0, M_H, "S201-C16", "16A 1P", ["1 (L1)"], ["2"], "#1e293b")
    xn_svg, xn_top, xn_bot = draw_blue_neutral_terminals(1485.0, M_Y + 18.0, count=3, w_unit=44.0, h=190.0)

    parts.append(f'<g id="breakers" filter="url(#softShadow)">{q1_svg}{q2_svg}{xn_svg}</g>')

    # 4B. 3 Priz Arka Bağlantı Şeması (Üst: Fazlar | Orta: Başlık | Alt: N & PE)
    PY = 860.0
    P_H = 262.0
    P2X, P2W = 790.0, 280.0
    p2_pins = {"L": (P2X + 140.0, PY + 36.0), "PE": (P2X + 95.0, PY + P_H - 36.0), "N": (P2X + 185.0, PY + P_H - 36.0)}
    P1X, P1W = 1150.0, 540.0
    p1_pins = {
        "L1": (P1X + 135.0, PY + 36.0), "L2": (P1X + 270.0, PY + 36.0), "L3": (P1X + 405.0, PY + 36.0),
        "N": (P1X + 195.0, PY + P_H - 36.0), "PE": (P1X + 345.0, PY + P_H - 36.0),
    }
    P3X, P3W = 1770.0, 280.0
    p3_pins = {"L": (P3X + 140.0, PY + 36.0), "PE": (P3X + 95.0, PY + P_H - 36.0), "N": (P3X + 185.0, PY + P_H - 36.0)}

    def terminal_dot(pt: tuple[float, float], lbl: str, col: str, sub: str, label_side: str = "below") -> str:
        px, py = pt
        if label_side == "below":
            t_svg = (
                f'<text x="{px:.1f}" y="{py+32:.1f}" text-anchor="middle" font-size="11.5" font-weight="900" fill="{col}">{lbl}</text>'
                f'<text x="{px:.1f}" y="{py+46:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#475569">{sub}</text>'
            )
        else:
            t_svg = (
                f'<text x="{px:.1f}" y="{py-36:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#475569">{sub}</text>'
                f'<text x="{px:.1f}" y="{py-22:.1f}" text-anchor="middle" font-size="11.5" font-weight="900" fill="{col}">{lbl}</text>'
            )
        return f"""
        <g>
          <circle cx="{px:.1f}" cy="{py:.1f}" r="16" fill="#ffffff" stroke="{col}" stroke-width="3"/>
          <circle cx="{px:.1f}" cy="{py:.1f}" r="7" fill="#cbd5e1" stroke="#334155" stroke-width="1.3"/>
          {t_svg}
        </g>"""

    parts.append(f'''
  <g id="sockets-rear" filter="url(#cardShadow)">
    <rect x="{P2X:.1f}" y="{PY:.1f}" width="{P2W:.1f}" height="{P_H:.1f}" rx="16" fill="#f8fafc" stroke="#2563eb" stroke-width="2.2"/>
    <rect x="{P2X+10:.1f}" y="{PY+104:.1f}" width="{P2W-20:.1f}" height="52" rx="10" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.3"/>
    <text x="{P2X+P2W/2:.1f}" y="{PY+127:.1f}" text-anchor="middle" font-size="13.5" font-weight="800" fill="#1d4ed8">P2 • SOL YAN PRİZ (IP68)</text>
    <text x="{P2X+P2W/2:.1f}" y="{PY+145:.1f}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#475569">16A 220V (2P+E) • 2,5 mm² • Q2</text>
    {terminal_dot(p2_pins["L"], "L (L1)", C_L1, "Q2:2", "below")}
    {terminal_dot(p2_pins["PE"], "PE ⏚", C_PE, "PE3", "above")}
    {terminal_dot(p2_pins["N"], "N", C_N, "XN2", "above")}

    <rect x="{P1X:.1f}" y="{PY:.1f}" width="{P1W:.1f}" height="{P_H:.1f}" rx="16" fill="#f8fafc" stroke="#dc2626" stroke-width="2.4"/>
    <rect x="{P1X+12:.1f}" y="{PY+104:.1f}" width="{P1W-24:.1f}" height="52" rx="10" fill="#fef2f2" stroke="#fecaca" stroke-width="1.3"/>
    <text x="{P1X+P1W/2:.1f}" y="{PY+127:.1f}" text-anchor="middle" font-size="14.5" font-weight="800" fill="#b91c1c">P1 • ÖN YÜZ 5/32A 380V CEE PRİZ (IP67 • 6h)</text>
    <text x="{P1X+P1W/2:.1f}" y="{PY+145:.1f}" text-anchor="middle" font-size="10.8" font-weight="700" fill="#475569">3P+N+PE Trifaze Sanayi Prizi • Q1 (25A) • 4 mm²</text>
    {terminal_dot(p1_pins["L1"], "L1", C_L1, "Q1:2", "below")}
    {terminal_dot(p1_pins["L2"], "L2", C_L2, "Q1:4", "below")}
    {terminal_dot(p1_pins["L3"], "L3", C_L3, "Q1:6", "below")}
    {terminal_dot(p1_pins["N"], "N", C_N, "XN1", "above")}
    {terminal_dot(p1_pins["PE"], "PE ⏚", C_PE, "PE2", "above")}

    <rect x="{P3X:.1f}" y="{PY:.1f}" width="{P3W:.1f}" height="{P_H:.1f}" rx="16" fill="#f8fafc" stroke="#2563eb" stroke-width="2.2"/>
    <rect x="{P3X+10:.1f}" y="{PY+104:.1f}" width="{P3W-20:.1f}" height="52" rx="10" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.3"/>
    <text x="{P3X+P3W/2:.1f}" y="{PY+127:.1f}" text-anchor="middle" font-size="13.5" font-weight="800" fill="#1d4ed8">P3 • SAĞ YAN PRİZ (IP68)</text>
    <text x="{P3X+P3W/2:.1f}" y="{PY+145:.1f}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#475569">16A 220V (2P+E) • 2,5 mm² • Q2</text>
    {terminal_dot(p3_pins["L"], "L (L1)", C_L1, "Q2:2", "below")}
    {terminal_dot(p3_pins["PE"], "PE ⏚", C_PE, "PE4", "above")}
    {terminal_dot(p3_pins["N"], "N", C_N, "XN3", "above")}
  </g>
''')

    # 4C. Alt PE-BARA (Merkez-Sağda temiz tek toprak barası; Nötr artık raydaki XN mavi klemenslerde!)
    BAR_W, BAR_H = 440.0, 64.0
    PE_X, PE_Y = 1200.0, 1255.0
    pe_pins = [PE_X + 52 + i * 84 for i in range(5)]
    pe_py = PE_Y + 42.0

    # =========================================================================
    # 5. KUTU İÇİ KABLO BAĞLANTILARI
    # =========================================================================
    parts.append('<g id="internal-wiring">')

    IN_X, IN_Y = 1420.0, 1456.0
    # 5A. Alttan Giriş L1-L2-L3 → Sol kenardan Q1 üstüne (1, 3, 5) + L1→Q2 üst köprüsü
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        x_up = 752.0 + i * 11.0
        y_top = 416.0 + i * 14.0
        y_bot_in = 1372.0 + i * 11.0
        parts.append(wire_path([
            (IN_X - 24 + i * 12, IN_Y), (IN_X - 24 + i * 12, y_bot_in),
            (x_up, y_bot_in), (x_up, y_top), (q1_top[i][0], y_top), q1_top[i]
        ], col, 4.6))
    # L1 → Q2 (1P 16A) üst köprü
    parts.append(wire_path([(q1_top[0][0], 416.0), (q2_top[0][0], 416.0), q2_top[0]], C_L1, 4.0))
    parts.append(f'<circle cx="{q1_top[0][0]:.1f}" cy="416.0" r="5.0" fill="{C_L1}" stroke="#ffffff" stroke-width="1.6"/>')

    # Giriş N (Mavi) → Sağ kenardan yukarı çıkıp XN1 (2,5 mm² Mavi Klemens üst) girişine!
    parts.append(wire_path([
        (IN_X + 12, IN_Y), (IN_X + 12, 1364), (2094, 1364), (2094, 434), (xn_top[0][0], 434), xn_top[0]
    ], C_N, 4.4))

    # Giriş PE → PE-BARA (PE1)
    parts.append(wire_path([(IN_X + 24, IN_Y), (IN_X + 24, 1348), (pe_pins[0], 1348), (pe_pins[0], pe_py)], C_PE, 4.6, stripe=C_PE_S))

    # 5B. Q1 alt (2, 4, 6) → P1 (32A CEE L1, L2, L3)
    for i, (k, col) in enumerate([("L1", C_L1), ("L2", C_L2), ("L3", C_L3)]):
        y_m = 776.0 + i * 14.0
        parts.append(wire_path([q1_bot[i], (q1_bot[i][0], y_m), (p1_pins[k][0], y_m), p1_pins[k]], col, 4.4))

    # 5C. Q2 alt (2 — 16A L1) → P2 (Sol 220V L) VE P3 (Sağ 220V L) ortak dallanma!
    parts.append(wire_path([q2_bot[0], (q2_bot[0][0], 756), (p2_pins["L"][0], 756), p2_pins["L"]], C_L1, 3.6))
    parts.append(wire_path([(q2_bot[0][0], 756), (p3_pins["L"][0], 756), p3_pins["L"]], C_L1, 3.6))
    parts.append(f'<circle cx="{q2_bot[0][0]:.1f}" cy="756.0" r="4.6" fill="{C_L1}" stroke="#ffffff" stroke-width="1.5"/>')

    # 5D. XN (2,5 mm² Mavi Klemensler) → P1:N, P2:N, P3:N (sağ taraftan/ara koridordan alt N pinlerine)
    # XN1 alt → P1:N (P1 ve P3 arasından inip P1:N altına)
    parts.append(wire_path([
        xn_bot[0], (xn_bot[0][0], 742), (1718, 742), (1718, 1172), (p1_pins["N"][0], 1172), p1_pins["N"]
    ], C_N, 3.8))
    # XN2 üst → P2:N (sola/alta temiz dönüş: XN2 alt → 1730 → y=1186 → P2:N)
    parts.append(wire_path([
        xn_bot[1], (xn_bot[1][0], 732), (1730, 732), (1730, 1188), (p2_pins["N"][0], 1188), p2_pins["N"]
    ], C_N, 3.4))
    # XN3 alt → P3:N (1742 → y=1172 → P3:N)
    parts.append(wire_path([
        xn_bot[2], (xn_bot[2][0], 722), (1742, 722), (1742, 1172), (p3_pins["N"][0], 1172), p3_pins["N"]
    ], C_N, 3.4))

    # 5E. PE-BARA → P1:PE, P2:PE, P3:PE
    parts.append(wire_path([(pe_pins[1], pe_py), (pe_pins[1], 1206), (p1_pins["PE"][0], 1206), p1_pins["PE"]], C_PE, 4.2, stripe=C_PE_S))
    parts.append(wire_path([(pe_pins[2], pe_py), (pe_pins[2], 1220), (p2_pins["PE"][0], 1220), p2_pins["PE"]], C_PE, 3.5, stripe=C_PE_S))
    parts.append(wire_path([(pe_pins[3], pe_py), (pe_pins[3], 1206), (p3_pins["PE"][0], 1206), p3_pins["PE"]], C_PE, 3.5, stripe=C_PE_S))

    parts.append('</g>')

    # 5F. Alt PE-BARA Kutusu
    pe_roles = ["Giriş", "P1 CEE", "P2 Sol", "P3 Sağ", "Loop"]
    parts.append(f'''
  <g id="pe-bar" filter="url(#softShadow)">
    <rect x="{PE_X:.1f}" y="{PE_Y:.1f}" width="{BAR_W:.1f}" height="{BAR_H:.1f}" rx="9" fill="#f0fdf4" stroke="#16a34a" stroke-width="2.2"/>
    <rect x="{PE_X+14:.1f}" y="{PE_Y+34:.1f}" width="{BAR_W-28:.1f}" height="16" rx="4" fill="#d97706" stroke="#92400e" stroke-width="1"/>
    {"".join(
        f'<text x="{px:.1f}" y="{PE_Y+14:.1f}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#14532d">PE{i+1}</text>'
        f'<text x="{px:.1f}" y="{PE_Y+27:.1f}" text-anchor="middle" font-size="8.6" font-weight="700" fill="#16a34a">{pe_roles[i]}</text>'
        f'<circle cx="{px:.1f}" cy="{pe_py:.1f}" r="5.6" fill="#fef08a" stroke="#78350f" stroke-width="1.3"/>'
        for i, px in enumerate(pe_pins)
    )}
    <rect x="{PE_X+BAR_W/2-70:.1f}" y="{PE_Y-22:.1f}" width="140" height="20" rx="5" fill="#15803d"/>
    <text x="{PE_X+BAR_W/2:.1f}" y="{PE_Y-8.5:.1f}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#ffffff">PE-BARA (TOPRAK)</text>
  </g>
''')

    # 5G. Kimlik Rozetleri
    def badge(cx: float, cy: float, txt: str, bg: str, bw: float = 136.0) -> str:
        return f'''
        <g>
          <rect x="{cx-bw/2:.1f}" y="{cy-14:.1f}" width="{bw:.1f}" height="28" rx="6" fill="{bg}" stroke="#ffffff" stroke-width="2"/>
          <text x="{cx:.1f}" y="{cy+4.5:.1f}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#ffffff">{txt}</text>
        </g>'''

    parts.append('<g id="badges" filter="url(#softShadow)">')
    parts.append(badge(1060 + 108, 474, "Q1 • 25A 3P (3M)", "#b91c1c", 162))
    parts.append(badge(1335 + 38, 474, "Q2 • 16A", "#8B4513", 92))
    parts.append(badge(1485 + 66, 488, "XN • 2,5 mm² MAVİ", "#1d4ed8", 148))
    parts.append('</g>')

    # 5H. Alt Giriş Rakoru & Bilgi Kartları
    parts.append(f'''
  <g id="bottom-gland-and-cards">
    <rect x="{IN_X-64:.1f}" y="{IN_Y-16:.1f}" width="128" height="26" rx="6" fill="#0B2540" stroke="#1F9D6B" stroke-width="1.8"/>
    <text x="{IN_X:.1f}" y="{IN_Y+1:.1f}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#ffffff">PG21 / M32 GİRİŞ</text>
    <text x="{IN_X+76:.1f}" y="{IN_Y+1:.1f}" font-size="10.5" font-weight="800" fill="#1F9D6B">▲ Bölge Panosu QF1 (5×4 / 5×6 mm²)</text>

    <!-- Alt Sol Kart -->
    <g filter="url(#cardShadow)">
      <rect x="64" y="1510" width="1020" height="236" rx="16" fill="#ffffff" stroke="#1d4ed8" stroke-width="2"/>
      <rect x="64" y="1510" width="1020" height="42" rx="16" fill="#eff6ff"/>
      <text x="574" y="1537" text-anchor="middle" font-size="14.5" font-weight="800" fill="#1d4ed8">İÇ BAĞLANTI ADIMLARI (BÖLGE PANOSU QF1 63A 4P 30mA BESLEMELİ)</text>
      <text x="90" y="1580" font-size="13" font-weight="800" fill="#0B2540">Giriş Kablosu: 5×4 mm² / 5×6 mm² (Alttan PG21/M32 IP68 Rakor ile)</text>
      <text x="90" y="1608" font-size="12.5" font-weight="700" fill="{C_L1}">• L1 (Kahve) → Q1:1 (ikiz yüksükle Q2:1 üstüne köprü) • Q1:2 → P1:L1 • Q2:2 → P2 &amp; P3 (L)</text>
      <text x="90" y="1634" font-size="12.5" font-weight="700" fill="{C_L2}">• L2 (Siyah)  → Q1:3 → Q1:4 → P1:L2 (Ön 32A CEE 2. Faz)</text>
      <text x="90" y="1660" font-size="12.5" font-weight="700" fill="{C_L3}">• L3 (Gri)    → Q1:5 → Q1:6 → P1:L3 (Ön 32A CEE 3. Faz)</text>
      <text x="90" y="1686" font-size="12.5" font-weight="700" fill="{C_N}">• N (Mavi)    → XN1 (2,5 mm² köprülü mavi ray klemensi) → XN1:P1 CEE, XN2:P2 Sol, XN3:P3 Sağ</text>
      <text x="90" y="1712" font-size="12.5" font-weight="700" fill="{C_PE}">• PE (Sr-Yşl) → PE-BARA (PE1) → PE2 (P1 CEE), PE3 (P2 Sol), PE4 (P3 Sağ), PE5 (Loop)</text>
    </g>

    <!-- Alt Sağ Kart -->
    <g filter="url(#cardShadow)">
      <rect x="1116" y="1510" width="1028" height="236" rx="16" fill="#ffffff" stroke="#1F9D6B" stroke-width="2"/>
      <rect x="1116" y="1510" width="1028" height="42" rx="16" fill="#ecfdf5"/>
      <text x="1630" y="1537" text-anchor="middle" font-size="14.5" font-weight="800" fill="#047857">MALZEME LİSTESİ (BOM) &amp; İÇ KABLO KESİTLERİ</text>
      <text x="1142" y="1580" font-size="12.5" font-weight="800" fill="#0B2540">1. Kutu: Bemis BD1-6130-2020 (V5 IP66 ABS, 120×255×122 mm, 5 Modül)</text>
      <text x="1142" y="1608" font-size="12.5" font-weight="700" fill="#b91c1c">2. Q1: 1× ABB S203-C25 (3P 25A — 3 Modül) • İç kablo: 4 mm² H07V-K</text>
      <text x="1142" y="1634" font-size="12.5" font-weight="700" fill="#1e293b">3. Q2: 1× ABB S201-C16 (1P 16A — 1 Modül) • İç kablo: 2,5 mm² H07V-K (P2 + P3)</text>
      <text x="1142" y="1660" font-size="12.5" font-weight="700" fill="#1d4ed8">4. XN: 3× 2,5 mm² Mavi DIN Ray Klemensi + 3'lü Köprü + Son Kapak (1 Modül = 15,6 mm)</text>
      <text x="1142" y="1686" font-size="12.5" font-weight="700" fill="#047857">5. PE-BARA (Yeşil izolatörlü toprak barası) + 1–2× PG21/M32 IP68 Rakor</text>
      <text x="1142" y="1712" font-size="11.8" font-weight="600" fill="#64748b">* Not: CEE prizde 25A dengesiz nötr yükü olacaksa N giriş + P1:N hattı 4 mm² önerilir.</text>
    </g>
  </g>
''')

    # =========================================================================
    # 6. ALT RENK LEJANTI & O2SERA ANTET
    # =========================================================================
    legend = [
        ("L1 Faz (4 / 2,5 mm²)", C_L1, None),
        ("L2 Faz (4 mm²)", C_L2, None),
        ("L3 Faz (4 mm²)", C_L3, None),
        ("Nötr — XN Mavi (2,5 mm²)", C_N, None),
        ("Toprak — PE (4 / 2,5 mm²)", C_PE, C_PE_S),
    ]
    lx = 82
    leg_svg = []
    for name, col, stp in legend:
        leg_svg.append(f'<rect x="{lx}" y="1798" width="24" height="8" rx="4" fill="{col}"/>')
        if stp:
            leg_svg.append(f'<line x1="{lx+2}" y1="1802" x2="{lx+22}" y2="1802" stroke="{stp}" stroke-width="5" stroke-dasharray="4 4"/>')
        leg_svg.append(f'<text x="{lx+32}" y="1806" font-size="12.2" font-weight="700" fill="#334155">{name}</text>')
        lx += 276

    parts.append(f'''
  <g id="footer">
    <rect x="56" y="1770" width="2088" height="64" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    {"".join(leg_svg)}
    <text x="2122" y="1806" text-anchor="end" font-size="13" font-weight="800" fill="#0B2540"><tspan fill="#1F9D6B">O2Sera</tspan> • Bemis BD1-6130-2020 (V5) Montaj Kılavuzu</text>
  </g>
</svg>''')

    return "\n".join(parts)


if __name__ == "__main__":
    svg = build_svg()
    OUT_SVG.write_text(svg, encoding="utf-8")
    print(f"Wrote SVG: {OUT_SVG} ({len(svg)} bytes)")
