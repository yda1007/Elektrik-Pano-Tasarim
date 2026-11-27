#!/usr/bin/env python3
"""
Novato broşür/kılavuz stilinde Bemis BH6-6000-0000 + ABB İkili Redüktör Motor
Kumanda Panosu görsel bağlantı diyagramı (SVG + yüksek çözünürlüklü PNG) üreticisi.
"""
import base64
import os
from pathlib import Path

BASE_DIR = Path("/home/yakup/Gemini-Projeler/kayitlar/Elektrik-Pano-Tasarim")
IMG_DIR = BASE_DIR / "gorseller"
OUT_SVG = BASE_DIR / "Bemis-ABB-Baglanti-Diyagrami.svg"


def b64_img(name: str) -> str:
    data = (IMG_DIR / name).read_bytes()
    return "data:image/png;base64," + base64.b64encode(data).decode("ascii")


def wire_path(pts: list[tuple[float, float]], color: str, width: float = 4.2, dashed: bool = False, stripe: str | None = None, radius: float = 10.0) -> str:
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
    dash_attr = ' stroke-dasharray="10 6"' if dashed else ""
    out = [
        f'<path d="{d}" fill="none" stroke="#ffffff" stroke-width="{width + 2.6:.1f}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.88"/>',
        f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width:.1f}" stroke-linecap="round" stroke-linejoin="round"{dash_attr}/>',
    ]
    if stripe:
        out.append(
            f'<path d="{d}" fill="none" stroke="{stripe}" stroke-width="{width:.1f}" stroke-dasharray="8 8" stroke-linecap="butt" stroke-linejoin="round"/>'
        )
    return "\n".join(out)


def sheath_path(pts: list[tuple[float, float]], width: float = 13.0) -> str:
    """Novato tarzı kalın siyah dış kablo kılıfı."""
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
        r = min(18.0, l1 / 2.2, l2 / 2.2)
        bx, by = x1 - v1x / l1 * r, y1 - v1y / l1 * r
        ax, ay = x1 + v2x / l2 * r, y1 + v2y / l2 * r
        d_parts.append(f"L {bx:.1f} {by:.1f} Q {x1:.1f} {y1:.1f} {ax:.1f} {ay:.1f}")
    d_parts.append(f"L {pts[-1][0]:.1f} {pts[-1][1]:.1f}")
    d = " ".join(d_parts)
    return (
        f'<path d="{d}" fill="none" stroke="#0f172a" stroke-width="{width:.1f}" stroke-linecap="round" stroke-linejoin="round"/>\n'
        f'<path d="{d}" fill="none" stroke="#334155" stroke-width="{max(2.0, width * 0.24):.1f}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.55"/>'
    )


def din_terminal_svg(x: float, y: float, w: float, h: float, label: str, fill: str = "#cbd5e1", accent: str = "#64748b") -> str:
    """Gerçekçi 3D gölgeli DIN ray klemensi."""
    cx = x + w / 2
    return f"""
    <g>
      <rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="3" fill="{fill}" stroke="#475569" stroke-width="1.2"/>
      <rect x="{x+2:.1f}" y="{y+3:.1f}" width="{w-4:.1f}" height="18" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.7"/>
      <rect x="{x+2:.1f}" y="{y+h-21:.1f}" width="{w-4:.1f}" height="18" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="0.7"/>
      <circle cx="{cx:.1f}" cy="{y+12:.1f}" r="4.8" fill="#64748b" stroke="#334155" stroke-width="1"/>
      <line x1="{cx-3:.1f}" y1="{y+12:.1f}" x2="{cx+3:.1f}" y2="{y+12:.1f}" stroke="#e2e8f0" stroke-width="1.2"/>
      <circle cx="{cx:.1f}" cy="{y+h-12:.1f}" r="4.8" fill="#64748b" stroke="#334155" stroke-width="1"/>
      <line x1="{cx-3:.1f}" y1="{y+h-12:.1f}" x2="{cx+3:.1f}" y2="{y+h-12:.1f}" stroke="#e2e8f0" stroke-width="1.2"/>
      <rect x="{x+3:.1f}" y="{y+h/2-14:.1f}" width="{w-6:.1f}" height="28" rx="2" fill="#ffffff" stroke="{accent}" stroke-width="1"/>
      <text x="{cx:.1f}" y="{y+h/2+4:.1f}" text-anchor="middle" font-size="{11 if w >= 24 else 9.5}" font-weight="800" fill="#0f172a">{label}</text>
    </g>"""


