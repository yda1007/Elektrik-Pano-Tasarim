#!/usr/bin/env python3
"""
O2Sera — Sera İçi Bölge Panosu Bağlantı Diyagramı (SVG + PNG + Vektörel PDF) üreticisi.

Kapsam:
- Ana Giriş: 3× 50 mm² (L1, L2, L3) + 1× 35 mm² (N) + 1× 50 mm² (PE)
- Ana Kesme & Dağıtım: Q0 (160A 3P Yük Ayırıcı) + DB1 (4×160A Dağıtım Bloğu)
- Güç Çıkışları:
  * Q1 (80A 3P): Isıtma Hattı
  * Q2 (63A 3P): Havalandırma (36 Motor) + Perde (2 Motor) Ortak Besleme
  * Q3 (63A 3P): Fan Ana Besleme → KM-F1 (40A, 18 Fan) + KM-F2 (40A, 18 Fan, KT1 3sn kademeli)
  * QF1 (63A 4P 30mA Kaçak Akım) → Q4 (32A 3P CEE) + Q5 (16A 1P Schuko) Kombinasyon Prizi
- Kumanda & Koruma:
  * F1 (10A 1P) + FK1 (3 Faz Koruma Rölesi)
  * Sol Panel: Bölge Kumanda Şalterleri (OTO-0-EL, Hav.1/2 Aç-0-Kapat, Perde Ser-0-Topla, Fan Oto-0-Aç, Saha İzni)
  * Sağ Panel: Merkez Otomasyon Girişi + IP54 Kombinasyon Priz Kutusu (32A CEE + 2×16A Schuko)
- Alt Baralar: Görev etiketli N-BARA (35 mm²) ve PE-BARA (50 mm²)
"""
from pathlib import Path

BASE_DIR = Path("/home/yakup/Gemini-Projeler/kayitlar/Elektrik-Pano-Tasarim")
OUT_SVG = BASE_DIR / "O2Sera-Sera-Ici-Bolge-Panosu.svg"


def wire_path(
    pts: list[tuple[float, float]],
    color: str,
    width: float = 4.0,
    dashed: bool = False,
    stripe: str | None = None,
    radius: float = 8.0,
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
    dash_attr = ' stroke-dasharray="10 6"' if dashed else ""
    out = [
        f'<path d="{d}" fill="none" stroke="#ffffff" stroke-width="{width + 2.4:.1f}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.92"/>',
        f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width:.1f}" stroke-linecap="round" stroke-linejoin="round"{dash_attr}/>',
    ]
    if stripe:
        out.append(
            f'<path d="{d}" fill="none" stroke="{stripe}" stroke-width="{width:.1f}" stroke-dasharray="8 8" stroke-linecap="butt" stroke-linejoin="round"/>'
        )
    return "\n".join(out)


def sheath_path(pts: list[tuple[float, float]], width: float = 13.0) -> str:
    """Kalın siyah dış kablo kılıfı."""
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
        r = min(16.0, l1 / 2.2, l2 / 2.2)
        if r < 1:
            d_parts.append(f"L {x1:.1f} {y1:.1f}")
        else:
            bx, by = x1 - v1x / l1 * r, y1 - v1y / l1 * r
            ax, ay = x1 + v2x / l2 * r, y1 + v2y / l2 * r
            d_parts.append(f"L {bx:.1f} {by:.1f} Q {x1:.1f} {y1:.1f} {ax:.1f} {ay:.1f}")
    d_parts.append(f"L {pts[-1][0]:.1f} {pts[-1][1]:.1f}")
    d = " ".join(d_parts)
    return (
        f'<path d="{d}" fill="none" stroke="#0f172a" stroke-width="{width:.1f}" stroke-linecap="round" stroke-linejoin="round"/>\n'
        f'<path d="{d}" fill="none" stroke="#334155" stroke-width="{max(2.0, width * 0.24):.1f}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.55"/>'
    )


# =============================================================================
# VEKTÖREL MODÜLER ŞALT BİLEŞEN ÇİZİCİLERİ (TEMİZ ABB TEKNİK STİLİ)
# =============================================================================

def draw_power_terminal_block(x: float, y: float, specs: list[tuple[str, str, str, str]]) -> tuple[str, list[tuple[float, float]], list[tuple[float, float]]]:
    """
    Yüksek akım giriş klemens bloğu (50 mm² / 35 mm²).
    specs: [(label, size_lbl, body_fill, accent_color), ...]
    Dönüş: (svg, top_pins, bot_pins)
    """
    w_unit = 44.0
    h = 190.0
    out = []
    tops, bots = [], []
    for i, (lbl, sz, fill, acc) in enumerate(specs):
        ux = x + i * w_unit
        cx = ux + w_unit / 2.0
        tops.append((cx, y + 19.0))
        bots.append((cx, y + h - 19.0))
        out.append(f"""
        <g>
          <rect x="{ux:.1f}" y="{y:.1f}" width="{w_unit:.1f}" height="{h:.1f}" rx="4" fill="{fill}" stroke="#334155" stroke-width="1.5"/>
          <rect x="{ux+4:.1f}" y="{y+5:.1f}" width="{w_unit-8:.1f}" height="32" rx="3" fill="#e2e8f0" stroke="#64748b" stroke-width="1"/>
          <rect x="{ux+4:.1f}" y="{y+h-37:.1f}" width="{w_unit-8:.1f}" height="32" rx="3" fill="#e2e8f0" stroke="#64748b" stroke-width="1"/>
          <circle cx="{cx:.1f}" cy="{y+19:.1f}" r="8.2" fill="#475569" stroke="#1e293b" stroke-width="1.3"/>
          <polygon points="{cx-4:.1f},{y+19:.1f} {cx-2:.1f},{y+15.5:.1f} {cx+2:.1f},{y+15.5:.1f} {cx+4:.1f},{y+19:.1f} {cx+2:.1f},{y+22.5:.1f} {cx-2:.1f},{y+22.5:.1f}" fill="#cbd5e1"/>
          <circle cx="{cx:.1f}" cy="{y+h-19:.1f}" r="8.2" fill="#475569" stroke="#1e293b" stroke-width="1.3"/>
          <polygon points="{cx-4:.1f},{y+h-19:.1f} {cx-2:.1f},{y+h-22.5:.1f} {cx+2:.1f},{y+h-22.5:.1f} {cx+4:.1f},{y+h-19:.1f} {cx+2:.1f},{y+h-15.5:.1f} {cx-2:.1f},{y+h-15.5:.1f}" fill="#cbd5e1"/>
          <rect x="{ux+4:.1f}" y="{y+58:.1f}" width="{w_unit-8:.1f}" height="74" rx="3" fill="#ffffff" stroke="{acc}" stroke-width="1.8"/>
          <text x="{cx:.1f}" y="{y+88:.1f}" text-anchor="middle" font-size="12.5" font-weight="900" fill="#0f172a">{lbl}</text>
          <text x="{cx:.1f}" y="{y+106:.1f}" text-anchor="middle" font-size="9.5" font-weight="800" fill="{acc}">{sz}</text>
          <text x="{cx:.1f}" y="{y+122:.1f}" text-anchor="middle" font-size="8" font-weight="700" fill="#64748b">mm²</text>
        </g>""")
    return "\n".join(out), tops, bots


def draw_mcb(
    x: float, y: float, poles: int, w_per_pole: float, h: float,
    brand: str, model: str, rating: str,
    top_labels: list[str], bot_labels: list[str],
    toggle_color: str = "#1e293b", is_rccb: bool = False, is_switch: bool = False,
) -> tuple[str, list[tuple[float, float]], list[tuple[float, float]]]:
    """Modüler ABB MCB / Yük Ayırıcı / RCCB ön görünüşü."""
    w = poles * w_per_pole
    tops, bots = [], []
    pole_lines = []
    screws = []
    for p in range(poles):
        px = x + p * w_per_pole
        cx = px + w_per_pole / 2.0
        tops.append((cx, y + 18.0))
        bots.append((cx, y + h - 18.0))
        if p > 0:
            pole_lines.append(f'<line x1="{px:.1f}" y1="{y+4:.1f}" x2="{px:.1f}" y2="{y+h-4:.1f}" stroke="#cbd5e1" stroke-width="1"/>')
        tl = top_labels[p] if p < len(top_labels) else str(2 * p + 1)
        bl = bot_labels[p] if p < len(bot_labels) else str(2 * p + 2)
        screws.append(f"""
          <circle cx="{cx:.1f}" cy="{y+18:.1f}" r="6.8" fill="#ffffff" stroke="#1e293b" stroke-width="1.3"/>
          <line x1="{cx-4:.1f}" y1="{y+18:.1f}" x2="{cx+4:.1f}" y2="{y+18:.1f}" stroke="#1e293b" stroke-width="1.3"/>
          <text x="{cx:.1f}" y="{y+36:.1f}" text-anchor="middle" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="8.6" font-weight="700" fill="#334155">{tl}</text>
          <circle cx="{cx:.1f}" cy="{y+h-18:.1f}" r="6.8" fill="#ffffff" stroke="#1e293b" stroke-width="1.3"/>
          <line x1="{cx-4:.1f}" y1="{y+h-18:.1f}" x2="{cx+4:.1f}" y2="{y+h-18:.1f}" stroke="#1e293b" stroke-width="1.3"/>
          <text x="{cx:.1f}" y="{y+h-30:.1f}" text-anchor="middle" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="8.6" font-weight="700" fill="#334155">{bl}</text>
        """)

    # Orta mandal / şalter detayı
    mid_y = y + h / 2.0
    if is_switch:
        handle = f"""
          <rect x="{x+14:.1f}" y="{mid_y-22:.1f}" width="{w-28:.1f}" height="52" rx="8" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>
          <circle cx="{x+w/2:.1f}" cy="{mid_y+4:.1f}" r="20" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
          <rect x="{x+w/2-5.5:.1f}" y="{mid_y-14:.1f}" width="11" height="36" rx="4" fill="#ef4444" stroke="#ffffff" stroke-width="1.2"/>
          <text x="{x+w/2:.1f}" y="{mid_y+43:.1f}" text-anchor="middle" font-size="9" font-weight="900" fill="#b91c1c">I - ON</text>
        """
    elif is_rccb:
        handle = f"""
          <rect x="{x+10:.1f}" y="{mid_y-12:.1f}" width="{w*0.52:.1f}" height="24" rx="4" fill="{toggle_color}" stroke="#0f172a" stroke-width="1.2"/>
          <rect x="{x+14:.1f}" y="{mid_y-6:.1f}" width="{w*0.52-8:.1f}" height="12" rx="2" fill="#2563eb"/>
          <rect x="{x+w*0.68:.1f}" y="{mid_y-16:.1f}" width="26" height="24" rx="4" fill="#f59e0b" stroke="#92400e" stroke-width="1.2"/>
          <text x="{x+w*0.68+13:.1f}" y="{mid_y:.1f}" text-anchor="middle" font-size="11" font-weight="900" fill="#ffffff">T</text>
          <text x="{x+w*0.68+13:.1f}" y="{mid_y+19:.1f}" text-anchor="middle" font-size="7.5" font-weight="800" fill="#92400e">30 mA</text>
        """
    else:
        handle = f"""
          <rect x="{x+10:.1f}" y="{mid_y-11:.1f}" width="{w-20:.1f}" height="22" rx="4" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/>
          <rect x="{x+13:.1f}" y="{mid_y-8:.1f}" width="{w-26:.1f}" height="14" rx="3" fill="{toggle_color}"/>
          <rect x="{x+w/2-9:.1f}" y="{mid_y-22:.1f}" width="18" height="8" rx="2" fill="#dc2626"/>
          <text x="{x+w/2:.1f}" y="{mid_y-15.5:.1f}" text-anchor="middle" font-size="6.8" font-weight="900" fill="#ffffff">I</text>
        """

    if poles == 1:
        header_txt = f"""
      <text x="{x+w/2:.1f}" y="{y+52:.1f}" text-anchor="middle" font-size="9.5" font-weight="900" fill="#e2231a">{brand}</text>
      <text x="{x+w/2:.1f}" y="{y+63:.1f}" text-anchor="middle" font-size="7.8" font-weight="800" fill="#334155">{model}</text>
      <text x="{x+w/2:.1f}" y="{y+76:.1f}" text-anchor="middle" font-size="10.2" font-weight="900" fill="#0f172a">{rating}</text>"""
    else:
        header_txt = f"""
      <text x="{x+8:.1f}" y="{y+55:.1f}" font-size="10.5" font-weight="900" fill="#e2231a">{brand}</text>
      <text x="{x+w-8:.1f}" y="{y+55:.1f}" text-anchor="end" font-size="8.6" font-weight="800" fill="#334155">{model}</text>
      <text x="{x+w/2:.1f}" y="{y+69:.1f}" text-anchor="middle" font-size="11" font-weight="900" fill="#0f172a">{rating}</text>"""

    svg = f"""
    <g>
      <rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="6" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
      <rect x="{x+3:.1f}" y="{y+3:.1f}" width="{w-6:.1f}" height="38" rx="3" fill="#e6ebef"/>
      <rect x="{x+3:.1f}" y="{y+h-41:.1f}" width="{w-6:.1f}" height="38" rx="3" fill="#e6ebef"/>
      {"".join(pole_lines)}
      {header_txt}
      {handle}
      {"".join(screws)}
    </g>"""
    return svg, tops, bots


