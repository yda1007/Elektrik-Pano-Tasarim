import fs from 'node:fs';
import path from 'node:path';
import { BEMIS_BH6_6000, DEFAULT_RAILS, createInitialItems } from '../src/data/bemisPreset.ts';
import { analyzeLayout } from '../src/utils/geometry.ts';
import { buildTwoPageSchematics, classifyWirePage } from '../src/utils/twoPageSchematic.ts';
import type { PanelItem, RailSpec, SchematicWire } from '../src/types/panel.ts';

const WIRE_COLOR_NAMES: Record<string, string> = {
  '#ef4444': 'Kırmızı',
  '#b45309': 'Kahverengi',
  '#475569': 'Siyah',
  '#94a3b8': 'Gri',
  '#3b82f6': 'Mavi (N)',
  '#22c55e': 'Sarı-Yeşil (PE)',
  '#f97316': 'Turuncu',
  '#eab308': 'Sarı',
  '#10b981': 'Yeşil',
  '#f8fafc': 'Beyaz',
  '#1d4ed8': 'Koyu Mavi',
  '#a855f7': 'Mor',
  '#ec4899': 'Pembe',
  '#06b6d4': 'Turkuaz',
  '#be123c': 'Bordo',
  '#84cc16': 'Açık Yeşil',
  '#4f46e5': 'Lacivert',
  '#d6d3d1': 'Bej',
  '#f472b6': 'Açık Pembe',
  '#d97706': 'Hardal',
};

const NODE_LABELS: Record<string, string> = {
  'sys-supply': 'Besleme 5×2,5',
  'sys-neutral': 'Pano N Barası',
  'sys-pe': 'Pano PE Barası',
  'blk-top-terminals': 'Üst Klemens',
  'blk-bottom-terminals': 'Alt Klemens',
  q1: 'Q1 (MKŞ 1)',
  q2: 'Q2 (MKŞ 2)',
  r1: 'R1 (14P Röle)',
  km1: 'KM1 (M1↑)',
  km2: 'KM2 (M1↓)',
  km3: 'KM3 (M2↑)',
  km4: 'KM4 (M2↓)',
  s1: 'S1 (Sol Buton)',
  s2: 'S2 (Sağ Buton)',
  'sys-m1': 'Motor 1 (M1)',
  'sys-m2': 'Motor 2 (M2)',
  'sys-sector-1': 'Sektör Kumanda 1',
  'sys-sector-2': 'Sektör Kumanda 2',
};

const MOUNT_LABELS: Record<string, string> = {
  'top-rail': 'Üst DIN Rayı',
  'bottom-rail': 'Alt DIN Rayı',
  backplate: 'Pano İçi Yuva',
  'left-wall': 'Sol Yan Duvar',
  'right-wall': 'Sağ Yan Duvar',
  'bottom-wall': 'Alt Duvar',
  'top-wall': 'Üst Duvar',
};

const outDir = path.resolve('/home/yakup/Projeler/Elektrik-Pano-Tasarim/ciktilar');
const defaultProjectJson = path.join(outDir, 'Bemis-BH6-6000-0000-Proje.json');
const inputPath = process.argv[2] ?? defaultProjectJson;
fs.mkdirSync(outDir, { recursive: true });

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as {
  items?: PanelItem[];
  rails?: Record<'top-rail' | 'bottom-rail', RailSpec>;
  schematicWires?: SchematicWire[];
};

const items = Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : createInitialItems();
const rails = raw.rails?.['top-rail'] && raw.rails?.['bottom-rail'] ? raw.rails : DEFAULT_RAILS;
const wires = Array.isArray(raw.schematicWires) ? raw.schematicWires : [];

const analysis = analyzeLayout(items, BEMIS_BH6_6000, rails);
const { power, control } = buildTwoPageSchematics(wires);

// Gruplanmış Malzeme Listesi (BOM)
const bomMap = new Map<
  string,
  { adet: number; kodlar: string[]; model: string; konum: string; olcu: string; not: string }
>();

for (const item of items) {
  const olcu = `${item.widthMm}×${item.heightMm}×${item.depthMm} mm`;
  const key = `${item.model}__${item.mount}__${olcu}`;
  const ex = bomMap.get(key);
  if (ex) {
    ex.adet += 1;
    ex.kodlar.push(item.code);
  } else {
    bomMap.set(key, {
      adet: 1,
      kodlar: [item.code],
      model: item.model,
      konum: MOUNT_LABELS[item.mount] ?? item.mount,
      olcu,
      not: item.rating ?? '',
    });
  }
}

const bomRows = [
  {
    adet: 1,
    kodlar: ['PANO'],
    model: `${BEMIS_BH6_6000.brand} ${BEMIS_BH6_6000.model} — ${BEMIS_BH6_6000.series}`,
    konum: 'Ana Gövde',
    olcu: `${BEMIS_BH6_6000.outerWidthMm}×${BEMIS_BH6_6000.outerHeightMm}×${BEMIS_BH6_6000.outerDepthMm} mm`,
    not: `${BEMIS_BH6_6000.ipRating}, ${BEMIS_BH6_6000.material}`,
  },
  {
    adet: 1,
    kodlar: ['DIN-2'],
    model: '35 mm Ek DIN Rayı (Alt Ray, Tam Kesim)',
    konum: 'Alt DIN Rayı',
    olcu: `${rails['bottom-rail'].usableWidthMm}×35×7,5 mm`,
    not: 'EN 60715 Çelik Ray',
  },
  ...Array.from(bomMap.values()),
];

const fieldCables = [
  { adet: 1, tip: 'Ana Besleme Kablosu', kesit: '5×2,5 mm²', aciklama: 'L1, L2, L3, N, PE (3~ 400V/230V)' },
  { adet: 2, tip: 'Motor Bağlantı Kablosu (M1, M2)', kesit: '7 Damar', aciklama: 'Her motorda U, V, W, PE + C, L↑, L↓ limit' },
  { adet: 2, tip: 'Sektör Kumanda Kablosu (1 & 2)', kesit: '5×1 mm²', aciklama: 'Otomasyon sektör giriş / paralel çıkış (X6–X10)' },
];

const wireList = wires.map((w, idx) => ({
  no: w.label || String(idx + 1),
  index: idx + 1,
  page: classifyWirePage(w) === 'power' ? 'Güç' : 'Kumanda',
  colorHex: w.color,
  colorName: WIRE_COLOR_NAMES[w.color.toLowerCase()] ?? w.color,
  sectionMm2: w.sectionMm2,
  fromText: `${NODE_LABELS[w.fromNodeId] ?? w.fromNodeId} : ${w.fromPinId}`,
  toText: `${NODE_LABELS[w.toNodeId] ?? w.toNodeId} : ${w.toPinId}`,
}));

const payload = {
  generatedAt: '25.11.2026',
  enclosure: BEMIS_BH6_6000,
  rails,
  analysis: {
    placed: analysis.placed,
    topRail: analysis.topRail,
    bottomRail: analysis.bottomRail,
    interRailGapMm: analysis.interRailGapMm,
    sideButtonMiddleGapMm: analysis.sideButtonMiddleGapMm,
    issues: analysis.issues,
  },
  pages: { power, control },
  bomRows,
  fieldCables,
  wireList,
};

if (path.resolve(inputPath) !== path.resolve(defaultProjectJson)) {
  fs.copyFileSync(inputPath, defaultProjectJson);
}
fs.writeFileSync(path.join(outDir, '_export_payload.json'), JSON.stringify(payload, null, 2));
console.log(
  `Prepared payload: ${items.length} items, ${power.wires.length} power wires, ${control.wires.length} control wires`
);