def build_svg() -> str:
    W, H = 2200, 2320

    img_ms132 = b64_img("abb_ms132.png")
    img_af09 = b64_img("abb_af09.png")
    img_relay = b64_img("relay_14pin.png")
    img_btn = b64_img("button_updown.png")
    img_motor = b64_img("gear_motor.png")

    # Standart kablo renkleri (beyaz zemin için yüksek kontrastlı)
    C_L1 = "#9A4A12"   # Kahverengi Faz L1
    C_L2 = "#1E293B"   # Siyah Faz L2
    C_L3 = "#64748B"   # Gri Faz L3
    C_N  = "#1D4ED8"   # Mavi Nötr
    C_PE = "#16A34A"   # Yeşil (+ Sarı şerit) Toprak PE
    C_PE_S = "#FACC15"
    C_LU = "#059669"   # Limit Yukarı (Yeşil)
    C_LD = "#DB2777"   # Limit Aşağı (Pembe)
    C_IL1 = "#65A30D"  # Kilitleme 1 (Açık Yeşil)
    C_IL2 = "#EA580C"  # Kilitleme 2 (Turuncu — beyaz zemin üstünde okunaklı)
    C_CMD = "#DC2626"  # Kumanda / Manuel (Kırmızı)

    parts: list[str] = []
    parts.append(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <style>
      text {{ font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif; }}
    </style>
    <filter id="cardShadow" x="-8%" y="-8%" width="118%" height="118%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.12"/>
    </filter>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.16"/>
    </filter>
    <linearGradient id="bemisBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="bemisInner" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#eef2f6"/>
    </linearGradient>
    <linearGradient id="dinRail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="22%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="82%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="pgGland" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="30%" stop-color="#cbd5e1"/>
      <stop offset="70%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <marker id="arrUp" viewBox="0 0 10 10" refX="5" refY="2" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 1 9 L 5 1 L 9 9 z" fill="context-stroke"/>
    </marker>
    <marker id="arrDn" viewBox="0 0 10 10" refX="5" refY="8" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 1 1 L 5 9 L 9 1 z" fill="context-stroke"/>
    </marker>
  </defs>

  <!-- SAF BEYAZ BROŞÜR ZEMİNİ -->
  <rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>
''')

    # =========================================================================
    # 1. BAŞLIK BANDI
    # =========================================================================
    parts.append(f'''
  <g>
    <rect x="60" y="32" width="10" height="58" rx="4" fill="#dc2626"/>
    <text x="86" y="60" font-size="28" font-weight="800" fill="#0f172a">BEMİS BH6-6000-0000 — ABB İKİLİ REDÜKTÖR MOTOR KUMANDA PANOSU</text>
    <text x="86" y="86" font-size="15.5" font-weight="500" fill="#475569">3~ 400V / 230V AC • 2× ABB MS132 (MKŞ) • 4× ABB AF09-30-01 • 14 Pin Mini Röle (Oto/Man) • 2× Mutlusan SW-BL4252 • PG 36 Rakor</text>
    <rect x="1910" y="36" width="230" height="50" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="2025" y="58" text-anchor="middle" font-size="13" font-weight="800" fill="#dc2626">ABB ŞALT • IP66</text>
    <text x="2025" y="76" text-anchor="middle" font-size="12" font-weight="600" fill="#334155">245 × 325 × 138 mm</text>
    <line x1="60" y1="106" x2="2140" y2="106" stroke="#e2e8f0" stroke-width="2"/>
  </g>
''')

    # =========================================================================
    # 2. ÜST TEKNİK KLEMENS ŞEMASI (NOVATO ÜST BANT TARZI)
    # =========================================================================
    parts.append('<g id="top-terminal-diagrams">')

    # 2A. Sol Blok: Üst Ray Güç Klemensleri (X1-X3) + Dahili N & PE Baraları
    tx, ty, cw, ch = 75, 165, 68, 42
    top_terms = [
        ("X1", "L1", C_L1, "Faz L1"),
        ("X2", "L2", C_L2, "Faz L2"),
        ("X3", "L3", C_L3, "Faz L3"),
        ("N", "N1–N4", C_N, "Nötr Bara"),
        ("PE", "PE1–PE3", C_PE, "Toprak"),
    ]
    parts.append(f'<text x="{tx}" y="138" font-size="14" font-weight="800" fill="#0f172a">1) ANA BESLEME &amp; ÜST RAY KLEMENSİ (5×2,5 mm²)</text>')
    for i, (code, top_lbl, col, bot_lbl) in enumerate(top_terms):
        bx = tx + i * cw
        cx = bx + cw / 2
        parts.append(f'<text x="{cx:.1f}" y="{ty - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="{col}">{top_lbl}</text>')
        parts.append(f'<rect x="{bx}" y="{ty}" width="{cw}" height="{ch}" fill="#ffffff" stroke="#334155" stroke-width="1.6"/>')
        parts.append(f'<text x="{cx:.1f}" y="{ty + 27}" text-anchor="middle" font-size="16" font-weight="800" fill="#0f172a">{code}</text>')
        # Renkli giriş oku
        parts.append(f'<line x1="{cx:.1f}" y1="{ty + ch + 40}" x2="{cx:.1f}" y2="{ty + ch + 4}" stroke="{col}" stroke-width="3.5"/>')
        parts.append(f'<polygon points="{cx:.1f},{ty + ch + 3} {cx-6:.1f},{ty + ch + 15} {cx+6:.1f},{ty + ch + 15}" fill="{col}"/>')
        parts.append(f'<text x="{cx:.1f}" y="{ty + ch + 58}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#334155">{bot_lbl}</text>')
    parts.append(f'<text x="{tx + 170}" y="{ty + ch + 86}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#0f172a">3~ 400V / 230V AC Besleme → Q1 &amp; Q2 (1L1-3L2-5L3)</text>')

    # 2B. Orta Blok: Alt Ray Saha Klemensleri (X4 - X12)
    mx, my, mcw = 515, 165, 92
    alt_terms = [
        ("X4", "KM1:A2", C_LU, "M1 L↑"),
        ("X5", "KM2:A2", C_LD, "M1 L↓"),
        ("X6", "R1:1 NC1", C_L1, "SK D1"),
        ("X7", "R1:2 NC2", C_L2, "SK D2"),
        ("X8", "R1:3 NC3", C_L3, "SK D3"),
        ("X9", "R1:4 NC4", C_N, "SK D4"),
        ("X10", "R1:13 A1", C_PE, "Oto/Man"),
        ("X11", "KM3:A2", C_LU, "M2 L↑"),
        ("X12", "KM4:A2", C_LD, "M2 L↓"),
    ]
    parts.append(f'<text x="{mx}" y="138" font-size="14" font-weight="800" fill="#0f172a">2) ALT RAY SAHA KLEMENSİ (X4–X12 • 2,5 mm²)</text>')
    for i, (code, top_lbl, col, bot_lbl) in enumerate(alt_terms):
        bx = mx + i * mcw
        cx = bx + mcw / 2
        parts.append(f'<text x="{cx:.1f}" y="{my - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">{top_lbl}</text>')
        parts.append(f'<rect x="{bx}" y="{my}" width="{mcw}" height="{ch}" fill="#ffffff" stroke="#334155" stroke-width="1.6"/>')
        parts.append(f'<text x="{cx:.1f}" y="{my + 27}" text-anchor="middle" font-size="15.5" font-weight="800" fill="#0f172a">{code}</text>')
        parts.append(f'<line x1="{cx:.1f}" y1="{my + ch + 4}" x2="{cx:.1f}" y2="{my + ch + 38}" stroke="{col}" stroke-width="3.2"/>')
        parts.append(f'<polygon points="{cx:.1f},{my + ch + 40} {cx-5.5:.1f},{my + ch + 28} {cx+5.5:.1f},{my + ch + 28}" fill="{col}"/>')
        parts.append(f'<text x="{cx:.1f}" y="{my + ch + 56}" text-anchor="middle" font-size="11.5" font-weight="700" fill="{col}">{bot_lbl}</text>')
    # Alt parantezler (M1 Limit | Sektör Kumanda 1&2 | M2 Limit)
    parts.append(f'<path d="M {mx+12} {my+ch+66} L {mx+12} {my+ch+74} L {mx+2*mcw-12} {my+ch+74} L {mx+2*mcw-12} {my+ch+66}" fill="none" stroke="#0f172a" stroke-width="1.4"/>')
    parts.append(f'<text x="{mx+mcw}" y="{my+ch+90}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">M1 Limit Dönüş</text>')
    parts.append(f'<path d="M {mx+2*mcw+12} {my+ch+66} L {mx+2*mcw+12} {my+ch+74} L {mx+7*mcw-12} {my+ch+74} L {mx+7*mcw-12} {my+ch+66}" fill="none" stroke="#db2777" stroke-width="1.6"/>')
    parts.append(f'<text x="{mx+4.5*mcw}" y="{my+ch+90}" text-anchor="middle" font-size="12" font-weight="800" fill="#be185d">Sektör Kumanda 1 &amp; 2 (2× 5×1 mm² Paralel)</text>')
    parts.append(f'<path d="M {mx+7*mcw+12} {my+ch+66} L {mx+7*mcw+12} {my+ch+74} L {mx+9*mcw-12} {my+ch+74} L {mx+9*mcw-12} {my+ch+66}" fill="none" stroke="#0f172a" stroke-width="1.4"/>')
    parts.append(f'<text x="{mx+8*mcw}" y="{my+ch+90}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">M2 Limit Dönüş</text>')

    # 2C. Sağ Blok: 14 Pin Röle (R1) + Kilitleme Özeti
    rx, ry = 1415, 138
    parts.append(f'''
    <text x="{rx}" y="{ry}" font-size="14" font-weight="800" fill="#0f172a">3) 14 PİN RÖLE (R1) &amp; KİLİTLEME MANTIĞI</text>
    <rect x="{rx}" y="152" width="710" height="148" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="{rx+18}" y="178" font-size="12.5" font-weight="800" fill="#7c3aed">• NC (1–4) → Otomatik Sektör:</text>
    <text x="{rx+240}" y="178" font-size="12.5" fill="#334155">1←X6 (M1↓)  |  2←X7 (M1↑)  |  3←X8 (M2↓)  |  4←X9 (M2↑)</text>
    <text x="{rx+18}" y="204" font-size="12.5" font-weight="800" fill="#059669">• NO (5–8) → Manuel Butonlar:</text>
    <text x="{rx+240}" y="204" font-size="12.5" fill="#334155">5←S1:14 (▲) |  6←S1:24 (▼) |  7←S2:14 (▲) |  8←S2:24 (▼)</text>
    <text x="{rx+18}" y="230" font-size="12.5" font-weight="800" fill="#0284c7">• COM (9–12) → Kontaktörler:</text>
    <text x="{rx+240}" y="230" font-size="12.5" fill="#334155">9→KM2:22    |  10→KM1:22   |  11→KM4:22   |  12→KM3:22</text>
    <text x="{rx+18}" y="256" font-size="12.5" font-weight="800" fill="#dc2626">• Bobin (13–14) &amp; Kilit (21–22):</text>
    <text x="{rx+240}" y="256" font-size="12.5" fill="#334155">13(A1)←X10, 14(A2)→N4  •  KM1↔KM2 ve KM3↔KM4 NC Kilitli</text>
    <text x="{rx+18}" y="284" font-size="12" font-weight="700" fill="#475569">Ters Yön Faz Çevirme (Alt Çıkış): KM1(2-4-6) ↔ KM2(4-2-6)  •  KM3(2-4-6) ↔ KM4(4-2-6)</text>
    ''')
    parts.append('</g>')

    # Ayırıcı çizgi
    parts.append('<line x1="60" y1="322" x2="2140" y2="322" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6 4"/>')

    # =========================================================================
    # 3. MERKEZ — GERÇEKÇİ BEMİS BH6-6000-0000 PANO GÖVDESİ + ABB ELEMANLAR
    # =========================================================================
    EX, EY, EW, EH = 410, 360, 1380, 1140  # Pano kutusu (ortalanmış, X: 410..1790, Y: 360..1500)
    parts.append(f'''
  <g id="bemis-enclosure" filter="url(#cardShadow)">
    <!-- Dış ABS Kasa -->
    <rect x="{EX}" y="{EY}" width="{EW}" height="{EH}" rx="34" fill="url(#bemisBody)" stroke="#94a3b8" stroke-width="3"/>
    <!-- Kapak Conta Yivi -->
    <rect x="{EX+22}" y="{EY+22}" width="{EW-44}" height="{EH-44}" rx="22" fill="none" stroke="#cbd5e1" stroke-width="2.5"/>
    <!-- İç Montaj Hacmi -->
    <rect x="{EX+44}" y="{EY+44}" width="{EW-88}" height="{EH-88}" rx="14" fill="url(#bemisInner)" stroke="#94a3b8" stroke-width="1.5"/>
    <!-- 4 Köşe Paslanmaz Kapak Vidası -->
    {"".join(f'<g><circle cx="{vx}" cy="{vy}" r="14" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/><line x1="{vx-7}" y1="{vy}" x2="{vx+7}" y2="{vy}" stroke="#475569" stroke-width="2.5"/><line x1="{vx}" y1="{vy-7}" x2="{vx}" y2="{vy+7}" stroke="#475569" stroke-width="2.5"/></g>' for vx, vy in [(EX+32, EY+32), (EX+EW-32, EY+32), (EX+32, EY+EH-32), (EX+EW-32, EY+EH-32)])}
    <!-- Bemis Kabartma Etiketi -->
    <text x="{EX+EW/2}" y="{EY+35}" text-anchor="middle" font-size="13" font-weight="800" fill="#64748b" letter-spacing="2">BEMİS BH6-6000-0000 • V12 IP66 HALOJEN FREE ABS</text>
  </g>
