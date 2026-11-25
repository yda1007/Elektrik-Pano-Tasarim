#!/usr/bin/env python3
"""
Bemis BH6-6000-0000 Elektrik Pano Projesi
- Çok sayfalı yüksek çözünürlüklü vektörel PDF üretici (ReportLab)
- Katmanlı 1:1 mm AutoCAD / LibreCAD uyumlu DXF (R2000 / AC1015) üretici
"""

import json
import math
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT_DIR = Path("/home/yakup/Projeler/Elektrik-Pano-Tasarim/ciktilar")
PAYLOAD_PATH = OUT_DIR / "_export_payload.json"
PDF_PATH = OUT_DIR / "Bemis-BH6-6000-0000-Pano-Projesi.pdf"
DXF_PATH = OUT_DIR / "Bemis-BH6-6000-0000-Pano-Projesi.dxf"

FONT_REG = "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf"

pdfmetrics.registerFont(TTFont("DejaVu", FONT_REG))
pdfmetrics.registerFont(TTFont("DejaVuBold", FONT_BOLD))

PAGE_W, PAGE_H = landscape(A4)  # 841.89 x 595.28 pt (297 x 210 mm)


def hex_to_rl(hex_str: str, darken_white: bool = True):
    h = hex_str.strip().lstrip("#")
    if len(h) != 6:
        return colors.HexColor("#334155")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    # Beyaz kağıt üzerinde beyaz/çok açık renkli kabloları okunaklı koyu tonla çiz
    if darken_white and (r * 299 + g * 587 + b * 114) / 1000 > 215:
        return colors.HexColor("#475569")
    return colors.Color(r / 255.0, g / 255.0, b / 255.0)


def is_light_color(hex_str: str) -> bool:
    h = hex_str.strip().lstrip("#")
    if len(h) != 6:
        return False
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 165


