#!/usr/bin/env python3
"""
Kutusuz ABB İkili Redüktör Motor Kumanda Bağlantı Diyagramı (SVG + PNG) üreticisi.

Revizyon 2:
- N-BARA ve PE-BARA alt DIN rayının hemen altına taşındı; her aktif vida
  görev etiketiyle işaretlendi (çok daha sade ve anlaşılır kablo akışı).
- Fonksiyona göre ayrıştırılmış, yüksek kontrastlı yeni kablo renk paleti.
- Mutlusan SW-BL4252 buton kartları gerçek vidalardan çıkan kablolar,
  1NO kontak sembolleri, ölçüler ve teknik ürün bilgileriyle detaylandırıldı.
- Ana bileşenlerin (Q1, Q2, R1, X1-X3, KM1-KM4, X4-X12, S1, S2, alt kartlar)
  konumları birebir korundu.
"""
from pathlib import Path

BASE_DIR = Path("/home/yakup/Gemini-Projeler/Elektrik-Pano-Tasarim/ciktilar")
OUT_SVG = BASE_DIR / "O2Sera-Ikili-Motor-Baglanti-Diyagrami.svg"


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
    dash_attr = ' stroke-dasharray="10 6"' if dashed else ""
    out = [
        f'<path d="{d}" fill="none" stroke="#ffffff" stroke-width="{width + 2.6:.1f}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.92"/>',
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
        r = min(18.0, l1 / 2.2, l2 / 2.2)
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


def din_terminal_svg(x: float, y: float, w: float, h: float, label: str, fill: str = "#cbd5e1", accent: str = "#64748b") -> str:
    """3D gölgeli DIN ray klemensi."""
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
      <rect x="{x+3:.1f}" y="{y+h/2-14:.1f}" width="{w-6:.1f}" height="28" rx="2" fill="#ffffff" stroke="{accent}" stroke-width="1.3"/>
      <text x="{cx:.1f}" y="{y+h/2+4:.1f}" text-anchor="middle" font-size="{11 if w >= 24 else 9.5}" font-weight="800" fill="#0f172a">{label}</text>
    </g>"""


# =============================================================================
# 'gemini için görsel' TEKNİK ÇİZİMLERİNDEN BİREBİR VEKTÖREL BİLEŞENLER
# =============================================================================

def draw_abb_ms116(x: float, y: float, w: float = 150.0, h: float = 300.0) -> str:
    """ABB MS116 ön görünüş — kaynak: ABB-MS116-on-gorunus.png."""
    sx = w / 135.0
    sy = h / 270.0
    return f"""
    <g transform="translate({x:.2f},{y:.2f}) scale({sx:.5f},{sy:.5f})" stroke="#1b2228" fill="none">
      <rect x="0" y="0" width="135" height="270" rx="6" fill="#ffffff" stroke-width="1.8"/>
      <rect x="4" y="4" width="127" height="42" rx="3" fill="#e6ebef" stroke-width="1.1"/>
      <rect x="4" y="224" width="127" height="42" rx="3" fill="#e6ebef" stroke-width="1.1"/>
      <g fill="#ffffff" stroke-width="1.2">
        <circle cx="25.5" cy="21" r="7.2"/><circle cx="67.5" cy="21" r="7.2"/><circle cx="109.5" cy="21" r="7.2"/>
        <circle cx="25.5" cy="249" r="7.2"/><circle cx="67.5" cy="249" r="7.2"/><circle cx="109.5" cy="249" r="7.2"/>
      </g>
      <g stroke-width="1.4">
        <line x1="21" y1="21" x2="30" y2="21"/><line x1="63" y1="21" x2="72" y2="21"/><line x1="105" y1="21" x2="114" y2="21"/>
        <line x1="21" y1="249" x2="30" y2="249"/><line x1="63" y1="249" x2="72" y2="249"/><line x1="105" y1="249" x2="114" y2="249"/>
      </g>
      <g fill="#1b2228" stroke="none" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="10.2" font-weight="700" text-anchor="middle">
        <text x="25.5" y="40">1L1</text><text x="67.5" y="40">3L2</text><text x="109.5" y="40">5L3</text>
        <text x="25.5" y="236">2T1</text><text x="67.5" y="236">4T2</text><text x="109.5" y="236">6T3</text>
      </g>
      <text x="14" y="65" fill="#e2231a" stroke="none" font-size="11.5" font-weight="900">ABB</text>
      <text x="121" y="65" fill="#475569" stroke="none" font-size="9.5" font-weight="700" text-anchor="end">MS116</text>
      <circle cx="67.5" cy="83" r="13" fill="#e6ebef" stroke-width="1.2"/>
      <line x1="67.5" y1="83" x2="67.5" y2="72" stroke-width="2.2"/>
      <text x="85" y="87" fill="#5f6a73" stroke="none" font-size="9.5" font-weight="600">A ayarı</text>
      <circle cx="67.5" cy="150" r="39" fill="#e6ebef" stroke-width="1.5"/>
      <rect x="57" y="114" width="21" height="72" rx="6" fill="#2a3138" stroke="none"/>
      <text x="67.5" y="106" fill="#1b2228" stroke="none" text-anchor="middle" font-size="11" font-weight="800">I</text>
      <text x="20" y="154" fill="#1b2228" stroke="none" text-anchor="middle" font-size="11" font-weight="800">O</text>
      <text x="67.5" y="203" fill="#5f6a73" stroke="none" text-anchor="middle" font-size="9.5" font-weight="600">döner düğme</text>
    </g>"""


def draw_abb_bc6(x: float, y: float, w: float = 175.0) -> str:
    """ABB B6-30-01 (AC bobin; gövde BC6 ile aynı) ön görünüş — kaynak: ABB-BC6-30-01-on-gorunus.png."""
    s = w / 142.5
    return f"""
    <g transform="translate({x:.2f},{y:.2f}) scale({s:.5f})" stroke="#1b2228" fill="none">
      <path d="M115.5,1.5 V-10.5 A13.5,13.5 0 0 1 142.5,-10.5 V1.5 Z" fill="#e6ebef" stroke-width="1.4"/>
      <circle cx="129.0" cy="-9.6" r="4.8" fill="#ffffff" stroke-width="1.2"/>
      <path d="M-15,123 H27 V153.75 H-7.5 A7.5,15.3 0 0 1 -15,138 Z" fill="#e6ebef" stroke-width="1.4"/>
      <rect x="-9" y="135.6" width="24" height="10.2" rx="5.1" fill="#ffffff" stroke-width="1.2"/>
      <rect x="0" y="0" width="142.5" height="135" rx="5" fill="#ffffff" stroke-width="1.7"/>
      <rect x="4.5" y="4.5" width="133.5" height="126" rx="3" fill="#eef1f4" stroke="#c3cbd2" stroke-width="1.1"/>
      {"".join(
          f'<circle cx="{cx}" cy="26.0" r="7.6" fill="#ffffff" stroke-width="1.2"/>'
          f'<line x1="{cx-4.6}" y1="21.4" x2="{cx+4.6}" y2="30.6" stroke-width="1.2"/>'
          f'<line x1="{cx-4.6}" y1="30.6" x2="{cx+4.6}" y2="21.4" stroke-width="1.2"/>'
          f'<text x="{cx}" y="44.2" fill="#1b2228" stroke="none" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="8.4" font-weight="700" text-anchor="middle">{tl}</text>'
          f'<circle cx="{cx}" cy="109.0" r="7.6" fill="#ffffff" stroke-width="1.2"/>'
          f'<line x1="{cx-4.6}" y1="104.4" x2="{cx+4.6}" y2="113.6" stroke-width="1.2"/>'
          f'<line x1="{cx-4.6}" y1="113.6" x2="{cx+4.6}" y2="104.4" stroke-width="1.2"/>'
          f'<text x="{cx}" y="97.8" fill="#1b2228" stroke="none" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="8.4" font-weight="700" text-anchor="middle">{bl}</text>'
          for cx, tl, bl in [(30, "1L1", "2T1"), (54, "3L2", "4T2"), (78, "5L3", "6T3"), (102, "21", "22"), (126, "A1", "A2")]
      )}
      <rect x="8.5" y="56" width="15" height="22" rx="2" fill="#2a3138" stroke="none"/>
      <text x="8" y="53" fill="#5f6a73" stroke="none" font-size="6.8">gösterge</text>
      <rect x="62" y="60" width="8.5" height="8.5" fill="#2a3138" stroke="none"/>
      <rect x="88" y="60" width="8.5" height="8.5" fill="#2a3138" stroke="none"/>
      <text x="108" y="70" fill="#e2231a" stroke="none" font-size="9.2" font-weight="900">ABB</text>
      <text x="31" y="83" fill="#1b2228" stroke="none" font-size="9.2" font-weight="800">B6-30-01</text>
    </g>"""


def draw_abb_crm4ss(x: float, y: float, w: float = 136.0, h: float = 310.0) -> str:
    """ABB CR-M230AC4 + CR-M4SS 14 pin soketli ara röle — kaynak: ABB-CR-M230AC4-CR-M4SS-on-gorunus.png."""
    cols = [24.0, 53.3, 82.7, 112.0]
    y_no, y_nc, y_coil, y_com = 24.0, 62.0, 244.0, 286.0
    r = 8.2

    def screw(cx: float, cy: float) -> str:
        return (
            f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="#ffffff" stroke="#1b2228" stroke-width="1.3"/>'
            f'<line x1="{cx-5.0:.1f}" y1="{cy:.1f}" x2="{cx+5.0:.1f}" y2="{cy:.1f}" stroke="#1b2228" stroke-width="1.3"/>'
            f'<line x1="{cx:.1f}" y1="{cy-5.0:.1f}" x2="{cx:.1f}" y2="{cy+5.0:.1f}" stroke="#1b2228" stroke-width="1.3"/>'
        )

    screws_svg = []
    for cx, lbl in zip(cols, ["44", "34", "24", "14"]):
        screws_svg.append(screw(cx, y_no))
        screws_svg.append(f'<text x="{cx:.1f}" y="{y_no+18.5:.1f}" fill="#1b2228" stroke="none" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="10.2" font-weight="700" text-anchor="middle">{lbl}</text>')
    for cx, lbl in zip(cols, ["42", "32", "22", "12"]):
        screws_svg.append(screw(cx, y_nc))
        screws_svg.append(f'<text x="{cx:.1f}" y="{y_nc+18.5:.1f}" fill="#1b2228" stroke="none" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="10.2" font-weight="700" text-anchor="middle">{lbl}</text>')
    for cx, lbl in [(34.0, "A2"), (102.0, "A1")]:
        screws_svg.append(f'<text x="{cx:.1f}" y="{y_coil-13.5:.1f}" fill="#1b2228" stroke="none" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="10.5" font-weight="800" text-anchor="middle">{lbl}</text>')
        screws_svg.append(screw(cx, y_coil))
    for cx, lbl in zip(cols, ["41", "31", "21", "11"]):
        screws_svg.append(f'<text x="{cx:.1f}" y="{y_com-13.5:.1f}" fill="#1b2228" stroke="none" font-family="Liberation Mono, DejaVu Sans Mono, monospace" font-size="10.2" font-weight="700" text-anchor="middle">{lbl}</text>')
        screws_svg.append(screw(cx, y_com))

    return f"""
    <g transform="translate({x:.2f},{y:.2f})" stroke="#1b2228" fill="none">
      <rect x="0" y="0" width="{w:.1f}" height="{h:.1f}" rx="6" fill="#f4f6f8" stroke-width="2.0"/>
      <rect x="5" y="6" width="{w-10:.1f}" height="82" rx="3" fill="#e6ebef" stroke="#94a3b8" stroke-width="1"/>
      <rect x="14" y="95" width="{w-28:.1f}" height="104" rx="4" fill="#e9eef2" stroke="#1b2228" stroke-width="1.6"/>
      <rect x="20" y="121" width="{w-40:.1f}" height="72" rx="2" fill="#8f979e" stroke="none"/>
      <text x="{w-36:.1f}" y="137" fill="#e2231a" stroke="none" font-size="12.5" font-weight="900" text-anchor="middle">ABB</text>
      <text x="26" y="153" fill="#ffffff" stroke="none" font-size="9.5" font-weight="600">230 V AC</text>
      <text x="{w/2:.1f}" y="174" fill="#ffffff" stroke="none" font-size="10.8" font-weight="800" text-anchor="middle">CR-M230AC4</text>
      <text x="{w/2:.1f}" y="186" fill="#e2e8f0" stroke="none" font-size="7.6" text-anchor="middle">1SVR405613R3000</text>
      <rect x="{w-54:.1f}" y="101" width="32" height="14" rx="4.5" fill="#f58220" stroke="#1b2228" stroke-width="1.2"/>
      <line x1="{w-46:.1f}" y1="108" x2="{w-30:.1f}" y2="108" stroke="#ffffff" stroke-width="2"/>
      <rect x="7" y="201" width="16" height="14" rx="1.5" fill="#c9d1d8" stroke="#475569" stroke-width="1"/>
      <rect x="{w-23:.1f}" y="201" width="16" height="14" rx="1.5" fill="#c9d1d8" stroke="#475569" stroke-width="1"/>
      <rect x="5" y="219" width="{w-10:.1f}" height="85" rx="3" fill="#e6ebef" stroke="#94a3b8" stroke-width="1"/>
      {"".join(screws_svg)}
    </g>"""


def draw_detailed_button_card(
    card_x: float,
    card_y: float,
    card_w: float,
    card_h: float,
    side: str,
    title: str,
    motor_lbl: str,
    q_ref: str,
    up_pin: str,
    dn_pin: str,
    c_com: str,
    c_up: str,
    c_dn: str,
    uid: str,
) -> tuple[str, tuple[float, float]]:
    """
    Detaylı Mutlusan SW-BL4252 ikiz buton kartı (kaynak: 5-SW-BL4252-cizim.png).
    Önden ölçülü görünüş, 1NO kontak sembollü Blok A & Blok B, vida klemenslerinden
    çıkan gerçek renkli kablolar ve alt bağlantı tablosunu içerir.
    Dönüş: (svg_string, kablo_cikis_noktasi)
    """
    cx = card_x + card_w / 2.0
    exit_x = card_x + card_w if side == "left" else card_x
    exit_y = card_y + 348.0  # Kablolar blokların altındaki vidalardan engelsiz çıkar

    # 1. Önden Görünüş (krom oval çerçeve ≈ 54×30 mm)
    ow, oh = 188.0, 96.0
    ox, oy = cx - ow / 2.0, card_y + 88.0

    # 2. Arka 1NO Kontak Blokları (Blok A: ↓ , Blok B: ↑) — vidalar alt kenarda (sıfır yazı çakışması!)
    by = card_y + 224.0
    bw, bh = 104.0, 102.0
    gap = 18.0
    ax = cx - bw - gap / 2.0
    bx = cx + gap / 2.0

    # Vida merkezleri (blokların alt kısmında)
    a3 = (ax + 26.0, by + 84.0)
    a4 = (ax + 78.0, by + 84.0)
    b3 = (bx + 26.0, by + 84.0)
    b4 = (bx + 78.0, by + 84.0)

    # Klemenslerden kart çıkışına giden gerçek renkli iç kablolar (hiçbir yazıyı kesmez!)
    y_out_com = exit_y - 7.0
    y_out_up = exit_y
    y_out_dn = exit_y + 7.0
    inner_wires = []
    # Ortak 3-3 köprüsü (Blok A:3 ↔ Blok B:3, blokların hemen altında)
    y_j = by + bh + 10.0
    inner_wires.append(wire_path([a3, (a3[0], y_j), (b3[0], y_j), b3], c_com, 3.0, radius=4))
    if side == "left":
        inner_wires.append(wire_path([b3, (b3[0], y_j), (card_x + card_w - 22, y_j), (card_x + card_w - 22, y_out_com), (exit_x, y_out_com)], c_com, 2.8, radius=5))
        inner_wires.append(wire_path([b4, (b4[0], y_j + 11), (card_x + card_w - 14, y_j + 11), (card_x + card_w - 14, y_out_up), (exit_x, y_out_up)], c_up, 2.8, radius=5))
        inner_wires.append(wire_path([a4, (a4[0], y_j + 21), (card_x + card_w - 14, y_j + 21), (card_x + card_w - 14, y_out_dn), (exit_x, y_out_dn)], c_dn, 2.8, radius=5))
    else:
        inner_wires.append(wire_path([a3, (a3[0], y_j), (card_x + 22, y_j), (card_x + 22, y_out_com), (exit_x, y_out_com)], c_com, 2.8, radius=5))
        inner_wires.append(wire_path([b4, (b4[0], y_j + 11), (card_x + 14, y_j + 11), (card_x + 14, y_out_up), (exit_x, y_out_up)], c_up, 2.8, radius=5))
        inner_wires.append(wire_path([a4, (a4[0], y_j + 21), (card_x + 14, y_j + 21), (card_x + 14, y_out_dn), (exit_x, y_out_dn)], c_dn, 2.8, radius=5))

    # 1NO kontak sembolü yardımcısı (blok içine çizilir)
    def no_symbol(sx: float, sy: float) -> str:
        return (
            f'<line x1="{sx-18:.1f}" y1="{sy:.1f}" x2="{sx-6:.1f}" y2="{sy:.1f}" stroke="#e6fffa" stroke-width="2"/>'
            f'<circle cx="{sx-6:.1f}" cy="{sy:.1f}" r="2.2" fill="#e6fffa"/>'
            f'<line x1="{sx-6:.1f}" y1="{sy:.1f}" x2="{sx+7:.1f}" y2="{sy-9:.1f}" stroke="#e6fffa" stroke-width="2.2" stroke-linecap="round"/>'
            f'<circle cx="{sx+7:.1f}" cy="{sy:.1f}" r="2.2" fill="#e6fffa"/>'
            f'<line x1="{sx+7:.1f}" y1="{sy:.1f}" x2="{sx+19:.1f}" y2="{sy:.1f}" stroke="#e6fffa" stroke-width="2"/>'
        )

    def screw_head(pt: tuple[float, float]) -> str:
        px, py = pt
        return (
            f'<circle cx="{px:.1f}" cy="{py:.1f}" r="7.4" fill="#e2e8f0" stroke="#1e293b" stroke-width="1.3"/>'
            f'<line x1="{px-4.4:.1f}" y1="{py-4.4:.1f}" x2="{px+4.4:.1f}" y2="{py+4.4:.1f}" stroke="#334155" stroke-width="1.2"/>'
            f'<line x1="{px-4.4:.1f}" y1="{py+4.4:.1f}" x2="{px+4.4:.1f}" y2="{py-4.4:.1f}" stroke="#334155" stroke-width="1.2"/>'
        )

    svg = f"""
    <g filter="url(#cardShadow)">
      <!-- Kart gövdesi -->
      <rect x="{card_x:.1f}" y="{card_y:.1f}" width="{card_w:.1f}" height="{card_h:.1f}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Üst başlık şeridi -->
      <rect x="{card_x:.1f}" y="{card_y:.1f}" width="{card_w:.1f}" height="68" rx="18" fill="#f8fafc"/>
      <line x1="{card_x:.1f}" y1="{card_y+68:.1f}" x2="{card_x+card_w:.1f}" y2="{card_y+68:.1f}" stroke="#e2e8f0" stroke-width="1.4"/>
      <text x="{cx:.1f}" y="{card_y+25:.1f}" text-anchor="middle" font-size="16" font-weight="800" fill="#0f172a">{title}</text>
      <text x="{cx:.1f}" y="{card_y+43:.1f}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#059669">Mutlusan SW-BL4252 • 010 104 000081</text>
      <text x="{cx:.1f}" y="{card_y+59:.1f}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b">Yaylı (Anlık) • 1NO + 1NO • Delik Ø22,3 mm</text>

      <!-- Önden görünüş (≈54×30 mm krom oval çerçeve) -->
      <defs>
        <clipPath id="keys_{uid}"><rect x="{ox+10:.1f}" y="{oy+10:.1f}" width="{ow-20:.1f}" height="{oh-20:.1f}" rx="{(oh-20)/2:.1f}"/></clipPath>
      </defs>
      <rect x="{ox:.1f}" y="{oy:.1f}" width="{ow:.1f}" height="{oh:.1f}" rx="{oh/2:.1f}" fill="url(#chromeBtn)" stroke="#5f666d" stroke-width="2"/>
      <g clip-path="url(#keys_{uid})">
        <rect x="{ox+10:.1f}" y="{oy+10:.1f}" width="72" height="{oh-20:.1f}" fill="#d7dade"/>
        <rect x="{ox+82:.1f}" y="{oy+10:.1f}" width="24" height="{oh-20:.1f}" fill="#aeb6bd" opacity="0.88"/>
        <rect x="{ox+106:.1f}" y="{oy+10:.1f}" width="72" height="{oh-20:.1f}" fill="#2b3036"/>
      </g>
      <rect x="{ox+10:.1f}" y="{oy+10:.1f}" width="{ow-20:.1f}" height="{oh-20:.1f}" rx="{(oh-20)/2:.1f}" fill="none" stroke="#5f666d" stroke-width="1.4"/>
      <line x1="{ox+82:.1f}" y1="{oy+10:.1f}" x2="{ox+82:.1f}" y2="{oy+oh-10:.1f}" stroke="#5f666d" stroke-width="1.2"/>
      <line x1="{ox+106:.1f}" y1="{oy+10:.1f}" x2="{ox+106:.1f}" y2="{oy+oh-10:.1f}" stroke="#5f666d" stroke-width="1.2"/>
      <!-- Sol ↓ ve sağ ↑ okları -->
      <path d="M {ox+48:.1f},{oy+29:.1f} V {oy+63:.1f} M {ox+38:.1f},{oy+54:.1f} L {ox+48:.1f},{oy+67:.1f} L {ox+58:.1f},{oy+54:.1f}" fill="none" stroke="#2b3036" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M {ox+140:.1f},{oy+67:.1f} V {oy+33:.1f} M {ox+130:.1f},{oy+42:.1f} L {ox+140:.1f},{oy+29:.1f} L {ox+150:.1f},{oy+42:.1f}" fill="none" stroke="#f1f3f5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="{ox:.1f}" y1="{oy+oh+8:.1f}" x2="{ox+ow:.1f}" y2="{oy+oh+8:.1f}" stroke="#c0392b" stroke-width="1" stroke-dasharray="3 2"/>
      <text x="{cx:.1f}" y="{oy+oh+20:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#c0392b">Ön çerçeve ≈ 54 × 30 mm</text>
      <text x="{ox+46:.1f}" y="{oy-6:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#475569">Tuş A (▼ Aşağı)</text>
      <text x="{ox+142:.1f}" y="{oy-6:.1f}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#0f172a">Tuş B (▲ Yukarı)</text>

      <!-- Montaj tabanı + 2× 1NO yeşil kontak bloğu -->
      <rect x="{ax+6:.1f}" y="{by-12:.1f}" width="{2*bw+gap-12:.1f}" height="12" rx="3" fill="#1e2226" stroke="#0f172a" stroke-width="1"/>
      <text x="{cx:.1f}" y="{by-3:.1f}" text-anchor="middle" font-size="7.8" font-weight="700" fill="#cbd5e1">MONTAJ TABANI (Panel Arkası ≈ 45 mm)</text>

      <!-- Blok A (1NO • ▼) -->
      <rect x="{ax:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="5" fill="#1aa38c" stroke="#0d6b5b" stroke-width="1.6"/>
      <text x="{ax+bw/2:.1f}" y="{by+20:.1f}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#ffffff">Blok A • 1NO ▼</text>
      {no_symbol(ax + bw/2, by + 44)}
      <text x="{ax+26:.1f}" y="{by+69:.1f}" text-anchor="middle" font-size="11" font-weight="800" fill="#062922">3</text>
      <text x="{ax+78:.1f}" y="{by+69:.1f}" text-anchor="middle" font-size="11" font-weight="800" fill="#062922">4</text>

      <!-- Blok B (1NO • ▲) -->
      <rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="5" fill="#1aa38c" stroke="#0d6b5b" stroke-width="1.6"/>
      <text x="{bx+bw/2:.1f}" y="{by+20:.1f}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#ffffff">Blok B • 1NO ▲</text>
      {no_symbol(bx + bw/2, by + 44)}
      <text x="{bx+26:.1f}" y="{by+69:.1f}" text-anchor="middle" font-size="11" font-weight="800" fill="#062922">3</text>
      <text x="{bx+78:.1f}" y="{by+69:.1f}" text-anchor="middle" font-size="11" font-weight="800" fill="#062922">4</text>

      <!-- Gerçek renkli iç kablolar ve vida başları -->
      {"".join(inner_wires)}
      {screw_head(a3)}{screw_head(a4)}{screw_head(b3)}{screw_head(b4)}

      <!-- Alt detaylı bağlantı listesi kutusu -->
      <rect x="{card_x+14:.1f}" y="{card_y+368:.1f}" width="{card_w-28:.1f}" height="106" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.3"/>
      <text x="{cx:.1f}" y="{card_y+387:.1f}" text-anchor="middle" font-size="12" font-weight="800" fill="#0f172a">{motor_lbl} Manuel Bağlantı (3×1,5 mm²)</text>
      <rect x="{card_x+24:.1f}" y="{card_y+398:.1f}" width="16" height="5" rx="2.5" fill="{c_com}"/>
      <text x="{card_x+46:.1f}" y="{card_y+404:.1f}" font-size="11" font-weight="700" fill="{c_com}">3–3 Ortak Faz ← {q_ref}:2T1 (230V)</text>
      <rect x="{card_x+24:.1f}" y="{card_y+417:.1f}" width="16" height="5" rx="2.5" fill="{c_up}"/>
      <text x="{card_x+46:.1f}" y="{card_y+423:.1f}" font-size="11" font-weight="700" fill="{c_up}">Blok B:4 (▲ Yukarı) → R1:{up_pin} (NO)</text>
      <rect x="{card_x+24:.1f}" y="{card_y+436:.1f}" width="16" height="5" rx="2.5" fill="{c_dn}"/>
      <text x="{card_x+46:.1f}" y="{card_y+442:.1f}" font-size="11" font-weight="700" fill="{c_dn}">Blok A:4 (▼ Aşağı)  → R1:{dn_pin} (NO)</text>
      <text x="{cx:.1f}" y="{card_y+463:.1f}" text-anchor="middle" font-size="9.6" font-weight="600" fill="#64748b">Tuşa basılı tuttukça motor döner • Max 2×1,5 mm²</text>
    </g>"""
    return svg, (exit_x, exit_y)


def draw_rsu50_and_motor(x: float, y: float, c_lu: str, c_ld: str, c_n: str) -> str:
    """RSU50 Switch Kutusu + Yıldız Bağlı Motor & Redüktör — kaynak: 1-RSU50-saha-baglantisi.png."""
    rx, ry, rw, rh = x, y, 200.0, 108.0
    mx, my = x, y + 116.0
    pin_xs = [rx + 14 + i * 15.6 for i in range(12)]
    pins_svg = []
    for i, px in enumerate(pin_xs):
        pins_svg.append(f'<text x="{px:.1f}" y="{ry+62:.1f}" text-anchor="middle" font-size="6.4" font-weight="800" fill="#1a1a1a">{i+1}</text>')
        pins_svg.append(f'<circle cx="{px:.1f}" cy="{ry+70:.1f}" r="3.4" fill="#cbd5e1" stroke="#475569" stroke-width="0.7"/>')

    return f"""
    <g>
      <rect x="{rx:.1f}" y="{ry:.1f}" width="{rw:.1f}" height="{rh:.1f}" rx="8" fill="#262a2f" stroke="#0f172a" stroke-width="1.5"/>
      <text x="{rx+rw/2:.1f}" y="{ry+12:.1f}" text-anchor="middle" font-size="8.2" font-weight="800" fill="#e2e8f0">RSU50 SWITCH KUTUSU</text>
      <rect x="{rx+12:.1f}" y="{ry+22:.1f}" width="166" height="5" fill="#9aa1a8"/>
      <rect x="{rx+178:.1f}" y="{ry+18:.1f}" width="10" height="13" rx="2" fill="#d9dde1"/>
      <rect x="{rx+40:.1f}" y="{ry+16:.1f}" width="14" height="17" rx="2.5" fill="#c9a227" stroke="#8a6d12" stroke-width="0.8"/>
      <rect x="{rx+138:.1f}" y="{ry+16:.1f}" width="14" height="17" rx="2.5" fill="#c9a227" stroke="#8a6d12" stroke-width="0.8"/>
      <rect x="{rx+10:.1f}" y="{ry+36:.1f}" width="40" height="12" rx="2" fill="#0e0f11" stroke="#555" stroke-width="0.7"/>
      <text x="{rx+30:.1f}" y="{ry+44.5:.1f}" text-anchor="middle" font-size="6.4" fill="#f1f5f9">ES12/22</text>
      <rect x="{rx+150:.1f}" y="{ry+36:.1f}" width="40" height="12" rx="2" fill="#0e0f11" stroke="#555" stroke-width="0.7"/>
      <text x="{rx+170:.1f}" y="{ry+44.5:.1f}" text-anchor="middle" font-size="6.4" fill="#f1f5f9">ES11/21</text>
      <text x="{rx+100:.1f}" y="{ry+45:.1f}" text-anchor="middle" font-size="6.5" fill="#94a3b8">köprü: 6-10 · 1-7 · 7-12</text>
      <rect x="{rx+7:.1f}" y="{ry+53:.1f}" width="186" height="24" rx="2.5" fill="#e8c547" stroke="#a88a1c" stroke-width="1"/>
      {"".join(pins_svg)}
      <path d="M {pin_xs[5]:.1f},{ry+74:.1f} C {pin_xs[5]:.1f},{ry+91:.1f} {pin_xs[9]:.1f},{ry+91:.1f} {pin_xs[9]:.1f},{ry+74:.1f}" fill="none" stroke="#ea580c" stroke-width="1.8"/>
      <path d="M {pin_xs[0]:.1f},{ry+74:.1f} C {pin_xs[0]:.1f},{ry+97:.1f} {pin_xs[6]:.1f},{ry+97:.1f} {pin_xs[6]:.1f},{ry+74:.1f}" fill="none" stroke="#ea580c" stroke-width="1.8"/>
      <path d="M {pin_xs[6]:.1f},{ry+74:.1f} C {pin_xs[6]:.1f},{ry+100:.1f} {pin_xs[11]:.1f},{ry+100:.1f} {pin_xs[11]:.1f},{ry+74:.1f}" fill="none" stroke="#ea580c" stroke-width="1.8"/>
      <circle cx="{pin_xs[2]:.1f}" cy="{ry+70:.1f}" r="3.4" fill="{c_lu}" stroke="#ffffff" stroke-width="0.8"/>
      <circle cx="{pin_xs[3]:.1f}" cy="{ry+70:.1f}" r="3.4" fill="{c_n}" stroke="#ffffff" stroke-width="0.8"/>
      <circle cx="{pin_xs[8]:.1f}" cy="{ry+70:.1f}" r="3.4" fill="{c_ld}" stroke="#ffffff" stroke-width="0.8"/>
      <text x="{pin_xs[2]-6:.1f}" y="{ry+103:.1f}" text-anchor="middle" font-size="6.8" font-weight="800" fill="#34d399">3:L↑</text>
      <text x="{pin_xs[3]+7:.1f}" y="{ry+103:.1f}" text-anchor="middle" font-size="6.8" font-weight="800" fill="#60a5fa">4:N</text>
      <text x="{pin_xs[8]:.1f}" y="{ry+103:.1f}" text-anchor="middle" font-size="6.8" font-weight="800" fill="#f472b6">9:L↓</text>

      <rect x="{mx+14:.1f}" y="{my:.1f}" width="118" height="42" rx="4" fill="#3d4f62" stroke="#1d2833" stroke-width="1.2"/>
      <rect x="{mx+26:.1f}" y="{my+4:.1f}" width="80" height="33" rx="2.5" fill="#ddd6c6" stroke="#8d8370" stroke-width="1"/>
      <rect x="{mx+33:.1f}" y="{my+9:.1f}" width="66" height="6" rx="1.5" fill="#b87333" stroke="#7b4a1f" stroke-width="0.8"/>
      <circle cx="{mx+38:.1f}" cy="{my+12:.1f}" r="3.4" fill="#cbd5e1" stroke="#475569" stroke-width="0.8"/>
      <circle cx="{mx+66:.1f}" cy="{my+12:.1f}" r="3.4" fill="#cbd5e1" stroke="#475569" stroke-width="0.8"/>
      <circle cx="{mx+94:.1f}" cy="{my+12:.1f}" r="3.4" fill="#cbd5e1" stroke="#475569" stroke-width="0.8"/>
      <circle cx="{mx+38:.1f}" cy="{my+25:.1f}" r="3.4" fill="#8B4513" stroke="#ffffff" stroke-width="0.8"/>
      <circle cx="{mx+66:.1f}" cy="{my+25:.1f}" r="3.4" fill="#1E293B" stroke="#ffffff" stroke-width="0.8"/>
      <circle cx="{mx+94:.1f}" cy="{my+25:.1f}" r="3.4" fill="#64748B" stroke="#ffffff" stroke-width="0.8"/>
      <text x="{mx+38:.1f}" y="{my+35:.1f}" text-anchor="middle" font-size="6.4" font-weight="800" fill="#0f172a">U1</text>
      <text x="{mx+66:.1f}" y="{my+35:.1f}" text-anchor="middle" font-size="6.4" font-weight="800" fill="#0f172a">V1</text>
      <text x="{mx+94:.1f}" y="{my+35:.1f}" text-anchor="middle" font-size="6.4" font-weight="800" fill="#0f172a">W1</text>
      <circle cx="{mx+120:.1f}" cy="{my+21:.1f}" r="4.2" fill="#16a34a" stroke="#facc15" stroke-width="1.3"/>
      <text x="{mx+120:.1f}" y="{my+35:.1f}" text-anchor="middle" font-size="6.6" font-weight="800" fill="#dcfce7">PE</text>
      <rect x="{mx:.1f}" y="{my+43:.1f}" width="146" height="48" rx="6" fill="url(#motorFins)" stroke="#2c3a48" stroke-width="1.3"/>
      <rect x="{mx+146:.1f}" y="{my+34:.1f}" width="54" height="66" rx="6" fill="#9ea5ac" stroke="#475569" stroke-width="1.3"/>
      <circle cx="{mx+173:.1f}" cy="{my+67:.1f}" r="15" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <circle cx="{mx+173:.1f}" cy="{my+67:.1f}" r="5" fill="#475569"/>
      <text x="{mx+73:.1f}" y="{my+106:.1f}" text-anchor="middle" font-size="8.2" font-weight="700" fill="#334155">Motor (Yıldız 400V)</text>
      <text x="{mx+173:.1f}" y="{my+112:.1f}" text-anchor="middle" font-size="8.0" font-weight="700" fill="#475569">Redüktör</text>
    </g>"""


def build_svg() -> str:
    W, H = 2200, 2320

    # =========================================================================
    # FONKSİYONA GÖRE AYRIŞTIRILMIŞ, YÜKSEK KONTRASTLI KABLO RENK PALETİ
    # =========================================================================
    # 1. Ana 3 Faz Güç + Nötr + Toprak (IEC standardı)
    C_L1 = "#8B4513"     # Kahverengi — Faz L1
    C_L2 = "#1E293B"     # Siyah — Faz L2
    C_L3 = "#64748B"     # Gri — Faz L3
    C_N = "#1D4ED8"      # Koyu Mavi — Sadece Nötr (N)
    C_PE = "#16A34A"     # Yeşil + Sarı Şerit — Sadece Toprak (PE)
    C_PE_S = "#FACC15"

    # 2. SADE KUMANDA PALETİ — renk = görev (yön), motor/sektör ayrımı konumdan okunur
    C_CTRL = "#DC2626"     # Kırmızı — 230V kumanda fazı (Q → buton ortak 3-3)
    C_UP = "#D97706"       # Amber — ↑ YUKARI yolu (▲ / oto ↑ → R1 → karşı NC → bobin → limit ↑)
    C_DN = "#7C3AED"       # Mor — ↓ AŞAĞI yolu (▼ / oto ↓ → R1 → karşı NC → bobin → limit ↓)
    C_OTOMAN = "#0D9488"   # Teal — Oto/Man röle bobini (X10 → R1:A1)

    C_MAN_COM = C_CTRL
    C_MAN_UP, C_SK_M1U, C_SK_M2U, C_LU = C_UP, C_UP, C_UP, C_UP
    C_MAN_DN, C_SK_M1D, C_SK_M2D, C_LD = C_DN, C_DN, C_DN, C_DN
    # Kilit telleri: KMsol:21 → KMsağ:A1 aşağı bobinini besler (↓), KMsağ:21 → KMsol:A1 yukarı (↑)
    C_IL2 = C_DN
    C_IL1 = C_UP

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
    <linearGradient id="chromeBtn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e9edf0"/>
      <stop offset="50%" stop-color="#9aa3ab"/>
      <stop offset="100%" stop-color="#dfe3e6"/>
    </linearGradient>
    <pattern id="motorFins" width="7" height="10" patternUnits="userSpaceOnUse">
      <rect width="7" height="10" fill="#5a6f86"/>
      <line x1="0" y1="0" x2="0" y2="10" stroke="#3f5163" stroke-width="2.2"/>
    </pattern>
  </defs>

  <!-- SAF BEYAZ ZEMİN (KUTUSUZ AÇIK BAĞLANTI DİYAGRAMI) -->
  <rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>
''')

    # =========================================================================
    # 1. BAŞLIK BANDI (O2SERA KURUMSAL ANTET)
    # =========================================================================
    parts.append('''
  <g>
    <rect x="60" y="32" width="10" height="58" rx="4" fill="#1F9D6B"/>
    <text x="86" y="60" font-size="28" font-weight="800" fill="#0B2540"><tspan fill="#1F9D6B">O2Sera</tspan> — İKİLİ REDÜKTÖR MOTOR KUMANDA BAĞLANTI DİYAGRAMI</text>
    <text x="86" y="86" font-size="15.5" font-weight="500" fill="#475569">3~ 400V / 230V AC • 2× ABB MS116 (MKŞ) • 4× ABB B6-30-01 (230V AC bobin) • ABB CR-M230AC4 + CR-M4SS • 2× Mutlusan SW-BL4252 • RSU50</text>
    <rect x="1885" y="36" width="255" height="50" rx="8" fill="#0B2540" stroke="#1F9D6B" stroke-width="2"/>
    <text x="2012" y="58" text-anchor="middle" font-size="14" font-weight="800" fill="#ffffff"><tspan fill="#34D399">O2Sera</tspan> • SERA OTOMASYON</text>
    <text x="2012" y="76" text-anchor="middle" font-size="11.5" font-weight="600" fill="#cbd5e1">www.o2sera.com • ABB Şalt</text>
    <line x1="60" y1="106" x2="2140" y2="106" stroke="#e2e8f0" stroke-width="2"/>
  </g>
''')

    # =========================================================================
    # 2. ÜST TEKNİK KLEMENS ŞEMASI (RENK PALETİYLE %100 UYUMLU)
    # =========================================================================
    parts.append('<g id="top-terminal-diagrams">')

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
        parts.append(f'<line x1="{cx:.1f}" y1="{ty + ch + 40}" x2="{cx:.1f}" y2="{ty + ch + 4}" stroke="{col}" stroke-width="3.5"/>')
        parts.append(f'<polygon points="{cx:.1f},{ty + ch + 3} {cx-6:.1f},{ty + ch + 15} {cx+6:.1f},{ty + ch + 15}" fill="{col}"/>')
        parts.append(f'<text x="{cx:.1f}" y="{ty + ch + 58}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#334155">{bot_lbl}</text>')
    parts.append(f'<text x="{tx + 170}" y="{ty + ch + 86}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#0f172a">3~ 400V / 230V AC Besleme → Q1 &amp; Q2 (1L1-3L2-5L3)</text>')

    mx, my, mcw = 515, 165, 92
    alt_terms = [
        ("X4", "KM1:A2", C_LU, "M1 L↑"),
        ("X5", "KM2:A2", C_LD, "M1 L↓"),
        ("X6", "R1:32 NC", C_SK_M1D, "SK D1"),
        ("X7", "R1:42 NC", C_SK_M1U, "SK D2"),
        ("X8", "R1:12 NC", C_SK_M2D, "SK D3"),
        ("X9", "R1:22 NC", C_SK_M2U, "SK D4"),
        ("X10", "R1:A1", C_OTOMAN, "Oto/Man"),
        ("X11", "KM3:A2", C_LU, "M2 L↑"),
        ("X12", "KM4:A2", C_LD, "M2 L↓"),
    ]
    parts.append(f'<text x="{mx}" y="138" font-size="14" font-weight="800" fill="#0f172a">2) ALT RAY SAHA KLEMENSİ (X4–X12 • 2,5 mm²)</text>')
    for i, (code, top_lbl, col, bot_lbl) in enumerate(alt_terms):
        bx = mx + i * mcw
        cx = bx + mcw / 2
        parts.append(f'<text x="{cx:.1f}" y="{my - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="{col}">{top_lbl}</text>')
        parts.append(f'<rect x="{bx}" y="{my}" width="{mcw}" height="{ch}" fill="#ffffff" stroke="#334155" stroke-width="1.6"/>')
        parts.append(f'<text x="{cx:.1f}" y="{my + 27}" text-anchor="middle" font-size="15.5" font-weight="800" fill="#0f172a">{code}</text>')
        parts.append(f'<line x1="{cx:.1f}" y1="{my + ch + 4}" x2="{cx:.1f}" y2="{my + ch + 38}" stroke="{col}" stroke-width="3.2"/>')
        parts.append(f'<polygon points="{cx:.1f},{my + ch + 40} {cx-5.5:.1f},{my + ch + 28} {cx+5.5:.1f},{my + ch + 28}" fill="{col}"/>')
        parts.append(f'<text x="{cx:.1f}" y="{my + ch + 56}" text-anchor="middle" font-size="11.5" font-weight="700" fill="{col}">{bot_lbl}</text>')
    parts.append(f'<path d="M {mx+12} {my+ch+66} L {mx+12} {my+ch+74} L {mx+2*mcw-12} {my+ch+74} L {mx+2*mcw-12} {my+ch+66}" fill="none" stroke="#0f172a" stroke-width="1.4"/>')
    parts.append(f'<text x="{mx+mcw}" y="{my+ch+90}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">M1 Doğu • RSU50 Limit</text>')
    parts.append(f'<path d="M {mx+2*mcw+12} {my+ch+66} L {mx+2*mcw+12} {my+ch+74} L {mx+7*mcw-12} {my+ch+74} L {mx+7*mcw-12} {my+ch+66}" fill="none" stroke="#7c3aed" stroke-width="1.6"/>')
    parts.append(f'<text x="{mx+4.5*mcw}" y="{my+ch+90}" text-anchor="middle" font-size="12" font-weight="800" fill="#6d28d9">Sektör Kumanda 1 &amp; 2 (2× 5×1 mm² Paralel)</text>')
    parts.append(f'<path d="M {mx+7*mcw+12} {my+ch+66} L {mx+7*mcw+12} {my+ch+74} L {mx+9*mcw-12} {my+ch+74} L {mx+9*mcw-12} {my+ch+66}" fill="none" stroke="#0f172a" stroke-width="1.4"/>')
    parts.append(f'<text x="{mx+8*mcw}" y="{my+ch+90}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">M2 Batı • RSU50 Limit</text>')

    rx, ry = 1415, 138
    parts.append(f'''
    <text x="{rx}" y="{ry}" font-size="14" font-weight="800" fill="#0f172a">3) ABB CR-M230AC4 + CR-M4SS (R1) &amp; KİLİTLEME MANTIĞI</text>
    <rect x="{rx}" y="152" width="710" height="148" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="{rx+18}" y="178" font-size="12.5" font-weight="800" fill="{C_SK_M1D}">• NC (42-32-22-12) → Oto Sektör:</text>
    <text x="{rx+248}" y="178" font-size="12.3" fill="#334155">42←X7 (M1↑) | 32←X6 (M1↓) | 22←X9 (M2↑) | 12←X8 (M2↓)</text>
    <text x="{rx+18}" y="204" font-size="12.5" font-weight="800" fill="{C_MAN_UP}">• NO (44-34-24-14) → Manuel:</text>
    <text x="{rx+248}" y="204" font-size="12.3" fill="#334155">44←S1:B4 (▲) | 34←S1:A4 (▼) | 24←S2:B4 (▲) | 14←S2:A4 (▼)</text>
    <text x="{rx+18}" y="230" font-size="12.5" font-weight="800" fill="{C_SK_M2U}">• COM (41-31-21-11) → KM NC:</text>
    <text x="{rx+248}" y="230" font-size="12.3" fill="#334155">41→KM2:22   | 31→KM1:22   | 21→KM4:22   | 11→KM3:22</text>
    <text x="{rx+18}" y="256" font-size="12.5" font-weight="800" fill="{C_OTOMAN}">• Bobin (A1–A2) &amp; Kilit (21–22):</text>
    <text x="{rx+248}" y="256" font-size="12.3" fill="#334155">A1←X10, A2→N4 (Alt N-BARA) • KM1↔KM2 ve KM3↔KM4 Kilitli</text>
    <text x="{rx+18}" y="284" font-size="12" font-weight="700" fill="#475569">Ters Yön Faz Çevirme (Alt Çıkış): KM1(2T1-4T2-6T3) ↔ KM2(4T2-2T1-6T3) • KM3 ↔ KM4</text>
    ''')
    parts.append('</g>')

    parts.append('<line x1="60" y1="322" x2="2140" y2="322" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6 4"/>')

    # =========================================================================
    # 3. MERKEZ — 2× 35 mm DIN RAYI (AYNI KONUM: R1_CY=700, R2_CY=1145)
    # =========================================================================
    EX, EW = 410, 1380
    R1_CY, R2_CY = 700, 1145
    RAIL_X1, RAIL_W = EX + 74, EW - 148
    for r_cy in [R1_CY, R2_CY]:
        slots = "".join(
            f'<rect x="{RAIL_X1 + 26 + k*78}" y="{r_cy - 5}" width="38" height="10" rx="5" fill="#64748b"/>'
            for k in range(15)
        )
        parts.append(f'''
  <g>
    <rect x="{RAIL_X1}" y="{r_cy - 26}" width="{RAIL_W}" height="52" rx="3" fill="url(#dinRail)" stroke="#475569" stroke-width="1.4"/>
    {slots}
  </g>''')

    # =========================================================================
    # 4. BİLEŞEN KONUMLARI (BİREBİR AYNI MERKEZLER) & VİDA KOORDİNATLARI
    # =========================================================================
    Q_W, Q_H = 150.0, 300.0
    Q1_X, Q1_Y = 582.5, 550.0
    Q2_X, Q2_Y = 842.5, 550.0

    RL_W, RL_H = 136.0, 310.0
    RL_X, RL_Y = 1129.5, 545.0

    TX1_X, TX1_Y, T1_W, T1_H = 1410.0, 615.0, 42.0, 170.0

    KM_W = 175.0
    KM_S = KM_W / 142.5
    KM_BODY_H = 135.0 * KM_S
    KM_Y = R2_CY - KM_BODY_H / 2.0
    KM1_X, KM2_X = 515.0, 710.0
    TX4_X, TX4_Y, T2_W, T2_H = 928.0, 1065.0, 38.0, 160.0
    KM3_X, KM4_X = 1315.0, 1510.0

    # ALT N-BARA VE PE-BARA (ALT RAYIN HEMEN ALTINDA — ÇOK DAHA ANLAŞILIR DÜZEN!)
    BAR_W, BAR_H = 350.0, 60.0
    N_X, N_Y = 515.0, 1438.0     # KM1–KM2 altı
    PE_X, PE_Y = 1335.0, 1438.0  # KM3–KM4 altı
    n_pins = [N_X + 35 + i * 56 for i in range(6)]
    pe_pins = [PE_X + 35 + i * 56 for i in range(6)]
    n_pin_y = N_Y + 38.0
    pe_pin_y = PE_Y + 38.0

    # Pin yardımcıları
    def q_top(qx: float, idx: int) -> tuple[float, float]:
        s = Q_W / 135.0
        return (qx + [25.5, 67.5, 109.5][idx] * s, Q1_Y + 21.0 * s)

    def q_bot(qx: float, idx: int) -> tuple[float, float]:
        s = Q_W / 135.0
        return (qx + [25.5, 67.5, 109.5][idx] * s, Q1_Y + 249.0 * s)

    def km_top(kx: float, idx: int) -> tuple[float, float]:
        return (kx + [30.0, 54.0, 78.0, 102.0, 126.0][idx] * KM_S, KM_Y + 26.0 * KM_S)

    def km_bot(kx: float, idx: int) -> tuple[float, float]:
        return (kx + [30.0, 54.0, 78.0, 102.0, 126.0][idx] * KM_S, KM_Y + 109.0 * KM_S)

    RL_COLS = [RL_X + 24.0, RL_X + 53.3, RL_X + 82.7, RL_X + 112.0]

    def r1_no(col: int) -> tuple[float, float]:
        return (RL_COLS[col], RL_Y + 24.0)

    def r1_nc(col: int) -> tuple[float, float]:
        return (RL_COLS[col], RL_Y + 62.0)

    def r1_a2() -> tuple[float, float]:
        return (RL_X + 34.0, RL_Y + 244.0)

    def r1_a1() -> tuple[float, float]:
        return (RL_X + 102.0, RL_Y + 244.0)

    def r1_com(col: int) -> tuple[float, float]:
        return (RL_COLS[col], RL_Y + 286.0)

    def xt_top(idx: int) -> tuple[float, float]:
        return (TX1_X + idx * T1_W + T1_W / 2, TX1_Y + 12)

    def xt_bot(idx: int) -> tuple[float, float]:
        return (TX1_X + idx * T1_W + T1_W / 2, TX1_Y + T1_H - 12)

    def xb_top(idx: int) -> tuple[float, float]:
        return (TX4_X + idx * T2_W + T2_W / 2, TX4_Y + 12)

    def xb_bot(idx: int) -> tuple[float, float]:
        return (TX4_X + idx * T2_W + T2_W / 2, TX4_Y + T2_H - 12)

    # Bileşenleri çiz
    parts.append('<g id="components" filter="url(#softShadow)">')
    parts.append(draw_abb_ms116(Q1_X, Q1_Y, Q_W, Q_H))
    parts.append(draw_abb_ms116(Q2_X, Q2_Y, Q_W, Q_H))
    parts.append(draw_abb_crm4ss(RL_X, RL_Y, RL_W, RL_H))
    for i, lbl in enumerate(["X1", "X2", "X3"]):
        parts.append(din_terminal_svg(TX1_X + i * T1_W, TX1_Y, T1_W, T1_H, lbl, "#cbd5e1", [C_L1, C_L2, C_L3][i]))

    for kx in [KM1_X, KM2_X, KM3_X, KM4_X]:
        parts.append(draw_abb_bc6(kx, KM_Y, KM_W))
    xb_accents = [C_LU, C_LD, C_SK_M1D, C_SK_M1U, C_SK_M2D, C_SK_M2U, C_OTOMAN, C_LU, C_LD]
    for i in range(9):
        parts.append(din_terminal_svg(TX4_X + i * T2_W, TX4_Y, T2_W, T2_H, f"X{4+i}", "#e2e8f0", xb_accents[i]))
    parts.append('</g>')

    # DETAYLI SOL & SAĞ MUTLUSAN SW-BL4252 İKİZ BUTON KARTLARI
    s1_svg, s1_exit = draw_detailed_button_card(
        card_x=72.0, card_y=635.0, card_w=322.0, card_h=484.0,
        side="left", title="S1 • SOL YAN DUVAR • DOĞU", motor_lbl="M1 Doğu Çatı",
        q_ref="Q1", up_pin="44", dn_pin="34",
        c_com=C_MAN_COM, c_up=C_MAN_UP, c_dn=C_MAN_DN, uid="s1",
    )
    s2_svg, s2_exit = draw_detailed_button_card(
        card_x=1806.0, card_y=635.0, card_w=322.0, card_h=484.0,
        side="right", title="S2 • SAĞ YAN DUVAR • BATI", motor_lbl="M2 Batı Çatı",
        q_ref="Q2", up_pin="24", dn_pin="14",
        c_com=C_MAN_COM, c_up=C_MAN_UP, c_dn=C_MAN_DN, uid="s2",
    )
    parts.append(f'<g id="side-buttons">{s1_svg}{s2_svg}</g>')

    # =========================================================================
    # 5. İÇ KABLO BAĞLANTILARI (AYRIŞTIRILMIŞ RENK KODU + TEMİZ YOLLAR)
    # =========================================================================
    parts.append('<g id="internal-wiring">')

    # 5A. Üst Ray Güç Dağıtımı: X1-X3 → Q2 giriş, Q2 → Q1 köprü teli (havada ek YOK,
    #     uçta 2 tel aynı vidada — iki ucu ±4 px kaydırılarak gösterilir)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_bus = 476 + i * 11
        y_jmp = 508 + i * 10
        txp = xt_top(i)
        q1p = q_top(Q1_X, i)
        q2p = q_top(Q2_X, i)
        parts.append(wire_path([txp, (txp[0], y_bus), (q2p[0] + 4, y_bus), (q2p[0] + 4, q2p[1])], col, 4.4))
        parts.append(wire_path([(q2p[0] - 4, q2p[1]), (q2p[0] - 4, y_jmp), (q1p[0], y_jmp), q1p], col, 4.0))

    # 5B. Q1 alt (2T1,4T2,6T3) → KM1 üst, KM1 → KM2 köprü teli
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_mid = 916 + i * 10
        y_jmp = 960 + i * 10
        q1b = q_bot(Q1_X, i)
        k1t = km_top(KM1_X, i)
        k2t = km_top(KM2_X, i)
        parts.append(wire_path([q1b, (q1b[0], y_mid), (k1t[0] + 4, y_mid), (k1t[0] + 4, k1t[1])], col, 4.1))
        parts.append(wire_path([(k1t[0] - 4, k1t[1]), (k1t[0] - 4, y_jmp), (k2t[0], y_jmp), k2t], col, 3.8))

    # 5C. Q2 alt (2T1,4T2,6T3) → KM3 üst, KM3 → KM4 köprü teli
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        y_mid = 946 + i * 10
        y_jmp = 972 + i * 9
        q2b = q_bot(Q2_X, i)
        k3t = km_top(KM3_X, i)
        k4t = km_top(KM4_X, i)
        parts.append(wire_path([q2b, (q2b[0], y_mid), (k3t[0] - 4, y_mid), (k3t[0] - 4, k3t[1])], col, 4.1))
        parts.append(wire_path([(k3t[0] + 4, k3t[1]), (k3t[0] + 4, y_jmp), (k4t[0], y_jmp), k4t], col, 3.8))

    # 5D. Ters Yön Faz Çevirme Köprüleri (KM1↔KM2 ve KM3↔KM4 alt uçlar)
    for (k_left, k_right) in [(KM1_X, KM2_X), (KM3_X, KM4_X)]:
        parts.append(wire_path([km_bot(k_left, 0), (km_bot(k_left, 0)[0], 1300), (km_bot(k_right, 1)[0], 1300), km_bot(k_right, 1)], C_L1, 3.6))
        parts.append(wire_path([km_bot(k_left, 1), (km_bot(k_left, 1)[0], 1310), (km_bot(k_right, 0)[0], 1310), km_bot(k_right, 0)], C_L2, 3.6))
        parts.append(wire_path([km_bot(k_left, 2), (km_bot(k_left, 2)[0], 1320), (km_bot(k_right, 2)[0], 1320), km_bot(k_right, 2)], C_L3, 3.6))

    # 5E. Elektriksel Kilitleme (B6-30-01 üst sıra: 21↔A1)
    for (k_left, k_right) in [(KM1_X, KM2_X), (KM3_X, KM4_X)]:
        parts.append(wire_path([km_top(k_left, 3), (km_top(k_left, 3)[0], 1002), (km_top(k_right, 4)[0], 1002), km_top(k_right, 4)], C_IL2, 3.2))
        parts.append(wire_path([km_top(k_left, 4), (km_top(k_left, 4)[0], 1014), (km_top(k_right, 3)[0], 1014), km_top(k_right, 3)], C_IL1, 3.2))

    # 5F. Alt Klemens Limit Dönüşleri → Kontaktör A2 (↑ amber, ↓ mor)
    parts.append(wire_path([xb_top(0), (xb_top(0)[0], 1034), (912, 1034), (912, 1368), (km_bot(KM1_X, 4)[0], 1368), km_bot(KM1_X, 4)], C_LU, 3.0))
    parts.append(wire_path([xb_top(1), (xb_top(1)[0], 1044), (920, 1044), (920, 1332), (km_bot(KM2_X, 4)[0], 1332), km_bot(KM2_X, 4)], C_LD, 3.0))
    parts.append(wire_path([xb_top(7), (xb_top(7)[0], 1044), (1278, 1044), (1278, 1332), (km_bot(KM3_X, 4)[0], 1332), km_bot(KM3_X, 4)], C_LU, 3.0))
    parts.append(wire_path([xb_top(8), (xb_top(8)[0], 1034), (1286, 1034), (1286, 1368), (km_bot(KM4_X, 4)[0], 1368), km_bot(KM4_X, 4)], C_LD, 3.0))

    # 5G. Sektör Kumanda Girişleri (Mor / İndigo / Teal / Turkuaz / Macenta)
    p_x6, p_r32 = xb_top(2), r1_nc(1)
    p_x7, p_r42 = xb_top(3), r1_nc(0)
    parts.append(wire_path([p_x6, (p_x6[0], 986), (1052, 986), (1052, 591), (p_r32[0], 591), p_r32], C_SK_M1D, 3.0))
    parts.append(wire_path([p_x7, (p_x7[0], 994), (1064, 994), (1064, p_r42[1]), p_r42], C_SK_M1U, 3.0))

    p_x8, p_r12 = xb_top(4), r1_nc(3)
    p_x9, p_r22 = xb_top(5), r1_nc(2)
    parts.append(wire_path([p_x8, (p_x8[0], 994), (1330, 994), (1330, p_r12[1]), p_r12], C_SK_M2D, 3.0))
    parts.append(wire_path([p_x9, (p_x9[0], 986), (1318, 986), (1318, 591), (p_r22[0], 591), p_r22], C_SK_M2U, 3.0))

    # X10 -> R1:A1 (Oto/Man bobin — Macenta)
    p_x10, p_a1 = xb_top(6), r1_a1()
    parts.append(wire_path([p_x10, (p_x10[0], 976), (1304, 976), (1304, p_a1[1]), p_a1], C_OTOMAN, 3.1))

    # R1:A2 → Alt N-BARA (N4) — Tek temiz mavi hat (sol kanal x=1034 → 891 → N4)!
    p_a2 = r1_a2()
    parts.append(wire_path([
        p_a2, (1034, p_a2[1]), (1034, 902), (891, 902),
        (891, 1412), (n_pins[3], 1412), (n_pins[3], n_pin_y),
    ], C_N, 3.2))

    # 5H. R1 COM (41, 31, 21, 11) → Kontaktör NC 22 (Sektör kanal rengiyle eşleşir!)
    com_targets = [
        (0, KM2_X, C_SK_M1U, 1356, 898, 876),  # 41 -> KM2:22 -> KM2:21 -> KM1:A1 (M1 ↑)
        (1, KM1_X, C_SK_M1D, 1344, 905, 886),  # 31 -> KM1:22 -> KM1:21 -> KM2:A1 (M1 ↓)
        (2, KM4_X, C_SK_M2U, 1344, 1294, 886), # 21 -> KM4:22 -> KM4:21 -> KM3:A1 (M2 ↑)
        (3, KM3_X, C_SK_M2D, 1356, 1303, 876), # 11 -> KM3:22 -> KM3:21 -> KM4:A1 (M2 ↓)
    ]
    for c_idx, kx, col, y_ret, x_lane, y_drop in com_targets:
        rc = r1_com(c_idx)
        kb = km_bot(kx, 3)
        parts.append(wire_path([rc, (rc[0], y_drop), (x_lane, y_drop), (x_lane, y_ret), (kb[0], y_ret), kb], col, 2.9))

    # 5I. Yan Buton Kabloları (Kırmızı ton ailesi: Ortak Kırmızı, ▲ Gül Kırmızısı, ▼ Bordo)
    q1_2 = q_bot(Q1_X, 0)
    parts.append(sheath_path([s1_exit, (452, s1_exit[1])], 12))
    parts.append(wire_path([(452, s1_exit[1] - 7), (464, s1_exit[1] - 7), (464, 868), (q1_2[0], 868), q1_2], C_MAN_COM, 3.2))
    parts.append(wire_path([(452, s1_exit[1]), (476, s1_exit[1]), (476, 444), (r1_no(0)[0], 444), r1_no(0)], C_MAN_UP, 3.1))
    parts.append(wire_path([(452, s1_exit[1] + 7), (488, s1_exit[1] + 7), (488, 456), (r1_no(1)[0], 456), r1_no(1)], C_MAN_DN, 3.1))

    q2_2 = q_bot(Q2_X, 0)
    parts.append(sheath_path([s2_exit, (1748, s2_exit[1])], 12))
    parts.append(wire_path([(1748, s2_exit[1] - 7), (1736, s2_exit[1] - 7), (1736, 868), (q2_2[0], 868), q2_2], C_MAN_COM, 3.2))
    parts.append(wire_path([(1748, s2_exit[1]), (1724, s2_exit[1]), (1724, 444), (r1_no(2)[0], 444), r1_no(2)], C_MAN_UP, 3.1))
    parts.append(wire_path([(1748, s2_exit[1] + 7), (1712, s2_exit[1] + 7), (1712, 456), (r1_no(3)[0], 456), r1_no(3)], C_MAN_DN, 3.1))

    # =========================================================================
    # 6. ALT N-BARA / PE-BARA BAĞLANTILARI & 4 KABLO KILIFI YAKASI
    # =========================================================================
    C_Y = 1608.0
    C_SUP, C_SEC, C_M1, C_M2 = 740.0, 995.0, 1215.0, 1455.0

    # 6A. Ana Besleme L1-L2-L3 (X1-X3 alt → sağ kenar → alt koridor → 5×2,5 yakası)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        xb = xt_bot(i)
        rx_lane = 1700 - i * 10
        y_low = 1574 + i * 8
        parts.append(wire_path([
            xb, (xb[0], 822 + i * 9), (rx_lane, 822 + i * 9),
            (rx_lane, y_low), (C_SUP - 14 + i * 7, y_low),
            (C_SUP - 14 + i * 7, C_Y),
        ], col, 3.7))

    # 6B. N-BARA alt çıkışları (N1 → Besleme, N2 → M1, N3 → M2 — KISA VE DİREKT!)
    parts.append(wire_path([(n_pins[0], n_pin_y), (n_pins[0], 1528), (C_SUP + 7, 1528), (C_SUP + 7, C_Y)], C_N, 3.6))
    parts.append(wire_path([(n_pins[1], n_pin_y), (n_pins[1], 1538), (C_M1 + 7, 1538), (C_M1 + 7, C_Y)], C_N, 3.2))
    parts.append(wire_path([(n_pins[2], n_pin_y), (n_pins[2], 1548), (C_M2 + 7, 1548), (C_M2 + 7, C_Y)], C_N, 3.2))

    # 6C. PE-BARA alt çıkışları (PE1 → Besleme, PE2 → M1, PE3 → M2 — KISA VE DİREKT!)
    parts.append(wire_path([(pe_pins[0], pe_pin_y), (pe_pins[0], 1558), (C_SUP + 14, 1558), (C_SUP + 14, C_Y)], C_PE, 3.6, stripe=C_PE_S))
    parts.append(wire_path([(pe_pins[1], pe_pin_y), (pe_pins[1], 1566), (C_M1, 1566), (C_M1, C_Y)], C_PE, 3.2, stripe=C_PE_S))
    parts.append(wire_path([(pe_pins[2], pe_pin_y), (pe_pins[2], 1524), (C_M2, 1524), (C_M2, C_Y)], C_PE, 3.2, stripe=C_PE_S))

    # 6D. Sektör Kumanda 1 & 2 (X6..X10 alt → 2×5×1 yakası)
    for j, col in enumerate([C_SK_M1D, C_SK_M1U, C_SK_M2D, C_SK_M2U, C_OTOMAN]):
        p = xb_bot(2 + j)
        gx = C_SEC - 14 + j * 7
        y_join = 1432 + j * 8
        parts.append(wire_path([p, (p[0], y_join), (gx, y_join), (gx, C_Y)], col, 3.1))

    # 6E. Motor 1 Güç (KM1 U-V-W) + Limit (X4, X5) → M1 • 7D yakası (N-BARA üstünden geçer!)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        p1 = km_bot(KM1_X, i)
        parts.append(wire_path([p1, (p1[0], 1384 + i * 8), (C_M1 - 21 + i * 7, 1384 + i * 8), (C_M1 - 21 + i * 7, C_Y)], col, 3.5))
    parts.append(wire_path([xb_bot(0), (xb_bot(0)[0], 1412), (C_M1 + 14, 1412), (C_M1 + 14, C_Y)], C_LU, 3.1))
    parts.append(wire_path([xb_bot(1), (xb_bot(1)[0], 1420), (C_M1 + 21, 1420), (C_M1 + 21, C_Y)], C_LD, 3.1))

    # 6F. Motor 2 Güç (KM3 U-V-W) + Limit (X11, X12) → M2 • 7D yakası (PE-BARA'nın sol koridorundan temiz iner!)
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        p3 = km_bot(KM3_X, i)
        x_corr = 1304 + i * 8
        y_low = 1514 + i * 7
        parts.append(wire_path([
            p3, (p3[0], 1384 + i * 8), (x_corr, 1384 + i * 8),
            (x_corr, y_low), (C_M2 - 21 + i * 7, y_low), (C_M2 - 21 + i * 7, C_Y),
        ], col, 3.5))
    parts.append(wire_path([
        xb_bot(7), (xb_bot(7)[0], 1412), (1284, 1412),
        (1284, 1534), (C_M2 + 14, 1534), (C_M2 + 14, C_Y),
    ], C_LU, 3.1))
    parts.append(wire_path([
        xb_bot(8), (xb_bot(8)[0], 1420), (1294, 1420),
        (1294, 1542), (C_M2 + 21, 1542), (C_M2 + 21, C_Y),
    ], C_LD, 3.1))

    parts.append('</g>')

    # ALT N-BARA ve PE-BARA KUTULARI (kablolar vidalardan temizce çıkar, görev etiketleri üstte net okunur!)
    n_roles = ["Giriş", "M1", "M2", "R1:A2", "Boş", "Boş"]
    pe_roles = ["Giriş", "M1", "M2", "Boş", "Boş", "Boş"]
    parts.append(f'''
  <g id="n-pe-bars-bottom" filter="url(#softShadow)">
    <!-- NÖTR BARA (MAVİ — ALT KONUM) -->
    <rect x="{N_X:.1f}" y="{N_Y:.1f}" width="{BAR_W:.1f}" height="{BAR_H:.1f}" rx="9" fill="#eff6ff" stroke="#2563eb" stroke-width="2.2"/>
    <rect x="{N_X+12:.1f}" y="{N_Y+30:.1f}" width="{BAR_W-24:.1f}" height="16" rx="4" fill="#d97706" stroke="#92400e" stroke-width="1"/>
    {"".join(
        f'<text x="{px:.1f}" y="{N_Y+13:.1f}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#1e3a8a">N{i+1}</text>'
        f'<text x="{px:.1f}" y="{N_Y+24.5:.1f}" text-anchor="middle" font-size="8.4" font-weight="700" fill="#3b82f6">{n_roles[i]}</text>'
        f'<circle cx="{px:.1f}" cy="{n_pin_y:.1f}" r="5.5" fill="#fef08a" stroke="#78350f" stroke-width="1.3"/>'
        for i, px in enumerate(n_pins)
    )}
    <rect x="{N_X-88:.1f}" y="{N_Y+16:.1f}" width="78" height="28" rx="6" fill="#1d4ed8"/>
    <text x="{N_X-49:.1f}" y="{N_Y+34.5:.1f}" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff">N-BARA</text>

    <!-- TOPRAK BARA (YEŞİL — ALT KONUM) -->
    <rect x="{PE_X:.1f}" y="{PE_Y:.1f}" width="{BAR_W:.1f}" height="{BAR_H:.1f}" rx="9" fill="#f0fdf4" stroke="#16a34a" stroke-width="2.2"/>
    <rect x="{PE_X+12:.1f}" y="{PE_Y+30:.1f}" width="{BAR_W-24:.1f}" height="16" rx="4" fill="#d97706" stroke="#92400e" stroke-width="1"/>
    {"".join(
        f'<text x="{px:.1f}" y="{PE_Y+13:.1f}" text-anchor="middle" font-size="10.2" font-weight="800" fill="#14532d">PE{i+1}</text>'
        f'<text x="{px:.1f}" y="{PE_Y+24.5:.1f}" text-anchor="middle" font-size="8.4" font-weight="700" fill="#16a34a">{pe_roles[i]}</text>'
        f'<circle cx="{px:.1f}" cy="{pe_pin_y:.1f}" r="5.5" fill="#fef08a" stroke="#78350f" stroke-width="1.3"/>'
        for i, px in enumerate(pe_pins)
    )}
    <rect x="{PE_X+BAR_W+10:.1f}" y="{PE_Y+16:.1f}" width="84" height="28" rx="6" fill="#15803d"/>
    <text x="{PE_X+BAR_W+52:.1f}" y="{PE_Y+34.5:.1f}" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff">PE-BARA</text>
  </g>
''')

    # Bileşen Kimlik Rozetleri — EN ÜST KATMAN
    def badge(cx: float, cy: float, code: str, sub: str, bg: str = "#0f172a") -> str:
        return f'''
        <g>
          <rect x="{cx-58:.1f}" y="{cy-14:.1f}" width="116" height="28" rx="6" fill="{bg}" stroke="#ffffff" stroke-width="2.2"/>
          <text x="{cx:.1f}" y="{cy+4.5:.1f}" text-anchor="middle" font-size="12.2" font-weight="800" fill="#ffffff">{code} • {sub}</text>
        </g>'''

    parts.append('<g id="badges-top" filter="url(#softShadow)">')
    parts.append(badge(Q1_X + Q_W / 2, 535, "Q1", "MS116", "#0369a1"))
    parts.append(badge(Q2_X + Q_W / 2, 535, "Q2", "MS116", "#0369a1"))
    parts.append(badge(RL_X + RL_W / 2, 535, "R1", "CR-M4SS", "#6d28d9"))
    parts.append(badge(TX1_X + 1.5 * T1_W, TX1_Y - 22, "X1–X3", "6 mm²", "#334155"))

    parts.append(badge(KM1_X + KM_W / 2, 1270, "KM1", "M1 ↑", "#b45309"))
    parts.append(badge(KM2_X + KM_W / 2, 1270, "KM2", "M1 ↓", "#b45309"))
    parts.append(badge(KM3_X + KM_W / 2, 1270, "KM3", "M2 ↑", "#b45309"))
    parts.append(badge(KM4_X + KM_W / 2, 1270, "KM4", "M2 ↓", "#b45309"))
    parts.append('</g>')

    # =========================================================================
    # 7. ALT SAHA KABLOLARI & CİHAZ KARTLARI (BİREBİR AYNI KART KONUMLARI)
    # =========================================================================
    CARD_Y = 1860
    X_SUP, X_SEC, X_M1, X_M2 = 290, 820, 1375, 1905

    parts.append('<g id="field-sheaths">')
    parts.append(sheath_path([(C_SUP, C_Y), (C_SUP, 1665), (X_SUP, 1665), (X_SUP, 1745)], 15))
    parts.append(sheath_path([(C_SEC, C_Y), (C_SEC, 1692), (X_SEC, 1692), (X_SEC, 1745)], 14))
    parts.append(sheath_path([(C_M1, C_Y), (C_M1, 1692), (X_M1, 1692), (X_M1, 1745)], 14))
    parts.append(sheath_path([(C_M2, C_Y), (C_M2, 1665), (X_M2, 1665), (X_M2, 1745)], 14))
    for cx_col, lbl in [(C_SUP, "5×2,5"), (C_SEC, "2×5×1"), (C_M1, "M1 • 7D"), (C_M2, "M2 • 7D")]:
        parts.append(f'<rect x="{cx_col-28:.1f}" y="{C_Y-10:.1f}" width="56" height="22" rx="6" fill="#0f172a" stroke="#475569" stroke-width="1.4"/>')
        parts.append(f'<text x="{cx_col:.1f}" y="{C_Y+4.5:.1f}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#f8fafc">{lbl}</text>')
    parts.append('</g>')

    def fan_cores(cx: float, y_top: float, y_bot: float, cores: list[tuple[str, str, str | None]]) -> str:
        n = len(cores)
        spread = min(380, (n - 1) * 52)
        start_x = cx - spread / 2
        step = spread / max(1, n - 1)
        out = [f'<rect x="{cx - 12}" y="{y_top - 6}" width="24" height="14" rx="4" fill="#0f172a"/>']
        for i, (lbl, col, stp) in enumerate(cores):
            tx = start_x + i * step
            out.append(wire_path([(cx, y_top + 6), (cx, y_top + 26), (tx, y_top + 58), (tx, y_bot)], col, 4.2, stripe=stp, radius=12))
            out.append(f'<rect x="{tx - 24:.1f}" y="{y_bot - 22:.1f}" width="48" height="20" rx="4" fill="#ffffff" stroke="{col}" stroke-width="1.6"/>')
            out.append(f'<text x="{tx:.1f}" y="{y_bot - 8:.1f}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f172a">{lbl}</text>')
        return "\n".join(out)

    parts.append('<g id="field-cores">')
    parts.append(fan_cores(X_SUP, 1745, CARD_Y, [
        ("L1", C_L1, None), ("L2", C_L2, None), ("L3", C_L3, None), ("N", C_N, None), ("PE", C_PE, C_PE_S)
    ]))
    parts.append(fan_cores(X_SEC, 1745, CARD_Y, [
        ("X6", C_SK_M1D, None), ("X7", C_SK_M1U, None), ("X8", C_SK_M2D, None), ("X9", C_SK_M2U, None), ("X10", C_OTOMAN, None)
    ]))
    parts.append(fan_cores(X_M1, 1745, CARD_Y, [
        ("U", C_L1, None), ("V", C_L2, None), ("W", C_L3, None), ("PE", C_PE, C_PE_S), ("N", C_N, None), ("L↑", C_LU, None), ("L↓", C_LD, None)
    ]))
    parts.append(fan_cores(X_M2, 1745, CARD_Y, [
        ("U", C_L1, None), ("V", C_L2, None), ("W", C_L3, None), ("PE", C_PE, C_PE_S), ("N", C_N, None), ("L↑", C_LU, None), ("L↓", C_LD, None)
    ]))
    parts.append('</g>')

    # Saha Cihaz Kartları (Aynı konumlar, yeni renk paletiyle uyumlu metinler)
    parts.append(f'''
  <g id="field-cards" filter="url(#cardShadow)">
    <!-- 1. ANA BESLEME -->
    <rect x="{X_SUP - 205}" y="{CARD_Y}" width="410" height="295" rx="18" fill="#ffffff" stroke="#ef4444" stroke-width="2.2"/>
    <rect x="{X_SUP - 205}" y="{CARD_Y}" width="410" height="44" rx="18" fill="#fef2f2"/>
    <text x="{X_SUP}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#b91c1c">ANA BESLEME (1× 5×2,5 mm²)</text>
    <text x="{X_SUP}" y="{CARD_Y + 86}" text-anchor="middle" font-size="28" font-weight="900" fill="#0f172a">3~ 400V / 230V AC</text>
    <text x="{X_SUP}" y="{CARD_Y + 116}" text-anchor="middle" font-size="14" font-weight="700" fill="#475569">50 Hz • Üç Faz + Nötr + Toprak</text>
    <rect x="{X_SUP - 175}" y="{CARD_Y + 140}" width="350" height="128" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.4"/>
    <text x="{X_SUP - 155}" y="{CARD_Y + 168}" font-size="13" font-weight="700" fill="{C_L1}">• L1 (Kahve) → Üst Klemens X1</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 192}" font-size="13" font-weight="700" fill="{C_L2}">• L2 (Siyah)  → Üst Klemens X2</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 216}" font-size="13" font-weight="700" fill="{C_L3}">• L3 (Gri)    → Üst Klemens X3</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 240}" font-size="13" font-weight="700" fill="{C_N}">• N (Mavi)    → Alt N-BARA (N1)</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 262}" font-size="13" font-weight="700" fill="{C_PE}">• PE (Sr-Yşl) → Alt PE-BARA (PE1)</text>

    <!-- 2. SEKTÖR KUMANDA 1 & 2 -->
    <rect x="{X_SEC - 220}" y="{CARD_Y}" width="440" height="295" rx="18" fill="#ffffff" stroke="#7c3aed" stroke-width="2.2"/>
    <rect x="{X_SEC - 220}" y="{CARD_Y}" width="440" height="44" rx="18" fill="#f5f3ff"/>
    <text x="{X_SEC}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#6d28d9">SEKTÖR KUMANDA 1 &amp; 2 (2× 5×1 mm²)</text>
    <text x="{X_SEC}" y="{CARD_Y + 74}" text-anchor="middle" font-size="13.5" font-weight="700" fill="#475569">Otomasyon Giriş &amp; Paralel Çıkış (X6–X10)</text>
    <rect x="{X_SEC - 190}" y="{CARD_Y + 94}" width="380" height="174" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.4"/>
    <text x="{X_SEC - 170}" y="{CARD_Y + 124}" font-size="13" font-weight="700" fill="{C_SK_M1D}">• D1 (M1 ↓)  → X6  → R1:32 (M1 Aşağı)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 152}" font-size="13" font-weight="700" fill="{C_SK_M1U}">• D2 (M1 ↑)  → X7  → R1:42 (M1 Yukarı)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 180}" font-size="13" font-weight="700" fill="{C_SK_M2D}">• D3 (M2 ↓)  → X8  → R1:12 (M2 Aşağı)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 208}" font-size="13" font-weight="700" fill="{C_SK_M2U}">• D4 (M2 ↑)  → X9  → R1:22 (M2 Yukarı)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 236}" font-size="13" font-weight="700" fill="{C_OTOMAN}">• D5 (Oto/Man) → X10 → R1:A1 (bobin)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 258}" font-size="11.5" font-weight="600" fill="#64748b">* Sektör 1 ve Sektör 2 aynı klemenslere paralel girer.</text>
    <text x="{X_SEC}" y="{CARD_Y + 286}" text-anchor="middle" font-size="11.2" font-weight="800" fill="#dc2626">⚠ Q1/Q2 kapalıyken RSU50'de sektör fazı kalır — bakımda sektörü de kes</text>

    <!-- 3. MOTOR 1 (M1 — RSU50 + MOTOR • 7 DAMAR) -->
    <rect x="{X_M1 - 225}" y="{CARD_Y}" width="450" height="295" rx="18" fill="#ffffff" stroke="#0284c7" stroke-width="2.2"/>
    <rect x="{X_M1 - 225}" y="{CARD_Y}" width="450" height="44" rx="18" fill="#f0f9ff"/>
    <text x="{X_M1}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#0369a1">MOTOR 1 • DOĞU ÇATI (M1 • RSU50 + 7D)</text>
    {draw_rsu50_and_motor(X_M1 - 210, CARD_Y + 52, C_LU, C_LD, C_N)}
    <text x="{X_M1 + 4}" y="{CARD_Y + 76}" font-size="12.5" font-weight="800" fill="#0f172a">3 Faz Güç + RSU50 Limit:</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 104}" font-size="12" font-weight="700" fill="{C_L1}">1-U1 (Kahve) → KM1:2T1</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 128}" font-size="12" font-weight="700" fill="{C_L2}">2-V1 (Siyah)  → KM1:4T2</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 152}" font-size="12" font-weight="700" fill="{C_L3}">3-W1 (Gri)    → KM1:6T3</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 176}" font-size="12" font-weight="700" fill="{C_PE}">4-PE (Sr-Yşl) → PE-BARA (PE2)</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 200}" font-size="12" font-weight="700" fill="{C_N}">5-RSU4 (Mavi) → N-BARA (N2)</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 224}" font-size="12" font-weight="700" fill="{C_LU}">6-RSU3 (L↑)  → X4 (KM1:A2)</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 248}" font-size="12" font-weight="700" fill="{C_LD}">7-RSU9 (L↓)  → X5 (KM2:A2)</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 274}" font-size="10.8" font-weight="700" fill="#ea580c">RSU Köprü: 6–10 · 1–7 · 7–12</text>

    <!-- 4. MOTOR 2 (M2 — RSU50 + MOTOR • 7 DAMAR) -->
    <rect x="{X_M2 - 225}" y="{CARD_Y}" width="450" height="295" rx="18" fill="#ffffff" stroke="#0284c7" stroke-width="2.2"/>
    <rect x="{X_M2 - 225}" y="{CARD_Y}" width="450" height="44" rx="18" fill="#f0f9ff"/>
    <text x="{X_M2}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#0369a1">MOTOR 2 • BATI ÇATI (M2 • RSU50 + 7D)</text>
    {draw_rsu50_and_motor(X_M2 - 210, CARD_Y + 52, C_LU, C_LD, C_N)}
    <text x="{X_M2 + 4}" y="{CARD_Y + 76}" font-size="12.5" font-weight="800" fill="#0f172a">3 Faz Güç + RSU50 Limit:</text>
    <text x="{X_M2 + 4}" y="{CARD_Y + 104}" font-size="12" font-weight="700" fill="{C_L1}">1-U1 (Kahve) → KM3:2T1</text>
    <text x="{X_M2 + 4}" y="{CARD_Y + 128}" font-size="12" font-weight="700" fill="{C_L2}">2-V1 (Siyah)  → KM3:4T2</text>
    <text x="{X_M2 + 4}" y="{CARD_Y + 152}" font-size="12" font-weight="700" fill="{C_L3}">3-W1 (Gri)    → KM3:6T3</text>
    <text x="{X_M2 + 4}" y="{CARD_Y + 176}" font-size="12" font-weight="700" fill="{C_PE}">4-PE (Sr-Yşl) → PE-BARA (PE3)</text>
    <text x="{X_M2 + 4}" y="{CARD_Y + 200}" font-size="12" font-weight="700" fill="{C_N}">5-RSU4 (Mavi) → N-BARA (N3)</text>
    <text x="{X_M2 + 4}" y="{CARD_Y + 224}" font-size="12" font-weight="700" fill="{C_LU}">6-RSU3 (L↑)  → X11 (KM3:A2)</text>
    <text x="{X_M2 + 4}" y="{CARD_Y + 248}" font-size="12" font-weight="700" fill="{C_LD}">7-RSU9 (L↓)  → X12 (KM4:A2)</text>
    <text x="{X_M2 + 4}" y="{CARD_Y + 274}" font-size="10.8" font-weight="700" fill="#ea580c">RSU Köprü: 6–10 · 1–7 · 7–12</text>
  </g>
''')

    # =========================================================================
    # 8. ALT RENK LEJANTI (TAM AYRIŞTIRILMIŞ RENK KODU)
    # =========================================================================
    legend_row1 = [
        ("L1 Faz", C_L1, None),
        ("L2 Faz", C_L2, None),
        ("L3 Faz", C_L3, None),
        ("Nötr (N)", C_N, None),
        ("Toprak (PE)", C_PE, C_PE_S),
        ("Kumanda fazı 230V", C_CTRL, None),
        ("↑ Yukarı yolu (▲, oto ↑, kilit, limit ↑)", C_UP, None),
        ("↓ Aşağı yolu (▼, oto ↓, kilit, limit ↓)", C_DN, None),
        ("Oto/Man bobini", C_OTOMAN, None),
    ]
    lx = 76
    leg_svg = []
    for name, col, stp in legend_row1:
        leg_svg.append(f'<rect x="{lx}" y="2228" width="20" height="8" rx="4" fill="{col}"/>')
        if stp:
            leg_svg.append(f'<line x1="{lx+2}" y1="2232" x2="{lx+18}" y2="2232" stroke="{stp}" stroke-width="5" stroke-dasharray="4 4"/>')
        leg_svg.append(f'<text x="{lx + 26}" y="2236" font-size="11.5" font-weight="700" fill="#334155">{name}</text>')
        lx += 120 if len(name) < 12 else (175 if len(name) < 20 else 300)

    parts.append(f'''
  <g id="footer">
    <rect x="60" y="2200" width="2080" height="66" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    {"".join(leg_svg)}
    <text x="2122" y="2236" text-anchor="end" font-size="12" font-weight="800" fill="#0B2540"><tspan fill="#1F9D6B">O2Sera</tspan> • Bağlantı Kılavuzu</text>
  </g>
</svg>''')

    return "\n".join(parts)


if __name__ == "__main__":
    svg = build_svg()
    OUT_SVG.write_text(svg, encoding="utf-8")
    print(f"Wrote SVG: {OUT_SVG} ({len(svg)} bytes)")