''')

    # Dahili Nötr (N) ve Toprak (PE) Pirinç Klemens Baraları (Üst iç yuva)
    N_X, N_Y, BAR_W, BAR_H = 540, 412, 300, 38
    PE_X, PE_Y = 1360, 412
    n_pins = [N_X + 35 + i * 46 for i in range(6)]
    pe_pins = [PE_X + 35 + i * 46 for i in range(6)]
    parts.append(f'''
  <g id="n-pe-bars">
    <!-- NÖTR BARA (MAVİ) -->
    <rect x="{N_X}" y="{N_Y}" width="{BAR_W}" height="{BAR_H}" rx="7" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <rect x="{N_X+14}" y="{N_Y+6}" width="{BAR_W-28}" height="14" rx="3" fill="#d97706" stroke="#92400e" stroke-width="1"/>
    {"".join(f'<circle cx="{px}" cy="{N_Y+13}" r="5.2" fill="#fef08a" stroke="#78350f" stroke-width="1.2"/><text x="{px}" y="{N_Y+33}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#1e3a8a">N{i+1}</text>' for i, px in enumerate(n_pins))}
    <text x="{N_X - 12}" y="{N_Y+24}" text-anchor="end" font-size="12.5" font-weight="800" fill="#1d4ed8">N-BARA</text>

    <!-- TOPRAK BARA (YEŞİL) -->
    <rect x="{PE_X}" y="{PE_Y}" width="{BAR_W}" height="{BAR_H}" rx="7" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
    <rect x="{PE_X+14}" y="{PE_Y+6}" width="{BAR_W-28}" height="14" rx="3" fill="#d97706" stroke="#92400e" stroke-width="1"/>
    {"".join(f'<circle cx="{px}" cy="{PE_Y+13}" r="5.2" fill="#fef08a" stroke="#78350f" stroke-width="1.2"/><text x="{px}" y="{PE_Y+33}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#14532d">PE{i+1}</text>' for i, px in enumerate(pe_pins))}
    <text x="{PE_X + BAR_W + 12}" y="{PE_Y+24}" text-anchor="start" font-size="12.5" font-weight="800" fill="#15803d">PE-BARA</text>
  </g>
