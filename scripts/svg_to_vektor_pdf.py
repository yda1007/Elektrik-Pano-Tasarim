#!/usr/bin/env python3
"""SVG -> tamamen vektör PDF (+ 144 dpi PNG).
Gölge filtreleri (feDropShadow) cairo'da 72 dpi resme dönüştüğü için PDF'te kaldırılır;
böylece yazılar ve çizgiler her yakınlaştırmada keskin kalır.
Kullanım: python3 -I scripts/svg_to_vektor_pdf.py ciktilar/O2Sera-Ikili-Motor-Baglanti-Diyagrami.svg
"""
import re, sys, subprocess, cairo, gi
gi.require_version("Rsvg", "2.0")
from gi.repository import Rsvg

svg_path = sys.argv[1]
base = svg_path[:-4]
src = open(svg_path, encoding="utf-8").read()
m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', src)
W, H = float(m.group(1)), float(m.group(2))
h = Rsvg.Handle.new_from_data(re.sub(r' filter="url\(#[A-Za-z0-9_-]+\)"', "", src).encode())
k = 841.89 / W  # A1 genişliğine yakın: 841,9 pt
surf = cairo.PDFSurface(base + ".pdf", W * k, H * k)
ctx = cairo.Context(surf); ctx.scale(k, k)
r = Rsvg.Rectangle(); r.x = 0; r.y = 0; r.width = W; r.height = H
h.render_document(ctx, r); surf.finish()
subprocess.run(["magick", "-density", "144", "-background", "white", "RSVG:" + svg_path, "-flatten", base + ".png"], check=True)
print("PDF + PNG:", base)