def draw_frame_and_titleblock(
    c: canvas.Canvas,
    page_no: int,
    total_pages: int,
    sheet_title: str,
    sheet_subtitle: str,
    date_str: str,
):
    m = 8 * mm
    # Dış çerçeve
    c.setStrokeColor(colors.HexColor("#1e293b"))
    c.setLineWidth(1.2)
    c.rect(m, m, PAGE_W - 2 * m, PAGE_H - 2 * m)

    # Üst ince başlık şeridi
    header_h = 12 * mm
    header_y = PAGE_H - m - header_h
    c.setFillColor(colors.HexColor("#0f172a"))
    c.rect(m, header_y, PAGE_W - 2 * m, header_h, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont("DejaVuBold", 11)
    c.drawString(m + 4 * mm, header_y + 6.5 * mm, sheet_title)
    c.setFont("DejaVu", 7.8)
    c.setFillColor(colors.HexColor("#cbd5e1"))
    c.drawString(m + 4 * mm, header_y + 2.2 * mm, sheet_subtitle)

    # Sağ üst proje bilgisi
    c.setFillColor(colors.HexColor("#38bdf8"))
    c.setFont("DejaVuBold", 8.5)
    c.drawRightString(PAGE_W - m - 4 * mm, header_y + 6.8 * mm, "Bemis BH6-6000-0000 (245×325×138 mm • IP66)")
    c.setFillColor(colors.HexColor("#cbd5e1"))
    c.setFont("DejaVu", 7.5)
    c.drawRightString(
        PAGE_W - m - 4 * mm,
        header_y + 2.2 * mm,
        f"Tarih: {date_str}   |   Sayfa {page_no} / {total_pages}",
    )

    # Alt antet şeridi
    footer_h = 7.5 * mm
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(0.6)
    c.rect(m, m, PAGE_W - 2 * m, footer_h, fill=1, stroke=1)
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("DejaVu", 7)
    c.drawString(
        m + 3 * mm,
        m + 2.4 * mm,
        "PROJE: Elektrik Pano Tasarım — 2 Motor Ters Yönlü + R1 (14P) Oto/Manuel Seçici + PG36 ODB-42 + 2× Mutlusan SW-BL4252",
    )
    c.setFont("DejaVuBold", 7)
    c.drawRightString(PAGE_W - m - 3 * mm, m + 2.4 * mm, f"ÖLÇEK: Vektörel CAD  •  Sayfa {page_no}/{total_pages}")


def draw_panel_layout_page(c: canvas.Canvas, data: dict, total_pages: int):
    enc = data["enclosure"]
    rails = data["rails"]
    analysis = data["analysis"]
    placed = analysis["placed"]

    draw_frame_and_titleblock(
        c,
        1,
        total_pages,
        "SAYFA 1 — PANO İÇ YERLEŞİM PLANI & DELİK DELME ŞABLONU",
        "Bemis BH6-6000-0000 (245×325×138 mm) • 1:1 Orantılı mm Çizim, Ray Dolulukları ve Delik Koordinatları",
        data["generatedAt"],
    )

    # Ön yerleşim çizim alanı (sol yarı)
    scale = 1.12
    ox = 26 * mm
    oy_top = PAGE_H - 36 * mm  # üst başlık ve 245 mm ölçüsü için ferah boşluk

    def px(x_mm: float) -> float:
        return ox + x_mm * scale

    def py(y_mm: float) -> float:
        return oy_top - y_mm * scale

    W = enc["outerWidthMm"]
    H = enc["outerHeightMm"]
    D = enc["outerDepthMm"]
    wall_x = (W - enc["innerWidthMm"]) / 2.0
    wall_y = (H - enc["innerHeightMm"]) / 2.0

    # Başlık (ölçü çizgisinin yeterince üstünde)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 8.5)
    c.drawString(ox, oy_top + 10.5 * mm, "ÖN İÇ YERLEŞİM (245 × 325 mm)")

    # Dış kasa
    c.setFillColor(colors.HexColor("#f1f5f9"))
    c.setStrokeColor(colors.HexColor("#334155"))
    c.setLineWidth(1.4)
    c.roundRect(px(0), py(H), W * scale, H * scale, 5, fill=1, stroke=1)

    # İç hacim
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor("#94a3b8"))
    c.setLineWidth(0.8)
    c.roundRect(px(wall_x), py(H - wall_y), enc["innerWidthMm"] * scale, enc["innerHeightMm"] * scale, 3, fill=1, stroke=1)

    # DIN rayları
    for rkey in ("top-rail", "bottom-rail"):
        r = rails[rkey]
        rx = (W - r["usableWidthMm"]) / 2.0
        ry_top = r["centerYMm"] - r["railHeightMm"] / 2.0
        c.setFillColor(colors.HexColor("#e2e8f0"))
        c.setStrokeColor(colors.HexColor("#64748b"))
        c.setLineWidth(0.7)
        c.rect(px(rx), py(ry_top + r["railHeightMm"]), r["usableWidthMm"] * scale, r["railHeightMm"] * scale, fill=1, stroke=1)

    # Elemanlar
    for p in placed:
        item = p["item"]
        box = p["box"]
        mount = item["mount"]
        w_mm = box["x2"] - box["x1"]
        h_mm = box["y2"] - box["y1"]
        col = hex_to_rl(item["color"], darken_white=True)

        if mount in ("top-rail", "bottom-rail"):
            c.setFillColor(colors.Color(col.red, col.green, col.blue, alpha=0.18))
            c.setStrokeColor(col)
            c.setLineWidth(0.9 if item["category"] != "terminal" else 0.5)
            c.rect(px(box["x1"]), py(box["y2"]), w_mm * scale, h_mm * scale, fill=1, stroke=1)
            cx = px((box["x1"] + box["x2"]) / 2.0)
            cy = py((box["y1"] + box["y2"]) / 2.0)
            c.setFillColor(colors.HexColor("#0f172a"))
            if item["category"] == "terminal":
                c.saveState()
                c.translate(cx, cy)
                c.rotate(90)
                c.setFont("DejaVuBold", 5.2)
                c.drawCentredString(0, -1.6, item["code"])
                c.restoreState()
            else:
                c.setFont("DejaVuBold", 7.2)
                c.drawCentredString(cx, cy + 2, item["code"])
                c.setFont("DejaVu", 5.6)
                c.drawCentredString(cx, cy - 6, item.get("rating", "")[:12])
        elif mount == "backplate":
            c.setFillColor(colors.Color(col.red, col.green, col.blue, alpha=0.28))
            c.setStrokeColor(col)
            c.setLineWidth(1.0)
            c.roundRect(px(box["x1"]), py(box["y2"]), w_mm * scale, h_mm * scale, 2, fill=1, stroke=1)
            cx = px((box["x1"] + box["x2"]) / 2.0)
            cy = py((box["y1"] + box["y2"]) / 2.0)
            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("DejaVuBold", 6.2)
            c.drawCentredString(cx, cy - 2, f"{item['code']} ({'N' if 'N' in item['code'] else 'PE'})")
        elif mount in ("left-wall", "right-wall"):
            # İç derinlik bölgesi (kesikli)
            c.saveState()
            c.setDash(3, 2)
            c.setFillColor(colors.Color(0.06, 0.72, 0.51, alpha=0.12))
            c.setStrokeColor(colors.HexColor("#059669"))
            c.setLineWidth(0.8)
            c.rect(px(box["x1"]), py(box["y2"]), w_mm * scale, h_mm * scale, fill=1, stroke=1)
            c.restoreState()
            # Dış buton başlığı
            prot = item.get("protrusionMm", 16)
            ext_x = -prot if mount == "left-wall" else W
            c.setFillColor(colors.HexColor("#059669"))
            c.setStrokeColor(colors.HexColor("#064e3b"))
            c.setLineWidth(0.8)
            c.roundRect(px(ext_x), py(box["y2"]), prot * scale, h_mm * scale, 2, fill=1, stroke=1)
            cx = px((box["x1"] + box["x2"]) / 2.0)
            cy = py((box["y1"] + box["y2"]) / 2.0)
            c.setFillColor(colors.HexColor("#065f46"))
            c.setFont("DejaVuBold", 6.5)
            c.drawCentredString(cx, cy + 2, f"{item['code']} (SW-BL4252)")
            c.setFont("DejaVu", 5.5)
            c.drawCentredString(cx, cy - 6, f"İç: {item['depthMm']}mm • Y={item.get('posYMm', 264)}")
        elif mount == "bottom-wall":
            # İç kontra somun + dış PG 36 rakor
            c.setFillColor(colors.Color(0.02, 0.71, 0.83, alpha=0.22))
            c.setStrokeColor(colors.HexColor("#0891b2"))
            c.setLineWidth(0.9)
            c.rect(px(box["x1"]), py(box["y2"]), w_mm * scale, h_mm * scale, fill=1, stroke=1)
            prot = item.get("protrusionMm", 46)
            c.setFillColor(colors.HexColor("#0891b2"))
            c.rect(px(box["x1"] + 3), py(H + prot * 0.72), (w_mm - 6) * scale, prot * 0.72 * scale, fill=1, stroke=1)
            cx = px((box["x1"] + box["x2"]) / 2.0)
            c.setFillColor(colors.white)
            c.setFont("DejaVuBold", 6)
            c.drawCentredString(cx, py(H + 14), f"{item['code']} PG36")
            c.setFont("DejaVu", 5.4)
            c.drawCentredString(cx, py(H + 24), f"Ø{item.get('holeDiameterMm', 47.5)}mm")

    # Dış ölçüler (245 mm ve 325 mm)
    c.setStrokeColor(colors.HexColor("#475569"))
    c.setLineWidth(0.6)
    # Üst 245 mm
    c.line(px(0), py(-10), px(W), py(-10))
    c.line(px(0), py(-14), px(0), py(-2))
    c.line(px(W), py(-14), px(W), py(-2))
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 7)
    c.drawCentredString(px(W / 2), py(-14), f"{W} mm (İç: {enc['innerWidthMm']} mm)")
    # Sol 325 mm
    c.line(px(-22), py(0), px(-22), py(H))
    c.line(px(-26), py(0), px(-4), py(0))
    c.line(px(-26), py(H), px(-4), py(H))
    c.saveState()
    c.translate(px(-26), py(H / 2))
    c.rotate(90)
    c.drawCentredString(0, 0, f"{H} mm (İç: {enc['innerHeightMm']} mm)")
    c.restoreState()

    # Sağ yarı: Yan & Alt Duvar Delme Şablonları + Koordinat Tablosu
    rx0 = 144 * mm
    s_side = 0.72

    # 1. Sol/Sağ Yan Delme Şablonu (138 x 325 mm)
    sy_top = PAGE_H - 33 * mm
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 8.0)
    c.drawString(rx0, sy_top + 5 * mm, "YAN DELME (S1 & S2 • Ø22)")

    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setStrokeColor(colors.HexColor("#334155"))
    c.setLineWidth(1.0)
    c.roundRect(rx0, sy_top - H * s_side, D * s_side, H * s_side, 3, fill=1, stroke=1)
    # Kapak ayrım çizgisi
    c.saveState()
    c.setDash(3, 2)
    c.setStrokeColor(colors.HexColor("#d97706"))
    c.line(rx0 + enc["baseDepthMm"] * s_side, sy_top, rx0 + enc["baseDepthMm"] * s_side, sy_top - H * s_side)
    c.restoreState()
    c.setFont("DejaVu", 6.0)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawString(rx0 + 4, sy_top - 8, f"Gövde ({enc['baseDepthMm']}mm)")
    c.setFillColor(colors.HexColor("#b45309"))
    c.drawString(rx0 + enc["baseDepthMm"] * s_side + 3, sy_top - 8, "Kapak")

    # S1/S2 delik merkezi (gerçek konumdan oku)
    btn_l = next((p["item"] for p in placed if p["item"]["mount"] == "left-wall"), None)
    btn_r = next((p["item"] for p in placed if p["item"]["mount"] == "right-wall"), None)
    by = btn_l.get("posYMm", 264) if btn_l else 264
    by_r = btn_r.get("posYMm", by) if btn_r else by
    bz = btn_l.get("posZMm", 48) if btn_l else 48
    bdia = btn_l.get("holeDiameterMm", 22) if btn_l else 22
    hx = rx0 + bz * s_side
    hy = sy_top - by * s_side
    c.setFillColor(colors.Color(0.06, 0.72, 0.51, alpha=0.2))
    c.setStrokeColor(colors.HexColor("#059669"))
    c.setLineWidth(1.0)
    c.circle(hx, hy, (bdia / 2) * s_side, fill=1, stroke=1)
    c.setStrokeColor(colors.HexColor("#dc2626"))
    c.line(hx - 6, hy, hx + 6, hy)
    c.line(hx, hy - 6, hx, hy + 6)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 6.3)
    c.drawString(rx0 + D * s_side + 4, hy + 5, f"Ø{bdia} mm Panç")
    c.setFont("DejaVu", 6.1)
    c.drawString(rx0 + D * s_side + 4, hy - 4, f"S1 Y = {by} mm")
    c.drawString(rx0 + D * s_side + 4, hy - 12, f"S2 Y = {by_r} mm")
    c.drawString(rx0 + D * s_side + 4, hy - 20, f"Z = {bz} mm")

    # 2. Alt Duvar Rakor Delme Şablonu (245 x 138 mm)
    bx0 = 214 * mm
    s_bot = 0.78
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 8.0)
    c.drawString(bx0, sy_top + 5 * mm, "ALT DUVAR RAKOR (RK1 • PG 36)")
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setStrokeColor(colors.HexColor("#334155"))
    c.setLineWidth(1.0)
    c.roundRect(bx0, sy_top - D * s_bot, W * s_bot, D * s_bot, 3, fill=1, stroke=1)
    c.saveState()
    c.setDash(3, 2)
    c.setStrokeColor(colors.HexColor("#d97706"))
    c.line(bx0, sy_top - enc["baseDepthMm"] * s_bot, bx0 + W * s_bot, sy_top - enc["baseDepthMm"] * s_bot)
    c.restoreState()

    gland = next((p["item"] for p in placed if p["item"]["mount"] == "bottom-wall"), None)
    gx_mm = gland.get("posXMm", 122.5) if gland else 122.5
    gz_mm = gland.get("posZMm", 48) if gland else 48
    gdia = gland.get("holeDiameterMm", 47.5) if gland else 47.5
    gout = gland.get("widthMm", 58) if gland else 58
    gcx = bx0 + gx_mm * s_bot
    gcy = sy_top - gz_mm * s_bot
    c.setFillColor(colors.Color(0.02, 0.71, 0.83, alpha=0.18))
    c.setStrokeColor(colors.HexColor("#0891b2"))
    c.circle(gcx, gcy, (gout / 2) * s_bot, fill=1, stroke=1)
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor("#dc2626"))
    c.setLineWidth(1.1)
    c.circle(gcx, gcy, (gdia / 2) * s_bot, fill=1, stroke=1)
    c.line(gcx - 8, gcy, gcx + 8, gcy)
    c.line(gcx, gcy - 8, gcx, gcy + 8)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 6.2)
    c.drawCentredString(bx0 + (W * s_bot) / 2, sy_top - D * s_bot - 9, f"Ortaç ODB-42 PG36 • Panç: Ø{gdia} mm")
    c.setFont("DejaVu", 6.1)
    c.drawCentredString(bx0 + (W * s_bot) / 2, sy_top - D * s_bot - 17, f"Soldan X = {gx_mm} mm  •  Arkadan Z = {gz_mm} mm")

    # 3. Sağ Alt Özet Kutusu (Ray Dolulukları + Delme Koordinatları)
    box_y = 20 * mm
    box_x = 144 * mm
    box_w = PAGE_W - 11 * mm - box_x
    box_h = 64 * mm
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(0.8)
    c.roundRect(box_x, box_y, box_w, box_h, 4, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 8.2)
    c.drawString(box_x + 4 * mm, box_y + box_h - 6.5 * mm, "YERLEŞİM & DELİK ÖLÇÜ ÖZETİ")

    n_bar = next((p["item"] for p in placed if p["item"]["id"] == "n-bar"), None)
    pe_bar = next((p["item"] for p in placed if p["item"]["id"] == "pe-bar"), None)
    n_y = n_bar.get("posYMm", 21) if n_bar else 21
    pe_y = pe_bar.get("posYMm", 21) if pe_bar else 21

    tr = analysis["topRail"]
    br = analysis["bottomRail"]
    summary_lines = [
        f"• Üst DIN Rayı (12M): {tr['usedWidthMm']} / {tr['usableWidthMm']} mm (Kalan: {tr['remainingMm']} mm) — Q1, Q2, R1, X1–X3 (6 mm²)",
        f"• Alt DIN Rayı (Ek): {br['usedWidthMm']} / {br['usableWidthMm']} mm (Kalan: {br['remainingMm']} mm) — KM1–KM2 | X4–X12 | KM3–KM4",
        f"• Raylar Arası Boşluk: {analysis['interRailGapMm']} mm  |  Orta Koridor (S1–S2): {analysis['sideButtonMiddleGapMm']} mm",
        f"• Dahili Baralar: N-BARA (Y={n_y} mm) ve PE-BARA (Y={pe_y} mm) — 6'şar vidalı pano içi bara",
        f"• Yan Duvar (S1/S2 — Mutlusan SW-BL4252): Ø{bdia} mm | S1 Y={by}, S2 Y={by_r}, Z={bz} mm",
        f"• Alt Rakor (RK1 — Ortaç ODB-42 PG36): Ø{gdia} mm | Soldan X={gx_mm}, Arkadan Z={gz_mm} mm",
        "• PG 36 (Ø36 spiral) Doluluk: 1×5×2,5 + 2×7 damar motor + 2×5×1 sektör ≈ %48 (Uygun)",
    ]
    c.setFont("DejaVu", 6.45)
    yy = box_y + box_h - 13.5 * mm
    for ln in summary_lines:
        c.drawString(box_x + 3.5 * mm, yy, ln)
        yy -= 6.8 * mm