def draw_dist_block(x: float, y: float, w: float = 168.0, h: float = 190.0) -> tuple[str, list[tuple[float, float]], list[tuple[float, float]]]:
    """4×160A şeffaf kapaklı pirinç dağıtım bloğu (L1, L2, L3, N)."""
    bar_cols = ["#8B4513", "#1E293B", "#64748B", "#1D4ED8"]
    bar_lbls = ["L1", "L2", "L3", "N"]
    tops, bots = [], []
    bars_svg = []
    for i in range(4):
        bx = x + 16 + i * 38
        cx = bx + 13
        tops.append((cx, y + 22))
        bots.append((cx, y + h - 22))
        bars_svg.append(f"""
          <rect x="{bx:.1f}" y="{y+34:.1f}" width="26" height="{h-68:.1f}" rx="3" fill="#d97706" stroke="#92400e" stroke-width="1"/>
          <circle cx="{cx:.1f}" cy="{y+22:.1f}" r="7.5" fill="#fef08a" stroke="{bar_cols[i]}" stroke-width="2.2"/>
          <text x="{cx:.1f}" y="{y+52:.1f}" text-anchor="middle" font-size="9.5" font-weight="900" fill="#ffffff">{bar_lbls[i]}</text>
          <circle cx="{cx:.1f}" cy="{y+76:.1f}" r="4.2" fill="#fef08a" stroke="#78350f" stroke-width="1"/>
          <circle cx="{cx:.1f}" cy="{y+100:.1f}" r="4.2" fill="#fef08a" stroke="#78350f" stroke-width="1"/>
          <circle cx="{cx:.1f}" cy="{y+124:.1f}" r="4.2" fill="#fef08a" stroke="#78350f" stroke-width="1"/>
          <circle cx="{cx:.1f}" cy="{y+h-22:.1f}" r="6.8" fill="#fef08a" stroke="{bar_cols[i]}" stroke-width="2"/>
        """)
    svg = f"""
    <g>
      <rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="8" fill="#f1f5f9" stroke="#334155" stroke-width="1.8"/>
      <rect x="{x+6:.1f}" y="{y+6:.1f}" width="{w-12:.1f}" height="{h-12:.1f}" rx="5" fill="#e2e8f0" fill-opacity="0.45" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 3"/>
      {"".join(bars_svg)}
    </g>"""
    return svg, tops, bots


def draw_contactor_af38(x: float, y: float, w: float = 152.0, h: float = 196.0, title: str = "AF38-30", sub: str = "40A • 18 Fan") -> tuple[str, dict[str, tuple[float, float]]]:
    """ABB AF38 40A 3P Güç Kontaktörü (1L1-3L2-5L3-A1 üst / 2T1-4T2-6T3-A2 alt)."""
    cols = [x + 24, x + 56, x + 88, x + 124]
    ty, by = y + 20.0, y + h - 20.0
    pins = {
        "1L1": (cols[0], ty), "3L2": (cols[1], ty), "5L3": (cols[2], ty), "A1": (cols[3], ty),
        "2T1": (cols[0], by), "4T2": (cols[1], by), "6T3": (cols[2], by), "A2": (cols[3], by),
    }
    screws = []
    for cx, tl, bl in zip(cols, ["1L1", "3L2", "5L3", "A1"], ["2T1", "4T2", "6T3", "A2"]):
        screws.append(f"""
          <circle cx="{cx:.1f}" cy="{ty:.1f}" r="6.8" fill="#ffffff" stroke="#1e293b" stroke-width="1.3"/>
          <line x1="{cx-4:.1f}" y1="{ty-4:.1f}" x2="{cx+4:.1f}" y2="{ty+4:.1f}" stroke="#1e293b" stroke-width="1.2"/>
          <line x1="{cx-4:.1f}" y1="{ty+4:.1f}" x2="{cx+4:.1f}" y2="{ty-4:.1f}" stroke="#1e293b" stroke-width="1.2"/>
          <text x="{cx:.1f}" y="{ty+18:.1f}" text-anchor="middle" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="8.6" font-weight="700" fill="#1e293b">{tl}</text>
          <circle cx="{cx:.1f}" cy="{by:.1f}" r="6.8" fill="#ffffff" stroke="#1e293b" stroke-width="1.3"/>
          <line x1="{cx-4:.1f}" y1="{by-4:.1f}" x2="{cx+4:.1f}" y2="{by+4:.1f}" stroke="#1e293b" stroke-width="1.2"/>
          <line x1="{cx-4:.1f}" y1="{by+4:.1f}" x2="{cx+4:.1f}" y2="{by-4:.1f}" stroke="#1e293b" stroke-width="1.2"/>
          <text x="{cx:.1f}" y="{by-12:.1f}" text-anchor="middle" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="8.6" font-weight="700" fill="#1e293b">{bl}</text>
        """)
    svg = f"""
    <g>
      <rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="6" fill="#475569" stroke="#1e293b" stroke-width="1.8"/>
      <rect x="{x+4:.1f}" y="{y+4:.1f}" width="{w-8:.1f}" height="40" rx="3" fill="#e6ebef"/>
      <rect x="{x+4:.1f}" y="{y+h-44:.1f}" width="{w-8:.1f}" height="40" rx="3" fill="#e6ebef"/>
      <rect x="{x+10:.1f}" y="{y+52:.1f}" width="{w-20:.1f}" height="{h-104:.1f}" rx="4" fill="#334155" stroke="#1e293b" stroke-width="1"/>
      <rect x="{x+18:.1f}" y="{y+62:.1f}" width="22" height="26" rx="2" fill="#0f172a"/>
      <text x="{x+w-16:.1f}" y="{y+74:.1f}" text-anchor="end" font-size="12" font-weight="900" fill="#ef4444">ABB</text>
      <text x="{x+w/2:.1f}" y="{y+106:.1f}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#f8fafc">{title}</text>
      <text x="{x+w/2:.1f}" y="{y+122:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#34d399">{sub}</text>
      <text x="{x+w/2:.1f}" y="{y+136:.1f}" text-anchor="middle" font-size="8" font-weight="600" fill="#cbd5e1">Bobin: 230V AC</text>
      {"".join(screws)}
    </g>"""
    return svg, pins


def draw_phase_or_timer_relay(
    x: float, y: float, w: float, h: float, title: str, sub: str, accent: str,
    top_lbls: list[str], bot_lbls: list[str], dial_lbl: str = "3 sn"
) -> tuple[str, list[tuple[float, float]], list[tuple[float, float]]]:
    """Faz Koruma Rölesi (FK1) veya Zaman Rölesi (KT1)."""
    nt, nb = len(top_lbls), len(bot_lbls)
    tops = [(x + (i + 0.5) * (w / nt), y + 18.0) for i in range(nt)]
    bots = [(x + (i + 0.5) * (w / nb), y + h - 18.0) for i in range(nb)]
    scr = []
    for (cx, cy), lbl in zip(tops, top_lbls):
        scr.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="5.6" fill="#fff" stroke="#1e293b" stroke-width="1.2"/>'
                   f'<text x="{cx:.1f}" y="{cy+16:.1f}" text-anchor="middle" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="7.8" font-weight="700" fill="#1e293b">{lbl}</text>')
    for (cx, cy), lbl in zip(bots, bot_lbls):
        scr.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="5.6" fill="#fff" stroke="#1e293b" stroke-width="1.2"/>'
                   f'<text x="{cx:.1f}" y="{cy-10:.1f}" text-anchor="middle" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="7.8" font-weight="700" fill="#1e293b">{lbl}</text>')
    svg = f"""
    <g>
      <rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="6" fill="#f8fafc" stroke="#1e293b" stroke-width="1.7"/>
      <rect x="{x+3:.1f}" y="{y+3:.1f}" width="{w-6:.1f}" height="36" rx="3" fill="#e6ebef"/>
      <rect x="{x+3:.1f}" y="{y+h-39:.1f}" width="{w-6:.1f}" height="36" rx="3" fill="#e6ebef"/>
      <rect x="{x+6:.1f}" y="{y+46:.1f}" width="{w-12:.1f}" height="18" rx="3" fill="{accent}"/>
      <text x="{x+w/2:.1f}" y="{y+58.5:.1f}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#ffffff">{title}</text>
      <text x="{x+w/2:.1f}" y="{y+78:.1f}" text-anchor="middle" font-size="8.2" font-weight="700" fill="#334155">{sub}</text>
      <circle cx="{x+w/2:.1f}" cy="{y+106:.1f}" r="14" fill="#e2e8f0" stroke="#475569" stroke-width="1.3"/>
      <line x1="{x+w/2:.1f}" y1="{y+106:.1f}" x2="{x+w/2+8:.1f}" y2="{y+98:.1f}" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>
      <text x="{x+w/2:.1f}" y="{y+134:.1f}" text-anchor="middle" font-size="8.5" font-weight="800" fill="{accent}">{dial_lbl}</text>
      <circle cx="{x+14:.1f}" cy="{y+146:.1f}" r="3.5" fill="#16a34a"/>
      <circle cx="{x+28:.1f}" cy="{y+146:.1f}" r="3.5" fill="#f59e0b"/>
      {"".join(scr)}
    </g>"""
    return svg, tops, bots


