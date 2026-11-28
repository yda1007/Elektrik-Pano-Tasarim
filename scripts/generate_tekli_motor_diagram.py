#!/usr/bin/env python3
"""
O2Sera TEKLİ redüktör motor kumanda bağlantı diyagramı (SVG).
İkili diyagramın (generate_brochure_diagram_kutusuz.py) çizim parçalarını kullanır.

Saha düzeni (26.11.2026):
  Ray 1 = Q1 (MS116) + R1 (CR-M230AC4 + CR-M4SS) — klemens yok, besleme doğrudan Q1'e
  Ray 2 = KM1 + KM2 (B6-30-01, 230V AC) + X1–X5 (2,5 mm²)
  Sağ duvar = S1 (Mutlusan SW-BL4252)
Kilitleme: 41→KM2:22→KM2:21→KM1:A1 (↑) | 31→KM1:22→KM1:21→KM2:A1 (↓)
Havada ek yok: Q1:6T3'te 2 tel (KM1 besleme + buton ortak), KM1→KM2 köprü telleri.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_brochure_diagram_kutusuz as base  # noqa: E402

wire_path = base.wire_path
sheath_path = base.sheath_path
din_terminal_svg = base.din_terminal_svg

OUT_SVG = base.BASE_DIR / "O2Sera-Tekli-Motor-Baglanti-Diyagrami.svg"


def build_svg() -> str:
    W, H = 1700, 2320

    C_L1, C_L2, C_L3 = "#8B4513", "#1E293B", "#64748B"
    C_N, C_PE, C_PE_S = "#1D4ED8", "#16A34A", "#FACC15"
    C_CTRL, C_UP, C_DN, C_OTOMAN = "#DC2626", "#D97706", "#7C3AED", "#0D9488"

    P: list[str] = []
    P.append(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <defs>
    <style>text {{ font-family: 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif; }}</style>
    <filter id="cardShadow" x="-8%" y="-8%" width="118%" height="118%">
      <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.10"/>
    </filter>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
    <linearGradient id="dinRail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/><stop offset="22%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#94a3b8"/><stop offset="82%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="chromeBtn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e9edf0"/><stop offset="50%" stop-color="#9aa3ab"/><stop offset="100%" stop-color="#dfe3e6"/>
    </linearGradient>
    <pattern id="motorFins" width="7" height="10" patternUnits="userSpaceOnUse">
      <rect width="7" height="10" fill="#5a6f86"/><line x1="0" y1="0" x2="0" y2="10" stroke="#3f5163" stroke-width="2.2"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff"/>
''')

    # ---------------------------------------------------------------- 1. BAŞLIK
    P.append(f'''
  <g>
    <rect x="60" y="32" width="10" height="58" rx="4" fill="#1F9D6B"/>
    <text x="86" y="60" font-size="28" font-weight="800" fill="#0B2540"><tspan fill="#1F9D6B">O2Sera</tspan> — TEKLİ REDÜKTÖR MOTOR KUMANDA BAĞLANTI DİYAGRAMI</text>
    <text x="86" y="86" font-size="15" font-weight="500" fill="#475569">3~ 400V / 230V AC • ABB MS116 (MKŞ) • 2× ABB B6-30-01 (230V AC bobin) • ABB CR-M230AC4 + CR-M4SS • Mutlusan SW-BL4252 • RSU50</text>
    <line x1="60" y1="106" x2="{W-60}" y2="106" stroke="#e2e8f0" stroke-width="2"/>
  </g>
''')

    # ------------------------------------------------- 2. ÜST BİLGİ ŞERİTLERİ
    P.append('<g id="top-terminal-diagrams">')
    tx, ty, cw, ch = 75, 165, 68, 42
    sup_terms = [
        ("1L1", "L1", C_L1, "Q1 giriş"),
        ("3L2", "L2", C_L2, "Q1 giriş"),
        ("5L3", "L3", C_L3, "Q1 giriş"),
        ("N2", "N", C_N, "N-BARA"),
        ("PE1", "PE", C_PE, "PE-BARA"),
    ]
    P.append(f'<text x="{tx}" y="138" font-size="14" font-weight="800" fill="#0f172a">1) ANA BESLEME (5×2,5 mm²) → DOĞRUDAN Q1</text>')
    for i, (code, top_lbl, col, bot_lbl) in enumerate(sup_terms):
        bx = tx + i * cw
        cx = bx + cw / 2
        P.append(f'<text x="{cx:.1f}" y="{ty - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="{col}">{top_lbl}</text>')
        P.append(f'<rect x="{bx}" y="{ty}" width="{cw}" height="{ch}" fill="#ffffff" stroke="#334155" stroke-width="1.6"/>')
        P.append(f'<text x="{cx:.1f}" y="{ty + 27}" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a">{code}</text>')
        P.append(f'<line x1="{cx:.1f}" y1="{ty + ch + 40}" x2="{cx:.1f}" y2="{ty + ch + 4}" stroke="{col}" stroke-width="3.5"/>')
        P.append(f'<polygon points="{cx:.1f},{ty + ch + 3} {cx-6:.1f},{ty + ch + 15} {cx+6:.1f},{ty + ch + 15}" fill="{col}"/>')
        P.append(f'<text x="{cx:.1f}" y="{ty + ch + 58}" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">{bot_lbl}</text>')
    P.append(f'<text x="{tx + 170}" y="{ty + ch + 86}" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">Ray 1’de klemens yok — fazlar Q1 üst vidalarına girer</text>')

    mx, my, mcw = 470, 165, 92
    alt_terms = [
        ("X1", "KM1:A2", C_UP, "M1 L↑"),
        ("X2", "KM2:A2", C_DN, "M1 L↓"),
        ("X3", "R1:A1", C_OTOMAN, "SK D5 Oto/Man"),
        ("X4", "R1:32 NC", C_DN, "SK D1/D3 ↓"),
        ("X5", "R1:42 NC", C_UP, "SK D2/D4 ↑"),
    ]
    P.append(f'<text x="{mx}" y="138" font-size="14" font-weight="800" fill="#0f172a">2) RAY 2 SAHA KLEMENSİ (X1–X5 • 2,5 mm²)</text>')
    for i, (code, top_lbl, col, bot_lbl) in enumerate(alt_terms):
        bx = mx + i * mcw
        cx = bx + mcw / 2
        P.append(f'<text x="{cx:.1f}" y="{my - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="{col}">{top_lbl}</text>')
        P.append(f'<rect x="{bx}" y="{my}" width="{mcw}" height="{ch}" fill="#ffffff" stroke="#334155" stroke-width="1.6"/>')
        P.append(f'<text x="{cx:.1f}" y="{my + 27}" text-anchor="middle" font-size="15.5" font-weight="800" fill="#0f172a">{code}</text>')
        P.append(f'<line x1="{cx:.1f}" y1="{my + ch + 4}" x2="{cx:.1f}" y2="{my + ch + 38}" stroke="{col}" stroke-width="3.2"/>')
        P.append(f'<polygon points="{cx:.1f},{my + ch + 40} {cx-5.5:.1f},{my + ch + 28} {cx+5.5:.1f},{my + ch + 28}" fill="{col}"/>')
        P.append(f'<text x="{cx:.1f}" y="{my + ch + 56}" text-anchor="middle" font-size="11" font-weight="700" fill="{col}">{bot_lbl}</text>')
    P.append(f'<path d="M {mx+12} {my+ch+66} L {mx+12} {my+ch+74} L {mx+2*mcw-12} {my+ch+74} L {mx+2*mcw-12} {my+ch+66}" fill="none" stroke="#0f172a" stroke-width="1.4"/>')
    P.append(f'<text x="{mx+mcw}" y="{my+ch+90}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">M1 RSU50 Limit (7D)</text>')
    P.append(f'<path d="M {mx+2*mcw+12} {my+ch+66} L {mx+2*mcw+12} {my+ch+74} L {mx+5*mcw-12} {my+ch+74} L {mx+5*mcw-12} {my+ch+66}" fill="none" stroke="#7c3aed" stroke-width="1.6"/>')
    P.append(f'<text x="{mx+3.5*mcw}" y="{my+ch+90}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#6d28d9">Sektör Kumanda (1× 5×1 mm²)</text>')

    rx = 975
    P.append(f'''
    <text x="{rx}" y="138" font-size="14" font-weight="800" fill="#0f172a">3) R1 (CR-M230AC4 + CR-M4SS) &amp; KİLİTLEME</text>
    <rect x="{rx}" y="152" width="{W-60-rx}" height="148" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="{rx+16}" y="176" font-size="12.3" font-weight="800" fill="{C_DN}">• NC → Oto:</text>
    <text x="{rx+150}" y="176" font-size="12.2" fill="#334155">42←X5 (D2/D4 ↑) | 32←X4 (D1/D3 ↓)</text>
    <text x="{rx+16}" y="200" font-size="12.3" font-weight="800" fill="{C_UP}">• NO → Manuel:</text>
    <text x="{rx+150}" y="200" font-size="12.2" fill="#334155">44←S1:B4 (▲) | 34←S1:A4 (▼)</text>
    <text x="{rx+16}" y="224" font-size="12.3" font-weight="800" fill="{C_UP}">• COM → KM NC:</text>
    <text x="{rx+150}" y="224" font-size="12.2" fill="#334155">41→KM2:22 (↑) | 31→KM1:22 (↓)</text>
    <text x="{rx+16}" y="248" font-size="12.3" font-weight="800" fill="{C_OTOMAN}">• Bobin:</text>
    <text x="{rx+150}" y="248" font-size="12.2" fill="#334155">A1←X3 (D5 Oto/Man) • A2→N-BARA (N1)</text>
    <text x="{rx+16}" y="272" font-size="11.8" font-weight="700" fill="#475569">KM1:21→KM2:A1 • KM2:21→KM1:A1 (kilit) • KM1 ↔ KM2 alt: 2T1↔4T2</text>
    <text x="{rx+16}" y="291" font-size="11.2" font-weight="600" fill="#94a3b8">R1 kontak 2 ve 1 (21-24-22 / 11-14-12) boş — yedek</text>
    ''')
    P.append('</g>')
    P.append(f'<line x1="60" y1="322" x2="{W-60}" y2="322" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6 4"/>')

    # ------------------------------------------------------- 3. DIN RAYLARI
    R1_CY, R2_CY = 700, 1145
    RAIL_X1, RAIL_W = 420, 760
    for r_cy, lbl, ly in [(R1_CY, "RAY 1", R1_CY + 44), (R2_CY, "RAY 2", R2_CY + 100)]:
        slots = "".join(
            f'<rect x="{RAIL_X1 + 26 + k*78}" y="{r_cy - 5}" width="38" height="10" rx="5" fill="#64748b"/>'
            for k in range(9)
        )
        P.append(f'''
  <g>
    <rect x="{RAIL_X1}" y="{r_cy - 26}" width="{RAIL_W}" height="52" rx="3" fill="url(#dinRail)" stroke="#475569" stroke-width="1.4"/>
    {slots}
    <text x="{RAIL_X1 + RAIL_W - 8}" y="{ly}" text-anchor="end" font-size="11" font-weight="800" fill="#94a3b8">{lbl}</text>
  </g>''')

    # ------------------------------------------- 4. BİLEŞENLER & VİDA NOKTALARI
    Q_W, Q_H = 150.0, 300.0
    Q1_X, Q1_Y = 470.0, 550.0
    RL_W, RL_H = 136.0, 310.0
    RL_X, RL_Y = 800.0, 545.0

    KM_W = 175.0
    KM_S = KM_W / 142.5
    KM_BODY_H = 135.0 * KM_S
    KM_Y = R2_CY - KM_BODY_H / 2.0
    KM1_X, KM2_X = 440.0, 650.0
    TX_X, TX_Y, T_W, T_H = 960.0, 1065.0, 38.0, 160.0

    N_X, N_Y, N_W = 430.0, 1438.0, 200.0
    PE_X, PE_Y, PE_W = 650.0, 1438.0, 160.0
    BAR_H = 60.0
    n_pins = [N_X + 30 + i * 50 for i in range(4)]
    pe_pins = [PE_X + 30 + i * 50 for i in range(3)]
    pin_y = N_Y + 38.0

    s = Q_W / 135.0

    def q_top(i): return (Q1_X + [25.5, 67.5, 109.5][i] * s, Q1_Y + 21.0 * s)
    def q_bot(i): return (Q1_X + [25.5, 67.5, 109.5][i] * s, Q1_Y + 249.0 * s)
    def km_top(kx, i): return (kx + [30.0, 54.0, 78.0, 102.0, 126.0][i] * KM_S, KM_Y + 26.0 * KM_S)
    def km_bot(kx, i): return (kx + [30.0, 54.0, 78.0, 102.0, 126.0][i] * KM_S, KM_Y + 109.0 * KM_S)
    RL_COLS = [RL_X + 24.0, RL_X + 53.3, RL_X + 82.7, RL_X + 112.0]
    def r1_no(c): return (RL_COLS[c], RL_Y + 24.0)
    def r1_nc(c): return (RL_COLS[c], RL_Y + 62.0)
    def r1_com(c): return (RL_COLS[c], RL_Y + 286.0)
    r1_a2 = (RL_X + 34.0, RL_Y + 244.0)
    r1_a1 = (RL_X + 102.0, RL_Y + 244.0)
    def xt(i): return (TX_X + i * T_W + T_W / 2, TX_Y + 12)
    def xb(i): return (TX_X + i * T_W + T_W / 2, TX_Y + T_H - 12)

    P.append('<g id="components" filter="url(#softShadow)">')
    P.append(base.draw_abb_ms116(Q1_X, Q1_Y, Q_W, Q_H))
    P.append(base.draw_abb_crm4ss(RL_X, RL_Y, RL_W, RL_H))
    for kx in [KM1_X, KM2_X]:
        P.append(base.draw_abb_bc6(kx, KM_Y, KM_W))
    accents = [C_UP, C_DN, C_OTOMAN, C_DN, C_UP]
    for i in range(5):
        P.append(din_terminal_svg(TX_X + i * T_W, TX_Y, T_W, T_H, f"X{1+i}", "#e2e8f0", accents[i]))
    P.append('</g>')

    # Sağ duvar butonu (S1)
    CARD_W = 322.0
    s1_svg, s1_exit = base.draw_detailed_button_card(
        card_x=W - 72.0 - CARD_W, card_y=635.0, card_w=CARD_W, card_h=484.0,
        side="right", title="S1 • SAĞ DUVAR MANUEL BUTON", motor_lbl="M1",
        q_ref="Q1", up_pin="44", dn_pin="34",
        c_com=C_CTRL, c_up=C_UP, c_dn=C_DN, uid="s1",
    )
    s1_svg = s1_svg.replace("Q1:2T1 (230V)", "Q1:6T3 (230V)")
    P.append(f'<g id="side-buttons">{s1_svg}</g>')

    # ------------------------------------------------------ 5. İÇ KABLOLAMA
    P.append('<g id="internal-wiring">')

    # 5A. Besleme → Q1 üst (sol koridor; L3 en dışta)
    sup_lane = {2: 350.0, 1: 360.0, 0: 370.0}
    sup_turn = {2: 476.0, 1: 487.0, 0: 498.0}
    C_Y = 1608.0
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        qt = q_top(i)
        P.append(wire_path([(sup_lane[i], C_Y), (sup_lane[i], sup_turn[i]), (qt[0], sup_turn[i]), qt], col, 4.4))

    # 5B. Q1 alt → KM1 üst (+4), KM1 (−4) → KM2 köprü teli. 6T3'te 2. tel buton ortağı.
    for i, col in enumerate([C_L1, C_L2, C_L3]):
        qb = q_bot(i)
        qx = qb[0] - 4 if i == 2 else qb[0]
        k1 = km_top(KM1_X, i)
        k2 = km_top(KM2_X, i)
        y_mid = 916 + i * 10
        y_jmp = 960 + i * 10
        P.append(wire_path([(qx, qb[1]), (qx, y_mid), (k1[0] + 4, y_mid), (k1[0] + 4, k1[1])], col, 4.1))
        P.append(wire_path([(k1[0] - 4, k1[1]), (k1[0] - 4, y_jmp), (k2[0], y_jmp), k2], col, 3.8))

    # 5C. Ters yön köprüleri (KM1 alt ↔ KM2 alt)
    P.append(wire_path([km_bot(KM1_X, 0), (km_bot(KM1_X, 0)[0], 1300), (km_bot(KM2_X, 1)[0], 1300), km_bot(KM2_X, 1)], C_L1, 3.6))
    P.append(wire_path([km_bot(KM1_X, 1), (km_bot(KM1_X, 1)[0], 1310), (km_bot(KM2_X, 0)[0], 1310), km_bot(KM2_X, 0)], C_L2, 3.6))
    P.append(wire_path([km_bot(KM1_X, 2), (km_bot(KM1_X, 2)[0], 1320), (km_bot(KM2_X, 2)[0], 1320), km_bot(KM2_X, 2)], C_L3, 3.6))

    # 5D. Elektriksel kilit (üst sıra 21 ↔ A1)
    P.append(wire_path([km_top(KM1_X, 3), (km_top(KM1_X, 3)[0], 1002), (km_top(KM2_X, 4)[0], 1002), km_top(KM2_X, 4)], C_DN, 3.2))
    P.append(wire_path([km_top(KM1_X, 4), (km_top(KM1_X, 4)[0], 1014), (km_top(KM2_X, 3)[0], 1014), km_top(KM2_X, 3)], C_UP, 3.2))

    # 5E. R1 COM → KM NC 22 ve X1/X2 limit → KM A2 (sağ koridor 860–890)
    c41, c31 = r1_com(0), r1_com(1)
    P.append(wire_path([c41, (c41[0], 886), (860, 886), (860, 1332), (km_bot(KM2_X, 3)[0], 1332), km_bot(KM2_X, 3)], C_UP, 2.9))
    P.append(wire_path([c31, (c31[0], 876), (870, 876), (870, 1344), (km_bot(KM1_X, 3)[0], 1344), km_bot(KM1_X, 3)], C_DN, 2.9))
    x1t, x2t = xt(0), xt(1)
    P.append(wire_path([x2t, (x2t[0], 1034), (880, 1034), (880, 1356), (km_bot(KM2_X, 4)[0], 1356), km_bot(KM2_X, 4)], C_DN, 3.0))
    P.append(wire_path([x1t, (x1t[0], 1044), (890, 1044), (890, 1368), (km_bot(KM1_X, 4)[0], 1368), km_bot(KM1_X, 4)], C_UP, 3.0))

    # 5F. Sektör → R1 (X3 → A1, X4 → 32 NC, X5 → 42 NC)
    x3, x4, x5 = xt(2), xt(3), xt(4)
    P.append(wire_path([x3, (x3[0], r1_a1[1]), r1_a1], C_OTOMAN, 3.1))
    n32, n42 = r1_nc(1), r1_nc(0)
    P.append(wire_path([x4, (x4[0], 597), (n32[0], 597), n32], C_DN, 3.0))
    P.append(wire_path([x5, (x5[0], 590), (n42[0], 590), n42], C_UP, 3.0))

    # 5G. R1:A2 → N-BARA N1 (sol koridor x=400)
    P.append(wire_path([r1_a2, (790, r1_a2[1]), (790, 880), (400, 880), (400, 1506), (n_pins[0], 1506), (n_pins[0], pin_y)], C_N, 3.2))

    # 5H. S1 buton kabloları (ortak: Q1:6T3, ▲ → R1:44, ▼ → R1:34)
    ex, ey = s1_exit
    q6 = q_bot(2)
    P.append(sheath_path([s1_exit, (ex - 44, ey)], 12))
    P.append(wire_path([(ex - 44, ey - 7), (1248, ey - 7), (1248, 410), (770, 410), (770, 866), (q6[0] + 4, 866), (q6[0] + 4, q6[1])], C_CTRL, 3.2))
    no44, no34 = r1_no(0), r1_no(1)
    P.append(wire_path([(ex - 44, ey), (1236, ey), (1236, 444), (no44[0], 444), no44], C_UP, 3.1))
    P.append(wire_path([(ex - 44, ey + 7), (1224, ey + 7), (1224, 456), (no34[0], 456), no34], C_DN, 3.1))

    # ------------------------------------------- 6. ALT: BARALAR → SAHA YAKALARI
    C_SUP, C_M1, C_SEC = 370.0, 930.0, 1093.0
    # Besleme N/PE (L3 350, L2 360, L1 370, N 380, PE 390)
    P.append(wire_path([(n_pins[1], pin_y), (n_pins[1], 1518), (380, 1518), (380, C_Y)], C_N, 3.6))
    P.append(wire_path([(pe_pins[0], pin_y), (pe_pins[0], 1530), (390, 1530), (390, C_Y)], C_PE, 3.6, stripe=C_PE_S))
    # Motor yakası: N 909, PE 916, U 923, V 930, W 937, L↑ 944, L↓ 951
    P.append(wire_path([(n_pins[2], pin_y), (n_pins[2], 1570), (909, 1570), (909, C_Y)], C_N, 3.2))
    P.append(wire_path([(pe_pins[1], pin_y), (pe_pins[1], 1550), (916, 1550), (916, C_Y)], C_PE, 3.2, stripe=C_PE_S))
    for i, (col, yy, cx) in enumerate([(C_L1, 1400, 923), (C_L2, 1392, 930), (C_L3, 1384, 937)]):
        p = km_bot(KM1_X, i)
        P.append(wire_path([p, (p[0], yy), (cx, yy), (cx, C_Y)], col, 3.5))
    x1b, x2b = xb(0), xb(1)
    P.append(wire_path([x1b, (x1b[0], 1412), (944, 1412), (944, C_Y)], C_UP, 3.1))
    P.append(wire_path([x2b, (x2b[0], 1420), (951, 1420), (951, C_Y)], C_DN, 3.1))
    # Sektör yakası: X3 1086, X4 1093, X5 1100
    x3b, x4b, x5b = xb(2), xb(3), xb(4)
    P.append(wire_path([x3b, (x3b[0], 1440), (1086, 1440), (1086, C_Y)], C_OTOMAN, 3.1))
    P.append(wire_path([x4b, (1093, C_Y)], C_DN, 3.1))
    P.append(wire_path([x5b, (x5b[0], 1440), (1100, 1440), (1100, C_Y)], C_UP, 3.1))
    P.append('</g>')

    # Baralar
    n_roles = ["R1:A2", "Giriş", "M1", "Boş"]
    pe_roles = ["Giriş", "M1", "Boş"]

    def bar(x0, w, pins, roles, pre, fill, stroke, tcol, rcol, title):
        out = [f'<text x="{x0+4:.1f}" y="{N_Y-8:.1f}" font-size="11.5" font-weight="800" fill="{stroke}">{title}</text>',
               f'<rect x="{x0:.1f}" y="{N_Y:.1f}" width="{w:.1f}" height="{BAR_H:.1f}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="2.2"/>',
               f'<rect x="{x0+12:.1f}" y="{N_Y+30:.1f}" width="{w-24:.1f}" height="16" rx="4" fill="#d97706" stroke="#92400e" stroke-width="1"/>']
        for i, px in enumerate(pins):
            out.append(f'<text x="{px:.1f}" y="{N_Y+13:.1f}" text-anchor="middle" font-size="10.2" font-weight="800" fill="{tcol}">{pre}{i+1}</text>')
            out.append(f'<text x="{px:.1f}" y="{N_Y+24.5:.1f}" text-anchor="middle" font-size="8.4" font-weight="700" fill="{rcol}">{roles[i]}</text>')
            out.append(f'<circle cx="{px:.1f}" cy="{pin_y:.1f}" r="5.5" fill="#fef08a" stroke="#78350f" stroke-width="1.3"/>')
        return "".join(out)

    P.append('<g id="n-pe-bars" filter="url(#softShadow)">')
    P.append(bar(N_X, N_W, n_pins, n_roles, "N", "#eff6ff", "#1d4ed8", "#1e3a8a", "#3b82f6", "N-BARA (kutu içi)"))
    P.append(bar(PE_X, PE_W, pe_pins, pe_roles, "PE", "#f0fdf4", "#15803d", "#14532d", "#16a34a", "PE-BARA (kutu içi)"))
    P.append('</g>')

    def badge(cx, cy, text, bg, w=116.0):
        return (f'<g><rect x="{cx-w/2:.1f}" y="{cy-14:.1f}" width="{w:.1f}" height="28" rx="6" fill="{bg}" stroke="#ffffff" stroke-width="2.2"/>'
                f'<text x="{cx:.1f}" y="{cy+4.5:.1f}" text-anchor="middle" font-size="12.2" font-weight="800" fill="#ffffff">{text}</text></g>')

    P.append('<g id="badges" filter="url(#softShadow)">')
    P.append(badge(425, 620, "Q1 • MS116", "#0369a1", 90))
    P.append(badge(1000, 548, "R1 • CR-M4SS", "#6d28d9"))
    P.append(badge(TX_X + 2.5 * T_W, TX_Y - 22, "X1–X5 • 2,5 mm²", "#334155", 132))
    P.append(badge(KM1_X + KM_W / 2, 1270, "KM1 • M1 ↑", "#b45309"))
    P.append(badge(KM2_X + KM_W / 2, 1270, "KM2 • M1 ↓", "#b45309"))
    P.append('</g>')

    # ------------------------------------------------ 7. SAHA KABLOLARI & KARTLAR
    CARD_Y = 1860
    X_SUP, X_M1, X_SEC = 300, 830, 1370
    P.append('<g id="field-sheaths">')
    P.append(sheath_path([(C_SUP, C_Y), (C_SUP, 1665), (X_SUP, 1665), (X_SUP, 1745)], 15))
    P.append(sheath_path([(C_M1, C_Y), (C_M1, 1692), (X_M1, 1692), (X_M1, 1745)], 14))
    P.append(sheath_path([(C_SEC, C_Y), (C_SEC, 1665), (X_SEC, 1665), (X_SEC, 1745)], 14))
    for cx_col, lbl in [(C_SUP, "5×2,5"), (C_M1, "M1 • 7D"), (C_SEC, "5×1")]:
        P.append(f'<rect x="{cx_col-28:.1f}" y="{C_Y-10:.1f}" width="56" height="22" rx="6" fill="#0f172a" stroke="#475569" stroke-width="1.4"/>')
        P.append(f'<text x="{cx_col:.1f}" y="{C_Y+4.5:.1f}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#f8fafc">{lbl}</text>')
    P.append('</g>')

    def fan_cores(cx, y_top, y_bot, cores):
        n = len(cores)
        spread = min(380, (n - 1) * 52)
        start_x = cx - spread / 2
        step = spread / max(1, n - 1)
        out = [f'<rect x="{cx - 12}" y="{y_top - 6}" width="24" height="14" rx="4" fill="#0f172a"/>']
        for i, (lbl, col, stp) in enumerate(cores):
            tx_ = start_x + i * step
            out.append(wire_path([(cx, y_top + 6), (cx, y_top + 26), (tx_, y_top + 58), (tx_, y_bot)], col, 4.2, stripe=stp, radius=12))
            out.append(f'<rect x="{tx_ - 24:.1f}" y="{y_bot - 22:.1f}" width="48" height="20" rx="4" fill="#ffffff" stroke="{col}" stroke-width="1.6"/>')
            out.append(f'<text x="{tx_:.1f}" y="{y_bot - 8:.1f}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f172a">{lbl}</text>')
        return "\n".join(out)

    P.append('<g id="field-cores">')
    P.append(fan_cores(X_SUP, 1745, CARD_Y, [("L1", C_L1, None), ("L2", C_L2, None), ("L3", C_L3, None), ("N", C_N, None), ("PE", C_PE, C_PE_S)]))
    P.append(fan_cores(X_M1, 1745, CARD_Y, [("U", C_L1, None), ("V", C_L2, None), ("W", C_L3, None), ("PE", C_PE, C_PE_S), ("N", C_N, None), ("L↑", C_UP, None), ("L↓", C_DN, None)]))
    P.append(fan_cores(X_SEC, 1745, CARD_Y, [("D1/D3", C_DN, None), ("D2/D4", C_UP, None), ("D5", C_OTOMAN, None), ("izole", "#94a3b8", None), ("izole", "#94a3b8", None)]))
    P.append('</g>')

    P.append(f'''
  <g id="field-cards" filter="url(#cardShadow)">
    <rect x="{X_SUP - 205}" y="{CARD_Y}" width="410" height="295" rx="18" fill="#ffffff" stroke="#ef4444" stroke-width="2.2"/>
    <rect x="{X_SUP - 205}" y="{CARD_Y}" width="410" height="44" rx="18" fill="#fef2f2"/>
    <text x="{X_SUP}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#b91c1c">ANA BESLEME (1× 5×2,5 mm²)</text>
    <text x="{X_SUP}" y="{CARD_Y + 86}" text-anchor="middle" font-size="28" font-weight="900" fill="#0f172a">3~ 400V / 230V AC</text>
    <text x="{X_SUP}" y="{CARD_Y + 116}" text-anchor="middle" font-size="14" font-weight="700" fill="#475569">50 Hz • Üç Faz + Nötr + Toprak</text>
    <rect x="{X_SUP - 175}" y="{CARD_Y + 140}" width="350" height="128" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.4"/>
    <text x="{X_SUP - 155}" y="{CARD_Y + 168}" font-size="13" font-weight="700" fill="{C_L1}">• L1 (Kahve) → Q1:1L1</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 192}" font-size="13" font-weight="700" fill="{C_L2}">• L2 (Siyah)  → Q1:3L2</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 216}" font-size="13" font-weight="700" fill="{C_L3}">• L3 (Gri)    → Q1:5L3</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 240}" font-size="13" font-weight="700" fill="{C_N}">• N (Mavi)    → N-BARA (N2)</text>
    <text x="{X_SUP - 155}" y="{CARD_Y + 262}" font-size="13" font-weight="700" fill="{C_PE}">• PE (Sr-Yşl) → PE-BARA (PE1)</text>

    <rect x="{X_M1 - 225}" y="{CARD_Y}" width="450" height="295" rx="18" fill="#ffffff" stroke="#0284c7" stroke-width="2.2"/>
    <rect x="{X_M1 - 225}" y="{CARD_Y}" width="450" height="44" rx="18" fill="#f0f9ff"/>
    <text x="{X_M1}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#0369a1">REDÜKTÖR MOTOR (M1 • RSU50 + 7D)</text>
    {base.draw_rsu50_and_motor(X_M1 - 210, CARD_Y + 52, C_UP, C_DN, C_N)}
    <text x="{X_M1 + 4}" y="{CARD_Y + 76}" font-size="12.5" font-weight="800" fill="#0f172a">3 Faz Güç + RSU50 Limit:</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 104}" font-size="12" font-weight="700" fill="{C_L1}">1-U1 (Kahve) → KM1:2T1</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 128}" font-size="12" font-weight="700" fill="{C_L2}">2-V1 (Siyah)  → KM1:4T2</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 152}" font-size="12" font-weight="700" fill="{C_L3}">3-W1 (Gri)    → KM1:6T3</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 176}" font-size="12" font-weight="700" fill="{C_PE}">4-PE (Sr-Yşl) → PE-BARA (PE2)</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 200}" font-size="12" font-weight="700" fill="{C_N}">5-RSU4 (Mavi) → N-BARA (N3)</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 224}" font-size="12" font-weight="700" fill="{C_UP}">6-RSU3 (L↑)  → X1 (KM1:A2)</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 248}" font-size="12" font-weight="700" fill="{C_DN}">7-RSU9 (L↓)  → X2 (KM2:A2)</text>
    <text x="{X_M1 + 4}" y="{CARD_Y + 274}" font-size="10.8" font-weight="700" fill="#ea580c">RSU Köprü: 6–10 · 1–7 · 7–12</text>

    <rect x="{X_SEC - 220}" y="{CARD_Y}" width="440" height="295" rx="18" fill="#ffffff" stroke="#7c3aed" stroke-width="2.2"/>
    <rect x="{X_SEC - 220}" y="{CARD_Y}" width="440" height="44" rx="18" fill="#f5f3ff"/>
    <text x="{X_SEC}" y="{CARD_Y + 29}" text-anchor="middle" font-size="16" font-weight="800" fill="#6d28d9">SEKTÖR KUMANDA (1× 5×1 mm²)</text>
    <text x="{X_SEC}" y="{CARD_Y + 74}" text-anchor="middle" font-size="13.5" font-weight="700" fill="#475569">Otomasyon girişi (X3–X5)</text>
    <rect x="{X_SEC - 190}" y="{CARD_Y + 94}" width="380" height="164" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.4"/>
    <text x="{X_SEC - 170}" y="{CARD_Y + 124}" font-size="13" font-weight="700" fill="{C_DN}">• D1 / D3 (↓) → X4 → R1:32 (Aşağı)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 152}" font-size="13" font-weight="700" fill="{C_UP}">• D2 / D4 (↑) → X5 → R1:42 (Yukarı)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 180}" font-size="13" font-weight="700" fill="{C_OTOMAN}">• D5 (Oto/Man) → X3 → R1:A1 (bobin)</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 208}" font-size="13" font-weight="700" fill="#64748b">• Kullanılmayan çift → uçları izole et</text>
    <text x="{X_SEC - 170}" y="{CARD_Y + 240}" font-size="11.5" font-weight="600" fill="#64748b">* Doğu / batı çatıya göre D1-D2 ya da D3-D4 bağlanır.</text>
    <text x="{X_SEC}" y="{CARD_Y + 280}" text-anchor="middle" font-size="11.2" font-weight="800" fill="#dc2626">⚠ Q1 kapalıyken RSU50’de sektör fazı kalır — bakımda sektörü de kes</text>
  </g>
''')

    # ------------------------------------------------------------ 8. LEJANT
    legend = [
        ("L1 Faz", C_L1, None), ("L2 Faz", C_L2, None), ("L3 Faz", C_L3, None),
        ("Nötr (N)", C_N, None), ("Toprak (PE)", C_PE, C_PE_S),
        ("Kumanda fazı 230V", C_CTRL, None),
        ("↑ Yukarı (▲, oto ↑, kilit, limit ↑)", C_UP, None),
        ("↓ Aşağı (▼, oto ↓, kilit, limit ↓)", C_DN, None),
        ("Oto/Man bobini", C_OTOMAN, None),
    ]
    lx = 80.0
    leg = []
    for name, col, stp in legend:
        leg.append(f'<rect x="{lx:.0f}" y="2228" width="20" height="8" rx="4" fill="{col}"/>')
        if stp:
            leg.append(f'<line x1="{lx+2:.0f}" y1="2232" x2="{lx+18:.0f}" y2="2232" stroke="{stp}" stroke-width="5" stroke-dasharray="4 4"/>')
        leg.append(f'<text x="{lx + 26:.0f}" y="2236" font-size="11.5" font-weight="700" fill="#334155">{name}</text>')
        lx += 26 + len(name) * 6.4 + 22
    P.append(f'''
  <g id="footer">
    <rect x="60" y="2200" width="{W-120}" height="66" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    {"".join(leg)}
    <text x="{W-60}" y="2296" text-anchor="end" font-size="12" font-weight="800" fill="#0B2540"><tspan fill="#1F9D6B">O2Sera</tspan> • Tekli Motor Bağlantı Kılavuzu</text>
  </g>
</svg>''')
    return "\n".join(P)


if __name__ == "__main__":
    svg = build_svg()
    OUT_SVG.write_text(svg, encoding="utf-8")
    print(f"Wrote SVG: {OUT_SVG} ({len(svg)} bytes)")