''')

    # İki Adet 35 mm Metalik DIN Rayı
    R1_CY = 700
    R2_CY = 1145
    RAIL_X1, RAIL_W = EX + 74, EW - 148
    for r_cy in [R1_CY, R2_CY]:
        slots = "".join(f'<rect x="{RAIL_X1 + 26 + k*78}" y="{r_cy - 5}" width="38" height="10" rx="5" fill="#64748b"/>' for k in range(15))
        parts.append(f'''
  <g>
    <rect x="{RAIL_X1}" y="{r_cy - 26}" width="{RAIL_W}" height="52" rx="3" fill="url(#dinRail)" stroke="#475569" stroke-width="1.4"/>
    {slots}
  </g>''')

    # =========================================================================
    # 4. GERÇEKÇİ BİLEŞENLERİN KONUMLARI VE PİN KOORDİNATLARI
    # =========================================================================
    # ÜST RAY: Q1 (ABB MS132), Q2 (ABB MS132), R1 (14 Pin Röle), X1-X2-X3 (6 mm² Klemens)
    Q1_X, Q1_Y, Q_W, Q_H = 560, 550, 195, 300
    Q2_X, Q2_Y = 820, 550
    RL_X, RL_Y, RL_W, RL_H = 1110, 545, 175, 310
    TX1_X, TX1_Y, T1_W, T1_H = 1410, 615, 42, 170  # X1, X2, X3

    # ALT RAY: KM1, KM2 (ABB AF09) | X4..X12 (9× 2,5 mm² Klemens) | KM3, KM4 (ABB AF09)
    KM_W, KM_H = 175, 250
    KM1_X, KM_Y = 515, 1020
    KM2_X = 710
    TX4_X, TX4_Y, T2_W, T2_H = 928, 1065, 38, 160  # 9 * 38 = 342 -> 928..1270
    KM3_X = 1315
    KM4_X = 1510

    # SOL & SAĞ YAN DUVAR: Mutlusan SW-BL4252 İkiz Butonlar (S1, S2)
    S1_X, S1_Y, S_W, S_H = 145, 760, 145, 230
    S2_X, S2_Y = 1910, 760

    # Pin koordinat yardımcıları (doğrudan ürün fotoğraflarının vida merkezlerine hizalı!)
    def q_top(qx: float, idx: int) -> tuple[float, float]:
        # 3 üst vida: 1L1, 3L2, 5L3
        return (qx + Q_W * [0.24, 0.50, 0.76][idx], Q1_Y + 26)

    def q_bot(qx: float, idx: int) -> tuple[float, float]:
        # 3 alt vida: 2T1, 4T2, 6T3
        return (qx + Q_W * [0.24, 0.50, 0.76][idx], Q1_Y + Q_H - 30)

    def km_top(kx: float, idx: int) -> tuple[float, float]:
        # 4 üst vida: 1L1, 3L2, 5L3, 21NC (ve A1 bobin üst-sağ/iç yan)
        return (kx + KM_W * [0.16, 0.39, 0.62, 0.85][idx], KM_Y + 34)

    def km_bot(kx: float, idx: int) -> tuple[float, float]:
        # 4 alt vida: 2T1, 4T2, 6T3, 22NC
        return (kx + KM_W * [0.16, 0.39, 0.62, 0.85][idx], KM_Y + KM_H - 32)

    def km_a1(kx: float) -> tuple[float, float]:
        return (kx + KM_W * 0.92, KM_Y + 12)

    def km_a2(kx: float) -> tuple[float, float]:
        return (kx + KM_W * 0.92, KM_Y + KM_H - 12)

    def r1_nc(idx: int) -> tuple[float, float]:  # 1..4 (en üst sıra)
        return (RL_X + RL_W * [0.22, 0.41, 0.59, 0.78][idx], RL_Y + 22)

    def r1_no(idx: int) -> tuple[float, float]:  # 5..8 (ikinci üst sıra)
        return (RL_X + RL_W * [0.22, 0.41, 0.59, 0.78][idx], RL_Y + 56)

    def r1_com(idx: int) -> tuple[float, float]:  # 9..12 (üst alt sıra)
        return (RL_X + RL_W * [0.22, 0.41, 0.59, 0.78][idx], RL_Y + RL_H - 58)

    def r1_coil(idx: int) -> tuple[float, float]:  # 13 (A1), 14 (A2) en alt sıra
        return (RL_X + RL_W * [0.39, 0.61][idx], RL_Y + RL_H - 22)

    def xt_top(idx: int) -> tuple[float, float]:
        return (TX1_X + idx * T1_W + T1_W / 2, TX1_Y + 12)

    def xt_bot(idx: int) -> tuple[float, float]:
        return (TX1_X + idx * T1_W + T1_W / 2, TX1_Y + T1_H - 12)

    def xb_top(idx: int) -> tuple[float, float]:  # 0=X4 .. 8=X12
        return (TX4_X + idx * T2_W + T2_W / 2, TX4_Y + 12)

    def xb_bot(idx: int) -> tuple[float, float]:
        return (TX4_X + idx * T2_W + T2_W / 2, TX4_Y + T2_H - 12)

    # Önce bileşen görsellerini yerleştir (kabloların bir kısmı üstten vidalara girecek, arkadan gelenler altta kalacak)
    parts.append('<g id="components" filter="url(#softShadow)">')
    # Q1 & Q2 (ABB MS132)
    parts.append(f'<image href="{img_ms132}" x="{Q1_X}" y="{Q1_Y}" width="{Q_W}" height="{Q_H}" preserveAspectRatio="xMidYMid meet"/>')
    parts.append(f'<image href="{img_ms132}" x="{Q2_X}" y="{Q2_Y}" width="{Q_W}" height="{Q_H}" preserveAspectRatio="xMidYMid meet"/>')
    # R1 (14 Pin Röle)
    parts.append(f'<image href="{img_relay}" x="{RL_X}" y="{RL_Y}" width="{RL_W}" height="{RL_H}" preserveAspectRatio="xMidYMid meet"/>')
    # X1, X2, X3
    for i, lbl in enumerate(["X1", "X2", "X3"]):
        parts.append(din_terminal_svg(TX1_X + i * T1_W, TX1_Y, T1_W, T1_H, lbl, "#cbd5e1", [C_L1, C_L2, C_L3][i]))

    # KM1, KM2, KM3, KM4 (ABB AF09-30-01)
    for kx in [KM1_X, KM2_X, KM3_X, KM4_X]:
        parts.append(f'<image href="{img_af09}" x="{kx}" y="{KM_Y}" width="{KM_W}" height="{KM_H}" preserveAspectRatio="xMidYMid meet"/>')
    # X4..X12
    xb_accents = [C_LU, C_LD, C_L1, C_L2, C_L3, C_N, C_PE, C_LU, C_LD]
    for i in range(9):
        parts.append(din_terminal_svg(TX4_X + i * T2_W, TX4_Y, T2_W, T2_H, f"X{4+i}", "#e2e8f0", xb_accents[i]))
    parts.append('</g>')

    # Bileşen Kimlik Rozetleri yardımcısı (kablolardan SONRA üst katmana çizilecek)
    def badge(cx: float, cy: float, code: str, sub: str, bg: str = "#0f172a") -> str:
        return f'''
        <g>
          <rect x="{cx-56:.1f}" y="{cy-14:.1f}" width="112" height="28" rx="6" fill="{bg}" stroke="#ffffff" stroke-width="2.2"/>
          <text x="{cx:.1f}" y="{cy+4.5:.1f}" text-anchor="middle" font-size="12.5" font-weight="800" fill="#ffffff">{code} • {sub}</text>
        </g>'''

    # Sol & Sağ Mutlusan SW-BL4252 İkiz Buton Kartları
    parts.append(f'''
  <g id="side-buttons" filter="url(#cardShadow)">
    <rect x="{S1_X - 30}" y="{S1_Y - 56}" width="{S_W + 60}" height="{S_H + 112}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="{S1_X + S_W/2}" y="{S1_Y - 30}" text-anchor="middle" font-size="16" font-weight="800" fill="#0f172a">S1 (SOL DUVAR)</text>
    <text x="{S1_X + S_W/2}" y="{S1_Y - 12}" text-anchor="middle" font-size="12" font-weight="600" fill="#059669">Mutlusan SW-BL4252</text>
    <image href="{img_btn}" x="{S1_X}" y="{S1_Y}" width="{S_W}" height="{S_H}" preserveAspectRatio="xMidYMid meet"/>
    <text x="{S1_X + S_W/2}" y="{S1_Y + S_H + 24}" text-anchor="middle" font-size="12.5" font-weight="800" fill="#334155">M1 Manuel ▲ / ▼</text>
    <text x="{S1_X + S_W/2}" y="{S1_Y + S_H + 42}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#64748b">13-23←Q1:2 • 14→R1:5, 24→R1:6</text>

    <rect x="{S2_X - 30}" y="{S2_Y - 56}" width="{S_W + 60}" height="{S_H + 112}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="{S2_X + S_W/2}" y="{S2_Y - 30}" text-anchor="middle" font-size="16" font-weight="800" fill="#0f172a">S2 (SAĞ DUVAR)</text>
    <text x="{S2_X + S_W/2}" y="{S2_Y - 12}" text-anchor="middle" font-size="12" font-weight="600" fill="#059669">Mutlusan SW-BL4252</text>
    <image href="{img_btn}" x="{S2_X}" y="{S2_Y}" width="{S_W}" height="{S_H}" preserveAspectRatio="xMidYMid meet"/>
    <text x="{S2_X + S_W/2}" y="{S2_Y + S_H + 24}" text-anchor="middle" font-size="12.5" font-weight="800" fill="#334155">M2 Manuel ▲ / ▼</text>
    <text x="{S2_X + S_W/2}" y="{S2_Y + S_H + 42}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#64748b">13-23←Q2:2 • 14→R1:7, 24→R1:8</text>
  </g>