def draw_small_din_terminals(x: float, y: float, items: list[tuple[str, str]]) -> tuple[str, list[tuple[float, float]], list[tuple[float, float]]]:
    """2,5 mm² kumanda ray klemens dizisi."""
    tw, th = 26.0, 146.0
    out, tops, bots = [], [], []
    for i, (lbl, acc) in enumerate(items):
        tx = x + i * tw
        cx = tx + tw / 2.0
        tops.append((cx, y + 12.0))
        bots.append((cx, y + th - 12.0))
        out.append(f"""
        <g>
          <rect x="{tx:.1f}" y="{y:.1f}" width="{tw:.1f}" height="{th:.1f}" rx="2.5" fill="#e2e8f0" stroke="#475569" stroke-width="1.1"/>
          <circle cx="{cx:.1f}" cy="{y+12:.1f}" r="4.2" fill="#64748b" stroke="#1e293b" stroke-width="0.9"/>
          <circle cx="{cx:.1f}" cy="{y+th-12:.1f}" r="4.2" fill="#64748b" stroke="#1e293b" stroke-width="0.9"/>
          <rect x="{tx+2:.1f}" y="{y+th/2-18:.1f}" width="{tw-4:.1f}" height="36" rx="2" fill="#ffffff" stroke="{acc}" stroke-width="1.4"/>
          <text x="{cx:.1f}" y="{y+th/2+3.5:.1f}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#0f172a">{lbl}</text>
        </g>""")
    return "\n".join(out), tops, bots


def draw_selector_switch(cx: float, cy: float, code: str, title: str, pos_l: str, pos_r: str, accent: str) -> str:
    """Kapak seçici şalteri (3 konumlu)."""
    return f"""
    <g>
      <circle cx="{cx:.1f}" cy="{cy:.1f}" r="24" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
      <circle cx="{cx:.1f}" cy="{cy:.1f}" r="18" fill="#1e293b" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="{cx-3.5:.1f}" y="{cy-16:.1f}" width="7" height="32" rx="3" fill="#f8fafc" transform="rotate(-28 {cx:.1f} {cy:.1f})"/>
      <rect x="{cx-2:.1f}" y="{cy-15:.1f}" width="4" height="10" rx="1.5" fill="{accent}" transform="rotate(-28 {cx:.1f} {cy:.1f})"/>
      <text x="{cx:.1f}" y="{cy-29:.1f}" text-anchor="middle" font-size="8.2" font-weight="800" fill="#64748b">0</text>
      <text x="{cx-27:.1f}" y="{cy-17:.1f}" text-anchor="end" font-size="8.2" font-weight="800" fill="{accent}">{pos_l}</text>
      <text x="{cx+27:.1f}" y="{cy-17:.1f}" text-anchor="start" font-size="8.2" font-weight="800" fill="#0f172a">{pos_r}</text>
      <rect x="{cx-42:.1f}" y="{cy+29:.1f}" width="84" height="17" rx="4" fill="#0B2540"/>
      <text x="{cx:.1f}" y="{cy+40.5:.1f}" text-anchor="middle" font-size="8.8" font-weight="800" fill="#ffffff">{code}</text>
      <text x="{cx:.1f}" y="{cy+58:.1f}" text-anchor="middle" font-size="9.2" font-weight="700" fill="#334155">{title}</text>
    </g>"""


def build_svg() -> str:
    W, H = 2280, 2360

    # =========================================================================
    # O2SERA AYRIŞTIRILMIŞ RENK PALETİ
    # =========================================================================
    C_L1 = "#8B4513"      # Kahverengi — Faz L1
    C_L2 = "#1E293B"      # Siyah — Faz L2
    C_L3 = "#64748B"      # Gri — Faz L3
    C_N = "#1D4ED8"       # Koyu Mavi — Nötr (N)
    C_PE = "#16A34A"      # Yeşil (+ Sarı Şerit) — Toprak (PE)
    C_PE_S = "#FACC15"

    C_CMD = "#DC2626"     # Kırmızı — 230V Kumanda Fazı (F1 → FK1 → Şalterler)
    C_HAV1U = "#4338CA"   # İndigo — Havalandırma 1 Aç (D2)
    C_HAV1D = "#7C3AED"   # Mor — Havalandırma 1 Kapat (D1)
    C_HAV2U = "#0284C7"   # Turkuaz — Havalandırma 2 Aç (D4)
    C_HAV2D = "#0F766E"   # Koyu Teal — Havalandırma 2 Kapat (D3)
    C_SAHA = "#A21CAF"    # Macenta — Saha Yerel Buton İzni (D5)
    C_PER_S = "#059669"   # Zümrüt Yeşil — Perde Ser (▲)
    C_PER_T = "#DB2777"   # Pembe — Perde Topla (▼)
    C_FAN_C = "#EA580C"   # Turuncu — Fan Kumanda (KM-F1 & KT1 → KM-F2)
    C_HEAT = "#B91C1C"    # Koyu Kırmızı — Isıtma 80A vurgusu

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
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.13"/>
    </filter>
    <linearGradient id="dinRail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="22%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="82%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>
''')

    # =========================================================================
    # 1. BAŞLIK BANDI (O2SERA KURUMSAL ANTET)
    # =========================================================================
    parts.append(f'''
  <g>
    <rect x="56" y="30" width="10" height="58" rx="4" fill="#1F9D6B"/>
    <text x="82" y="58" font-size="28" font-weight="800" fill="#0B2540"><tspan fill="#1F9D6B">O2Sera</tspan> — SERA İÇİ BÖLGE PANOSU BAĞLANTI DİYAGRAMI</text>
    <text x="82" y="84" font-size="15" font-weight="500" fill="#475569">3~ 400V / 230V AC • Giriş: 3×50 mm² + 35 mm² N + 50 mm² PE • 80A Isıtma • 63A Hav.(36)+Perde(2) • 63A Fan(2×18) • 63A 4P 30mA Komb. Priz</text>
    <rect x="1950" y="34" width="274" height="52" rx="8" fill="#0B2540" stroke="#1F9D6B" stroke-width="2"/>
    <text x="2087" y="56" text-anchor="middle" font-size="14" font-weight="800" fill="#ffffff"><tspan fill="#34D399">O2Sera</tspan> • BÖLGE PANOSU</text>
    <text x="2087" y="75" text-anchor="middle" font-size="11.5" font-weight="600" fill="#cbd5e1">www.o2sera.com • 160A ABB Şalt</text>
    <line x1="56" y1="104" x2="2224" y2="104" stroke="#e2e8f0" stroke-width="2"/>
  </g>