def draw_schematic_page(c: canvas.Canvas, page: dict, page_no: int, total_pages: int, date_str: str):
    pdf_title = (
        f"SAYFA {page_no} — 3 FAZ GÜÇ ŞEMASI (Bemis BH6-6000-0000)"
        if page["kind"] == "power"
        else f"SAYFA {page_no} — KUMANDA & OTOMASYON ŞEMASI (Bemis BH6-6000-0000)"
    )
    draw_frame_and_titleblock(
        c,
        page_no,
        total_pages,
        pdf_title,
        f"{page['subtitle']}  •  Toplam {len(page['wires'])} numaralı kablo bağlantısı",
        date_str,
    )

    m = 10 * mm
    avail_w = PAGE_W - 2 * m
    avail_h = PAGE_H - 30 * mm - 18 * mm  # üst başlık ve alt antet arası
    sw = page["width"]
    sh = page["height"]
    scale = min(avail_w / sw, avail_h / sh)
    ox = m + (avail_w - sw * scale) / 2.0
    oy_top = PAGE_H - 22 * mm - (avail_h - sh * scale) / 2.0

    def tx(x: float) -> float:
        return ox + x * scale

    def ty(y: float) -> float:
        return oy_top - y * scale

    # Hafif ızgara
    c.setStrokeColor(colors.HexColor("#eef2f6"))
    c.setLineWidth(0.35)
    for gx in range(0, int(sw) + 1, 40):
        c.line(tx(gx), ty(0), tx(gx), ty(sh))
    for gy in range(0, int(sh) + 1, 40):
        c.line(tx(0), ty(gy), tx(sw), ty(gy))

    # Dikey segmentler (atlama yayı hesabı için)
    v_segs = []
    for rw in page["wires"]:
        pts = rw["points"]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            if abs(a["x"] - b["x"]) < 1 and abs(a["y"] - b["y"]) > 6:
                v_segs.append((rw["wire"]["id"], a["x"], min(a["y"], b["y"]), max(a["y"], b["y"])))

    # 1. Kablolar
    for rw in page["wires"]:
        w = rw["wire"]
        pts = rw["points"]
        if len(pts) < 2:
            continue
        col = hex_to_rl(w["color"], darken_white=True)
        lw = 1.6 if w["sectionMm2"] == "2,5" else 1.2

        # Beyaz ayrım kılıfı + renkli kablo (köprü atlama yaylarıyla!)
        def stroke_wire_path(stroke_col, width_pt, dash=None):
            c.saveState()
            c.setStrokeColor(stroke_col)
            c.setLineWidth(width_pt)
            c.setLineCap(1)
            c.setLineJoin(1)
            if dash:
                c.setDash(dash[0], dash[1])
            p = c.beginPath()
            p.moveTo(tx(pts[0]["x"]), ty(pts[0]["y"]))
            hop_r = 5.0
            for i in range(len(pts) - 1):
                a, b = pts[i], pts[i + 1]
                is_h = abs(a["y"] - b["y"]) < 1 and abs(a["x"] - b["x"]) > hop_r * 3
                if not is_h:
                    p.lineTo(tx(b["x"]), ty(b["y"]))
                    continue
                min_x, max_x = min(a["x"], b["x"]), max(a["x"], b["x"])
                right = b["x"] > a["x"]
                xs = sorted(
                    [
                        vx
                        for (wid, vx, vy1, vy2) in v_segs
                        if wid != w["id"]
                        and min_x + hop_r + 3 < vx < max_x - hop_r - 3
                        and vy1 + 3 < a["y"] < vy2 - 3
                    ],
                    reverse=not right,
                )
                filt = []
                for cx_v in xs:
                    if not filt or abs(cx_v - filt[-1]) >= hop_r * 2 + 2:
                        filt.append(cx_v)
                for cx_v in filt:
                    if right:
                        p.lineTo(tx(cx_v - hop_r), ty(a["y"]))
                        p.arcTo(
                            tx(cx_v - hop_r),
                            ty(a["y"] + hop_r),
                            tx(cx_v + hop_r),
                            ty(a["y"] - hop_r),
                            startAng=180,
                            extent=-180,
                        )
                    else:
                        p.lineTo(tx(cx_v + hop_r), ty(a["y"]))
                        p.arcTo(
                            tx(cx_v - hop_r),
                            ty(a["y"] + hop_r),
                            tx(cx_v + hop_r),
                            ty(a["y"] - hop_r),
                            startAng=0,
                            extent=180,
                        )
                p.lineTo(tx(b["x"]), ty(b["y"]))
            c.drawPath(p, stroke=1, fill=0)
            c.restoreState()

        stroke_wire_path(colors.white, lw + 1.8)
        stroke_wire_path(col, lw)
        if rw.get("stripeHex"):
            stroke_wire_path(colors.HexColor("#eab308"), lw, dash=(4, 4))

    # 2. Ek noktaları
    for j in page["junctions"]:
        c.setFillColor(hex_to_rl(j["color"], darken_white=True))
        c.setStrokeColor(colors.white)
        c.setLineWidth(0.7)
        c.circle(tx(j["x"]), ty(j["y"]), 2.3, fill=1, stroke=1)

    # 3. Bloklar ve pinler
    for b in page["blocks"]:
        bx = tx(b["x"])
        by_bot = ty(b["y"] + b["height"])
        bw = b["width"] * scale
        bh = b["height"] * scale
        accent = hex_to_rl(b["accent"], darken_white=True)

        c.setFillColor(colors.HexColor("#f8fafc"))
        c.setStrokeColor(accent)
        c.setLineWidth(1.1)
        c.roundRect(bx, by_bot, bw, bh, 3, fill=1, stroke=1)

        # Üst vurgu şeridi
        c.setFillColor(accent)
        c.rect(bx, by_bot + bh - 2.6, bw, 2.6, fill=1, stroke=0)

        has_top = any(p["side"] == "top" for p in b["pins"])
        has_bot = any(p["side"] == "bottom" for p in b["pins"])
        if has_bot and not has_top:
            title_y = ty(b["y"] + 21)
            sub_y = ty(b["y"] + 33)
        elif has_top and not has_bot:
            title_y = ty(b["y"] + b["height"] - 23)
            sub_y = ty(b["y"] + b["height"] - 11)
        else:
            title_y = ty(b["y"] + b["height"] / 2.0 - 2)
            sub_y = ty(b["y"] + b["height"] / 2.0 + 11)

        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("DejaVuBold", max(5.8, 10.5 * scale))
        c.drawCentredString(bx + bw / 2.0, title_y, b["title"])
        c.setFillColor(colors.HexColor("#475569"))
        c.setFont("DejaVu", max(4.8, 8.2 * scale))
        c.drawCentredString(bx + bw / 2.0, sub_y, b["subtitle"])

        for p in b["pins"]:
            px_p = tx(b["x"] + p["dx"])
            py_p = ty(b["y"] + p["dy"])
            c.setFillColor(colors.white)
            c.setStrokeColor(colors.HexColor("#334155"))
            c.setLineWidth(0.8)
            c.circle(px_p, py_p, 2.3, fill=1, stroke=1)
            ly = ty(b["y"] + (15 if p["side"] == "top" else b["height"] - (16 if p.get("subLabel") else 9)))
            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("DejaVuBold", max(4.6, 8.0 * scale))
            c.drawCentredString(px_p, ly, p["label"])
            if p.get("subLabel"):
                sy = ty(b["y"] + (25 if p["side"] == "top" else b["height"] - 6))
                c.setFillColor(hex_to_rl(p.get("subColor", "#475569"), darken_white=True))
                c.setFont("DejaVu", max(4.2, 6.8 * scale))
                c.drawCentredString(px_p, sy, p["subLabel"])

    # 4. Kablo Numaraları (En üstte — net, çakışmasız!)
    for rw in page["wires"]:
        w = rw["wire"]
        lp = rw["labelPoint"]
        lbl = str(w.get("label") or rw["index"])
        lx, ly = tx(lp["x"]), ty(lp["y"])
        col = hex_to_rl(w["color"], darken_white=True)
        pill_w = max(13.5, len(lbl) * 4.2 + 6)
        pill_h = 8.6

        c.setFillColor(colors.white)
        c.setStrokeColor(col)
        c.setLineWidth(0.85)
        c.roundRect(lx - pill_w / 2, ly - pill_h / 2, pill_w, pill_h, 2, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("DejaVuBold", 5.5)
        c.drawCentredString(lx, ly - 2.0, lbl)

    # 5. Notlar
    for n in page["notes"]:
        c.setFillColor(hex_to_rl(n["color"], darken_white=True))
        c.setFont("DejaVuBold", max(5.2, 9.0 * scale))
        c.drawCentredString(tx(n["x"]), ty(n["y"]), n["text"])


def draw_bom_page(c: canvas.Canvas, data: dict, total_pages: int):
    draw_frame_and_titleblock(
        c,
        4,
        total_pages,
        "SAYFA 4 — KOMPLE MALZEME LİSTESİ (BOM) & SAHA KABLOLARI",
        "Bemis BH6-6000-0000 Pano İç Malzemeleri, Dış Kumanda Elemanları, Rakor ve Saha Kablo Çizelgesi",
        data["generatedAt"],
    )

    m = 12 * mm
    y = PAGE_H - 28 * mm

    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 9.5)
    c.drawString(m, y, "1. PANO VE ŞALT MALZEME LİSTESİ (BOM)")
    y -= 5 * mm

    col_xs = [m, m + 12 * mm, m + 28 * mm, m + 64 * mm, m + 162 * mm, m + 202 * mm, m + 236 * mm]
    headers = ["No", "Adet", "Etiket Kodları", "Marka / Model / Açıklama", "Konum", "Ölçü (mm)", "Not / Değer"]

    def draw_table_header(yy):
        c.setFillColor(colors.HexColor("#1e293b"))
        c.rect(m, yy - 5.5 * mm, PAGE_W - 2 * m, 6.2 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("DejaVuBold", 7.2)
        for hx, htxt in zip(col_xs, headers):
            c.drawString(hx + 1.5 * mm, yy - 3.6 * mm, htxt)
        return yy - 6.2 * mm

    y = draw_table_header(y)

    for idx, row in enumerate(data["bomRows"], start=1):
        row_h = 6.2 * mm
        if idx % 2 == 0:
            c.setFillColor(colors.HexColor("#f8fafc"))
            c.rect(m, y - row_h + 0.8 * mm, PAGE_W - 2 * m, row_h, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.setLineWidth(0.4)
        c.line(m, y - row_h + 0.8 * mm, PAGE_W - m, y - row_h + 0.8 * mm)

        kod_str = ", ".join(row["kodlar"])
        if len(kod_str) > 22:
            kod_str = f"{row['kodlar'][0]}–{row['kodlar'][-1]} ({len(row['kodlar'])})"

        vals = [
            str(idx),
            f"{row['adet']} adet",
            kod_str,
            row["model"][:68],
            row["konum"],
            row["olcu"],
            "3P + 1NC" if "Mini Kontaktör" in row["model"] else row["not"][:26],
        ]
        c.setFillColor(colors.HexColor("#0f172a"))
        for ci, (cx_v, val) in enumerate(zip(col_xs, vals)):
            c.setFont("DejaVuBold" if ci in (1, 2) else "DejaVu", 7.0)
            c.drawString(cx_v + 1.5 * mm, y - 3.6 * mm, val)
        y -= row_h

    # Saha Kabloları Tablosu
    y -= 8 * mm
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("DejaVuBold", 9.5)
    c.drawString(m, y, "2. SAHA KABLO LİSTESİ (Ortaç ODB-42 PG 36 Spiral Rakordan Geçen Hatlar)")
    y -= 5 * mm

    fcols = [m, m + 16 * mm, m + 82 * mm, m + 114 * mm]
    fheads = ["Adet", "Kablo Grubu", "Kesit / Damar", "Açıklama"]
    c.setFillColor(colors.HexColor("#1e293b"))
    c.rect(m, y - 5.5 * mm, PAGE_W - 2 * m, 6.2 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("DejaVuBold", 7.2)
    for fx, ftxt in zip(fcols, fheads):
        c.drawString(fx + 1.5 * mm, y - 3.6 * mm, ftxt)
    y -= 6.2 * mm

    for idx, fc in enumerate(data["fieldCables"]):
        rh = 6.2 * mm
        if idx % 2 == 1:
            c.setFillColor(colors.HexColor("#f8fafc"))
            c.rect(m, y - rh + 0.8 * mm, PAGE_W - 2 * m, rh, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor("#e2e8f0"))
        c.line(m, y - rh + 0.8 * mm, PAGE_W - m, y - rh + 0.8 * mm)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("DejaVuBold", 7.0)
        c.drawString(fcols[0] + 1.5 * mm, y - 3.6 * mm, f"{fc['adet']} adet")
        c.drawString(fcols[1] + 1.5 * mm, y - 3.6 * mm, fc["tip"])
        c.setFont("DejaVu", 7.0)
        c.drawString(fcols[2] + 1.5 * mm, y - 3.6 * mm, fc["kesit"])
        c.drawString(fcols[3] + 1.5 * mm, y - 3.6 * mm, fc["aciklama"])
        y -= rh


def draw_wirelist_page(c: canvas.Canvas, data: dict, total_pages: int):
    wires = data["wireList"]
    draw_frame_and_titleblock(
        c,
        5,
        total_pages,
        f"SAYFA 5 — TAM KABLO BAĞLANTI ÇİZELGESİ (1 – {len(wires)} NUMARALI NETLIST)",
        "Sayfa 2 (Güç) ve Sayfa 3 (Kumanda) Üzerindeki Numaralı Tüm Kabloların Birebir Kaynak → Hedef Listesi",
        data["generatedAt"],
    )

    m = 10 * mm
    mid_gap = 6 * mm
    col_w = (PAGE_W - 2 * m - mid_gap) / 2.0
    half = math.ceil(len(wires) / 2)

    def draw_half_table(x0: float, subset: list):
        y = PAGE_H - 24 * mm
        # Sütun ofsetleri: No | Devre | Renk | mm² | Kaynak → Hedef
        offs = [0, 9 * mm, 22 * mm, 44 * mm, 53 * mm]
        heads = ["No", "Devre", "Renk", "mm²", "Kaynak Pin → Hedef Pin"]
        c.setFillColor(colors.HexColor("#1e293b"))
        c.rect(x0, y - 4.8 * mm, col_w, 5.2 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("DejaVuBold", 6.4)
        for ox_c, htxt in zip(offs, heads):
            c.drawString(x0 + ox_c + 1 * mm, y - 3.3 * mm, htxt)
        y -= 5.2 * mm

        rh = 4.05 * mm
        for i, w in enumerate(subset):
            if i % 2 == 1:
                c.setFillColor(colors.HexColor("#f8fafc"))
                c.rect(x0, y - rh + 0.6 * mm, col_w, rh, fill=1, stroke=0)
            c.setStrokeColor(colors.HexColor("#e2e8f0"))
            c.setLineWidth(0.3)
            c.line(x0, y - rh + 0.6 * mm, x0 + col_w, y - rh + 0.6 * mm)

            # Renk noktası
            dot_col = hex_to_rl(w["colorHex"], darken_white=False)
            c.setFillColor(dot_col)
            c.setStrokeColor(colors.HexColor("#475569"))
            c.setLineWidth(0.3)
            c.circle(x0 + offs[2] + 2.2 * mm, y - 2.0 * mm, 1.3 * mm, fill=1, stroke=1)

            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("DejaVuBold", 6.1)
            c.drawString(x0 + offs[0] + 1 * mm, y - 2.8 * mm, str(w["no"]))
            c.setFont("DejaVu", 5.8)
            c.setFillColor(
                colors.HexColor("#0369a1") if w["page"] == "Güç" else colors.HexColor("#7c3aed")
            )
            c.drawString(x0 + offs[1] + 1 * mm, y - 2.8 * mm, w["page"])
            c.setFillColor(colors.HexColor("#334155"))
            c.drawString(x0 + offs[2] + 4.3 * mm, y - 2.8 * mm, w["colorName"][:11])
            c.drawString(x0 + offs[3] + 1 * mm, y - 2.8 * mm, w["sectionMm2"])
            c.setFillColor(colors.HexColor("#0f172a"))
            c.drawString(
                x0 + offs[4] + 1 * mm,
                y - 2.8 * mm,
                f"{w['fromText']}  →  {w['toText']}"[:46],
            )
            y -= rh

    draw_half_table(m, wires[:half])
    draw_half_table(m + col_w + mid_gap, wires[half:])


def generate_pdf(data: dict):
    total_pages = 5
    c = canvas.Canvas(str(PDF_PATH), pagesize=landscape(A4))
    c.setTitle("Bemis BH6-6000-0000 Elektrik Pano Projesi")
    c.setAuthor("Elektrik Pano Tasarım")

    draw_panel_layout_page(c, data, total_pages)
    c.showPage()

    draw_schematic_page(c, data["pages"]["power"], 2, total_pages, data["generatedAt"])
    c.showPage()

    draw_schematic_page(c, data["pages"]["control"], 3, total_pages, data["generatedAt"])
    c.showPage()

    draw_bom_page(c, data, total_pages)
    c.showPage()

    draw_wirelist_page(c, data, total_pages)
    c.showPage()

    c.save()
    print(f"PDF generated: {PDF_PATH} ({PDF_PATH.stat().st_size} bytes)")


# ---------- STANDART KATMANLI AUTOCAD DXF (R12 / AC1009 — %100 AutoCAD & LibreCAD Uyumlu) ----------

HEX_TO_ACI = {
    "#ef4444": 1,   # Kırmızı
    "#eab308": 2,   # Sarı
    "#22c55e": 3,   # Yeşil (PE)
    "#10b981": 3,   # Yeşil
    "#06b6d4": 4,   # Cyan
    "#0ea5e9": 4,   # Cyan
    "#3b82f6": 5,   # Mavi
    "#1d4ed8": 5,   # Koyu Mavi
    "#ec4899": 6,   # Magenta
    "#a855f7": 6,   # Mor
    "#f8fafc": 7,   # Beyaz
    "#94a3b8": 8,   # Gri
    "#475569": 251, # Koyu Gri / Siyah
    "#b45309": 34,  # Kahverengi
    "#f97316": 30,  # Turuncu
    "#f59e0b": 40,  # Amber
    "#84cc16": 80,  # Açık Yeşil
    "#64748b": 9,   # Klemens Gri
}


class DxfWriter:
    def __init__(self):
        self.layers = [
            ("PANO_KASA", 7),
            ("DIN_RAY", 8),
            ("ELEMANLAR", 4),
            ("DELIK_SABLONU", 1),
            ("OLCULER", 2),
            ("GUC_SEMASI", 30),
            ("KUMANDA_SEMASI", 6),
            ("KABLO_NUMARALARI", 2),
            ("MALZEME_LISTESI", 7),
            ("KABLO_TABLOSU", 7),
            ("ANTET", 5),
        ]
        self.entities = []
        self.min_x = float("inf")
        self.min_y = float("inf")
        self.max_x = float("-inf")
        self.max_y = float("-inf")

    def _track(self, x: float, y: float):
        if x < self.min_x:
            self.min_x = x
        if y < self.min_y:
            self.min_y = y
        if x > self.max_x:
            self.max_x = x
        if y > self.max_y:
            self.max_y = y

    def _aci(self, hex_str: str) -> int:
        return HEX_TO_ACI.get(hex_str.lower(), 7)

    def _clean(self, txt: str) -> str:
        # AutoCAD R12/R2000 (txt.shx / CP1252) uyumlulugu icin saf ASCII temizligi (garbled/\\U+XXXX onleme)
        repl = {
            "→": "->",
            "↔": "<->",
            "↑": "(YUKARI)",
            "↓": "(ASAGI)",
            "▲": "Y",
            "▼": "A",
            "×": "x",
            "•": "-",
            "—": "-",
            "–": "-",
            "²": "2",
            "Ø": "%%C",
            "ç": "c", "Ç": "C",
            "ğ": "g", "Ğ": "G",
            "ı": "i", "İ": "I",
            "ö": "o", "Ö": "O",
            "ş": "s", "Ş": "S",
            "ü": "u", "Ü": "U",
        }
        out = txt
        for k, v in repl.items():
            out = out.replace(k, v)
        return out

    def add_line(self, layer: str, x1: float, y1: float, x2: float, y2: float, color: int | None = None):
        self._track(x1, y1)
        self._track(x2, y2)
        e = [
            "0", "LINE",
            "8", layer,
        ]
        if color is not None:
            e += ["62", str(color)]
        e += [
            "10", f"{x1:.2f}", "20", f"{y1:.2f}", "30", "0.0",
            "11", f"{x2:.2f}", "21", f"{y2:.2f}", "31", "0.0",
        ]
        self.entities.extend(e)

    def add_rect(self, layer: str, x: float, y: float, w: float, h: float, color: int | None = None):
        self.add_line(layer, x, y, x + w, y, color)
        self.add_line(layer, x + w, y, x + w, y + h, color)
        self.add_line(layer, x + w, y + h, x, y + h, color)
        self.add_line(layer, x, y + h, x, y, color)

    def add_circle(self, layer: str, cx: float, cy: float, r: float, color: int | None = None):
        self._track(cx - r, cy - r)
        self._track(cx + r, cy + r)
        e = ["0", "CIRCLE", "8", layer]
        if color is not None:
            e += ["62", str(color)]
        e += ["10", f"{cx:.2f}", "20", f"{cy:.2f}", "30", "0.0", "40", f"{r:.2f}"]
        self.entities.extend(e)

    def add_text(self, layer: str, x: float, y: float, height: float, text: str, color: int | None = None, rot: float = 0.0):
        self._track(x, y)
        self._track(x, y + height)
        e = ["0", "TEXT", "8", layer]
        if color is not None:
            e += ["62", str(color)]
        e += [
            "10", f"{x:.2f}", "20", f"{y:.2f}", "30", "0.0",
            "40", f"{height:.2f}",
            "1", self._clean(text),
        ]
        if rot:
            e += ["50", f"{rot:.1f}"]
        self.entities.extend(e)

    def add_polyline(self, layer: str, pts: list[tuple[float, float]], color: int | None = None):
        for i in range(len(pts) - 1):
            self.add_line(layer, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], color)

    def save(self, path: Path):
        min_x = self.min_x if self.min_x < self.max_x else 0.0
        min_y = self.min_y if self.min_y < self.max_y else 0.0
        max_x = self.max_x if self.min_x < self.max_x else 1000.0
        max_y = self.max_y if self.min_y < self.max_y else 1000.0
        lines = [
            "0", "SECTION", "2", "HEADER",
            "9", "$ACADVER", "1", "AC1009",
            "9", "$INSUNITS", "70", "4",  # 4 = Millimeters
            "9", "$MEASUREMENT", "70", "1",  # 1 = Metric
            "9", "$EXTMIN", "10", f"{min_x:.2f}", "20", f"{min_y:.2f}", "30", "0.0",
            "9", "$EXTMAX", "10", f"{max_x:.2f}", "20", f"{max_y:.2f}", "30", "0.0",
            "9", "$LIMMIN", "10", f"{min_x:.2f}", "20", f"{min_y:.2f}",
            "9", "$LIMMAX", "10", f"{max_x:.2f}", "20", f"{max_y:.2f}",
            "0", "ENDSEC",
            "0", "SECTION", "2", "TABLES",
            "0", "TABLE", "2", "LTYPE", "70", "1",
            "0", "LTYPE",
            "2", "CONTINUOUS",
            "70", "0",
            "3", "Solid line",
            "72", "65",
            "73", "0",
            "40", "0.0",
            "0", "ENDTAB",
            "0", "TABLE", "2", "LAYER", "70", str(len(self.layers)),
        ]
        for lname, aci in self.layers:
            lines += [
                "0", "LAYER",
                "2", lname,
                "70", "0",
                "62", str(aci),
                "6", "CONTINUOUS",
            ]
        lines += [
            "0", "ENDTAB",
            "0", "ENDSEC",
            "0", "SECTION", "2", "ENTITIES",
        ]
        lines.extend(self.entities)
        lines += ["0", "ENDSEC", "0", "EOF"]
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def generate_dxf(data: dict):
    dxf = DxfWriter()
    enc = data["enclosure"]
    rails = data["rails"]
    placed = data["analysis"]["placed"]

    # ========== PAFTA 1 (X: 0..900, Y: 0..450) — 1:1 MM PANO YERLEŞİM & DELİK ŞABLONLARI ==========
    W, H, D = enc["outerWidthMm"], enc["outerHeightMm"], enc["outerDepthMm"]
    wx = (W - enc["innerWidthMm"]) / 2.0
    wy = (H - enc["innerHeightMm"]) / 2.0

    dxf.add_rect("ANTET", -40, -60, 880, 480)
    dxf.add_text("ANTET", -20, 395, 10, "PAFTA 1: BEMIS BH6-6000-0000 PANO YERLESIM (1:1 mm) & DELIK SABLONU")

    # Ön İç Yerleşim (1:1 mm, Y yukarı artacak şekilde H - y)
    dxf.add_rect("PANO_KASA", 0, 0, W, H)
    dxf.add_rect("PANO_KASA", wx, wy, enc["innerWidthMm"], enc["innerHeightMm"], 8)
    dxf.add_text("OLCULER", 75, H + 12, 7, f"{W} mm (Ic: {enc['innerWidthMm']} mm)")
    dxf.add_text("OLCULER", -28, H / 2 - 20, 7, f"{H} mm", rot=90)

    for rk in ("top-rail", "bottom-rail"):
        r = rails[rk]
        rx = (W - r["usableWidthMm"]) / 2.0
        ry = H - (r["centerYMm"] + r["railHeightMm"] / 2.0)
        dxf.add_rect("DIN_RAY", rx, ry, r["usableWidthMm"], r["railHeightMm"])

    for p in placed:
        it = p["item"]
        b = p["box"]
        col = dxf._aci(it["color"])
        y_cad = H - b["y2"]
        bw = b["x2"] - b["x1"]
        bh = b["y2"] - b["y1"]
        dxf.add_rect("ELEMANLAR", b["x1"], y_cad, bw, bh, col)
        if it["category"] == "terminal":
            dxf.add_text("ELEMANLAR", b["x1"] + 3.5, y_cad + 10, 3.0, it["code"], col, rot=90)
        else:
            dxf.add_text("ELEMANLAR", b["x1"] + 4, y_cad + bh / 2.0, 5.0, it["code"], col)

    # Sol/Sağ Yan Delme Şablonu (1:1 mm, X: 310..448 — gerçek konumlardan)
    btn_l = next((p["item"] for p in placed if p["item"]["mount"] == "left-wall"), None)
    by_cad = btn_l.get("posYMm", 149) if btn_l else 149
    bz_cad = btn_l.get("posZMm", 48) if btn_l else 48
    sx0 = 310.0
    dxf.add_rect("PANO_KASA", sx0, 0, D, H)
    dxf.add_line("OLCULER", sx0 + enc["baseDepthMm"], 0, sx0 + enc["baseDepthMm"], H, 40)
    dxf.add_text("ANTET", sx0, H + 10, 6, "YAN DUVAR DELME (S1 & S2)")
    dxf.add_circle("DELIK_SABLONU", sx0 + bz_cad, H - by_cad, 11.0, 1)
    dxf.add_text("DELIK_SABLONU", sx0 + bz_cad + 17, H - by_cad, 5, f"Ø22 mm (Y={by_cad}, Z={bz_cad})")

    # Alt Duvar Rakor Delme Şablonu (1:1 mm, X: 520..765)
    bx0 = 520.0
    dxf.add_rect("PANO_KASA", bx0, 120, W, D)
    dxf.add_line("OLCULER", bx0, 120 + (D - enc["baseDepthMm"]), bx0 + W, 120 + (D - enc["baseDepthMm"]), 40)
    dxf.add_text("ANTET", bx0, 120 + D + 10, 6, "ALT DUVAR RAKOR (RK1 PG36)")
    dxf.add_circle("DELIK_SABLONU", bx0 + 122.5, 120 + (D - 48), 23.75, 1)
    dxf.add_circle("ELEMANLAR", bx0 + 122.5, 120 + (D - 48), 29.0, 4)
    dxf.add_text("DELIK_SABLONU", bx0 + 40, 102, 5, "Ortac ODB-42 PG36: Ø47.5 mm (X=122.5, Z=48)")

    # ========== PAFTA 2 & 3 — SAYFA 1 GÜÇ ŞEMASI & SAYFA 2 KUMANDA ŞEMASI ==========
    def add_schematic_sheet(page: dict, off_x: float, off_y: float, wire_layer: str):
        sw, sh = page["width"], page["height"]
        sc = 0.65  # CAD mm ölçeği (~900 x 600 mm pafta)
        dxf.add_rect("ANTET", off_x - 20, off_y - 20, sw * sc + 40, sh * sc + 50)
        dxf.add_text("ANTET", off_x, off_y + sh * sc + 8, 9, page["title"])

        def gx(x: float) -> float:
            return off_x + x * sc

        def gy(y: float) -> float:
            return off_y + (sh - y) * sc

        for rw in page["wires"]:
            col = dxf._aci(rw["wire"]["color"])
            pts = [(gx(pt["x"]), gy(pt["y"])) for pt in rw["points"]]
            dxf.add_polyline(wire_layer, pts, col)
            lp = rw["labelPoint"]
            dxf.add_text(
                "KABLO_NUMARALARI",
                gx(lp["x"]) - 4,
                gy(lp["y"]) + 1.5,
                4.5,
                str(rw["wire"].get("label") or rw["index"]),
                col,
            )

        for j in page["junctions"]:
            dxf.add_circle(wire_layer, gx(j["x"]), gy(j["y"]), 2.2, dxf._aci(j["color"]))

        for b in page["blocks"]:
            col = dxf._aci(b["accent"])
            dxf.add_rect("ELEMANLAR", gx(b["x"]), gy(b["y"] + b["height"]), b["width"] * sc, b["height"] * sc, col)
            dxf.add_text("ELEMANLAR", gx(b["x"] + 6), gy(b["y"] + b["height"] / 2.0), 5.5, b["title"], col)
            for p in b["pins"]:
                px_c = gx(b["x"] + p["dx"])
                py_c = gy(b["y"] + p["dy"])
                dxf.add_circle("ELEMANLAR", px_c, py_c, 2.4, 7)
                ly = gy(b["y"] + (16 if p["side"] == "top" else b["height"] - 10))
                dxf.add_text("ELEMANLAR", px_c - 4, ly, 3.8, p["label"], 7)

    add_schematic_sheet(data["pages"]["power"], 960.0, -60.0, "GUC_SEMASI")
    add_schematic_sheet(data["pages"]["control"], 0.0, -860.0, "KUMANDA_SEMASI")

    # ========== PAFTA 4 — MALZEME LİSTESİ & KABLO ÇİZELGESİ ==========
    tx0, ty0 = 1140.0, -860.0
    dxf.add_rect("ANTET", tx0 - 15, ty0 - 20, 820, 740)
    dxf.add_text("MALZEME_LISTESI", tx0, ty0 + 700, 9, "MALZEME LISTESI (BOM)")
    yy = ty0 + 680
    for idx, row in enumerate(data["bomRows"], start=1):
        kod_s = ", ".join(row["kodlar"][:4])
        dxf.add_text(
            "MALZEME_LISTESI",
            tx0,
            yy,
            4.8,
            f"{idx:02d}. {row['adet']}x | {kod_s} | {row['model']} | {row['konum']} | {row['olcu']}",
        )
        yy -= 10

    yy -= 12
    dxf.add_text("KABLO_TABLOSU", tx0, yy, 9, f"KABLO BAGLANTI CIZELGESI (1-{len(data['wireList'])})")
    yy -= 14
    half = math.ceil(len(data["wireList"]) / 2)
    for idx, w in enumerate(data["wireList"]):
        col_off = 0 if idx < half else 400
        row_i = idx if idx < half else idx - half
        wy_c = yy - row_i * 11
        dxf.add_text(
            "KABLO_TABLOSU",
            tx0 + col_off,
            wy_c,
            4.2,
            f"#{w['no']} [{w['page']}] {w['colorName']} {w['sectionMm2']}mm2: {w['fromText']} -> {w['toText']}",
            dxf._aci(w["colorHex"]),
        )

    dxf.save(DXF_PATH)
    print(f"DXF generated: {DXF_PATH} ({DXF_PATH.stat().st_size} bytes)")


def main():
    data = json.loads(PAYLOAD_PATH.read_text(encoding="utf-8"))
    generate_pdf(data)
    generate_dxf(data)


if __name__ == "__main__":
    main()