''')

    # =========================================================================
    # 5. PANO İÇİ GERÇEKÇİ KABLO BAĞLANTILARI (80 HAT ÖZETLENMİŞ TEMİZ DEMETLER)
    # =========================================================================
    parts.append('<g id="internal-wiring">')

    # 5A. Üst Ray Güç Dağıtımı: X1-X2-X3 üst → Q1 (1,3,5) → Q2 (1,3,5)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_bus = 502 + i * 7
        txp = xt_top(i)
        q1p = q_top(Q1_X, i)
        q2p = q_top(Q2_X, i)
        parts.append(wire_path([txp, (txp[0], y_bus), (q1p[0], y_bus), q1p], col, 4.2))
        parts.append(wire_path([(q2p[0], y_bus), q2p], col, 4.2))
        parts.append(f'<circle cx="{q2p[0]:.1f}" cy="{y_bus:.1f}" r="4.4" fill="{col}" stroke="#ffffff" stroke-width="1.5"/>')

    # 5B. Q1 alt (2,4,6) → KM1 & KM2 üst (1,3,5)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_mid = 918 + i * 10
        q1b = q_bot(Q1_X, i)
        k1t = km_top(KM1_X, i)
        k2t = km_top(KM2_X, i)
        parts.append(wire_path([q1b, (q1b[0], y_mid), (k1t[0], y_mid), k1t], col, 4.0))
        parts.append(wire_path([(k2t[0], y_mid), k2t], col, 4.0))
        parts.append(f'<circle cx="{k2t[0]:.1f}" cy="{y_mid:.1f}" r="4.2" fill="{col}" stroke="#ffffff" stroke-width="1.4"/>')

    # 5C. Q2 alt (2,4,6) → KM3 & KM4 üst (1,3,5)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_mid = 948 + i * 10
        q2b = q_bot(Q2_X, i)
        k3t = km_top(KM3_X, i)
        k4t = km_top(KM4_X, i)
        parts.append(wire_path([q2b, (q2b[0], y_mid), (k4t[0], y_mid), k4t], col, 4.0))
        parts.append(wire_path([(k3t[0], y_mid), k3t], col, 4.0))
        parts.append(f'<circle cx="{k3t[0]:.1f}" cy="{y_mid:.1f}" r="4.2" fill="{col}" stroke="#ffffff" stroke-width="1.4"/>')

    # 5D. Ters Yön Faz Çevirme Köprüleri (KM1↔KM2 ve KM3↔KM4 alt uçlar: 2↔4, 4↔2, 6↔6)
    for (k_left, k_right) in [(KM1_X, KM2_X), (KM3_X, KM4_X)]:
        # 2 -> 4 (Kahve), 4 -> 2 (Siyah), 6 -> 6 (Gri) — KM rozetlerinin (y=1284) altında temiz bant
        parts.append(wire_path([km_bot(k_left, 0), (km_bot(k_left, 0)[0], 1318), (km_bot(k_right, 1)[0], 1318), km_bot(k_right, 1)], C_L1, 3.6))
        parts.append(wire_path([km_bot(k_left, 1), (km_bot(k_left, 1)[0], 1328), (km_bot(k_right, 0)[0], 1328), km_bot(k_right, 0)], C_L2, 3.6))
        parts.append(wire_path([km_bot(k_left, 2), (km_bot(k_left, 2)[0], 1338), (km_bot(k_right, 2)[0], 1338), km_bot(k_right, 2)], C_L3, 3.6))

    # 5E. Elektriksel Kilitleme (KM1:21↔KM2:A1, KM2:21↔KM1:A1 ve KM3↔KM4)
    for (k_left, k_right) in [(KM1_X, KM2_X), (KM3_X, KM4_X)]:
        parts.append(wire_path([km_top(k_left, 3), (km_top(k_left, 3)[0], 998), (km_a1(k_right)[0], 998), km_a1(k_right)], C_IL2, 3.0))
        parts.append(wire_path([km_a1(k_left), (km_a1(k_left)[0], 1008), (km_top(k_right, 3)[0], 1008), km_top(k_right, 3)], C_IL1, 3.0))

    # 5F. Alt Klemens Limit Dönüşleri → Kontaktör A2 (X4→KM1:A2, X5→KM2:A2, X11→KM3:A2, X12→KM4:A2)
    parts.append(wire_path([xb_top(0), (xb_top(0)[0], 1036), (km_a2(KM1_X)[0] + 14, 1036), (km_a2(KM1_X)[0] + 14, km_a2(KM1_X)[1]), km_a2(KM1_X)], C_LU, 3.0))
    parts.append(wire_path([xb_top(1), (xb_top(1)[0], 1046), (km_a2(KM2_X)[0] + 10, 1046), (km_a2(KM2_X)[0] + 10, km_a2(KM2_X)[1]), km_a2(KM2_X)], C_LD, 3.0))
    parts.append(wire_path([xb_top(7), (xb_top(7)[0], 1046), (km_a2(KM3_X)[0] + 10, 1046), (km_a2(KM3_X)[0] + 10, km_a2(KM3_X)[1]), km_a2(KM3_X)], C_LU, 3.0))
    parts.append(wire_path([xb_top(8), (xb_top(8)[0], 1036), (km_a2(KM4_X)[0] + 10, 1036), (km_a2(KM4_X)[0] + 10, km_a2(KM4_X)[1]), km_a2(KM4_X)], C_LD, 3.0))

    # 5G. Sektör Kumanda Girişleri (X6-X9 → R1 NC 1-4, X10 → R1:13 A1, R1:14 A2 → N4)
    for i, col in enumerate([C_L1, C_L2, C_L3, C_N]):
        xbp = xb_top(2 + i)  # X6..X9
        rnc = r1_nc(i)
        x_ch = 1042 + i * 11
        y_top = 466 + i * 6
        parts.append(wire_path([xbp, (xbp[0], 976 + i * 6), (x_ch, 976 + i * 6), (x_ch, y_top), (rnc[0], y_top), rnc], col, 2.8))
    # X10 -> R1:13 (Oto/Man bobin)
    parts.append(wire_path([xb_top(6), (xb_top(6)[0], 878), (r1_coil(0)[0], 878), r1_coil(0)], C_PE, 3.0))
    # R1:14 -> N4 (Mavi)
    parts.append(wire_path([r1_coil(1), (r1_coil(1)[0], 860), (1026, 860), (1026, 456), (n_pins[3], 456), (n_pins[3], N_Y + 14)], C_N, 3.0))

    # 5H. R1 COM (9-12) → Kontaktör NC 22 (9→KM2:22, 10→KM1:22, 11→KM4:22, 12→KM3:22)
    com_targets = [
        (0, KM2_X, C_L1, 1356),
        (1, KM1_X, C_L2, 1366),
        (2, KM4_X, C_L3, 1366),
        (3, KM3_X, C_N,  1356),
    ]
    for c_idx, kx, col, y_ret in com_targets:
        rc = r1_com(c_idx)
        kb = km_bot(kx, 3)
        x_lane = 1286 + c_idx * 9 if kx >= KM3_X else 898 - c_idx * 9
        parts.append(wire_path([rc, (rc[0], 886 + c_idx * 7), (x_lane, 886 + c_idx * 7), (x_lane, y_ret), (kb[0], y_ret), kb], col, 2.7))

    # 5I. Yan Buton Kabloları (S1 Sol -> Q1:2 & R1:5,6 | S2 Sağ -> Q2:2 & R1:7,8) — %100 90° dik açılı
    s1_out_x = S1_X + S_W + 30
    q1_2 = q_bot(Q1_X, 0)
    parts.append(sheath_path([(s1_out_x, 875), (EX + 55, 875)], 11))
    parts.append(wire_path([(EX + 55, 868), (q1_2[0], 868), q1_2], C_L1, 3.2))
    parts.append(wire_path([(EX + 55, 875), (484, 875), (484, 490), (r1_no(0)[0], 490), r1_no(0)], C_CMD, 3.0))
    parts.append(wire_path([(EX + 55, 882), (472, 882), (472, 496), (r1_no(1)[0], 496), r1_no(1)], C_L2, 3.0))

    s2_in_x = S2_X - 30
    q2_2 = q_bot(Q2_X, 0)
    parts.append(sheath_path([(s2_in_x, 875), (EX + EW - 55, 875)], 11))
    parts.append(wire_path([(EX + EW - 55, 868), (q2_2[0], 868), q2_2], C_L1, 3.2))
    parts.append(wire_path([(EX + EW - 55, 875), (1724, 875), (1724, 490), (r1_no(2)[0], 490), r1_no(2)], C_L3, 3.0))
    parts.append(wire_path([(EX + EW - 55, 882), (1736, 882), (1736, 496), (r1_no(3)[0], 496), r1_no(3)], C_N, 3.0))

    # 5J. Pano İçinden PG 36 Rakor Girişine Toplanan Ana Kablo Demetleri
    GLAND_X = 1100
    GLAND_TOP_Y = EY + EH - 44

    # Besleme 5x2.5 içten rakora (X1-X3 alt + N1 + PE1 -> PG36)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        xb = xt_bot(i)
        parts.append(wire_path([xb, (xb[0], 822 + i * 9), (1696 - i * 10, 822 + i * 9), (1696 - i * 10, 1418 + i * 8), (GLAND_X - 36 + i * 8, 1418 + i * 8), (GLAND_X - 36 + i * 8, GLAND_TOP_Y + 30)], col, 3.8))
    parts.append(wire_path([(n_pins[0], N_Y + 14), (n_pins[0], 462), (496, 462), (496, 1412), (GLAND_X - 12, 1412), (GLAND_X - 12, GLAND_TOP_Y + 30)], C_N, 3.8))
    parts.append(wire_path([(pe_pins[0], PE_Y + 14), (pe_pins[0], 462), (1706, 462), (1706, 1442), (GLAND_X - 4, 1442), (GLAND_X - 4, GLAND_TOP_Y + 30)], C_PE, 3.8, stripe=C_PE_S))

    # Alt klemensler X4..X12 alt uçlarından rakora temiz iniş
    for i, col in enumerate(xb_accents):
        p = xb_bot(i)
        gx = GLAND_X - 24 + i * 6
        y_join = 1384 + (i % 3) * 8
        parts.append(wire_path([p, (p[0], y_join), (gx, y_join), (gx, GLAND_TOP_Y + 30)], col, 3.0))

    # KM1 (M1 U-V-W) ve KM3 (M2 U-V-W) çıkışlarından rakora
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        p1 = km_bot(KM1_X, i)
        parts.append(wire_path([p1, (p1[0], 1394 + i * 8), (GLAND_X + 18 + i * 6, 1394 + i * 8), (GLAND_X + 18 + i * 6, GLAND_TOP_Y + 30)], col, 3.5))
        p3 = km_bot(KM3_X, i)
        parts.append(wire_path([p3, (p3[0], 1402 + i * 8), (GLAND_X + 34 + i * 5, 1402 + i * 8), (GLAND_X + 34 + i * 5, GLAND_TOP_Y + 30)], col, 3.5))

    parts.append('</g>')

    # Bileşen Kimlik Rozetleri — EN ÜST KATMAN (kabloların üstünde, sıfır kesme!)
    parts.append('<g id="badges-top" filter="url(#softShadow)">')
    parts.append(badge(Q1_X + Q_W / 2, 535, "Q1", "M1 MKŞ", "#0369a1"))
    parts.append(badge(Q2_X + Q_W / 2, 535, "Q2", "M2 MKŞ", "#0369a1"))
    parts.append(badge(RL_X + RL_W / 2, 535, "R1", "14P RÖLE", "#6d28d9"))
    parts.append(badge(TX1_X + 1.5 * T1_W, TX1_Y - 22, "X1–X3", "6 mm²", "#334155"))

    parts.append(badge(KM1_X + KM_W / 2, KM_Y + KM_H + 16, "KM1", "M1 ↑", "#b45309"))
    parts.append(badge(KM2_X + KM_W / 2, KM_Y + KM_H + 16, "KM2", "M1 ↓", "#b45309"))
    parts.append(badge(KM3_X + KM_W / 2, KM_Y + KM_H + 16, "KM3", "M2 ↑", "#b45309"))
    parts.append(badge(KM4_X + KM_W / 2, KM_Y + KM_H + 16, "KM4", "M2 ↓", "#b45309"))
    parts.append('</g>')

    # =========================================================================
    # 6. ALT DUVAR — ORTAÇ ODB-42 PG 36 SPİRAL RAKOR
    # =========================================================================
    parts.append(f'''
  <g id="pg36-gland" filter="url(#softShadow)">
    <!-- İç kontra somun -->
    <rect x="{GLAND_X - 58}" y="{EY + EH - 50}" width="116" height="24" rx="4" fill="#64748b" stroke="#334155" stroke-width="1.8"/>
    <!-- Dış altıgen flanş -->
    <rect x="{GLAND_X - 66}" y="{EY + EH - 4}" width="132" height="28" rx="5" fill="url(#pgGland)" stroke="#334155" stroke-width="2"/>
    <!-- Geçmeli spiral boru kafası -->
    <rect x="{GLAND_X - 48}" y="{EY + EH + 24}" width="96" height="58" rx="8" fill="url(#pgGland)" stroke="#334155" stroke-width="2"/>
    <line x1="{GLAND_X - 44}" y1="{EY + EH + 38}" x2="{GLAND_X + 44}" y2="{EY + EH + 38}" stroke="#334155" stroke-width="2"/>
    <line x1="{GLAND_X - 44}" y1="{EY + EH + 52}" x2="{GLAND_X + 44}" y2="{EY + EH + 52}" stroke="#334155" stroke-width="2"/>
    <line x1="{GLAND_X - 44}" y1="{EY + EH + 66}" x2="{GLAND_X + 44}" y2="{EY + EH + 66}" stroke="#334155" stroke-width="2"/>
    <rect x="{GLAND_X + 76}" y="{EY + EH + 8}" width="225" height="48" rx="8" fill="#ecfeff" stroke="#06b6d4" stroke-width="1.5"/>
    <text x="{GLAND_X + 188}" y="{EY + EH + 29}" text-anchor="middle" font-size="13" font-weight="800" fill="#0e7490">RK1 • PG 36 SPİRAL RAKOR</text>
    <text x="{GLAND_X + 188}" y="{EY + EH + 47}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#155e75">Ortaç ODB-42 • Panç: Ø47,5 mm</text>
  </g>