''')

    # =========================================================================
    # 2. ÜST TEKNİK ÖZET BANDI (3 BLOK)
    # =========================================================================
    parts.append('<g id="top-summary">')

    # 2A. Ana Giriş Klemensleri (X0)
    tx, ty, cw, ch = 66, 160, 72, 42
    in_terms = [
        ("L1", "50 mm²", C_L1, "Faz 1"),
        ("L2", "50 mm²", C_L2, "Faz 2"),
        ("L3", "50 mm²", C_L3, "Faz 3"),
        ("N", "35 mm²", C_N, "Nötr"),
        ("PE", "50 mm²", C_PE, "Toprak"),
    ]
    parts.append(f'<text x="{tx}" y="134" font-size="13.5" font-weight="800" fill="#0B2540">1) ANA GÜÇ GİRİŞ KLEMENSİ (X0 • 160A SINIFI)</text>')
    for i, (code, sz, col, lbl) in enumerate(in_terms):
        bx = tx + i * cw
        cx = bx + cw / 2
        parts.append(f'<text x="{cx:.1f}" y="{ty - 7}" text-anchor="middle" font-size="11" font-weight="800" fill="{col}">{sz}</text>')
        parts.append(f'<rect x="{bx}" y="{ty}" width="{cw}" height="{ch}" fill="#ffffff" stroke="#334155" stroke-width="1.6"/>')
        parts.append(f'<text x="{cx:.1f}" y="{ty + 27}" text-anchor="middle" font-size="16" font-weight="800" fill="#0f172a">{code}</text>')
        parts.append(f'<line x1="{cx:.1f}" y1="{ty + ch + 38}" x2="{cx:.1f}" y2="{ty + ch + 4}" stroke="{col}" stroke-width="3.6"/>')
        parts.append(f'<polygon points="{cx:.1f},{ty + ch + 3} {cx-6:.1f},{ty + ch + 15} {cx+6:.1f},{ty + ch + 15}" fill="{col}"/>')
        parts.append(f'<text x="{cx:.1f}" y="{ty + ch + 56}" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">{lbl}</text>')
    parts.append(f'<text x="{tx + 180}" y="{ty + ch + 82}" text-anchor="middle" font-size="12" font-weight="700" fill="#0B2540">X0 → Q0 (160A Şalter) → DB1 (4×160A Bara)</text>')

    # 2B. Orta Blok: Güç Çıkış & Koruma Tablosu
    mx = 480
    parts.append(f'''
    <text x="{mx}" y="134" font-size="13.5" font-weight="800" fill="#0B2540">2) GÜÇ KORUMA &amp; ÇIKIŞ HATLARI</text>
    <rect x="{mx}" y="148" width="900" height="142" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="{mx+16}" y="174" font-size="12.5" font-weight="800" fill="{C_HEAT}">• Q1 — ISITMA (80A 3P):</text>
    <text x="{mx+252}" y="174" font-size="12.3" fill="#334155">ABB S803S-C80 • Doğrudan ısıtma ana besleme çıkışı (3~ 400V + N + PE)</text>
    <text x="{mx+16}" y="200" font-size="12.5" font-weight="800" fill="#0369a1">• Q2 — HAV. + PERDE ORTAK (63A 3P):</text>
    <text x="{mx+252}" y="200" font-size="12.3" fill="#334155">ABB S203-C63 • 36 Havalandırma (18× İkili Pano) + 2 Perde Motoru ortak gücü</text>
    <text x="{mx+16}" y="226" font-size="12.5" font-weight="800" fill="{C_FAN_C}">• Q3 — FANLAR (63A 3P → 2×40A KM):</text>
    <text x="{mx+252}" y="226" font-size="12.3" fill="#334155">36 Fan 2 gruba bölünür: KM-F1 (18 Fan) + KT1 (3 sn) → KM-F2 (18 Fan)</text>
    <text x="{mx+16}" y="252" font-size="12.5" font-weight="800" fill="#1d4ed8">• QF1 — KOMB. PRİZ (63A 4P 30mA):</text>
    <text x="{mx+252}" y="252" font-size="12.3" fill="#334155">3P+N Kaçak Akım → Q4 (32A 3P CEE Priz) + Q5 (16A 1P 2× Schuko Priz)</text>
    <text x="{mx+16}" y="278" font-size="12" font-weight="700" fill="#475569">• F1 (10A 1P) + FK1 (Faz Koruma Rölesi): Faz kaybı / gerilim hatasında tüm kumanda kesilir.</text>
    ''')

    # 2C. Sağ Blok: Sektör Kumanda (O2Sera Motor Panosu Uyumu)
    rx = 1412
    parts.append(f'''
    <text x="{rx}" y="134" font-size="13.5" font-weight="800" fill="#0B2540">3) SEKTÖR KUMANDA &amp; O2SERA SAHA UYUMU</text>
    <rect x="{rx}" y="148" width="810" height="142" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="{rx+16}" y="174" font-size="12.5" font-weight="800" fill="{C_HAV1U}">• Havalandırma (5×1 mm² D1–D5):</text>
    <text x="{rx+246}" y="174" font-size="12.2" fill="#334155">D1:M1↓ | D2:M1↑ | D3:M2↓ | D4:M2↑ | D5:Yerel İzin (230V)</text>
    <text x="{rx+16}" y="200" font-size="12.5" font-weight="800" fill="{C_PER_S}">• Perde Kumanda (P1–P3):</text>
    <text x="{rx+246}" y="200" font-size="12.2" fill="#334155">P1:Perde Topla (▼) | P2:Perde Ser (▲) | P3:Yerel İzin</text>
    <text x="{rx+16}" y="226" font-size="12.5" font-weight="800" fill="{C_FAN_C}">• Fan Kontrol (S-FAN / Oto):</text>
    <text x="{rx+246}" y="226" font-size="12.2" fill="#334155">OTO–0–AÇ → KM-F1 anında (18 Fan), KT1 3 sn → KM-F2 (18 Fan)</text>
    <text x="{rx+16}" y="252" font-size="12.5" font-weight="800" fill="#1F9D6B">• Çift Yönlü Çalışma Mantığı:</text>
    <text x="{rx+246}" y="252" font-size="12.2" fill="#334155">S-MOD=OTO: Merkez Otomasyon | S-MOD=EL: Bölge Şalterleri</text>
    <text x="{rx+16}" y="278" font-size="11.8" font-weight="700" fill="#64748b">* D1–D5 çıkışı, O2Sera İkili Redüktör Motor Panolarının X6–X10 girişine paralel bağlanır.</text>
    ''')
    parts.append('</g>')

    parts.append('<line x1="56" y1="312" x2="2224" y2="312" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6 4"/>')

    # =========================================================================
    # 3. İKİ ADET 35 mm METALİK DIN RAYI (KUTUSUZ AÇIK DÜZEN)
    # =========================================================================
    R1_CY = 585.0
    R2_CY = 1045.0
    RAIL_X1, RAIL_W = 460.0, 1360.0
    for r_cy in [R1_CY, R2_CY]:
        slots = "".join(
            f'<rect x="{RAIL_X1 + 24 + k*84}" y="{r_cy - 5}" width="40" height="10" rx="5" fill="#64748b"/>'
            for k in range(16)
        )
        parts.append(f'''
  <g>
    <rect x="{RAIL_X1:.1f}" y="{r_cy - 26:.1f}" width="{RAIL_W:.1f}" height="52" rx="3" fill="url(#dinRail)" stroke="#475569" stroke-width="1.4"/>
    {slots}
  </g>''')

    # =========================================================================
    # 4. RAY 1 (ÜST GÜÇ RAYI) VE RAY 2 (KORUMA, KONTAKTÖR & KUMANDA RAYI)
    # =========================================================================
    # --- RAY 1 (Y merkez = 585, gövde Y = 490..680, H = 190) ---
    R1_Y = 490.0
    x0_svg, x0_top, x0_bot = draw_power_terminal_block(
        486.0, R1_Y,
        [("L1", "50", "#e2e8f0", C_L1), ("L2", "50", "#e2e8f0", C_L2), ("L3", "50", "#e2e8f0", C_L3),
         ("N", "35", "#dbeafe", C_N), ("PE", "50", "#dcfce7", C_PE)]
    )
    q0_svg, q0_top, q0_bot = draw_mcb(
        740.0, R1_Y, 3, 46.0, 190.0, "ABB", "OT160", "160A 3P",
        ["1", "3", "5"], ["2", "4", "6"], is_switch=True
    )
    db1_svg, db1_top, db1_bot = draw_dist_block(912.0, R1_Y, 174.0, 190.0)
    q1_svg, q1_top, q1_bot = draw_mcb(
        1132.0, R1_Y, 3, 48.0, 190.0, "ABB", "S803S", "80A 3P",
        ["1", "3", "5"], ["2", "4", "6"], toggle_color="#b91c1c"
    )
    q2_svg, q2_top, q2_bot = draw_mcb(
        1334.0, R1_Y, 3, 46.0, 190.0, "ABB", "S203", "63A 3P",
        ["1", "3", "5"], ["2", "4", "6"], toggle_color="#0369a1"
    )
    q3_svg, q3_top, q3_bot = draw_mcb(
        1534.0, R1_Y, 3, 46.0, 190.0, "ABB", "S203", "63A 3P",
        ["1", "3", "5"], ["2", "4", "6"], toggle_color="#ea580c"
    )

    # --- RAY 2 (Y merkez = 1045, gövde Y = 947..1143, H = 196) ---
    R2_Y = 947.0
    qf1_svg, qf1_top, qf1_bot = draw_mcb(
        486.0, R2_Y, 4, 42.0, 196.0, "ABB", "FH204", "63A 4P",
        ["1", "3", "5", "N"], ["2", "4", "6", "N"], toggle_color="#1d4ed8", is_rccb=True
    )
    q4_svg, q4_top, q4_bot = draw_mcb(
        676.0, R2_Y, 3, 38.0, 196.0, "ABB", "S203", "32A 3P",
        ["1", "3", "5"], ["2", "4", "6"], toggle_color="#1e293b"
    )
    q5_svg, q5_top, q5_bot = draw_mcb(
        806.0, R2_Y, 1, 44.0, 196.0, "ABB", "S201", "16A",
        ["1"], ["2"], toggle_color="#1e293b"
    )
    f1_svg, f1_top, f1_bot = draw_mcb(
        878.0, R2_Y, 1, 44.0, 196.0, "ABB", "S201", "10A",
        ["1"], ["2"], toggle_color="#dc2626"
    )
    fk1_svg, fk1_top, fk1_bot = draw_phase_or_timer_relay(
        940.0, R2_Y, 96.0, 196.0, "FAZ KOR.", "CM-PFS", "#b91c1c",
        ["L1", "L2", "L3"], ["11", "14"], "3~ 400V"
    )
    kmf1_svg, kmf1_pins = draw_contactor_af38(1066.0, R2_Y, 152.0, 196.0, "AF38-30", "40A • 18 Fan")
    kt1_svg, kt1_top, kt1_bot = draw_phase_or_timer_relay(
        1236.0, R2_Y, 78.0, 196.0, "ZAMAN", "CT-ERD", "#ea580c",
        ["A1", "15"], ["A2", "18"], "3 sn"
    )
    kmf2_svg, kmf2_pins = draw_contactor_af38(1332.0, R2_Y, 152.0, 196.0, "AF38-30", "40A • 18 Fan")

    # Sağ uçta Sektör Kumanda Ray Klemensleri (X-KUM: D1..D5 + P1..P3)
    xkum_items = [
        ("D1", C_HAV1D), ("D2", C_HAV1U), ("D3", C_HAV2D), ("D4", C_HAV2U), ("D5", C_SAHA),
        ("P1", C_PER_T), ("P2", C_PER_S), ("P3", C_SAHA),
    ]
    xkum_svg, xkum_top, xkum_bot = draw_small_din_terminals(1524.0, R2_Y + 25.0, xkum_items)

    parts.append('<g id="rail-components" filter="url(#softShadow)">')
    parts.extend([x0_svg, q0_svg, db1_svg, q1_svg, q2_svg, q3_svg,
                  qf1_svg, q4_svg, q5_svg, f1_svg, fk1_svg, kmf1_svg, kt1_svg, kmf2_svg, xkum_svg])
    parts.append('</g>')

    # =========================================================================
    # 5. SOL & SAĞ YAN PANELLER (KAPAK ŞALTERLERİ + OTOMASYON & KOMB. PRİZİ)
    # =========================================================================
    # SOL PANEL: Kapak Kumanda Şalterleri
    SL_X, SL_Y, SL_W, SL_H = 56.0, 460.0, 344.0, 720.0
    parts.append(f'''
  <g id="left-control-panel" filter="url(#cardShadow)">
    <rect x="{SL_X:.1f}" y="{SL_Y:.1f}" width="{SL_W:.1f}" height="{SL_H:.1f}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="{SL_X:.1f}" y="{SL_Y:.1f}" width="{SL_W:.1f}" height="64" rx="18" fill="#0B2540"/>
    <text x="{SL_X+SL_W/2:.1f}" y="{SL_Y+28:.1f}" text-anchor="middle" font-size="15.5" font-weight="800" fill="#ffffff">BÖLGE KAPAK KUMANDA</text>
    <text x="{SL_X+SL_W/2:.1f}" y="{SL_Y+48:.1f}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#34D399">230V AC • F1(10A) + FK1 Faz Korumalı</text>
    {draw_selector_switch(SL_X + 95, SL_Y + 130, "S-MOD", "Bölge Modu", "OTO", "EL", "#1F9D6B")}
    {draw_selector_switch(SL_X + 250, SL_Y + 130, "S-SAHA", "Saha İzni (D5)", "PANO", "YEREL", C_SAHA)}
    {draw_selector_switch(SL_X + 95, SL_Y + 266, "S-HAV1", "Havalandırma 1", "AÇ", "KAPAT", C_HAV1U)}
    {draw_selector_switch(SL_X + 250, SL_Y + 266, "S-HAV2", "Havalandırma 2", "AÇ", "KAPAT", C_HAV2U)}
    {draw_selector_switch(SL_X + 95, SL_Y + 402, "S-PER", "Perde (2 Motor)", "SER", "TOPLA", C_PER_S)}
    {draw_selector_switch(SL_X + 250, SL_Y + 402, "S-FAN", "Fanlar (2×18)", "OTO", "AÇ", C_FAN_C)}

    <!-- Alt bağlantı özeti kutusu -->
    <rect x="{SL_X+16:.1f}" y="{SL_Y+490:.1f}" width="{SL_W-32:.1f}" height="210" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.4"/>
    <text x="{SL_X+SL_W/2:.1f}" y="{SL_Y+512:.1f}" text-anchor="middle" font-size="12" font-weight="800" fill="#0B2540">Kapak Şalter Bağlantı Özeti</text>
    <text x="{SL_X+28:.1f}" y="{SL_Y+534:.1f}" font-size="11" font-weight="700" fill="{C_CMD}">• Ortak Kumanda Fazı ← FK1:14 (230V)</text>
    <text x="{SL_X+28:.1f}" y="{SL_Y+556:.1f}" font-size="11" font-weight="700" fill="{C_HAV1U}">• S-HAV1 (Aç/Kapat) → X-KUM D2 / D1</text>
    <text x="{SL_X+28:.1f}" y="{SL_Y+578:.1f}" font-size="11" font-weight="700" fill="{C_HAV2U}">• S-HAV2 (Aç/Kapat) → X-KUM D4 / D3</text>
    <text x="{SL_X+28:.1f}" y="{SL_Y+600:.1f}" font-size="11" font-weight="700" fill="{C_PER_S}">• S-PER (Ser/Topla)  → X-KUM P2 / P1</text>
    <text x="{SL_X+28:.1f}" y="{SL_Y+622:.1f}" font-size="11" font-weight="700" fill="{C_FAN_C}">• S-FAN (Aç/Oto)    → KM-F1 + KT1(3sn)</text>
    <text x="{SL_X+28:.1f}" y="{SL_Y+644:.1f}" font-size="11" font-weight="700" fill="{C_SAHA}">• S-SAHA (Yerel)    → D5 &amp; P3 (230V)</text>
    <text x="{SL_X+SL_W/2:.1f}" y="{SL_Y+678:.1f}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">S-MOD=OTO iken merkez otomasyon devrededir.</text>
    <text x="{SL_X+SL_W/2:.1f}" y="{SL_Y+692:.1f}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">S-SAHA=YEREL iken saha SW-BL4252 çalışır.</text>
  </g>
