import type {
  AccessoryItem,
  EnclosureSpec,
  FieldCableSpec,
  GlandFillResult,
  LayoutAnalysis,
  PanelItem,
  ProjectMeta,
  RailSpec,
  TerminalStripRow,
  ThermalAnalysis,
  WireCutRow,
} from '../types/panel';
import { getWallOffsets, isRailMount } from './geometry';

function asciiSafe(text: string): string {
  return text
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
    .replace(/Ø/g, 'D')
    .replace(/²/g, '2')
    .replace(/×/g, 'x')
    .replace(/—|–/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function safeSlug(text: string): string {
  return asciiSafe(text)
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'Pano-Projesi';
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Tarayıcı içi katmanlı AutoCAD R12 DXF üreticisi (mm ölçekli).
 * Ön İç Görünüş + Sol/Sağ Yan Delme + Alt Duvar Rakor Delme + Proje Anteti.
 */
export function exportPanelToDxf(
  meta: ProjectMeta,
  enclosure: EnclosureSpec,
  rails: RailSpec[],
  analysis: LayoutAnalysis
) {
  const entities: string[] = [];
  const H = enclosure.outerHeightMm;
  const W = enclosure.outerWidthMm;
  const D = enclosure.outerDepthMm;
  const walls = getWallOffsets(enclosure);

  const addLine = (layer: string, x1: number, y1: number, x2: number, y2: number, color = 7) => {
    entities.push(
      `0\nLINE\n8\n${layer}\n62\n${color}\n10\n${x1.toFixed(2)}\n20\n${y1.toFixed(2)}\n30\n0.0\n11\n${x2.toFixed(2)}\n21\n${y2.toFixed(2)}\n31\n0.0`
    );
  };

  const addRect = (layer: string, x1: number, y1: number, x2: number, y2: number, color = 7) => {
    addLine(layer, x1, y1, x2, y1, color);
    addLine(layer, x2, y1, x2, y2, color);
    addLine(layer, x2, y2, x1, y2, color);
    addLine(layer, x1, y2, x1, y1, color);
  };

  const addCircle = (layer: string, cx: number, cy: number, r: number, color = 2) => {
    entities.push(
      `0\nCIRCLE\n8\n${layer}\n62\n${color}\n10\n${cx.toFixed(2)}\n20\n${cy.toFixed(2)}\n30\n0.0\n40\n${r.toFixed(2)}`
    );
  };

  const addText = (layer: string, x: number, y: number, height: number, text: string, color = 7) => {
    entities.push(
      `0\nTEXT\n8\n${layer}\n62\n${color}\n10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0.0\n40\n${height.toFixed(2)}\n1\n${asciiSafe(text)}`
    );
  };

  // DXF Y ekseni yukarı doğru olduğu için screen Y (üstten) -> H - y çevrimi
  const fy = (y: number) => H - y;

  // 1. ÖN İÇ GÖRÜNÜŞ (X: 0..W, Y: 0..H)
  addRect('PANO_DIS', 0, 0, W, H, 7);
  addRect('PANO_IC', walls.innerX1, fy(walls.innerY2), walls.innerX2, fy(walls.innerY1), 8);
  addText('ANTET', 0, H + 12, 8, `ON IC YERLESIM - ${enclosure.brand} ${enclosure.model} (${W}x${H}x${D} mm)`, 4);

  for (const rail of rails) {
    const rx1 = (W - rail.usableWidthMm) / 2;
    const rx2 = rx1 + rail.usableWidthMm;
    addRect('DIN_RAY', rx1, fy(rail.centerYMm + rail.railHeightMm / 2), rx2, fy(rail.centerYMm - rail.railHeightMm / 2), 8);
  }

  for (const p of analysis.placed) {
    const { item, box } = p;
    if (isRailMount(item.mount) || item.mount === 'backplate') {
      const col = item.category === 'mks' || item.category === 'breaker' ? 4 : item.category === 'contactor' ? 2 : item.category === 'duct' ? 8 : 3;
      addRect('ELEMANLAR', box.x1, fy(box.y2), box.x2, fy(box.y1), col);
      addText('ETIKETLER', box.x1 + 1.5, fy((box.y1 + box.y2) / 2) - 2, Math.min(5, Math.max(2.5, (box.x2 - box.x1) * 0.25)), item.code, 7);
    }
  }

  // 2. SAĞ YAN DELME ŞABLONU (X ofset: W + 80)
  const oxSide = W + 80;
  addRect('PANO_DIS', oxSide, 0, oxSide + D, H, 7);
  addLine('PANO_IC', oxSide + enclosure.baseDepthMm, 0, oxSide + enclosure.baseDepthMm, H, 2);
  addText('ANTET', oxSide, H + 12, 7, `YAN DUVAR DELME (${D}x${H} mm)`, 4);

  for (const p of analysis.placed.filter((pl) => pl.item.mount === 'left-wall' || pl.item.mount === 'right-wall')) {
    const cy = p.item.posYMm ?? 260;
    const cz = p.item.posZMm ?? 48;
    const rHole = (p.item.holeDiameterMm ?? 22) / 2;
    addCircle('DELME_SABLONU', oxSide + cz, fy(cy), rHole, 1);
    addLine('DELME_SABLONU', oxSide + cz - 6, fy(cy), oxSide + cz + 6, fy(cy), 2);
    addLine('DELME_SABLONU', oxSide + cz, fy(cy) - 6, oxSide + cz, fy(cy) + 6, 2);
    addText('ETIKETLER', oxSide + cz + rHole + 3, fy(cy), 4.5, `${p.item.code} D${p.item.holeDiameterMm ?? 22} Y=${cy} Z=${cz}`, 2);
  }

  // 3. ALT DUVAR RAKOR DELME ŞABLONU (Y ofset: -D - 60)
  const oyBot = -D - 60;
  addRect('PANO_DIS', 0, oyBot, W, oyBot + D, 7);
  addLine('PANO_IC', 0, oyBot + D - enclosure.baseDepthMm, W, oyBot + D - enclosure.baseDepthMm, 2);
  addText('ANTET', 0, oyBot + D + 8, 7, `ALT DUVAR RAKOR DELME (${W}x${D} mm)`, 4);

  for (const p of analysis.placed.filter((pl) => pl.item.mount === 'bottom-wall')) {
    const cx = p.item.posXMm ?? W / 2;
    const cz = p.item.posZMm ?? 48;
    const rHole = (p.item.holeDiameterMm ?? 37) / 2;
    const dy = oyBot + D - cz;
    addCircle('DELME_SABLONU', cx, dy, rHole, 1);
    addCircle('DELME_SABLONU', cx, dy, p.item.widthMm / 2, 4);
    addLine('DELME_SABLONU', cx - 8, dy, cx + 8, dy, 2);
    addLine('DELME_SABLONU', cx, dy - 8, cx, dy + 8, 2);
    addText('ETIKETLER', cx + rHole + 3, dy, 4.5, `${p.item.code} D${p.item.holeDiameterMm ?? 37} X=${cx} Z=${cz}`, 2);
  }

  // 4. ANTET KUTUSU
  const ax = oxSide;
  const ay = oyBot;
  addRect('ANTET', ax, ay, ax + 180, ay + 65, 7);
  addText('ANTET', ax + 6, ay + 52, 6, `PROJE: ${meta.name}`, 7);
  addText('ANTET', ax + 6, ay + 40, 4.5, `MUSTERI: ${meta.customer || '-'} | SAHA: ${meta.location || '-'}`, 7);
  addText('ANTET', ax + 6, ay + 28, 4.5, `PANO: ${enclosure.brand} ${enclosure.model} (${W}x${H}x${D} mm)`, 4);
  addText('ANTET', ax + 6, ay + 16, 4.5, `REV: ${meta.revision} | CIZEN: ${meta.author || '-'} | TARIH: ${meta.date}`, 7);
  addText('ANTET', ax + 6, ay + 6, 4, `OLCEK: 1:1 mm | ELEKTRIK PANO TASARIM`, 8);

  const dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities.join('\n')}\n0\nENDSEC\n0\nEOF\n`;
  triggerDownload(`${safeSlug(meta.name)}-${safeSlug(enclosure.model)}.dxf`, dxf, 'application/dxf');
}

function openPrintHtml(title: string, bodyHtml: string, extraCss = '') {
  const win = window.open('', '_blank', 'width=1100,height=820');
  if (!win) {
    alert('Açılır pencere (pop-up) engellendi. Lütfen bu site için pop-up izni verin.');
    return;
  }
  win.document.open();
  win.document.write(`<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 14mm; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #f8fafc; padding: 10px 16px; border-radius: 8px; margin-bottom: 14px; }
  .toolbar button { background: #0ea5e9; color: #0b1120; border: none; padding: 7px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; }
  h1 { font-size: 16pt; margin: 0 0 6px; }
  h2 { font-size: 12pt; margin: 14px 0 6px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; }
  .page-break { page-break-before: always; }
  .meta-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; border: 1.5px solid #0f172a; padding: 8px; margin-bottom: 12px; font-size: 8.5pt; }
  .meta-box div strong { display: block; font-size: 7.5pt; color: #475569; text-transform: uppercase; }
  @media print {
    body { padding: 0; }
    .toolbar { display: none !important; }
    @page { size: A4; margin: 10mm; }
  }
  ${extraCss}
</style>
</head>
<body>
  <div class="toolbar">
    <span><strong>${title}</strong> — Yazdırma ayarlarında ölçeği <strong>%100 (Gerçek Boyut)</strong> seçin.</span>
    <button onclick="window.print()">Yazdır / PDF Kaydet</button>
  </div>
  ${bodyHtml}
</body>
</html>`);
  win.document.close();
}

/**
 * 1:1 Gerçek Ölçekli A4 Delme Şablonu (Panç / Matkap için doğrudan kasa duvarına yapıştırılabilir)
 */
export function openDrillTemplatePrintWindow(
  meta: ProjectMeta,
  enclosure: EnclosureSpec,
  items: PanelItem[]
) {
  const bottomGlands = items.filter((i) => i.mount === 'bottom-wall');
  const leftButtons = items.filter((i) => i.mount === 'left-wall');
  const rightButtons = items.filter((i) => i.mount === 'right-wall');

  const W = enclosure.outerWidthMm;
  const D = enclosure.outerDepthMm;

  const bottomSvg = `
    <h2>1. Alt Duvar Rakor Delme Şablonu — 1:1 Gerçek Ölçek (${W} × ${D} mm)</h2>
    <p style="font-size:8.5pt;color:#475569;margin:0 0 6mm;">Çıktıyı <strong>%100 ölçekle</strong> yazdırıp aşağıdaki 50 mm kalibrasyon cetvelini gerçek cetvelle doğrulayın, ardından kasa alt duvarına bantlayıp merkez artılarından panç/matkap ile delin.</p>
    <svg width="${W}mm" height="${D}mm" viewBox="0 0 ${W} ${D}" xmlns="http://www.w3.org/2000/svg" style="border:0.3mm solid #0f172a;display:block;margin-bottom:6mm;">
      <rect x="0" y="0" width="${W}" height="${D}" fill="none" stroke="#0f172a" stroke-width="0.6" />
      <line x1="0" y1="${enclosure.baseDepthMm}" x2="${W}" y2="${enclosure.baseDepthMm}" stroke="#d97706" stroke-width="0.4" stroke-dasharray="3 2" />
      <text x="3" y="5" font-size="3.5" fill="#475569">ARKA DUVAR (Z=0) — ${enclosure.brand} ${enclosure.model}</text>
      <text x="3" y="${enclosure.baseDepthMm - 2}" font-size="3.2" fill="#b45309">Kapak Birleşimi Z=${enclosure.baseDepthMm} mm</text>
      ${bottomGlands
        .map((g) => {
          const cx = g.posXMm ?? W / 2;
          const cz = g.posZMm ?? 48;
          const rHole = (g.holeDiameterMm ?? 37) / 2;
          const rNut = g.widthMm / 2;
          return `
            <circle cx="${cx}" cy="${cz}" r="${rNut}" fill="none" stroke="#94a3b8" stroke-width="0.35" stroke-dasharray="2 2" />
            <circle cx="${cx}" cy="${cz}" r="${rHole}" fill="none" stroke="#dc2626" stroke-width="0.6" />
            <line x1="${cx - rHole - 4}" y1="${cz}" x2="${cx + rHole + 4}" y2="${cz}" stroke="#0f172a" stroke-width="0.3" />
            <line x1="${cx}" y1="${cz - rHole - 4}" x2="${cx}" y2="${cz + rHole + 4}" stroke="#0f172a" stroke-width="0.3" />
            <circle cx="${cx}" cy="${cz}" r="1" fill="#dc2626" />
            <text x="${cx}" y="${cz - rHole - 2}" text-anchor="middle" font-size="3.5" font-weight="700" fill="#0f172a">${g.code} Ø${g.holeDiameterMm ?? 37} mm (X=${cx}, Z=${cz})</text>
          `;
        })
        .join('')}
    </svg>
  `;

  const sideBlock = (title: string, list: PanelItem[]) => {
    if (list.length === 0) return '';
    // A4'e rahat sığsın diye sadece buton bölgesini kırpılmış veya tam şablon olarak çiz (max 250 mm yükseklik)
    const minY = Math.max(0, Math.min(...list.map((i) => (i.posYMm ?? 260) - 45)));
    const maxY = Math.min(enclosure.outerHeightMm, Math.max(...list.map((i) => (i.posYMm ?? 260) + 45)));
    const hBand = Math.max(90, maxY - minY);
    return `
      <h2>${title} — 1:1 Bölgesel Şablon (${D} × ${Math.round(hBand)} mm • Y=${Math.round(minY)}..${Math.round(maxY)} mm)</h2>
      <svg width="${D}mm" height="${hBand}mm" viewBox="0 ${minY} ${D} ${hBand}" xmlns="http://www.w3.org/2000/svg" style="border:0.3mm solid #0f172a;display:block;margin-bottom:6mm;">
        <rect x="0" y="${minY}" width="${D}" height="${hBand}" fill="none" stroke="#0f172a" stroke-width="0.5" />
        <line x1="${enclosure.baseDepthMm}" y1="${minY}" x2="${enclosure.baseDepthMm}" y2="${minY + hBand}" stroke="#d97706" stroke-width="0.4" stroke-dasharray="3 2" />
        <text x="3" y="${minY + 5}" font-size="3.2" fill="#475569">Üst Kenardan Referans Y=${Math.round(minY)} mm | Arka Z=0</text>
        ${list
          .map((b) => {
            const cy = b.posYMm ?? 260;
            const cz = b.posZMm ?? 48;
            const rHole = (b.holeDiameterMm ?? 22) / 2;
            return `
              <rect x="${cz - b.widthMm / 2}" y="${cy - b.heightMm / 2}" width="${b.widthMm}" height="${b.heightMm}" rx="2" fill="none" stroke="#64748b" stroke-width="0.35" stroke-dasharray="2 2" />
              <circle cx="${cz}" cy="${cy}" r="${rHole}" fill="none" stroke="#dc2626" stroke-width="0.6" />
              <line x1="${cz - rHole - 5}" y1="${cy}" x2="${cz + rHole + 5}" y2="${cy}" stroke="#0f172a" stroke-width="0.3" />
              <line x1="${cz}" y1="${cy - rHole - 5}" x2="${cz}" y2="${cy + rHole + 5}" stroke="#0f172a" stroke-width="0.3" />
              <circle cx="${cz}" cy="${cy}" r="1" fill="#dc2626" />
              <text x="${cz}" y="${cy - b.heightMm / 2 - 2}" text-anchor="middle" font-size="3.4" font-weight="700" fill="#0f172a">${b.code} Ø${b.holeDiameterMm ?? 22} (Y=${cy}, Z=${cz})</text>
            `;
          })
          .join('')}
      </svg>
    `;
  };

  const calibrationRuler = `
    <div style="margin:6mm 0;">
      <strong style="font-size:8.5pt;">Ölçek Doğrulama Cetveli (Gerçek Cetvelle Tam 50 mm Olmalıdır):</strong>
      <svg width="60mm" height="12mm" viewBox="0 0 60 12" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-top:2mm;">
        <line x1="5" y1="6" x2="55" y2="6" stroke="#0f172a" stroke-width="0.6" />
        ${[0, 10, 20, 30, 40, 50]
          .map(
            (mm) =>
              `<line x1="${5 + mm}" y1="2" x2="${5 + mm}" y2="7" stroke="#0f172a" stroke-width="0.4" /><text x="${5 + mm}" y="11" text-anchor="middle" font-size="3" fill="#0f172a">${mm}</text>`
          )
          .join('')}
      </svg>
    </div>
  `;

  openPrintHtml(
    `1:1 Delme Şablonu — ${meta.name}`,
    `${calibrationRuler}${bottomSvg}${sideBlock('2. Sol Yan Duvar Delme Şablonu', leftButtons)}${sideBlock('3. Sağ Yan Duvar Delme Şablonu', rightButtons)}`
  );
}

/**
 * 18 mm Modül Hizalı Pano Kapak / DIN Rayı Etiket Şeridi (Kesip yapıştırmak için 1:1 mm)
 */
export function openDoorLabelPrintWindow(
  meta: ProjectMeta,
  enclosure: EnclosureSpec,
  rails: RailSpec[],
  items: PanelItem[]
) {
  const strips = rails
    .map((rail, idx) => {
      const rItems = items
        .filter((i) => i.mount === rail.id)
        .sort((a, b) => a.order - b.order);
      if (rItems.length === 0) return '';
      const totalW = rItems.reduce((s, it) => s + it.widthMm, 0);
      let cx = 0;
      const cells = rItems
        .map((it) => {
          const x = cx;
          cx += it.widthMm;
          const isNarrow = it.widthMm < 12;
          return `
            <g>
              <rect x="${x}" y="0" width="${it.widthMm}" height="5" fill="${it.color}" />
              <rect x="${x}" y="0" width="${it.widthMm}" height="20" fill="none" stroke="#0f172a" stroke-width="0.35" />
              ${
                isNarrow
                  ? `<text x="${x + it.widthMm / 2}" y="12.5" text-anchor="middle" dominant-baseline="central" font-size="2.8" font-weight="700" transform="rotate(-90 ${x + it.widthMm / 2} 12.5)">${it.code}</text>`
                  : `<text x="${x + it.widthMm / 2}" y="10.5" text-anchor="middle" font-size="4.2" font-weight="700" fill="#0f172a">${it.code}</text>
                     <text x="${x + it.widthMm / 2}" y="15.2" text-anchor="middle" font-size="2.6" fill="#334155">${(it.rating ?? it.name).slice(0, 14)}</text>
                     <text x="${x + it.widthMm / 2}" y="18.6" text-anchor="middle" font-size="2.2" fill="#64748b">${it.name.slice(0, 16)}</text>`
              }
            </g>
          `;
        })
        .join('');

      return `
        <h2>Ray ${idx + 1}: ${rail.name} (${totalW.toFixed(1)} mm)</h2>
        <svg width="${totalW}mm" height="22mm" viewBox="0 0 ${totalW} 22" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-bottom:8mm;">
          ${cells}
        </svg>
      `;
    })
    .join('');

  const doorBadge = `
    <div style="border:1.5px solid #0f172a;padding:4mm;width:110mm;margin-bottom:8mm;">
      <div style="font-size:11pt;font-weight:800;">${meta.name}</div>
      <div style="font-size:8.5pt;color:#334155;margin-top:2px;">${meta.customer || 'Elektrik Kumanda Panosu'} ${meta.location ? '• ' + meta.location : ''}</div>
      <div style="font-size:8pt;color:#475569;margin-top:4px;">${enclosure.brand} ${enclosure.model} • ${meta.revision} • ${meta.date}</div>
    </div>
  `;

  openPrintHtml(
    `Pano Kapak & Ray Etiketleri — ${meta.name}`,
    `<h1>Pano Kapak & 1:1 DIN Rayı Şerit Etiketleri</h1><p style="font-size:8.5pt;color:#475569;">%100 ölçekte yazdırıp şeritleri keserek pano kapağına veya ray üstüne yapıştırabilirsiniz.</p>${doorBadge}${strips}`
  );
}

/**
 * Çok Sayfalı Tam Proje Teknik Dosyası (PDF Kaydet / Yazdır)
 */
export function openFullProjectPrintWindow(params: {
  meta: ProjectMeta;
  enclosure: EnclosureSpec;
  rails: RailSpec[];
  items: PanelItem[];
  analysis: LayoutAnalysis;
  thermal: ThermalAnalysis;
  glandFills: GlandFillResult[];
  fieldCables: FieldCableSpec[];
  accessories: AccessoryItem[];
  terminalRows: TerminalStripRow[];
  wireCutRows: WireCutRow[];
}) {
  const { meta, enclosure, items, analysis, thermal, glandFills, fieldCables, accessories, terminalRows, wireCutRows } = params;

  const bomMap = new Map<string, { qty: number; codes: string[]; model: string; dims: string; unitPrice: number }>();
  for (const it of items) {
    const dims = `${it.widthMm}×${it.heightMm}×${it.depthMm}`;
    const key = `${it.model}__${dims}`;
    const cur = bomMap.get(key);
    if (cur) {
      cur.qty += 1;
      cur.codes.push(it.code);
    } else {
      bomMap.set(key, { qty: 1, codes: [it.code], model: it.model, dims, unitPrice: it.unitPriceTry ?? 0 });
    }
  }

  let totalTry = 0;
  const bomHtmlRows = [
    ...Array.from(bomMap.values()).map((r) => {
      const sub = r.qty * r.unitPrice;
      totalTry += sub;
      return `<tr><td><strong>${r.qty}</strong></td><td>${r.codes.join(', ')}</td><td>${r.model}</td><td>${r.dims} mm</td><td>${r.unitPrice > 0 ? sub.toLocaleString('tr-TR') + ' ₺' : '—'}</td></tr>`;
    }),
    ...accessories.map((a) => {
      const sub = a.qty * (a.unitPriceTry ?? 0);
      totalTry += sub;
      return `<tr><td><strong>${a.qty}</strong></td><td>${a.code}</td><td>${a.model}</td><td>${a.location}</td><td>${sub > 0 ? sub.toLocaleString('tr-TR') + ' ₺' : '—'}</td></tr>`;
    }),
  ].join('');

  const body = `
    <h1>${meta.name} — Teknik Pano Dosyası</h1>
    <div class="meta-box">
      <div><strong>Müşteri / Saha</strong>${meta.customer || '—'} / ${meta.location || '—'}</div>
      <div><strong>Pano Gövdesi</strong>${enclosure.brand} ${enclosure.model} (${enclosure.outerWidthMm}×${enclosure.outerHeightMm}×${enclosure.outerDepthMm} mm)</div>
      <div><strong>Revizyon / Tarih</strong>${meta.revision} • ${meta.date}</div>
      <div><strong>Tasarlayan</strong>${meta.author || '—'}</div>
    </div>

    <h2>1. Mühendislik Özeti (Ray, Isıl & Rakor Doluluk)</h2>
    <table>
      <thead><tr><th>Kontrol Kalemi</th><th>Değer</th><th>Durum / Not</th></tr></thead>
      <tbody>
        ${analysis.rails
          .map(
            (r) =>
              `<tr><td>${r.railName}</td><td>${r.usedWidthMm} / ${r.usableWidthMm} mm (Kalan: ${r.remainingMm} mm)</td><td>${r.overflow ? 'TAŞMA VAR' : 'Uygun'} • ${r.itemCount} eleman</td></tr>`
          )
          .join('')}
        <tr>
          <td>IEC 60890 Isıl Hesap</td>
          <td>${thermal.totalPowerLossW} W • Ortam ${thermal.ambientTempC}°C → Pano İçi ~${thermal.estimatedInternalTempC}°C (ΔT: +${thermal.deltaTC}°C)</td>
          <td>${thermal.status === 'ok' ? 'Uygun' : thermal.status === 'warning' ? 'Sınıra Yakın' : 'AŞIRI ISINMA'} — ${thermal.recommendation}</td>
        </tr>
        ${glandFills
          .map(
            (g) =>
              `<tr><td>Rakor Doluluk (${g.glandCode})</td><td>${g.cableCount} kablo • %${g.fillPercent} doluluk (İç Ø${g.innerDiameterMm} mm)</td><td>${g.status === 'ok' ? 'Uygun' : g.suggestedGland ? 'Öneri: ' + g.suggestedGland : 'Kontrol edin'}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>

    <h2>2. Malzeme Listesi (BOM)</h2>
    <table>
      <thead><tr><th>Adet</th><th>Kodlar</th><th>Model / Açıklama</th><th>Ölçü / Konum</th><th>Tahmini Tutar</th></tr></thead>
      <tbody>
        <tr><td><strong>1</strong></td><td>PANO</td><td>${enclosure.brand} ${enclosure.model} (${enclosure.ipRating}, ${enclosure.material})</td><td>${enclosure.outerWidthMm}×${enclosure.outerHeightMm}×${enclosure.outerDepthMm} mm</td><td>—</td></tr>
        ${bomHtmlRows}
      </tbody>
      ${totalTry > 0 ? `<tfoot><tr><th colspan="4" style="text-align:right;">Tahmini Eleman Toplamı (Kutu Hariç)</th><th>${totalTry.toLocaleString('tr-TR')} ₺</th></tr></tfoot>` : ''}
    </table>

    ${
      fieldCables.length > 0
        ? `<h2>3. Dış Saha Kablo Listesi</h2>
           <table><thead><tr><th>Adet</th><th>Kablo Adı</th><th>Kesit</th><th>Dış Çap</th><th>Kılıf</th></tr></thead>
           <tbody>${fieldCables.map((c) => `<tr><td>${c.count}</td><td>${c.name}</td><td>${c.section}</td><td>Ø${c.outerDiameterMm} mm</td><td>${c.jacketColor}</td></tr>`).join('')}</tbody></table>`
        : ''
    }

    ${
      terminalRows.length > 0
        ? `<div class="page-break"></div>
           <h2>4. Klemens Bağlantı Planı (İç Pano ↔ Saha)</h2>
           <table>
             <thead><tr><th>Klemens</th><th>Ray</th><th>Kesit</th><th>Pano İçi Bağlantı</th><th>Saha / Dış Bağlantı</th><th>Köprü</th></tr></thead>
             <tbody>
               ${terminalRows
                 .map(
                   (t) =>
                     `<tr><td><strong>${t.code}</strong></td><td>${t.mountLabel}</td><td>${t.rating}</td><td>${t.internalConnections.map((c) => `[${c.wireNo}] ${c.target}`).join('<br/>') || '—'}</td><td>${t.fieldConnections.map((c) => `[${c.wireNo}] ${c.target}`).join('<br/>') || '—'}</td><td>${t.jumperToCodes.join(', ') || '—'}</td></tr>`
                 )
                 .join('')}
             </tbody>
           </table>`
        : ''
    }

    ${
      wireCutRows.length > 0
        ? `<h2>5. Kablo Kesim & Yüksük Etiket Listesi (${wireCutRows.length} Hat)</h2>
           <table>
             <thead><tr><th>No</th><th>Başlangıç</th><th>Bitiş</th><th>Kesit</th><th>Tahmini Boy</th><th>Yüksük (Baş → Son)</th></tr></thead>
             <tbody>
               ${wireCutRows
                 .map(
                   (w) =>
                     `<tr><td><strong>${w.wireNo}</strong></td><td>${w.fromText}</td><td>${w.toText}</td><td>${w.sectionMm2} mm²</td><td>${w.estimatedLengthCm} cm</td><td>${w.ferruleFrom} → ${w.ferruleTo}</td></tr>`
                 )
                 .join('')}
             </tbody>
           </table>`
        : ''
    }
  `;

  openPrintHtml(`Teknik Pano Dosyası — ${meta.name}`, body);
}