''')

    # =========================================================================
    # 7. ALT SAHA KABLOLARI & GERÇEKÇİ CİHAZ KARTLARI (NOVATO ALT STİLİ)
    # =========================================================================
    G_EXIT_Y = EY + EH + 82  # 1582
    CARD_Y = 1860

    # 4 ana saha kablosu kalın siyah dış kılıf ile PG36'dan çıkıp saha cihazlarına dağılır
    # Hedef X merkezleri: Besleme=290, Sektör 1&2=815, Motor 1=1365, Motor 2=1905
    X_SUP, X_SEC, X_M1, X_M2 = 290, 820, 1375, 1905

    parts.append('<g id="field-sheaths">')
    parts.append(sheath_path([(GLAND_X - 30, G_EXIT_Y), (GLAND_X - 30, 1650), (X_SUP, 1650), (X_SUP, 1740)], 15))
    parts.append(sheath_path([(GLAND_X - 10, G_EXIT_Y), (GLAND_X - 10, 1685), (X_SEC, 1685), (X_SEC, 1740)], 14))
    parts.append(sheath_path([(GLAND_X + 10, G_EXIT_Y), (GLAND_X + 10, 1685), (X_M1, 1685), (X_M1, 1740)], 14))
    parts.append(sheath_path([(GLAND_X + 30, G_EXIT_Y), (GLAND_X + 30, 1650), (X_M2, 1650), (X_M2, 1740)], 14))
    parts.append('</g>')

    # Siyah kılıfların ucundan renkli damarların açılması (Novato kılavuz estetiği!)
    def fan_cores(cx: float, y_top: float, y_bot: float, cores: list[tuple[str, str, str | None]]) -> str:
        n = len(cores)
        spread = min(380, (n - 1) * 52)
        start_x = cx - spread / 2
        step = spread / max(1, n - 1)
        out = [f'<rect x="{cx - 12}" y="{y_top - 6}" width="24" height="14" rx="4" fill="#0f172a"/>']
        for i, (lbl, col, stp) in enumerate(cores):
            tx = start_x + i * step
            out.append(wire_path([(cx, y_top + 6), (cx, y_top + 28), (tx, y_top + 62), (tx, y_bot)], col, 4.2, stripe=stp, radius=12))
            out.append(f'<rect x="{tx - 24:.1f}" y="{y_bot - 22:.1f}" width="48" height="20" rx="4" fill="#ffffff" stroke="{col}" stroke-width="1.4"/>')
            out.append(f'<text x="{tx:.1f}" y="{y_bot - 8:.1f}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f172a">{lbl}</text>')
        return "\n".join(out)

    parts.append('<g id="field-cores">')
    # 7A. Ana Besleme (5x2,5)
    parts.append(fan_cores(X_SUP, 1740, CARD_Y, [
        ("L1", C_L1, None), ("L2", C_L2, None), ("L3", C_L3, None), ("N", C_N, None), ("PE", C_PE, C_PE_S)
    ]))
    # 7B. Sektör Kumanda 1 & 2 (2x 5x1)
    parts.append(fan_cores(X_SEC, 1740, CARD_Y, [
        ("X6", C_L1, None), ("X7", C_L2, None), ("X8", C_L3, None), ("X9", C_N, None), ("X10", C_PE, None)
    ]))
    # 7C. Motor 1 (7 Damar)
    parts.append(fan_cores(X_M1, 1740, CARD_Y, [
        ("U", C_L1, None), ("V", C_L2, None), ("W", C_L3, None), ("PE", C_PE, C_PE_S), ("COM", C_N, None), ("L↑", C_LU, None), ("L↓", C_LD, None)
    ]))
    # 7D. Motor 2 (7 Damar)
    parts.append(fan_cores(X_M2, 1740, CARD_Y, [
        ("U", C_L1, None), ("V", C_L2, None), ("W", C_L3, None), ("PE", C_PE, C_PE_S), ("COM", C_N, None), ("L↑", C_LU, None), ("L↓", C_LD, None)
    ]))
    parts.append('</g>')

    # Saha Cihaz Kartları (Alt Sıra)
    parts.append(f'''
  <g id="field-cards" filter="url(#cardShadow)">
    <!-- 1. ANA BESLEME -->
    <rect x="{X_SUP - 205}" y="{CARD_Y}" width="410" height="295" rx="18" fill="#ffffff" stroke="#ef4444" stroke-width="2.2"/>
    <rect x="{X_SUP - 205}" y="{CARD_Y}" width="410" height="44" rx="18" fill="#fef2f2"/>
    <text x="{X_SUP}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#b91c1c">ANA BESLEME (1× 5×2,5 mm²)</text>
    <text x="{X_SUP}" y="{CARD_Y + 86}" text-anchor="middle" font-size="28" font-weight="900" fill="#0f172a">3~ 400V / 230V AC</text>
    <text x="{X_SUP}" y="{CARD_Y + 116}" text-anchor="middle" font-size="14" font-weight="700" fill="#475569">50 Hz • Üç Faz + Nötr + Toprak</text>
    <rect x="{X_SUP - 175}" y="{CARD_Y + 140}" width="350" height="128" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.4"/>
    <text x="{X_SUP - 155}" y="{CARD_Y + 168}" font-size="13" font-weight="700" fill="#9a4a12">• L1 (Kahve) → Üst Klemens X1</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 192}" font-size="13" font-weight="700" fill="#1e293b">• L2 (Siyah)  → Üst Klemens X2</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 216}" font-size="13" font-weight="700" fill="#64748b">• L3 (Gri)    → Üst Klemens X3</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 240}" font-size="13" font-weight="700" fill="#1d4ed8">• N (Mavi)    → Pano N-BARA (N1)</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 262}" font-size="13" font-weight="700" fill="#15803d">• PE (Sr-Yşl) → Pano PE-BARA (PE1)</text>

    <!-- 2. SEKTÖR KUMANDA 1 & 2 -->
    <rect x="{X_SEC - 220}" y="{CARD_Y}" width="440" height="295" rx="18" fill="#ffffff" stroke="#ec4899" stroke-width="2.2"/>
    <rect x="{X_SEC - 220}" y="{CARD_Y}" width="440" height="44" rx="18" fill="#fdf2f8"/>
    <text x="{X_SEC}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#be185d">SEKTÖR KUMANDA 1 &amp; 2 (2× 5×1 mm²)</text>
    <text x="{X_SEC}" y="{CARD_Y + 74}" text-anchor="middle" font-size="13.5" font-weight="700" fill="#475569">Otomasyon Giriş &amp; Paralel Çıkış (X6–X10)</text>
    <rect x="{X_SEC - 190}" y="{CARD_Y + 94}" width="380" height="174" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.4"/>
    <text x="{X_SEC - 170}" y="{CARD_Y + 124}" font-size="13" font-weight="700" fill="#9a4a12">• D1 (Kahve) → X6  → R1:1 (M1 Aşağı Komutu)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 152}" font-size="13" font-weight="700" fill="#1e293b">• D2 (Siyah)  → X7  → R1:2 (M1 Yukarı Komutu)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 180}" font-size="13" font-weight="700" fill="#64748b">• D3 (Gri)    → X8  → R1:3 (M2 Aşağı Komutu)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 208}" font-size="13" font-weight="700" fill="#1d4ed8">• D4 (Mavi)   → X9  → R1:4 (M2 Yukarı Komutu)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 236}" font-size="13" font-weight="700" fill="#15803d">• D5 (Yeşil)  → X10 → R1:13 (Oto/Man Bobin)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 258}" font-size="11.5" font-weight="600" fill="#64748b">* Sektör 1 ve Sektör 2 aynı klemenslere paralel girer.</text>

    <!-- 3. MOTOR 1 (M1 — 7 DAMAR) -->
    <rect x="{X_M1 - 225}" y="{CARD_Y}" width="450" height="295" rx="18" fill="#ffffff" stroke="#0284c7" stroke-width="2.2"/>
    <rect x="{X_M1 - 225}" y="{CARD_Y}" width="450" height="44" rx="18" fill="#f0f9ff"/>
    <text x="{X_M1}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#0369a1">REDÜKTÖR MOTOR 1 (M1 • 7 DAMAR)</text>
    <circle cx="{X_M1 - 115}" cy="{CARD_Y + 168}" r="88" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    <image href="{img_motor}" x="{X_M1 - 195}" y="{CARD_Y + 86}" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>
    <text x="{X_M1 - 8}" y="{CARD_Y + 86}" font-size="13" font-weight="800" fill="#0f172a">3 Faz Güç + Limit:</text>
    <text x="{X_M1 - 8}" y="{CARD_Y + 114}" font-size="12.5" font-weight="700" fill="#9a4a12">1-U (Kahve) → KM1:2</text>
    <text x="{X_M1 - 8}" y="{CARD_Y + 138}" font-size="12.5" font-weight="700" fill="#1e293b">2-V (Siyah)  → KM1:4</text>
    <text x="{X_M1 - 8}" y="{CARD_Y + 162}" font-size="12.5" font-weight="700" fill="#64748b">3-W (Gri)    → KM1:6</text>
    <text x="{X_M1 - 8}" y="{CARD_Y + 186}" font-size="12.5" font-weight="700" fill="#15803d">4-PE (Sr-Yşl) → PE2</text>
    <text x="{X_M1 - 8}" y="{CARD_Y + 210}" font-size="12.5" font-weight="700" fill="#1d4ed8">5-COM (Mavi) → N2</text>
    <text x="{X_M1 - 8}" y="{CARD_Y + 234}" font-size="12.5" font-weight="700" fill="#059669">6-L↑ (Yeşil)  → X4 (KM1:A2)</text>
    <text x="{X_M1 - 8}" y="{CARD_Y + 258}" font-size="12.5" font-weight="700" fill="#db2777">7-L↓ (Pembe) → X5 (KM2:A2)</text>

    <!-- 4. MOTOR 2 (M2 — 7 DAMAR) -->
    <rect x="{X_M2 - 225}" y="{CARD_Y}" width="450" height="295" rx="18" fill="#ffffff" stroke="#0284c7" stroke-width="2.2"/>
    <rect x="{X_M2 - 225}" y="{CARD_Y}" width="450" height="44" rx="18" fill="#f0f9ff"/>
    <text x="{X_M2}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#0369a1">REDÜKTÖR MOTOR 2 (M2 • 7 DAMAR)</text>
    <circle cx="{X_M2 - 115}" cy="{CARD_Y + 168}" r="88" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    <image href="{img_motor}" x="{X_M2 - 195}" y="{CARD_Y + 86}" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>
    <text x="{X_M2 - 8}" y="{CARD_Y + 86}" font-size="13" font-weight="800" fill="#0f172a">3 Faz Güç + Limit:</text>
    <text x="{X_M2 - 8}" y="{CARD_Y + 114}" font-size="12.5" font-weight="700" fill="#9a4a12">1-U (Kahve) → KM3:2</text>
    <text x="{X_M2 - 8}" y="{CARD_Y + 138}" font-size="12.5" font-weight="700" fill="#1e293b">2-V (Siyah)  → KM3:4</text>
    <text x="{X_M2 - 8}" y="{CARD_Y + 162}" font-size="12.5" font-weight="700" fill="#64748b">3-W (Gri)    → KM3:6</text>
    <text x="{X_M2 - 8}" y="{CARD_Y + 186}" font-size="12.5" font-weight="700" fill="#15803d">4-PE (Sr-Yşl) → PE3</text>
    <text x="{X_M2 - 8}" y="{CARD_Y + 210}" font-size="12.5" font-weight="700" fill="#1d4ed8">5-COM (Mavi) → N3</text>
    <text x="{X_M2 - 8}" y="{CARD_Y + 234}" font-size="12.5" font-weight="700" fill="#059669">6-L↑ (Yeşil)  → X11 (KM3:A2)</text>
    <text x="{X_M2 - 8}" y="{CARD_Y + 258}" font-size="12.5" font-weight="700" fill="#db2777">7-L↓ (Pembe) → X12 (KM4:A2)</text>
  </g>