''')

    # SAĞ PANEL ÜST: Merkez Otomasyon Girişi | SAĞ PANEL ALT: Kombinasyon Prizi Kutusu
    SR_X, SR_W = 1880.0, 344.0
    SR1_Y, SR1_H = 460.0, 290.0
    SR2_Y, SR2_H = 790.0, 390.0
    parts.append(f'''
  <g id="right-panels" filter="url(#cardShadow)">
    <!-- 1. MERKEZ OTOMASYON GİRİŞİ -->
    <rect x="{SR_X:.1f}" y="{SR1_Y:.1f}" width="{SR_W:.1f}" height="{SR1_H:.1f}" rx="18" fill="#ffffff" stroke="#7c3aed" stroke-width="2"/>
    <rect x="{SR_X:.1f}" y="{SR1_Y:.1f}" width="{SR_W:.1f}" height="52" rx="18" fill="#f5f3ff"/>
    <text x="{SR_X+SR_W/2:.1f}" y="{SR1_Y+24:.1f}" text-anchor="middle" font-size="14.5" font-weight="800" fill="#6d28d9">MERKEZ OTOMASYON GİRİŞİ</text>
    <text x="{SR_X+SR_W/2:.1f}" y="{SR1_Y+42:.1f}" text-anchor="middle" font-size="11" font-weight="600" fill="#5b21b6">O2Sera PLC / Kontrolör (230V / Kuru Kontak)</text>
    <rect x="{SR_X+16:.1f}" y="{SR1_Y+66:.1f}" width="{SR_W-32:.1f}" height="206" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.3"/>
    <text x="{SR_X+28:.1f}" y="{SR1_Y+92:.1f}" font-size="11.5" font-weight="700" fill="{C_HAV1U}">• OTO Hav.1 Aç / Kapat → D2 / D1</text>
    <text x="{SR_X+28:.1f}" y="{SR1_Y+116:.1f}" font-size="11.5" font-weight="700" fill="{C_HAV2U}">• OTO Hav.2 Aç / Kapat → D4 / D3</text>
    <text x="{SR_X+28:.1f}" y="{SR1_Y+140:.1f}" font-size="11.5" font-weight="700" fill="{C_PER_S}">• OTO Perde Ser / Topla → P2 / P1</text>
    <text x="{SR_X+28:.1f}" y="{SR1_Y+164:.1f}" font-size="11.5" font-weight="700" fill="{C_FAN_C}">• OTO Fan Aç → KM-F1 + KT1 → KM-F2</text>
    <text x="{SR_X+28:.1f}" y="{SR1_Y+188:.1f}" font-size="11.5" font-weight="700" fill="{C_SAHA}">• OTO Saha İzin (Ops.) → D5 &amp; P3</text>
    <line x1="{SR_X+28:.1f}" y1="{SR1_Y+206:.1f}" x2="{SR_X+SR_W-28:.1f}" y2="{SR1_Y+206:.1f}" stroke="#cbd5e1" stroke-width="1"/>
    <text x="{SR_X+SR_W/2:.1f}" y="{SR1_Y+228:.1f}" text-anchor="middle" font-size="10.8" font-weight="700" fill="#0B2540">S-MOD = OTO konumunda aktif olur.</text>
    <text x="{SR_X+SR_W/2:.1f}" y="{SR1_Y+248:.1f}" text-anchor="middle" font-size="10.2" font-weight="600" fill="#64748b">Faz Koruma (FK1) arızasında tüm çıkışlar durur.</text>

    <!-- 2. KOMBİNASYON PRİZİ KUTUSU (3P+N+PE 32A CEE + 2× 16A SCHUKO) -->
    <rect x="{SR_X:.1f}" y="{SR2_Y:.1f}" width="{SR_W:.1f}" height="{SR2_H:.1f}" rx="18" fill="#ffffff" stroke="#2563eb" stroke-width="2.2"/>
    <rect x="{SR_X:.1f}" y="{SR2_Y:.1f}" width="{SR_W:.1f}" height="56" rx="18" fill="#eff6ff"/>
    <text x="{SR_X+SR_W/2:.1f}" y="{SR2_Y+25:.1f}" text-anchor="middle" font-size="15" font-weight="800" fill="#1d4ed8">KOMBİNASYON PRİZİ (IP54)</text>
    <text x="{SR_X+SR_W/2:.1f}" y="{SR2_Y+44:.1f}" text-anchor="middle" font-size="11" font-weight="700" fill="#1e40af">QF1 63A 4P 30mA Kaçak Akım Korumalı</text>

    <!-- CEE 32A 3P+N+PE Kırmızı Priz Çizimi -->
    <circle cx="{SR_X+94:.1f}" cy="{SR2_Y+142:.1f}" r="50" fill="#dc2626" stroke="#7f1d1d" stroke-width="2.2"/>
    <circle cx="{SR_X+94:.1f}" cy="{SR2_Y+142:.1f}" r="36" fill="#fef2f2" stroke="#b91c1c" stroke-width="1.5"/>
    <circle cx="{SR_X+94:.1f}" cy="{SR2_Y+118:.1f}" r="5" fill="#9a4a12"/>
    <circle cx="{SR_X+116:.1f}" cy="{SR2_Y+136:.1f}" r="5" fill="#1e293b"/>
    <circle cx="{SR_X+72:.1f}" cy="{SR2_Y+136:.1f}" r="5" fill="#64748b"/>
    <circle cx="{SR_X+108:.1f}" cy="{SR2_Y+162:.1f}" r="5" fill="#1d4ed8"/>
    <circle cx="{SR_X+80:.1f}" cy="{SR2_Y+162:.1f}" r="6.2" fill="#16a34a" stroke="#facc15" stroke-width="1.5"/>
    <text x="{SR_X+94:.1f}" y="{SR2_Y+209:.1f}" text-anchor="middle" font-size="11" font-weight="800" fill="#b91c1c">32A 3P+N+PE CEE</text>
    <text x="{SR_X+94:.1f}" y="{SR2_Y+224:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#475569">Q4 (32A 3P) + N + PE</text>

    <!-- 2× 16A 230V Mavi Kapaklı Schuko Priz -->
    <rect x="{SR_X+194:.1f}" y="{SR2_Y+92:.1f}" width="118" height="48" rx="8" fill="#2563eb" stroke="#1e3a8a" stroke-width="1.6"/>
    <circle cx="{SR_X+253:.1f}" cy="{SR2_Y+116:.1f}" r="18" fill="#eff6ff" stroke="#1e40af" stroke-width="1.3"/>
    <circle cx="{SR_X+245:.1f}" cy="{SR2_Y+116:.1f}" r="3.5" fill="#1e293b"/>
    <circle cx="{SR_X+261:.1f}" cy="{SR2_Y+116:.1f}" r="3.5" fill="#1d4ed8"/>
    <rect x="{SR_X+194:.1f}" y="{SR2_Y+150:.1f}" width="118" height="48" rx="8" fill="#2563eb" stroke="#1e3a8a" stroke-width="1.6"/>
    <circle cx="{SR_X+253:.1f}" cy="{SR2_Y+174:.1f}" r="18" fill="#eff6ff" stroke="#1e40af" stroke-width="1.3"/>
    <circle cx="{SR_X+245:.1f}" cy="{SR2_Y+174:.1f}" r="3.5" fill="#1e293b"/>
    <circle cx="{SR_X+261:.1f}" cy="{SR2_Y+174:.1f}" r="3.5" fill="#1d4ed8"/>
    <text x="{SR_X+253:.1f}" y="{SR2_Y+214:.1f}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#1d4ed8">2× 16A 230V Schuko</text>
    <text x="{SR_X+253:.1f}" y="{SR2_Y+228:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#475569">Q5 (16A 1P) + N + PE</text>

    <!-- Alt bağlantı kutusu -->
    <rect x="{SR_X+16:.1f}" y="{SR2_Y+248:.1f}" width="{SR_W-32:.1f}" height="124" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.3"/>
    <text x="{SR_X+28:.1f}" y="{SR2_Y+272:.1f}" font-size="11.5" font-weight="800" fill="#0B2540">Besleme Zinciri:</text>
    <text x="{SR_X+28:.1f}" y="{SR2_Y+294:.1f}" font-size="11" font-weight="700" fill="#1d4ed8">1. DB1 (L1-L2-L3-N) → QF1 (63A 4P 30mA)</text>
    <text x="{SR_X+28:.1f}" y="{SR2_Y+315:.1f}" font-size="11" font-weight="700" fill="{C_L2}">2. QF1 → Q4 (32A 3P) → 32A CEE Priz</text>
    <text x="{SR_X+28:.1f}" y="{SR2_Y+336:.1f}" font-size="11" font-weight="700" fill="{C_L1}">3. QF1 → Q5 (16A 1P) → 2× 16A Schuko</text>
    <text x="{SR_X+28:.1f}" y="{SR2_Y+357:.1f}" font-size="11" font-weight="700" fill="{C_PE}">4. PE-BARA (PE5) → Tüm priz toprakları</text>
  </g>
''')

    # =========================================================================
    # 6. ALT N-BARA (35 mm²) VE PE-BARA (50 mm²) — AÇIK MERKEZ KORİDORLA
    # =========================================================================
    BAR_W, BAR_H = 356.0, 62.0
    N_X, N_Y = 480.0, 1345.0     # 480..836 (80A ISITMA 895'ten tamamen ayrı!)
    PE_X, PE_Y = 1444.0, 1345.0  # 1444..1800 (PERDE 1370'ten tamamen ayrı!)
    n_pins = [N_X + 28 + i * 50 for i in range(7)]
    pe_pins = [PE_X + 28 + i * 50 for i in range(7)]
    n_py = N_Y + 40.0
    pe_py = PE_Y + 40.0

    # =========================================================================
    # 7. İÇ KABLO BAĞLANTILARI (GÜÇ + KORUMA + KUMANDA)
    # =========================================================================
    parts.append('<g id="internal-wiring">')

    # --- 7A. X0 (50 mm² L1-L2-L3) → Q0 (160A) → DB1 (4×160A) ---
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        # X0 üst → Q0 üst (kalın 50 mm² baralar: 5.5 px!)
        y_hi = 434 + i * 12
        parts.append(wire_path([x0_top[i], (x0_top[i][0], y_hi), (q0_top[i][0], y_hi), q0_top[i]], col, 5.4))
        # Q0 alt → DB1 üst
        y_lo = 708 + i * 11
        x_up = 890 + i * 7
        parts.append(wire_path([q0_bot[i], (q0_bot[i][0], y_lo), (x_up, y_lo), (x_up, 444 + i * 10), (db1_top[i][0], 444 + i * 10), db1_top[i]], col, 5.0))

    # X0 N (35 mm²) üst → DB1 N (4. bara) + X0 N alt → Alt N-BARA (N1)
    parts.append(wire_path([x0_top[3], (x0_top[3][0], 418), (db1_top[3][0], 418), db1_top[3]], C_N, 4.8))
    parts.append(wire_path([x0_bot[3], (x0_bot[3][0], 742), (452, 742), (452, 1316), (n_pins[0], 1316), (n_pins[0], n_py)], C_N, 4.6))

    # X0 PE (50 mm²) alt → Alt PE-BARA (PE1)
    parts.append(wire_path([x0_bot[4], (x0_bot[4][0], 756), (442, 756), (442, 1468), (pe_pins[0], 1468), (pe_pins[0], pe_py)], C_PE, 4.8, stripe=C_PE_S))

    # --- 7B. DB1 (4×160A) → Q1 (80A Isıtma), Q2 (63A Hav.+Perde), Q3 (63A Fan) ---
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_bus1 = 414 + i * 12
        # DB1 alt → sağ kanal üzerinden üst bara (veya DB1 üst paralel çıkış — üstte çok temiz!)
        # DB1'den Q1, Q2, Q3 üstlerine direkt baralı dağıtım:
        parts.append(wire_path([db1_top[i], (db1_top[i][0], y_bus1), (q3_top[i][0], y_bus1), q3_top[i]], col, 4.6))
        parts.append(wire_path([(q1_top[i][0], y_bus1), q1_top[i]], col, 4.8))
        parts.append(wire_path([(q2_top[i][0], y_bus1), q2_top[i]], col, 4.6))
        parts.append(f'<circle cx="{q1_top[i][0]:.1f}" cy="{y_bus1:.1f}" r="5.0" fill="{col}" stroke="#ffffff" stroke-width="1.5"/>')
        parts.append(f'<circle cx="{q2_top[i][0]:.1f}" cy="{y_bus1:.1f}" r="4.8" fill="{col}" stroke="#ffffff" stroke-width="1.5"/>')

    # --- 7C. DB1 alt → Ray 2: QF1 (63A 4P Kaçak Akım), F1 (10A Kumanda), FK1 (Faz Koruma) ---
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_mid = 782 + i * 11
        # DB1 alt → sola QF1 üst + sağa FK1 üst
        parts.append(wire_path([db1_bot[i], (db1_bot[i][0], y_mid), (qf1_top[i][0], y_mid), qf1_top[i]], col, 4.2))
        parts.append(wire_path([(db1_bot[i][0], y_mid), (fk1_top[i][0], y_mid), fk1_top[i]], col, 3.0))
        parts.append(f'<circle cx="{db1_bot[i][0]:.1f}" cy="{y_mid:.1f}" r="4.5" fill="{col}" stroke="#ffffff" stroke-width="1.4"/>')
    # DB1 N alt → QF1 N üst + Alt N-BARA (N2)
    parts.append(wire_path([db1_bot[3], (db1_bot[3][0], 818), (qf1_top[3][0], 818), qf1_top[3]], C_N, 4.2))
    # L1 → F1 (10A Kumanda Sigortası üst)
    parts.append(wire_path([(f1_top[0][0], 782), f1_top[0]], C_L1, 3.2))
    parts.append(f'<circle cx="{f1_top[0][0]:.1f}" cy="782.0" r="4.2" fill="{C_L1}" stroke="#ffffff" stroke-width="1.4"/>')

    # --- 7D. QF1 (63A 4P 30mA) alt → Q4 (32A 3P) & Q5 (16A 1P) üst ---
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_q = 1172 + i * 9
        parts.append(wire_path([qf1_bot[i], (qf1_bot[i][0], y_q), (664 + i * 5, y_q), (664 + i * 5, 896 + i * 9), (q4_top[i][0], 896 + i * 9), q4_top[i]], col, 3.6))
    # Q4 L1 üst → Q5 (16A 1P) üst köprüsü
    parts.append(wire_path([(q4_top[0][0], 896), (q5_top[0][0], 896), q5_top[0]], C_L1, 3.4))
    parts.append(f'<circle cx="{q4_top[0][0]:.1f}" cy="896.0" r="4.0" fill="{C_L1}" stroke="#ffffff" stroke-width="1.3"/>')
    # QF1 N alt → Kombinasyon prizi nötrü (N3 bara üzerinden değil, direkt kaçak akım çıkışından!)
    parts.append(wire_path([qf1_bot[3], (qf1_bot[3][0], 1204), (1848, 1204), (1848, 995), (SR_X, 995)], C_N, 3.6))

    # Q4 alt (32A CEE) + Q5 alt (16A Schuko) → Sağ Kombinasyon Prizi Kutusu
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_pr = 1216 + i * 9
        parts.append(wire_path([q4_bot[i], (q4_bot[i][0], y_pr), (1832 - i * 8, y_pr), (1832 - i * 8, 950 + i * 10), (SR_X, 950 + i * 10)], col, 3.4))
    parts.append(wire_path([q5_bot[0], (q5_bot[0][0], 1244), (1856, 1244), (1856, 982), (SR_X, 982)], C_L1, 3.2))
    # PE5 → Kombinasyon Prizi Toprak
    parts.append(wire_path([(pe_pins[4], pe_py), (pe_pins[4], 1260), (1866, 1260), (1866, 1008), (SR_X, 1008)], C_PE, 3.4, stripe=C_PE_S))

    # --- 7E. Q3 (63A 3P Fan) alt → KM-F1 (18 Fan) & KM-F2 (18 Fan) üst ---
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_fb = 836 + i * 10
        p_f1 = kmf1_pins[["1L1", "3L2", "5L3"][i]]
        p_f2 = kmf2_pins[["1L1", "3L2", "5L3"][i]]
        parts.append(wire_path([q3_bot[i], (q3_bot[i][0], y_fb), (p_f1[0], y_fb), p_f1], col, 4.0))
        parts.append(wire_path([(p_f2[0], y_fb), p_f2], col, 4.0))
        parts.append(f'<circle cx="{p_f2[0]:.1f}" cy="{y_fb:.1f}" r="4.4" fill="{col}" stroke="#ffffff" stroke-width="1.4"/>')

    # --- 7F. Kumanda Devresi: F1 (10A) → FK1 (11-14) → Sol Kapak Paneli & Fan Kontaktörleri ---
    # F1 alt → FK1:11
    parts.append(wire_path([f1_bot[0], (f1_bot[0][0], 1164), (fk1_bot[0][0], 1164), fk1_bot[0]], C_CMD, 3.1))
    # FK1:14 → Sol Kapak Kumanda Paneline (230V ortak kumanda fazı!)
    parts.append(wire_path([fk1_bot[1], (fk1_bot[1][0], 1178), (420, 1178), (420, 726), (SL_X + SL_W, 726)], C_CMD, 3.2))

    # Sol Kapak Şalter Çıkışları → X-KUM (D1..D5, P1..P3) ve KM-F1 / KT1
    # S-FAN → KM-F1:A1 + KT1:A1 & 15, KT1:18 → KM-F2:A1
    parts.append(wire_path([(SL_X + SL_W, 862), (432, 862), (432, 878), (kmf1_pins["A1"][0], 878), kmf1_pins["A1"]], C_FAN_C, 3.0))
    parts.append(wire_path([(kmf1_pins["A1"][0], 878), (kt1_top[0][0], 878), kt1_top[0]], C_FAN_C, 2.9))
    parts.append(wire_path([(kt1_top[0][0], 878), (kt1_top[1][0], 878), kt1_top[1]], C_FAN_C, 2.9))
    parts.append(f'<circle cx="{kmf1_pins["A1"][0]:.1f}" cy="878.0" r="3.8" fill="{C_FAN_C}" stroke="#ffffff" stroke-width="1.2"/>')
    parts.append(f'<circle cx="{kt1_top[0][0]:.1f}" cy="878.0" r="3.8" fill="{C_FAN_C}" stroke="#ffffff" stroke-width="1.2"/>')
    # KT1:18 (3 sn gecikmeli kontak) → KM-F2:A1
    parts.append(wire_path([kt1_bot[1], (kt1_bot[1][0], 1172), (1320, 1172), (1320, 892), (kmf2_pins["A1"][0], 892), kmf2_pins["A1"]], C_FAN_C, 3.0, dashed=True))
    # KM-F1:A2, KT1:A2, KM-F2:A2 → Alt N-BARA (N5: Kum.)
    parts.append(wire_path([kmf1_pins["A2"], (kmf1_pins["A2"][0], 1278), (n_pins[4], 1278), (n_pins[4], n_py)], C_N, 2.9))
    parts.append(wire_path([kt1_bot[0], (kt1_bot[0][0], 1278), (kmf1_pins["A2"][0], 1278)], C_N, 2.9))
    parts.append(wire_path([kmf2_pins["A2"], (kmf2_pins["A2"][0], 1278), (kt1_bot[0][0], 1278)], C_N, 2.9))
    parts.append(f'<circle cx="{kmf1_pins["A2"][0]:.1f}" cy="1278.0" r="3.8" fill="{C_N}" stroke="#ffffff" stroke-width="1.2"/>')
    parts.append(f'<circle cx="{kt1_bot[0][0]:.1f}" cy="1278.0" r="3.8" fill="{C_N}" stroke="#ffffff" stroke-width="1.2"/>')

    # Sol Kapak Havalandırma & Perde + Sağ Merkez Otomasyon → X-KUM (D1..D5, P1..P3 üstleri)
    parts.append(sheath_path([(SL_X + SL_W, 780), (456, 780)], 11))
    # Sağ Merkez Otomasyon panelinden X-KUM üstüne:
    parts.append(sheath_path([(SR_X, 600), (1835, 600)], 11))
    kum_cols = [C_HAV1D, C_HAV1U, C_HAV2D, C_HAV2U, C_SAHA, C_PER_T, C_PER_S, C_SAHA]
    for k, col in enumerate(kum_cols):
        y_k = 900 + k * 7
        parts.append(wire_path([(1835, 580 + k * 5.5), (1792 - k * 4.5, 580 + k * 5.5), (1792 - k * 4.5, y_k), (xkum_top[k][0], y_k), xkum_top[k]], col, 2.4))

    # =========================================================================
    # 8. ALT SAHA ÇIKIŞ KABLOLARI (5 AYRI TEMİZ KILIF YAKASI)
    # =========================================================================
    C_Y = 1585.0
    X_C1, X_C2, X_C3, X_C4, X_C5 = 265.0, 705.0, 1140.0, 1575.0, 2015.0
    K_IN, K_HT, K_HV, K_PR, K_FN = 650.0, 905.0, 1140.0, 1365.0, 1630.0

    # 8A. Ana Giriş 5 damar (50/35/50 mm²) → X0 alt uçları (L1-L2-L3) + N1 + PE1
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        parts.append(wire_path([
            x0_bot[i], (x0_bot[i][0], 710 + i * 10), (416 + i * 8, 710 + i * 10),
            (416 + i * 8, 1516 + i * 8), (K_IN - 16 + i * 8, 1516 + i * 8), (K_IN - 16 + i * 8, C_Y)
        ], col, 4.4))
    parts.append(wire_path([(n_pins[0], n_py), (n_pins[0], 1440), (K_IN + 8, 1440), (K_IN + 8, C_Y)], C_N, 4.2))
    parts.append(wire_path([(pe_pins[0], pe_py), (pe_pins[0], 1498), (K_IN + 16, 1498), (K_IN + 16, C_Y)], C_PE, 4.2, stripe=C_PE_S))

    # 8B. Isıtma 80A (Q1 alt L1-L2-L3 + N2 + PE2) → K_HT
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        parts.append(wire_path([
            q1_bot[i], (q1_bot[i][0], 722 + i * 9), (1046 + i * 6, 722 + i * 9),
            (1046 + i * 6, 1298 + i * 7), (K_HT - 14 + i * 7, 1298 + i * 7), (K_HT - 14 + i * 7, C_Y)
        ], col, 4.2))
    parts.append(wire_path([(n_pins[1], n_py), (n_pins[1], 1450), (K_HT + 7, 1450), (K_HT + 7, C_Y)], C_N, 3.4))
    parts.append(wire_path([(pe_pins[1], pe_py), (pe_pins[1], 1488), (K_HT + 14, 1488), (K_HT + 14, C_Y)], C_PE, 3.4, stripe=C_PE_S))

    # 8C. Havalandırma (36 Motor) + Perde (2 Motor) Ortak Güç (Q2 alt) + Kumanda (X-KUM alt)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_q2 = 746 + i * 9
        x_q2_drop = 1494 + i * 7
        parts.append(wire_path([
            q2_bot[i], (q2_bot[i][0], y_q2), (x_q2_drop, y_q2),
            (x_q2_drop, 1294 + i * 7), (K_HV - 26 + i * 7, 1294 + i * 7), (K_HV - 26 + i * 7, C_Y)
        ], col, 3.8))
        parts.append(wire_path([(K_PR - 20 + i * 7, 1294 + i * 7), (K_PR - 20 + i * 7, C_Y)], col, 3.4))
        parts.append(f'<circle cx="{K_PR - 20 + i * 7:.1f}" cy="{1294 + i * 7:.1f}" r="4.0" fill="{col}" stroke="#ffffff" stroke-width="1.3"/>')
    # Havalandırma N3 & PE3 + D1..D5 kumanda → K_HV
    parts.append(wire_path([(n_pins[2], n_py), (n_pins[2], 1460), (K_HV - 5, 1460), (K_HV - 5, C_Y)], C_N, 3.2))
    parts.append(wire_path([(pe_pins[2], pe_py), (pe_pins[2], 1478), (K_HV + 2, 1478), (K_HV + 2, C_Y)], C_PE, 3.2, stripe=C_PE_S))
    for k in range(5):
        parts.append(wire_path([xkum_bot[k], (xkum_bot[k][0], 1228 + k * 7), (K_HV + 9 + k * 5, 1228 + k * 7), (K_HV + 9 + k * 5, C_Y)], kum_cols[k], 2.5))

    # Perde P1..P3 kumanda → K_PR (PE-BARA'nın tamamen solunda!)
    for k in range(3):
        parts.append(wire_path([xkum_bot[5 + k], (xkum_bot[5 + k][0], 1265 + k * 7), (K_PR + 6 + k * 6, 1265 + k * 7), (K_PR + 6 + k * 6, C_Y)], kum_cols[5 + k], 2.6))

    # 8D. Fanlar 36 (KM-F1: 18 Fan + KM-F2: 18 Fan + N4 + PE4) → K_FN
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        pf1 = kmf1_pins[["2T1", "4T2", "6T3"][i]]
        pf2 = kmf2_pins[["2T1", "4T2", "6T3"][i]]
        parts.append(wire_path([pf1, (pf1[0], 1510 + i * 7), (K_FN - 24 + i * 6, 1510 + i * 7), (K_FN - 24 + i * 6, C_Y)], col, 3.4))
        parts.append(wire_path([pf2, (pf2[0], 1532 + i * 7), (K_FN - 4 + i * 6, 1532 + i * 7), (K_FN - 4 + i * 6, C_Y)], col, 3.4))
    parts.append(wire_path([(n_pins[3], n_py), (n_pins[3], 1468), (K_FN + 16, 1468), (K_FN + 16, C_Y)], C_N, 3.0))
    parts.append(wire_path([(pe_pins[3], pe_py), (pe_pins[3], 1450), (K_FN + 22, 1450), (K_FN + 22, C_Y)], C_PE, 3.0, stripe=C_PE_S))

    parts.append('</g>')

    # =========================================================================
    # 9. ALT N-BARA VE PE-BARA KUTULARI (ÜST KATMAN — SIFIR YAZI ÇAKIŞMASI)
    # =========================================================================
    n_roles = ["Giriş", "Isıtma", "Hav+Per", "Fan", "Kum.", "Yedek", "Yedek"]
    pe_roles = ["Giriş", "Isıtma", "Hav+Per", "Fan", "K.Priz", "Gövde", "Yedek"]
    parts.append(f'''
  <g id="n-pe-bars-bottom" filter="url(#softShadow)">
    <rect x="{N_X:.1f}" y="{N_Y:.1f}" width="{BAR_W:.1f}" height="{BAR_H:.1f}" rx="9" fill="#eff6ff" stroke="#2563eb" stroke-width="2.2"/>
    <rect x="{N_X+12:.1f}" y="{N_Y+32:.1f}" width="{BAR_W-24:.1f}" height="16" rx="4" fill="#d97706" stroke="#92400e" stroke-width="1"/>
    {"".join(
        f'<text x="{px:.1f}" y="{N_Y+13:.1f}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#1e3a8a">N{i+1}</text>'
        f'<text x="{px:.1f}" y="{N_Y+25:.1f}" text-anchor="middle" font-size="7.8" font-weight="700" fill="#3b82f6">{n_roles[i]}</text>'
        f'<circle cx="{px:.1f}" cy="{n_py:.1f}" r="5.2" fill="#fef08a" stroke="#78350f" stroke-width="1.3"/>'
        for i, px in enumerate(n_pins)
    )}
    <rect x="{N_X:.1f}" y="{N_Y-22:.1f}" width="118" height="20" rx="5" fill="#1d4ed8"/>
    <text x="{N_X+59:.1f}" y="{N_Y-8.5:.1f}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#ffffff">N-BARA (35 mm²)</text>

    <rect x="{PE_X:.1f}" y="{PE_Y:.1f}" width="{BAR_W:.1f}" height="{BAR_H:.1f}" rx="9" fill="#f0fdf4" stroke="#16a34a" stroke-width="2.2"/>
    <rect x="{PE_X+12:.1f}" y="{PE_Y+32:.1f}" width="{BAR_W-24:.1f}" height="16" rx="4" fill="#d97706" stroke="#92400e" stroke-width="1"/>
    {"".join(
        f'<text x="{px:.1f}" y="{PE_Y+13:.1f}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#14532d">PE{i+1}</text>'
        f'<text x="{px:.1f}" y="{PE_Y+25:.1f}" text-anchor="middle" font-size="7.8" font-weight="700" fill="#16a34a">{pe_roles[i]}</text>'
        f'<circle cx="{px:.1f}" cy="{pe_py:.1f}" r="5.2" fill="#fef08a" stroke="#78350f" stroke-width="1.3"/>'
        for i, px in enumerate(pe_pins)
    )}
    <rect x="{PE_X+BAR_W-126:.1f}" y="{PE_Y-22:.1f}" width="126" height="20" rx="5" fill="#15803d"/>
    <text x="{PE_X+BAR_W-63:.1f}" y="{PE_Y-8.5:.1f}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#ffffff">PE-BARA (50 mm²)</text>
  </g>