''')

    # =========================================================================
    # 8. ALT RENK LEJANTI & ANTET ŞERİDİ
    # =========================================================================
    legend_items = [
        ("L1 Faz", C_L1),
        ("L2 Faz", C_L2),
        ("L3 Faz", C_L3),
        ("Nötr (N)", C_N),
        ("Toprak (PE)", C_PE),
        ("Limit ↑", C_LU),
        ("Limit ↓", C_LD),
        ("Kilit NC/A1", C_IL2),
        ("Manuel ▲", C_CMD),
    ]
    lx = 75
    leg_svg = []
    for name, col in legend_items:
        leg_svg.append(f'<rect x="{lx}" y="2228" width="22" height="8" rx="4" fill="{col}"/>')
        leg_svg.append(f'<text x="{lx + 30}" y="2236" font-size="13" font-weight="700" fill="#334155">{name}</text>')
        lx += 165

    parts.append(f'''
  <g id="footer">
    <rect x="60" y="2200" width="2080" height="66" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    {"".join(leg_svg)}
    <text x="2120" y="2238" text-anchor="end" font-size="13" font-weight="800" fill="#0f172a">Bemis BH6-6000 • ABB Seri • 80 Hat Montaj Kılavuzu</text>
  </g>
</svg>''')

    return "\n".join(parts)


if __name__ == "__main__":
    svg = build_svg()
    OUT_SVG.write_text(svg, encoding="utf-8")
    print(f"Wrote SVG: {OUT_SVG} ({len(svg)} bytes)")