''')

    # =========================================================================
    # 10. BİLEŞEN KİMLİK ROZETLERİ (EN ÜST KATMAN)
    # =========================================================================
    def badge(cx: float, cy: float, text: str, bg: str = "#0B2540", bw: float = 124.0) -> str:
        return f'''
        <g>
          <rect x="{cx-bw/2:.1f}" y="{cy-13:.1f}" width="{bw:.1f}" height="26" rx="6" fill="{bg}" stroke="#ffffff" stroke-width="2"/>
          <text x="{cx:.1f}" y="{cy+4:.1f}" text-anchor="middle" font-size="11.2" font-weight="800" fill="#ffffff">{text}</text>
        </g>'''

    parts.append('<g id="badges-top" filter="url(#softShadow)">')
    parts.append(badge(486 + 110, 474, "X0 • 50/35/50 mm²", "#0B2540", 156))
    parts.append(badge(740 + 69, 474, "Q0 • 160A ŞALTER", "#b91c1c", 136))
    parts.append(badge(912 + 87, 474, "DB1 • 4×160A", "#334155", 122))
    parts.append(badge(1132 + 72, 474, "Q1 • 80A ISITMA", "#991b1b", 134))
    parts.append(badge(1334 + 69, 474, "Q2 • 63A HAV+PER", "#0369a1", 138))
    parts.append(badge(1534 + 69, 474, "Q3 • 63A FAN", "#ea580c", 124))

    parts.append(badge(486 + 84, 930, "QF1 • 63A 4P 30mA", "#1d4ed8", 152))
    parts.append(badge(676 + 57, 930, "Q4 • 32A", "#1e293b", 92))
    parts.append(badge(828, 930, "Q5", "#334155", 46))
    parts.append(badge(900, 930, "F1", "#dc2626", 46))
    parts.append(badge(988, 930, "FK1 • FAZ", "#b91c1c", 88))
    parts.append(badge(1066 + 76, 930, "KM-F1 • 18 FAN", "#ea580c", 132))
    parts.append(badge(1275, 930, "KT1 3s", "#c2410c", 68))
    parts.append(badge(1332 + 76, 930, "KM-F2 • 18 FAN", "#ea580c", 132))
    parts.append(badge(1524 + 104, 954, "X-KUM • D1–D5 / P1–P3", "#6d28d9", 174))
    parts.append('<rect x="403" y="771" width="54" height="18" rx="4" fill="#6d28d9" stroke="#ffffff" stroke-width="1.5"/><text x="430" y="783" text-anchor="middle" font-size="8.2" font-weight="800" fill="#ffffff">→ X-KUM</text>')
    parts.append('</g>')

    # =========================================================================
    # 11. ALT SAHA KILIFLARI VE 5 SAHA ÇIKIŞ KARTI
    # =========================================================================
    CARD_Y = 1850.0
    parts.append('<g id="field-sheaths">')
    parts.append(sheath_path([(K_IN, C_Y), (K_IN, 1650), (X_C1, 1650), (X_C1, 1740)], 16))
    parts.append(sheath_path([(K_HT, C_Y), (K_HT, 1680), (X_C2, 1680), (X_C2, 1740)], 15))
    parts.append(sheath_path([(K_HV, C_Y), (K_HV, 1740)], 15))
    parts.append(sheath_path([(K_PR, C_Y), (K_PR, 1680), (X_C4, 1680), (X_C4, 1740)], 14))
    parts.append(sheath_path([(K_FN, C_Y), (K_FN, 1650), (X_C5, 1650), (X_C5, 1740)], 15))
    for kx, lbl in [(K_IN, "GİRİŞ"), (K_HT, "80A ISITMA"), (K_HV, "HAV. 36M"), (K_PR, "PERDE 2M"), (K_FN, "FAN 2×18")]:
        parts.append(f'<rect x="{kx-38:.1f}" y="{C_Y-11:.1f}" width="76" height="22" rx="6" fill="#0B2540" stroke="#1F9D6B" stroke-width="1.4"/>')
        parts.append(f'<text x="{kx:.1f}" y="{C_Y+3.5:.1f}" text-anchor="middle" font-size="9.2" font-weight="800" fill="#ffffff">{lbl}</text>')
    parts.append('</g>')

    def fan_cores(cx: float, y_top: float, y_bot: float, cores: list[tuple[str, str, str | None]]) -> str:
        n = len(cores)
        spread = min(350, (n - 1) * 48)
        start_x = cx - spread / 2
        step = spread / max(1, n - 1)
        out = [f'<rect x="{cx - 12}" y="{y_top - 6}" width="24" height="14" rx="4" fill="#0f172a"/>']
        for i, (lbl, col, stp) in enumerate(cores):
            tx = start_x + i * step
            out.append(wire_path([(cx, y_top + 6), (cx, y_top + 24), (tx, y_top + 56), (tx, y_bot)], col, 3.8, stripe=stp, radius=10))
            out.append(f'<rect x="{tx - 21:.1f}" y="{y_bot - 22:.1f}" width="42" height="20" rx="4" fill="#ffffff" stroke="{col}" stroke-width="1.5"/>')
            out.append(f'<text x="{tx:.1f}" y="{y_bot - 8.5:.1f}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#0f172a">{lbl}</text>')
        return "\n".join(out)

    parts.append('<g id="field-cores">')
    parts.append(fan_cores(X_C1, 1740, CARD_Y, [("L1", C_L1, None), ("L2", C_L2, None), ("L3", C_L3, None), ("N", C_N, None), ("PE", C_PE, C_PE_S)]))
    parts.append(fan_cores(X_C2, 1740, CARD_Y, [("L1", C_L1, None), ("L2", C_L2, None), ("L3", C_L3, None), ("N", C_N, None), ("PE", C_PE, C_PE_S)]))
    parts.append(fan_cores(X_C3, 1740, CARD_Y, [("3~", C_L1, None), ("N", C_N, None), ("PE", C_PE, C_PE_S), ("D1", C_HAV1D, None), ("D2", C_HAV1U, None), ("D3", C_HAV2D, None), ("D4", C_HAV2U, None), ("D5", C_SAHA, None)]))
    parts.append(fan_cores(X_C4, 1740, CARD_Y, [("3~", C_L2, None), ("N", C_N, None), ("PE", C_PE, C_PE_S), ("P1", C_PER_T, None), ("P2", C_PER_S, None), ("P3", C_SAHA, None)]))
    parts.append(fan_cores(X_C5, 1740, CARD_Y, [("G1-U", C_L1, None), ("G1-V", C_L2, None), ("G1-W", C_L3, None), ("G2-U", C_L1, None), ("G2-V", C_L2, None), ("G2-W", C_L3, None), ("PE", C_PE, C_PE_S)]))
    parts.append('</g>')

    # 5 Saha Kartı (Genişlik 408 px, yükseklik 315 px)
    CW, CH = 408.0, 315.0

    def field_card(cx: float, title: str, sub: str, border: str, hdr_bg: str, hdr_fg: str, lines: list[tuple[str, str]], foot: str) -> str:
        from xml.sax.saxutils import escape
        x0 = cx - CW / 2
        rows = "".join(
            f'<text x="{x0+22:.1f}" y="{CARD_Y+96+i*26:.1f}" font-size="12" font-weight="700" fill="{col}">{escape(txt)}</text>'
            for i, (txt, col) in enumerate(lines)
        )
        return f"""
        <g>
          <rect x="{x0:.1f}" y="{CARD_Y:.1f}" width="{CW:.1f}" height="{CH:.1f}" rx="16" fill="#ffffff" stroke="{border}" stroke-width="2.2"/>
          <rect x="{x0:.1f}" y="{CARD_Y:.1f}" width="{CW:.1f}" height="46" rx="16" fill="{hdr_bg}"/>
          <text x="{cx:.1f}" y="{CARD_Y+24:.1f}" text-anchor="middle" font-size="14.5" font-weight="800" fill="{hdr_fg}">{escape(title)}</text>
          <text x="{cx:.1f}" y="{CARD_Y+41:.1f}" text-anchor="middle" font-size="10.8" font-weight="700" fill="#475569">{escape(sub)}</text>
          <rect x="{x0+14:.1f}" y="{CARD_Y+62:.1f}" width="{CW-28:.1f}" height="214" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.3"/>
          {rows}
          <text x="{cx:.1f}" y="{CARD_Y+298:.1f}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#64748b">{escape(foot)}</text>
        </g>"""

    parts.append('<g id="field-cards" filter="url(#cardShadow)">')
    parts.append(field_card(
        X_C1, "1. ANA GÜÇ GİRİŞİ (160A)", "3~ 400V / 230V AC • 50 Hz",
        "#0B2540", "#f1f5f9", "#0B2540",
        [
            ("• L1 (Kahve) → X0:L1 (50 mm² Klemens)", C_L1),
            ("• L2 (Siyah)  → X0:L2 (50 mm² Klemens)", C_L2),
            ("• L3 (Gri)    → X0:L3 (50 mm² Klemens)", C_L3),
            ("• N (Mavi)    → X0:N (35 mm²) → DB1 & N1", C_N),
            ("• PE (Sr-Yşl) → X0:PE (50 mm²) → PE1", C_PE),
            ("• Q0 (160A) → DB1 (4×160A Bara)", "#0B2540"),
        ],
        "Ana dağıtım panosundan gelen bölge beslemesi"
    ))
    parts.append(field_card(
        X_C2, "2. ISITMA HATTI (80A 3P)", "Q1: ABB S803S-C80 Çıkışı",
        "#b91c1c", "#fef2f2", "#991b1b",
        [
            ("• L1 (Kahve) → Q1:2 (80A Çıkış)", C_L1),
            ("• L2 (Siyah)  → Q1:4 (80A Çıkış)", C_L2),
            ("• L3 (Gri)    → Q1:6 (80A Çıkış)", C_L3),
            ("• N (Mavi)    → Alt N-BARA (N2)", C_N),
            ("• PE (Sr-Yşl) → Alt PE-BARA (PE2)", C_PE),
            ("• Önerilen Kablo: 4×25 + PE veya 5×25 mm²", "#991b1b"),
        ],
        "Isıtma kazan / sirkülasyon / üfleme grubu"
    ))
    parts.append(field_card(
        X_C3, "3. HAVALANDIRMA (36 MOTOR)", "Q2 (63A Ortak) + 5×1 mm² Sektör Kumanda",
        "#0369a1", "#f0f9ff", "#0369a1",
        [
            ("• 3~ Güç (L1-L2-L3) → Q2:2-4-6 (63A)", C_L1),
            ("• N & PE → N-BARA (N3) & PE-BARA (PE3)", C_N),
            ("• D1 (Mor) / D2 (İndigo) → Hav.1 Kapat/Aç", C_HAV1U),
            ("• D3 (Teal) / D4 (Turkuaz) → Hav.2 Kapat/Aç", C_HAV2U),
            ("• D5 (Macenta) → Saha Yerel Buton İzni", C_SAHA),
            ("• 18× O2Sera İkili Motor Panosu paralel!", "#1F9D6B"),
        ],
        "Önceki O2Sera İkili Motor Panosuyla %100 uyumlu"
    ))
    parts.append(field_card(
        X_C4, "4. PERDE GRUBU (2 MOTOR)", "Q2 (63A Hav. ile Ortak) + Ser / Topla",
        "#059669", "#ecfdf5", "#047857",
        [
            ("• 3~ Güç (L1-L2-L3) → Q2:2-4-6 (Ortak)", C_L2),
            ("• N & PE → N-BARA (N3) & PE-BARA (PE3)", C_N),
            ("• P1 (Pembe) → Perde Topla (▼) Komutu", C_PER_T),
            ("• P2 (Yeşil)  → Perde Ser (▲) Komutu", C_PER_S),
            ("• P3 (Macenta) → Saha Yerel İzin", C_SAHA),
            ("• 1× O2Sera İkili Motor Panosunu besler", "#047857"),
        ],
        "Isı / gölge perdesi ileri-geri redüktör grubu"
    ))
    parts.append(field_card(
        X_C5, "5. SİRKÜLASYON FANLARI (36 ADET)", "Q3 (63A) → KM-F1 (18) + KM-F2 (18)",
        "#ea580c", "#fff7ed", "#c2410c",
        [
            ("• Grup 1 (18 Fan): KM-F1 (2T1-4T2-6T3)", C_L1),
            ("• Grup 2 (18 Fan): KM-F2 (2T1-4T2-6T3)", C_L2),
            ("• Kademe: KT1 (3 sn) → KM-F2 gecikmeli", C_FAN_C),
            ("• N & PE → N-BARA (N4) & PE-BARA (PE4)", C_N),
            ("• S-FAN = OTO: Merkezden | AÇ: Manuel", "#c2410c"),
            ("• 2× 40A Kontaktör → Düşük demeraj akımı", "#0B2540"),
        ],
        "36 sirkülasyon fanı 2 eşit 18'li kademe"
    ))
    parts.append('</g>')

    # =========================================================================
    # 12. ALT RENK LEJANTI & O2SERA ANTET
    # =========================================================================
    legend = [
        ("L1 Faz", C_L1, None), ("L2 Faz", C_L2, None), ("L3 Faz", C_L3, None),
        ("Nötr (N)", C_N, None), ("Toprak (PE)", C_PE, C_PE_S), ("Kumanda 230V", C_CMD, None),
        ("Hav.1 ↑/↓", C_HAV1U, None), ("Hav.2 ↑/↓", C_HAV2U, None),
        ("Perde Ser", C_PER_S, None), ("Perde Topla", C_PER_T, None),
        ("Fan KM/KT", C_FAN_C, None), ("Yerel İzin", C_SAHA, None),
    ]
    lx = 74
    leg_svg = []
    for name, col, stp in legend:
        leg_svg.append(f'<rect x="{lx}" y="2264" width="20" height="8" rx="4" fill="{col}"/>')
        if stp:
            leg_svg.append(f'<line x1="{lx+2}" y1="2268" x2="{lx+18}" y2="2268" stroke="{stp}" stroke-width="5" stroke-dasharray="4 4"/>')
        leg_svg.append(f'<text x="{lx+26}" y="2272" font-size="11.5" font-weight="700" fill="#334155">{name}</text>')
        lx += 155

    parts.append(f'''
  <g id="footer">
    <rect x="56" y="2236" width="2168" height="66" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    {"".join(leg_svg)}
    <text x="2206" y="2272" text-anchor="end" font-size="12.5" font-weight="800" fill="#0B2540"><tspan fill="#1F9D6B">O2Sera</tspan> • Sera İçi Bölge Panosu</text>
  </g>
</svg>''')

    return "\n".join(parts)


if __name__ == "__main__":
    svg = build_svg()
    OUT_SVG.write_text(svg, encoding="utf-8")
    print(f"Wrote SVG: {OUT_SVG} ({len(svg)} bytes)")
