import { useEffect, useMemo, useRef, useState } from 'react';
import type { PanelItem, SchematicNodePos, SchematicPoint, SchematicWire } from '../types/panel';
import CleanSchematicView from './CleanSchematicView';
import {
  autoOptimizeSchematicLayout,
  autoRouteWiresWithMetrics,
  buildRoundedWirePath,
  computeDynamicSchematicBounds,
  computeNetJunctions,
  computeSmartWireLabels,
  extractVerticalSegments,
  getBestWireLabelPoint,
  type RouteMetrics,
} from '../utils/schematicRouter';
import { buildTwoPageSchematics } from '../utils/twoPageSchematic';

interface PinDef {
  id: string;
  label: string;
  subLabel?: string;
  subColor?: string;
  title: string;
  dx: number;
  dy: number;
  side: 'top' | 'bottom';
}

interface SchematicNode {
  id: string;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  accent: string;
  defaultX: number;
  defaultY: number;
  pins: PinDef[];
}

interface SchematicEditorProps {
  items: PanelItem[];
  nodePositions: Record<string, SchematicNodePos>;
  wires: SchematicWire[];
  externalFocusItemId?: string | null;
  onChangeNodePositions: (next: Record<string, SchematicNodePos>) => void;
  onChangeWires: (next: SchematicWire[]) => void;
  onExportJson: () => void;
  onSelectInPanel?: (itemId: string) => void;
}

interface StandardWireColor {
  name: string;
  short: string;
  hex: string;
  stripeHex?: string;
}

const STANDARD_WIRE_COLORS: StandardWireColor[] = [
  { name: 'Kırmızı (Kumanda)', short: 'KRM', hex: '#ef4444' },
  { name: 'Kahverengi (Faz L1)', short: 'KHV', hex: '#b45309' },
  { name: 'Siyah (Faz L2)', short: 'SYH', hex: '#475569' },
  { name: 'Gri (Faz L3)', short: 'GRI', hex: '#94a3b8' },
  { name: 'Mavi (Nötr N)', short: 'MVI', hex: '#3b82f6' },
  { name: 'Sarı-Yeşil (Toprak PE)', short: 'PE', hex: '#22c55e', stripeHex: '#facc15' },
  { name: 'Turuncu', short: 'TRN', hex: '#f97316' },
  { name: 'Sarı', short: 'SRI', hex: '#eab308' },
  { name: 'Yeşil', short: 'YSL', hex: '#10b981' },
  { name: 'Beyaz', short: 'BYZ', hex: '#f8fafc' },
  { name: 'Koyu Mavi (DC+)', short: 'KMV', hex: '#1d4ed8' },
  { name: 'Mor', short: 'MOR', hex: '#a855f7' },
  { name: 'Pembe', short: 'PMB', hex: '#ec4899' },
  { name: 'Turkuaz', short: 'TRK', hex: '#06b6d4' },
  { name: 'Bordo', short: 'BRD', hex: '#be123c' },
  { name: 'Açık Yeşil', short: 'AYŞ', hex: '#84cc16' },
  { name: 'Lacivert', short: 'LCV', hex: '#4f46e5' },
  { name: 'Krem / Bej', short: 'BEJ', hex: '#d6d3d1' },
  { name: 'Açık Pembe', short: 'APM', hex: '#f472b6' },
  { name: 'Hardal / Altın', short: 'HRD', hex: '#d97706' },
];

function getWireColorSpec(hex: string): StandardWireColor {
  return (
    STANDARD_WIRE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) ??
    STANDARD_WIRE_COLORS[0]
  );
}

const CANVAS_W = 1720;
const CANVAS_H = 1100;
const GRID = 10;

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

function shortNodeCode(node: SchematicNode): string {
  if (node.id === 'sys-supply') return 'BES';
  if (node.id === 'sys-neutral') return 'N';
  if (node.id === 'sys-pe') return 'PE';
  if (node.id === 'sys-m1') return 'M1';
  if (node.id === 'sys-m2') return 'M2';
  if (node.id === 'sys-sector-1') return 'SK1';
  if (node.id === 'sys-sector-2') return 'SK2';
  if (node.id === 'blk-top-terminals') return 'ÜST';
  if (node.id === 'blk-bottom-terminals') return 'ALT';
  return node.title.split(' ')[0];
}

function snap(val: number): number {
  return Math.round(val / GRID) * GRID;
}

function makeTopBottomPins(
  width: number,
  height: number,
  topPins: Array<{ id: string; label: string; subLabel?: string; subColor?: string; title: string }>,
  bottomPins: Array<{ id: string; label: string; subLabel?: string; subColor?: string; title: string }>
): PinDef[] {
  const result: PinDef[] = [];
  const placeRow = (
    list: Array<{ id: string; label: string; subLabel?: string; subColor?: string; title: string }>,
    side: 'top' | 'bottom'
  ) => {
    const step = width / (list.length + 1);
    list.forEach((p, idx) => {
      result.push({
        ...p,
        dx: Math.round(step * (idx + 1)),
        dy: side === 'top' ? 0 : height,
        side,
      });
    });
  };
  placeRow(topPins, 'top');
  placeRow(bottomPins, 'bottom');
  return result;
}

function buildSchematicNodes(items: PanelItem[]): SchematicNode[] {
  const nodes: SchematicNode[] = [];

  // 1. Sabit pano besleme (5×2,5 mm²) ve Bemis dahili N/PE baraları
  nodes.push({
    id: 'sys-supply',
    title: 'BESLEME (5×2,5 mm²)',
    subtitle: '3~ 400V / 230V Ana Giriş',
    width: 230,
    height: 66,
    accent: '#ef4444',
    defaultX: 40,
    defaultY: 28,
    pins: makeTopBottomPins(
      230,
      66,
      [],
      [
        { id: 'L1', label: 'L1', subLabel: 'Faz', subColor: '#d97706', title: 'Besleme 5×2,5 — Faz L1' },
        { id: 'L2', label: 'L2', subLabel: 'Faz', subColor: '#94a3b8', title: 'Besleme 5×2,5 — Faz L2' },
        { id: 'L3', label: 'L3', subLabel: 'Faz', subColor: '#e2e8f0', title: 'Besleme 5×2,5 — Faz L3' },
        { id: 'N', label: 'N', subLabel: 'Nötr', subColor: '#3b82f6', title: 'Besleme 5×2,5 — Nötr' },
        { id: 'PE', label: 'PE', subLabel: 'Toprak', subColor: '#22c55e', title: 'Besleme 5×2,5 — Toprak' },
      ]
    ),
  });

  nodes.push({
    id: 'sys-neutral',
    title: 'PANO NÖTR (N)',
    subtitle: 'Bemis Dahili Bara',
    width: 220,
    height: 60,
    accent: '#3b82f6',
    defaultX: 300,
    defaultY: 30,
    pins: makeTopBottomPins(
      220,
      60,
      [],
      [1, 2, 3, 4, 5, 6].map((n) => ({
        id: `N${n}`,
        label: `N${n}`,
        title: `Dahili Nötr Barası Uç ${n}`,
      }))
    ),
  });

  nodes.push({
    id: 'sys-pe',
    title: 'PANO TOPRAK (PE)',
    subtitle: 'Bemis Dahili Bara',
    width: 220,
    height: 60,
    accent: '#22c55e',
    defaultX: 550,
    defaultY: 30,
    pins: makeTopBottomPins(
      220,
      60,
      [],
      [1, 2, 3, 4, 5, 6].map((n) => ({
        id: `PE${n}`,
        label: `PE${n}`,
        title: `Dahili Toprak Barası Uç ${n}`,
      }))
    ),
  });

  // 2. MKŞ'ler (2. Satır — üstten ferah boşluk)
  const mksItems = items.filter((i) => i.category === 'mks').sort((a, b) => a.order - b.order);
  mksItems.forEach((item, idx) => {
    nodes.push({
      id: item.id,
      title: item.code,
      subtitle: item.rating ?? 'MKŞ 1–1,6A',
      width: 140,
      height: 80,
      accent: item.color,
      defaultX: 50 + idx * 190,
      defaultY: 200,
      pins: makeTopBottomPins(
        140,
        80,
        [
          { id: '1', label: '1/L1', title: `${item.code} Giriş 1/L1` },
          { id: '3', label: '3/L2', title: `${item.code} Giriş 3/L2` },
          { id: '5', label: '5/L3', title: `${item.code} Giriş 5/L3` },
        ],
        [
          { id: '2', label: '2/T1', title: `${item.code} Çıkış 2/T1` },
          { id: '4', label: '4/T2', title: `${item.code} Çıkış 4/T2` },
          { id: '6', label: '6/T3', title: `${item.code} Çıkış 6/T3` },
        ]
      ),
    });
  });

  // 3. 14 Pin Mini Röleler (Üst: 1–4 NC, 5–8 NO | Alt: 9–12 COM, 13–14 Bobin A1/A2)
  const relays = items.filter((i) => i.category === 'relay').sort((a, b) => a.order - b.order);
  relays.forEach((item, idx) => {
    nodes.push({
      id: item.id,
      title: item.code,
      subtitle: '14 Pin Mini Röle (4× NC / NO / COM + Bobin)',
      width: 360,
      height: 112,
      accent: item.color,
      defaultX: 470 + idx * 390,
      defaultY: 184,
      pins: makeTopBottomPins(
        360,
        112,
        [
          { id: '1', label: '1', subLabel: 'NC1', subColor: '#fbbf24', title: '1: Normalde Kapalı (NC1 ↔ COM 9)' },
          { id: '2', label: '2', subLabel: 'NC2', subColor: '#fbbf24', title: '2: Normalde Kapalı (NC2 ↔ COM 10)' },
          { id: '3', label: '3', subLabel: 'NC3', subColor: '#fbbf24', title: '3: Normalde Kapalı (NC3 ↔ COM 11)' },
          { id: '4', label: '4', subLabel: 'NC4', subColor: '#fbbf24', title: '4: Normalde Kapalı (NC4 ↔ COM 12)' },
          { id: '5', label: '5', subLabel: 'NO1', subColor: '#34d399', title: '5: Normalde Açık (NO1 ↔ COM 9)' },
          { id: '6', label: '6', subLabel: 'NO2', subColor: '#34d399', title: '6: Normalde Açık (NO2 ↔ COM 10)' },
          { id: '7', label: '7', subLabel: 'NO3', subColor: '#34d399', title: '7: Normalde Açık (NO3 ↔ COM 11)' },
          { id: '8', label: '8', subLabel: 'NO4', subColor: '#34d399', title: '8: Normalde Açık (NO4 ↔ COM 12)' },
        ],
        [
          { id: '9', label: '9', subLabel: 'C1', subColor: '#38bdf8', title: '9: Ortak Uç (COM 1 → 1 NC / 5 NO)' },
          { id: '10', label: '10', subLabel: 'C2', subColor: '#38bdf8', title: '10: Ortak Uç (COM 2 → 2 NC / 6 NO)' },
          { id: '11', label: '11', subLabel: 'C3', subColor: '#38bdf8', title: '11: Ortak Uç (COM 3 → 3 NC / 7 NO)' },
          { id: '12', label: '12', subLabel: 'C4', subColor: '#38bdf8', title: '12: Ortak Uç (COM 4 → 4 NC / 8 NO)' },
          { id: '13', label: '13', subLabel: 'A1', subColor: '#f87171', title: '13: Röle Bobini A1' },
          { id: '14', label: '14', subLabel: 'A2', subColor: '#60a5fa', title: '14: Röle Bobini A2' },
        ]
      ),
    });
  });

  // 4. Mini Kontaktörler (3P + 1NC: 1-2, 3-4, 5-6, 21-22 NC, A1-A2)
  const contactors = items
    .filter((i) => i.category === 'contactor')
    .sort((a, b) => a.order - b.order);
  contactors.forEach((item, idx) => {
    nodes.push({
      id: item.id,
      title: item.code,
      subtitle: `${item.rating ?? 'Mini Kontaktör'} • 3P+1NC`,
      width: 204,
      height: 98,
      accent: item.color,
      defaultX: 40 + idx * 230,
      defaultY: 430,
      pins: makeTopBottomPins(
        204,
        98,
        [
          { id: '1', label: '1', subLabel: 'L1', title: `${item.code} Güç 1/L1` },
          { id: '3', label: '3', subLabel: 'L2', title: `${item.code} Güç 3/L2` },
          { id: '5', label: '5', subLabel: 'L3', title: `${item.code} Güç 5/L3` },
          { id: '21', label: '21', subLabel: 'NC', subColor: '#fbbf24', title: `${item.code} Yardımcı NC 21 (Kilitleme)` },
          { id: 'A1', label: 'A1', subLabel: 'Bobin', subColor: '#f87171', title: `${item.code} Bobin A1` },
        ],
        [
          { id: '2', label: '2', subLabel: 'T1', title: `${item.code} Güç 2/T1` },
          { id: '4', label: '4', subLabel: 'T2', title: `${item.code} Güç 4/T2` },
          { id: '6', label: '6', subLabel: 'T3', title: `${item.code} Güç 6/T3` },
          { id: '22', label: '22', subLabel: 'NC', subColor: '#fbbf24', title: `${item.code} Yardımcı NC 22 (Kilitleme)` },
          { id: 'A2', label: 'A2', subLabel: 'Bobin', subColor: '#60a5fa', title: `${item.code} Bobin A2` },
        ]
      ),
    });
  });

  // 5. İkiz Butonlar (Mutlusan SW-BL4252)
  const buttons = items.filter((i) => i.category === 'button');
  buttons.forEach((item, idx) => {
    nodes.push({
      id: item.id,
      title: `${item.code} (${item.mount === 'left-wall' ? 'Sol' : 'Sağ'})`,
      subtitle: 'SW-BL4252 1NO+1NO',
      width: 170,
      height: 84,
      accent: item.color,
      defaultX: 1020 + idx * 220,
      defaultY: 436,
      pins: makeTopBottomPins(
        170,
        84,
        [
          { id: '13', label: '▲13', title: `${item.code} Yukarı 1NO Giriş (13)` },
          { id: '23', label: '▼23', title: `${item.code} Aşağı 1NO Giriş (23)` },
        ],
        [
          { id: '14', label: '▲14', title: `${item.code} Yukarı 1NO Çıkış (14)` },
          { id: '24', label: '▼24', title: `${item.code} Aşağı 1NO Çıkış (24)` },
        ]
      ),
    });
  });

  // 6. Üst Ray Klemens Bloğu (X1..X3)
  const topTerminals = items
    .filter((i) => i.category === 'terminal' && i.mount === 'top-rail')
    .sort((a, b) => a.order - b.order);
  if (topTerminals.length > 0) {
    const w = Math.max(170, topTerminals.length * 52);
    nodes.push({
      id: 'blk-top-terminals',
      title: `ÜST KLEMENS (${topTerminals.length} Adet)`,
      subtitle: topTerminals[0]?.rating ? `Üst Ray • ${topTerminals[0].rating}` : 'Üst DIN Rayı',
      width: w,
      height: 68,
      accent: '#64748b',
      defaultX: 840,
      defaultY: 30,
      pins: makeTopBottomPins(
        w,
        68,
        topTerminals.map((t) => ({ id: `${t.code}a`, label: t.code, title: `${t.code} Üst Uç` })),
        topTerminals.map((t) => ({ id: `${t.code}b`, label: t.code, title: `${t.code} Alt Uç` }))
      ),
    });
  }

  // 7. Alt Ray (ve 3./4. Ray) Klemens Bloğu
  const bottomTerminals = items
    .filter((i) => i.category === 'terminal' && i.mount !== 'top-rail')
    .sort((a, b) => (a.mount !== b.mount ? a.mount.localeCompare(b.mount) : a.order - b.order));
  if (bottomTerminals.length > 0) {
    const w = Math.max(260, bottomTerminals.length * 50);
    nodes.push({
      id: 'blk-bottom-terminals',
      title: `ALT KLEMENS (${bottomTerminals.length} Adet)`,
      subtitle: 'Saha / Çıkış Klemens Sırası',
      width: w,
      height: 70,
      accent: '#64748b',
      defaultX: 40,
      defaultY: 660,
      pins: makeTopBottomPins(
        w,
        70,
        bottomTerminals.map((t) => ({ id: `${t.code}a`, label: t.code, title: `${t.code} Pano İçi Uç` })),
        bottomTerminals.map((t) => ({ id: `${t.code}b`, label: t.code, title: `${t.code} Saha Çıkış Ucu` }))
      ),
    });
  }

  // 8. Diğer özel elemanlar (sigorta, güç kaynağı, PLC/ESP32 vb.)
  const others = items.filter(
    (i) => i.category === 'breaker' || i.category === 'psu' || i.category === 'plc'
  );
  others.forEach((item, idx) => {
    if (item.category === 'plc') {
      nodes.push({
        id: item.id,
        title: item.code,
        subtitle: item.name,
        width: 240,
        height: 92,
        accent: item.color,
        defaultX: 1060 + idx * 260,
        defaultY: 28,
        pins: makeTopBottomPins(
          240,
          92,
          [
            { id: '24V', label: '+24V', subColor: '#ef4444', title: `${item.code} 24V DC +` },
            { id: 'GND', label: 'GND', subColor: '#3b82f6', title: `${item.code} GND` },
            { id: 'A+', label: 'A+', subColor: '#f59e0b', title: `${item.code} RS485 A+` },
            { id: 'B-', label: 'B-', subColor: '#22c55e', title: `${item.code} RS485 B-` },
          ],
          [
            { id: 'DO1', label: 'DO1', title: `${item.code} Röle Çıkış 1` },
            { id: 'DO2', label: 'DO2', title: `${item.code} Röle Çıkış 2` },
            { id: 'DO3', label: 'DO3', title: `${item.code} Röle Çıkış 3` },
            { id: 'DO4', label: 'DO4', title: `${item.code} Röle Çıkış 4` },
            { id: 'DI1', label: 'DI1', title: `${item.code} Dijital Giriş 1` },
            { id: 'DI2', label: 'DI2', title: `${item.code} Dijital Giriş 2` },
          ]
        ),
      });
      return;
    }

    const is3P = item.widthMm >= 50 && item.category === 'breaker';
    nodes.push({
      id: item.id,
      title: item.code,
      subtitle: item.name,
      width: is3P ? 160 : 130,
      height: 72,
      accent: item.color,
      defaultX: 1080 + idx * 165,
      defaultY: 30,
      pins: makeTopBottomPins(
        is3P ? 160 : 130,
        72,
        is3P
          ? [
              { id: '1', label: '1/L1', title: `${item.code} Giriş L1` },
              { id: '3', label: '3/L2', title: `${item.code} Giriş L2` },
              { id: '5', label: '5/L3', title: `${item.code} Giriş L3` },
            ]
          : [
              { id: 'IN1', label: 'L/1', title: `${item.code} Giriş 1` },
              { id: 'IN2', label: 'N/3', title: `${item.code} Giriş 2` },
            ],
        is3P
          ? [
              { id: '2', label: '2/T1', title: `${item.code} Çıkış T1` },
              { id: '4', label: '4/T2', title: `${item.code} Çıkış T2` },
              { id: '6', label: '6/T3', title: `${item.code} Çıkış T3` },
            ]
          : [
              { id: 'OUT1', label: '+/2', title: `${item.code} Çıkış 1` },
              { id: 'OUT2', label: '-/4', title: `${item.code} Çıkış 2` },
            ]
      ),
    });
  });

  // 9. Saha Motorları (2× Motor — Her birinden 7 kablo: U, V, W, PE + 3 limit/switch damarı)
  ['M1', 'M2'].forEach((mCode, idx) => {
    nodes.push({
      id: `sys-${mCode.toLowerCase()}`,
      title: `MOTOR ${idx + 1} (${mCode} • 7 Damar)`,
      subtitle: '3 Faz + PE + Limit / Sinyal (PG36)',
      width: 320,
      height: 76,
      accent: '#06b6d4',
      defaultX: 40 + idx * 360,
      defaultY: 890,
      pins: makeTopBottomPins(
        320,
        76,
        [
          { id: '1', label: '1', subLabel: 'U', subColor: '#d97706', title: `${mCode} Damar 1 — Faz U` },
          { id: '2', label: '2', subLabel: 'V', subColor: '#94a3b8', title: `${mCode} Damar 2 — Faz V` },
          { id: '3', label: '3', subLabel: 'W', subColor: '#e2e8f0', title: `${mCode} Damar 3 — Faz W` },
          { id: '4', label: '4', subLabel: 'PE', subColor: '#22c55e', title: `${mCode} Damar 4 — Toprak (PE)` },
          { id: '5', label: '5', subLabel: 'C', subColor: '#38bdf8', title: `${mCode} Damar 5 — Limit Ortak (COM)` },
          { id: '6', label: '6', subLabel: 'L↑', subColor: '#fbbf24', title: `${mCode} Damar 6 — Yukarı Limit / Termik` },
          { id: '7', label: '7', subLabel: 'L↓', subColor: '#fbbf24', title: `${mCode} Damar 7 — Aşağı Limit / Termik` },
        ],
        []
      ),
    });
  });

  // 10. 2 Adet 5×1 mm² Sektör Kumanda Kablosu
  [1, 2].forEach((secNo, idx) => {
    nodes.push({
      id: `sys-sector-${secNo}`,
      title: `SEKTÖR KUMANDA ${secNo} (5×1 mm²)`,
      subtitle: `5×1 mm² Sektör Kumanda Kablosu ${secNo}`,
      width: 270,
      height: 76,
      accent: '#ec4899',
      defaultX: 790 + idx * 310,
      defaultY: 890,
      pins: makeTopBottomPins(
        270,
        76,
        [
          { id: '1', label: '1', subLabel: 'D1', subColor: '#f472b6', title: `Sektör Kumanda ${secNo} (5×1) — Damar 1` },
          { id: '2', label: '2', subLabel: 'D2', subColor: '#f472b6', title: `Sektör Kumanda ${secNo} (5×1) — Damar 2` },
          { id: '3', label: '3', subLabel: 'D3', subColor: '#f472b6', title: `Sektör Kumanda ${secNo} (5×1) — Damar 3` },
          { id: '4', label: '4', subLabel: 'D4', subColor: '#f472b6', title: `Sektör Kumanda ${secNo} (5×1) — Damar 4` },
          { id: '5', label: '5', subLabel: 'D5', subColor: '#f472b6', title: `Sektör Kumanda ${secNo} (5×1) — Damar 5` },
        ],
        []
      ),
    });
  });

  return nodes;
}

export default function SchematicEditor({
  items,
  nodePositions,
  wires,
  externalFocusItemId,
  onChangeNodePositions,
  onChangeWires,
  onExportJson,
  onSelectInPanel,
}: SchematicEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tool, setTool] = useState<'wire' | 'move'>('wire');
  const [orthoMode, setOrthoMode] = useState(true);
  const [wireColor, setWireColor] = useState(STANDARD_WIRE_COLORS[0].hex);
  const [wireSection, setWireSection] = useState('1,0');
  const [wireLabel, setWireLabel] = useState('');
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<
    'power-page' | 'control-page' | 'cards' | 'lines' | 'tags'
  >('power-page');
  const wireFilter: 'all' | 'power' | 'control' = 'all';
  const [showWireLabels, setShowWireLabels] = useState(true);
  const dimOthersOnSelect = true;
  const [mergeSameNet, setMergeSameNet] = useState(true);
  const [autoRerouteOnDrag, setAutoRerouteOnDrag] = useState(false);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [preOptimizeBackup, setPreOptimizeBackup] = useState<{
    nodePositions: Record<string, SchematicNodePos>;
    wires: SchematicWire[];
  } | null>(null);

  const [draft, setDraft] = useState<{
    fromNodeId: string;
    fromPinId: string;
    waypoints: SchematicPoint[];
  } | null>(null);
  const [cursorPt, setCursorPt] = useState<SchematicPoint | null>(null);

  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [draggingWaypoint, setDraggingWaypoint] = useState<{
    wireId: string;
    index: number;
  } | null>(null);

  const rawNodes = useMemo(() => buildSchematicNodes(items), [items]);
  const [smartFlipPins, setSmartFlipPins] = useState(true);

  // Tek taraflı sistem bloklarında (Besleme, N, PE, Motor, Sektör) pinleri parça konumunu
  // HİÇ değiştirmeden bağlı olduğu elemanlara bakan kenara otomatik çevir (alt dönüşleri yok eder)
  const nodes = useMemo(() => {
    if (!smartFlipPins || wires.length === 0) return rawNodes;
    const singleSidedIds = new Set([
      'sys-supply',
      'sys-neutral',
      'sys-pe',
      'sys-m1',
      'sys-m2',
      'sys-sector-1',
      'sys-sector-2',
    ]);
    const posOf = (n: SchematicNode) => nodePositions[n.id] ?? { x: n.defaultX, y: n.defaultY };
    const rawMap = new Map(rawNodes.map((n) => [n.id, n]));

    return rawNodes.map((node) => {
      if (!singleSidedIds.has(node.id) || node.pins.length === 0) return node;
      const myPos = posOf(node);
      const myCenterY = myPos.y + node.height / 2;
      let sumOtherY = 0;
      let count = 0;
      for (const w of wires) {
        const otherId =
          w.fromNodeId === node.id ? w.toNodeId : w.toNodeId === node.id ? w.fromNodeId : null;
        if (!otherId || otherId === node.id) continue;
        const other = rawMap.get(otherId);
        if (!other) continue;
        const oPos = posOf(other);
        sumOtherY += oPos.y + other.height / 2;
        count += 1;
      }
      if (count === 0) return node;
      const desiredSide: 'top' | 'bottom' = sumOtherY / count < myCenterY ? 'top' : 'bottom';
      if (node.pins[0].side === desiredSide) return node;
      return {
        ...node,
        pins: node.pins.map((pin) => ({
          ...pin,
          side: desiredSide,
          dy: desiredSide === 'top' ? 0 : node.height,
        })),
      };
    });
  }, [rawNodes, nodePositions, wires, smartFlipPins]);

  const dynamicBounds = useMemo(
    () => computeDynamicSchematicBounds(nodes, nodePositions, wires, CANVAS_W, CANVAS_H),
    [nodes, nodePositions, wires]
  );

  // Pano CAD görünümünden "Şema" butonuna basıldığında ilgili bloğa odaklan
  useEffect(() => {
    if (!externalFocusItemId) return;
    const direct = nodes.find((n) => n.id === externalFocusItemId);
    if (direct) {
      setFocusedNodeId(direct.id);
      setDisplayMode('lines');
      return;
    }
    const item = items.find((i) => i.id === externalFocusItemId);
    if (item?.category === 'terminal') {
      const targetBlk = item.mount === 'top-rail' ? 'blk-top-terminals' : 'blk-bottom-terminals';
      if (nodes.some((n) => n.id === targetBlk)) {
        setFocusedNodeId(targetBlk);
        setDisplayMode('lines');
      }
    }
  }, [externalFocusItemId, nodes, items]);

  const getNodePos = (node: SchematicNode): SchematicNodePos =>
    nodePositions[node.id] ?? { x: node.defaultX, y: node.defaultY };

  const getPinAbsPos = (nodeId: string, pinId: string): SchematicPoint | null => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    const pin = node.pins.find((p) => p.id === pinId);
    if (!pin) return null;
    const pos = getNodePos(node);
    return { x: pos.x + pin.dx, y: pos.y + pin.dy };
  };

  // Klavye kısayolları: ESC çizimi iptal eder, Delete seçili kabloyu siler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraft(null);
        setSelectedWireId(null);
        setFocusedNodeId(null);
      } else if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedWireId &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        onChangeWires(wires.filter((w) => w.id !== selectedWireId));
        setSelectedWireId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedWireId, wires, onChangeWires]);

  const handleOptimizeAll = () => {
    if (wires.length === 0) return;
    setPreOptimizeBackup({ nodePositions, wires });
    const result = autoOptimizeSchematicLayout(nodes, wires, CANVAS_W, CANVAS_H, mergeSameNet);
    onChangeNodePositions(result.nodePositions);
    onChangeWires(result.wires);
    setRouteMetrics(result.metrics);
    setZoom('fit');
  };

  const handleAutoRoute = (
    overridePositions?: Record<string, SchematicNodePos>,
    overrideWires?: SchematicWire[]
  ) => {
    const targetWires = overrideWires ?? wires;
    const targetPos = overridePositions ?? nodePositions;
    if (targetWires.length === 0) return;
    setPreOptimizeBackup({ nodePositions, wires });
    const res = autoRouteWiresWithMetrics(
      targetWires,
      nodes,
      targetPos,
      CANVAS_W,
      CANVAS_H,
      mergeSameNet
    );
    onChangeWires(res.wires);
    setRouteMetrics(res.metrics);
  };

  const handleRenumberWires = () => {
    if (wires.length === 0) return;
    onChangeWires(
      wires.map((w, idx) => ({
        ...w,
        label: String(idx + 1),
      }))
    );
  };

  const handleUndoOptimize = () => {
    if (!preOptimizeBackup) return;
    onChangeNodePositions(preOptimizeBackup.nodePositions);
    onChangeWires(preOptimizeBackup.wires);
    setPreOptimizeBackup(null);
  };

  // 2 Sayfalık Temiz EPLAN Şeması (Sayfa 1: Güç | Sayfa 2: Kumanda) — mevcut kablolarınızdan canlı üretilir
  const twoPages = useMemo(() => buildTwoPageSchematics(wires), [wires]);

  const isWireVisibleByFilter = (w: SchematicWire): boolean => {
    if (wireFilter === 'all') return true;
    const isPower = w.sectionMm2 === '2,5';
    return wireFilter === 'power' ? isPower : !isPower;
  };

  // Numaralı bayrak (yüksük) görünümü için her pindeki bağlantıları grupla
  const pinAttachments = useMemo(() => {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const map = new Map<
      string,
      Array<{
        wire: SchematicWire;
        num: number;
        badgeNumText: string;
        partnerShort: string;
      }>
    >();

    const addEntry = (
      nodeId: string,
      pinId: string,
      wire: SchematicWire,
      num: number,
      otherNodeId: string,
      otherPinId: string
    ) => {
      const otherNode = nodeById.get(otherNodeId);
      const otherPin = otherNode?.pins.find((p) => p.id === otherPinId);
      const partnerShort = `${otherNode ? shortNodeCode(otherNode) : otherNodeId}:${otherPin?.label ?? otherPinId}`;
      const badgeNumText = wire.label && !/^K\d+$/.test(wire.label) ? wire.label : String(num);
      const key = `${nodeId}::${pinId}`;
      const list = map.get(key) ?? [];
      list.push({ wire, num, badgeNumText, partnerShort });
      map.set(key, list);
    };

    wires.forEach((w, idx) => {
      if (!isWireVisibleByFilter(w)) return;
      const num = idx + 1;
      addEntry(w.fromNodeId, w.fromPinId, w, num, w.toNodeId, w.toPinId);
      addEntry(w.toNodeId, w.toPinId, w, num, w.fromNodeId, w.fromPinId);
    });

    return map;
  }, [wires, nodes, wireFilter]);

  const toSvgCoords = (clientX: number, clientY: number): SchematicPoint | null => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return {
      x: snap(Math.max(dynamicBounds.minX + 20, Math.min(dynamicBounds.maxX - 20, local.x))),
      y: snap(Math.max(dynamicBounds.minY + 20, Math.min(dynamicBounds.maxY - 20, local.y))),
    };
  };

  const snapOrtho = (prev: SchematicPoint, next: SchematicPoint): SchematicPoint => {
    if (!orthoMode) return next;
    const dx = Math.abs(next.x - prev.x);
    const dy = Math.abs(next.y - prev.y);
    return dx >= dy ? { x: next.x, y: prev.y } : { x: prev.x, y: next.y };
  };

  const handlePinClick = (e: React.MouseEvent, nodeId: string, pinId: string) => {
    e.stopPropagation();
    if (tool !== 'wire') return;

    if (!draft) {
      setSelectedWireId(null);
      setDraft({ fromNodeId: nodeId, fromPinId: pinId, waypoints: [] });
      return;
    }

    // Aynı pine tekrar tıklanırsa çizimi iptal et
    if (draft.fromNodeId === nodeId && draft.fromPinId === pinId) {
      setDraft(null);
      return;
    }

    const startPt = getPinAbsPos(draft.fromNodeId, draft.fromPinId);
    const endPt = getPinAbsPos(nodeId, pinId);
    let finalWaypoints = [...draft.waypoints];

    // Ara nokta konmadıysa ve 90° dik açı açıksa temiz Z-bükümü oluştur
    if (orthoMode && finalWaypoints.length === 0 && startPt && endPt && startPt.x !== endPt.x) {
      const midY = snap((startPt.y + endPt.y) / 2);
      finalWaypoints = [
        { x: startPt.x, y: midY },
        { x: endPt.x, y: midY },
      ];
    } else if (orthoMode && finalWaypoints.length > 0 && endPt) {
      const last = finalWaypoints[finalWaypoints.length - 1];
      if (last.x !== endPt.x && last.y !== endPt.y) {
        finalWaypoints.push({ x: endPt.x, y: last.y });
      }
    }

    const nextWire: SchematicWire = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromNodeId: draft.fromNodeId,
      fromPinId: draft.fromPinId,
      toNodeId: nodeId,
      toPinId: pinId,
      waypoints: finalWaypoints,
      color: wireColor,
      sectionMm2: wireSection,
      label: wireLabel.trim() || `K${wires.length + 1}`,
    };

    // Yeni çizilen kabloyu diğer kabloları bozmadan doğrudan ekle
    onChangeWires([...wires, nextWire]);
    setDraft(null);
    setSelectedWireId(nextWire.id);
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draft && tool === 'wire') {
      const pt = toSvgCoords(e.clientX, e.clientY);
      if (!pt) return;
      const startPt = getPinAbsPos(draft.fromNodeId, draft.fromPinId);
      const prev =
        draft.waypoints.length > 0
          ? draft.waypoints[draft.waypoints.length - 1]
          : startPt ?? pt;
      const next = snapOrtho(prev, pt);
      setDraft({ ...draft, waypoints: [...draft.waypoints, next] });
    } else {
      setSelectedWireId(null);
      setFocusedNodeId(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = toSvgCoords(e.clientX, e.clientY);
    if (!pt) return;

    if (draggingWaypoint) {
      onChangeWires(
        wires.map((w) => {
          if (w.id !== draggingWaypoint.wireId) return w;
          const nextPts = w.waypoints.map((wp, idx) =>
            idx === draggingWaypoint.index ? pt : wp
          );
          return { ...w, waypoints: nextPts };
        })
      );
      return;
    }

    if (draggingNode) {
      const nextX = snap(Math.max(10, Math.min(CANVAS_W - 140, pt.x - draggingNode.offsetX)));
      const nextY = snap(Math.max(10, Math.min(CANVAS_H - 70, pt.y - draggingNode.offsetY)));
      onChangeNodePositions({
        ...nodePositions,
        [draggingNode.id]: { x: nextX, y: nextY },
      });
      return;
    }

    if (draft) {
      const startPt = getPinAbsPos(draft.fromNodeId, draft.fromPinId);
      const prev =
        draft.waypoints.length > 0
          ? draft.waypoints[draft.waypoints.length - 1]
          : startPt ?? pt;
      setCursorPt(snapOrtho(prev, pt));
    }
  };

  const buildPolyline = (points: SchematicPoint[]): string =>
    points.map((p) => `${p.x},${p.y}`).join(' ');

  const selectedWire = wires.find((w) => w.id === selectedWireId) ?? null;

  // Yatay/dikey kesişimlerde atlama yayı (∩), ortak hat ek noktaları (•) ve çakışmasız kablo etiketleri
  const { verticalSegments: allVisibleVerticalSegments, netByWire, junctionDots, smartLabelMap } = useMemo(() => {
    const entries: Array<{ wire: SchematicWire; points: SchematicPoint[] }> = [];
    for (const w of wires) {
      if (!isWireVisibleByFilter(w)) continue;
      const p1 = getPinAbsPos(w.fromNodeId, w.fromPinId);
      const p2 = getPinAbsPos(w.toNodeId, w.toPinId);
      if (!p1 || !p2) continue;
      entries.push({ wire: w, points: [p1, ...w.waypoints, p2] });
    }
    const { segments, netByWire: nbw } = extractVerticalSegments(entries);
    const dots = mergeSameNet ? computeNetJunctions(entries) : [];
    const labels = computeSmartWireLabels(entries, nodes, nodePositions);
    return { verticalSegments: segments, netByWire: nbw, junctionDots: dots, smartLabelMap: labels };
  }, [wires, nodes, nodePositions, wireFilter, mergeSameNet]);

  const formatEndpoint = (nodeId: string, pinId: string): string => {
    const n = nodes.find((nd) => nd.id === nodeId);
    const p = n?.pins.find((pn) => pn.id === pinId);
    return `${n?.title ?? nodeId}:${p?.label ?? pinId}`;
  };

  const handleDownloadNetlistCsv = () => {
    const header = ['No', 'Kablo Etiketi', 'Kaynak', 'Hedef', 'Kesit (mm2)', 'Renk'];
    const rows = wires.map((w, i) => [
      String(i + 1),
      w.label,
      formatEndpoint(w.fromNodeId, w.fromPinId),
      formatEndpoint(w.toNodeId, w.toPinId),
      w.sectionMm2,
      getWireColorSpec(w.color).name,
    ]);
    const csv =
      '\uFEFF' +
      [header, ...rows]
        .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Bemis-BH6-6000-Kumanda-Kablo-Listesi.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Bemis-BH6-6000-Kumanda-Semasi.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`schematic-workspace ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {/* SOL ARAÇ ÇUBUĞU */}
      {!isFullscreen && (
      <aside className="left-sidebar">
        <section className="sidebar-section">
          <div className="section-title">Çizim Aracı</div>
          <div className="tool-toggle">
            <button
              type="button"
              className={tool === 'wire' ? 'btn-primary' : 'btn-sm'}
              onClick={() => setTool('wire')}
            >
              ✎ Kablo Çiz
            </button>
            <button
              type="button"
              className={tool === 'move' ? 'btn-primary' : 'btn-sm'}
              onClick={() => {
                setTool('move');
                setDraft(null);
              }}
            >
              ✥ Eleman Taşı
            </button>
          </div>

          <label className="check-row" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={orthoMode}
              onChange={(e) => setOrthoMode(e.target.checked)}
            />
            <span>90° Dik açılı kablo çizimi</span>
          </label>

          <div className="hint-box" style={{ marginTop: 8 }}>
            <strong>Nasıl çizilir?</strong>
            <br />
            1. <strong>Kablo Çiz</strong> seçiliyken bir terminal pinine tıklayın.
            <br />
            2. Boş alana tıklayıp köşe koyun (veya doğrudan hedef pine tıklayın).
            <br />
            3. İptal için <strong>ESC</strong> veya sağ tık. Elemanları sürüklemek için{' '}
            <strong>Eleman Taşı</strong> modunu seçin.
          </div>
        </section>

        <section className="sidebar-section">
          <div className="section-title">Sabit Kablo Renkleri (20 Standart)</div>
          <div className="active-color-label">
            <span
              className="wire-dot"
              style={{
                background: getWireColorSpec(wireColor).stripeHex
                  ? `repeating-linear-gradient(45deg, ${wireColor}, ${wireColor} 4px, ${getWireColorSpec(wireColor).stripeHex} 4px, ${getWireColorSpec(wireColor).stripeHex} 8px)`
                  : wireColor,
              }}
            />
            <strong>{getWireColorSpec(wireColor).name}</strong>
          </div>
          <div className="fixed-color-grid">
            {STANDARD_WIRE_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                className={`color-swatch-btn ${wireColor === c.hex ? 'active' : ''}`}
                onClick={() => setWireColor(c.hex)}
              >
                <span
                  className="color-swatch-fill"
                  style={{
                    background: c.stripeHex
                      ? `repeating-linear-gradient(45deg, ${c.hex}, ${c.hex} 4px, ${c.stripeHex} 4px, ${c.stripeHex} 8px)`
                      : c.hex,
                  }}
                />
                <span className="color-swatch-code">{c.short}</span>
              </button>
            ))}
          </div>

          <div className="dims-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
            <label className="field">
              <span>Kesit (mm²)</span>
              <select value={wireSection} onChange={(e) => setWireSection(e.target.value)}>
                <option value="0,75">0,75 mm²</option>
                <option value="1,0">1,0 mm²</option>
                <option value="1,5">1,5 mm²</option>
                <option value="2,5">2,5 mm²</option>
                <option value="4,0">4,0 mm²</option>
                <option value="5,0">5,0 mm²</option>
                <option value="6,0">6,0 mm²</option>
              </select>
            </label>
            <label className="field">
              <span>Kablo Etiketi</span>
              <input
                placeholder={`K${wires.length + 1}`}
                value={wireLabel}
                onChange={(e) => setWireLabel(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="sidebar-section">
          <div className="section-title">Gelişmiş A* Otorouter (Parçalar Sabit)</div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={smartFlipPins}
              onChange={(e) => setSmartFlipPins(e.target.checked)}
            />
            <span>Akıllı pin yönü (kutu sabit, pin hedefe bakar)</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={mergeSameNet}
              onChange={(e) => setMergeSameNet(e.target.checked)}
            />
            <span>Ortak hatları birleştir (• ek noktası)</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={autoRerouteOnDrag}
              onChange={(e) => setAutoRerouteOnDrag(e.target.checked)}
            />
            <span>Blok taşıyınca kabloları yenile</span>
          </label>
          {routeMetrics && (
            <div className="metric-sub" style={{ marginBottom: 8 }}>
              Son çizim: <strong>{routeMetrics.boxCollisions} blok ihlali</strong> •{' '}
              {routeMetrics.crossings} çapraz geçiş ({routeMetrics.timeMs} ms)
            </div>
          )}
          <div className="action-stack">
            <button
              type="button"
              className="btn-primary"
              disabled={wires.length === 0}
              onClick={() => handleAutoRoute()}
            >
              ✦ Kabloları Temizle (Parçalar Sabit)
            </button>
            <button
              type="button"
              className="btn-sm"
              disabled={wires.length === 0}
              onClick={handleOptimizeAll}
            >
              Komponent + Kablo Oto-Diz (Konumu Değiştirir)
            </button>
            <button
              type="button"
              className="btn-sm"
              disabled={wires.length === 0}
              onClick={handleRenumberWires}
            >
              1-2-3 Otomatik Numaralandır
            </button>
            {preOptimizeBackup && (
              <button type="button" className="btn-sm" onClick={handleUndoOptimize}>
                ↶ Önceki Yerleşime Geri Dön
              </button>
            )}
            {draft && (
              <button type="button" className="btn-sm btn-danger" onClick={() => setDraft(null)}>
                Aktif Çizimi İptal Et (ESC)
              </button>
            )}
            <button
              type="button"
              className="btn-sm"
              disabled={wires.length === 0}
              onClick={() => onChangeWires(wires.slice(0, -1))}
            >
              ↶ Son Kabloyu Geri Al
            </button>
            <button type="button" className="btn-sm" onClick={onExportJson}>
              💾 Projeyi JSON Yedekle
            </button>
            <button type="button" className="btn-sm" onClick={handleDownloadSvg}>
              Şemayı SVG İndir
            </button>
            <button
              type="button"
              className="btn-sm"
              onClick={() => onChangeNodePositions({})}
            >
              Blokları Ferah Diz (Sıfırla)
            </button>
            <button
              type="button"
              className="btn-sm btn-danger"
              disabled={wires.length === 0}
              onClick={() => {
                if (confirm('Çizdiğiniz tüm kablolar silinsin mi?')) {
                  onChangeWires([]);
                  setSelectedWireId(null);
                }
              }}
            >
              Tüm Kabloları Temizle
            </button>
          </div>
        </section>
      </aside>
      )}

      {/* ORTA ÇİZİM TUVALİ */}
      <main className="canvas-stage schematic-stage">
        <div className="cad-card">
          <div className="cad-card-header schematic-toolbar">
            <div className="toolbar-group">
              <div className="segmented">
                <button
                  type="button"
                  className={displayMode === 'power-page' ? 'active' : ''}
                  onClick={() => setDisplayMode('power-page')}
                >
                  ⚡ Sayfa 1: Güç ({twoPages.power.wires.length})
                </button>
                <button
                  type="button"
                  className={displayMode === 'control-page' ? 'active' : ''}
                  onClick={() => setDisplayMode('control-page')}
                >
                  🎛 Sayfa 2: Kumanda ({twoPages.control.wires.length})
                </button>
                <button
                  type="button"
                  className={displayMode === 'cards' ? 'active' : ''}
                  onClick={() => setDisplayMode('cards')}
                >
                  📋 Montaj Kartları
                </button>
                <button
                  type="button"
                  className={displayMode === 'lines' ? 'active' : ''}
                  onClick={() => setDisplayMode('lines')}
                >
                  ✎ Manuel Çizim
                </button>
                <button
                  type="button"
                  className={displayMode === 'tags' ? 'active' : ''}
                  onClick={() => setDisplayMode('tags')}
                >
                  🏷 Numaralı
                </button>
              </div>
            </div>

            <div className="toolbar-group">
              {(displayMode === 'power-page' || displayMode === 'control-page' || displayMode === 'lines') && (
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={showWireLabels}
                    onChange={(e) => setShowWireLabels(e.target.checked)}
                  />
                  <span>Kablo Numaraları</span>
                </label>
              )}

              {displayMode === 'lines' && wires.length > 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                  onClick={() => handleAutoRoute()}
                  title="Parçaların yerini hiç değiştirmeden tüm kabloları en temiz 3-geçişli yoldan yeniden çizer"
                >
                  ✦ Kabloları Temizle (Parçalar Sabit)
                </button>
              )}

              {(displayMode === 'lines' || displayMode === 'tags') && (
                <div className="segmented">
                  <button
                    type="button"
                    title="Küçült"
                    onClick={() =>
                      setZoom((z) => Math.max(0.7, Number(((z === 'fit' ? 1 : z) - 0.15).toFixed(2))))
                    }
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className={zoom === 'fit' ? 'active' : ''}
                    title="Ekrana Sığdır"
                    onClick={() => setZoom('fit')}
                  >
                    {zoom === 'fit' ? 'Sığdır' : `${Math.round(zoom * 100)}%`}
                  </button>
                  <button
                    type="button"
                    title="Büyüt"
                    onClick={() =>
                      setZoom((z) => Math.min(2.4, Number(((z === 'fit' ? 1 : z) + 0.15).toFixed(2))))
                    }
                  >
                    +
                  </button>
                </div>
              )}

              <button
                type="button"
                className={isFullscreen ? 'btn-primary' : 'btn-sm'}
                onClick={() => setIsFullscreen((f) => !f)}
              >
                {isFullscreen ? '✕ Paneli Göster' : '⛶ Tam Ekran'}
              </button>

              <button type="button" className="btn-sm" onClick={onExportJson}>
                💾 Yedekle
              </button>

              {(selectedWireId || focusedNodeId) && (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => {
                    setSelectedWireId(null);
                    setFocusedNodeId(null);
                  }}
                >
                  Seçimi Kaldır
                </button>
              )}
            </div>
          </div>

          {displayMode === 'power-page' ? (
            <CleanSchematicView
              page={twoPages.power}
              selectedWireId={selectedWireId}
              onSelectWire={setSelectedWireId}
              showLabels={showWireLabels}
            />
          ) : displayMode === 'control-page' ? (
            <CleanSchematicView
              page={twoPages.control}
              selectedWireId={selectedWireId}
              onSelectWire={setSelectedWireId}
              showLabels={showWireLabels}
            />
          ) : displayMode === 'cards' ? (
            <div className="mounting-cards-wrap">
              {wires.length === 0 ? (
                <div className="empty-state">
                  Henüz bağlantı yok. <strong>Numaralı</strong> veya <strong>Tüm Hatlar</strong> görünümünde kablo çizdiğinizde her elemanın pin-pin montaj kartı burada otomatik oluşur.
                </div>
              ) : (
                <div className="mounting-cards-grid">
                  {nodes.map((node) => {
                    const nodeRows = node.pins.flatMap((pin) => {
                      const entries = pinAttachments.get(`${node.id}::${pin.id}`) ?? [];
                      return entries.map((entry) => ({ pin, entry }));
                    });
                    if (nodeRows.length === 0) return null;

                    return (
                      <section
                        key={node.id}
                        className="mount-card"
                        style={{ borderTopColor: node.accent }}
                      >
                        <header className="mount-card-head">
                          <div>
                            <strong>{node.title}</strong>
                            <span>{node.subtitle}</span>
                          </div>
                          <span className="mount-count">{nodeRows.length} uç</span>
                        </header>
                        <div className="mount-card-list">
                          {nodeRows.map(({ pin, entry }, idx) => {
                            const { wire } = entry;
                            const spec = getWireColorSpec(wire.color);
                            const isSel = selectedWireId === wire.id;
                            return (
                              <div
                                key={`${pin.id}-${wire.id}-${idx}`}
                                className={`mount-row ${isSel ? 'selected-row' : ''}`}
                                onClick={() => setSelectedWireId(isSel ? null : wire.id)}
                              >
                                <span className="mount-pin">
                                  <strong>{pin.label}</strong>
                                  {pin.subLabel && <small>{pin.subLabel}</small>}
                                </span>
                                <span
                                  className="wire-num-pill"
                                  style={{
                                    background: spec.stripeHex
                                      ? `repeating-linear-gradient(45deg, ${wire.color}, ${wire.color} 4px, ${spec.stripeHex} 4px, ${spec.stripeHex} 8px)`
                                      : wire.color,
                                    color: isLightHex(wire.color) ? '#0b1120' : '#ffffff',
                                  }}
                                >
                                  #{entry.badgeNumText}
                                </span>
                                <span className="mount-wire-meta">
                                  {spec.name.split(' (')[0]} • {wire.sectionMm2}
                                </span>
                                <span className="mount-arrow">→</span>
                                <strong className="mount-target">{entry.partnerShort}</strong>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
          <div className="schematic-scroll-wrap">
          <svg
            ref={svgRef}
            viewBox={`${dynamicBounds.minX} ${dynamicBounds.minY} ${dynamicBounds.width} ${dynamicBounds.height}`}
            className="cad-svg schematic-svg"
            style={
              zoom === 'fit'
                ? { width: '100%', maxHeight: 'calc(100vh - 126px)' }
                : { width: `${Math.round(dynamicBounds.width * zoom * 0.78)}px`, minWidth: '100%' }
            }
            onClick={handleCanvasClick}
            onContextMenu={(e) => {
              if (draft) {
                e.preventDefault();
                setDraft(null);
              }
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={() => {
              if (draggingNode && autoRerouteOnDrag && wires.length > 0) {
                const res = autoRouteWiresWithMetrics(
                  wires,
                  nodes,
                  nodePositions,
                  CANVAS_W,
                  CANVAS_H,
                  mergeSameNet
                );
                onChangeWires(res.wires);
                setRouteMetrics(res.metrics);
              }
              setDraggingNode(null);
              setDraggingWaypoint(null);
            }}
            onPointerLeave={() => {
              setDraggingNode(null);
              setDraggingWaypoint(null);
            }}
          >
            <defs>
              <pattern id="sch-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#172033" strokeWidth="0.8" />
              </pattern>
            </defs>

            <rect x={dynamicBounds.minX} y={dynamicBounds.minY} width={dynamicBounds.width} height={dynamicBounds.height} fill="#0b1220" />
            <rect x={dynamicBounds.minX} y={dynamicBounds.minY} width={dynamicBounds.width} height={dynamicBounds.height} fill="url(#sch-grid)" />

            {/* KATMAN 1: NORMAL KABLO HATLARI (Sadece 'Tüm Hatlar' modunda, blokların altında değil temiz kanallarda) */}
            {displayMode === 'lines' &&
              wires.map((w, wireIdx) => {
                if (!isWireVisibleByFilter(w)) return null;
                const isSelected = selectedWireId === w.id;
                const isHovered = hoveredWireId === w.id;
                const isConnectedToFocused =
                  focusedNodeId !== null &&
                  (w.fromNodeId === focusedNodeId || w.toNodeId === focusedNodeId);
                const isHighlighted = isSelected || isHovered || isConnectedToFocused;
                if (isHighlighted) return null; // Vurgulanan hatlar Katman 3'te en üstte çizilir!

                const p1 = getPinAbsPos(w.fromNodeId, w.fromPinId);
                const p2 = getPinAbsPos(w.toNodeId, w.toPinId);
                if (!p1 || !p2) return null;
                const pts = [p1, ...w.waypoints, p2];
                const pathD = buildRoundedWirePath(
                  pts,
                  5,
                  w.id,
                  netByWire.get(w.id),
                  allVisibleVerticalSegments
                );
                const hasSelectionFocus =
                  dimOthersOnSelect &&
                  (selectedWireId !== null || focusedNodeId !== null || hoveredWireId !== null);
                const opacity = hasSelectionFocus ? 0.14 : 0.92;
                const labelPt = smartLabelMap.get(w.id) ?? getBestWireLabelPoint(pts, wireIdx);
                const strokeWidth = w.sectionMm2 === '2,5' ? 3.2 : 2.4;

                return (
                  <g
                    key={w.id}
                    opacity={opacity}
                    onMouseEnter={() => setHoveredWireId(w.id)}
                    onMouseLeave={() => setHoveredWireId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedNodeId(null);
                      setSelectedWireId(w.id);
                    }}
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                  >
                    <path d={pathD} fill="none" stroke="transparent" strokeWidth={13} />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#0b1220"
                      strokeWidth={strokeWidth + 3.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={w.color}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {getWireColorSpec(w.color).stripeHex && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={getWireColorSpec(w.color).stripeHex}
                        strokeWidth={strokeWidth}
                        strokeDasharray="6 6"
                        strokeLinecap="butt"
                        strokeLinejoin="round"
                      />
                    )}
                    <circle cx={p1.x} cy={p1.y} r={3.5} fill={w.color} />
                    <circle cx={p2.x} cy={p2.y} r={3.5} fill={w.color} />

                    {w.label && showWireLabels && (
                      <g pointerEvents="none">
                        <rect
                          x={labelPt.x - 16}
                          y={labelPt.y - 8}
                          width={32}
                          height={14}
                          rx={3}
                          fill="#0f172a"
                          stroke={w.color}
                          strokeWidth={0.9}
                        />
                        <text
                          x={labelPt.x}
                          y={labelPt.y + 2}
                          textAnchor="middle"
                          fontSize={8.5}
                          fill="#f8fafc"
                          fontWeight={700}
                        >
                          {w.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

            {/* KATMAN 2: ELEMAN BLOKLARI, PİNLER VE NUMARALI BAYRAKLAR */}
            {nodes.map((node) => {
              const pos = getNodePos(node);
              const isNodeFocused = focusedNodeId === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!draft) {
                      setSelectedWireId(null);
                      setFocusedNodeId(isNodeFocused ? null : node.id);
                    }
                  }}
                  onPointerDown={(e) => {
                    if (tool !== 'move') return;
                    e.stopPropagation();
                    const pt = toSvgCoords(e.clientX, e.clientY);
                    if (!pt) return;
                    setDraggingNode({
                      id: node.id,
                      offsetX: pt.x - pos.x,
                      offsetY: pt.y - pos.y,
                    });
                  }}
                  style={{ cursor: tool === 'move' ? 'grab' : 'pointer' }}
                >
                  <rect
                    x={0}
                    y={0}
                    width={node.width}
                    height={node.height}
                    rx={6}
                    fill="#131e33"
                    fillOpacity={displayMode === 'lines' ? 0.88 : 0.96}
                    stroke={isNodeFocused ? '#38bdf8' : node.accent}
                    strokeWidth={isNodeFocused ? 2.5 : 1.5}
                  />
                  {/* Üst vurgu şeridi */}
                  <rect
                    x={0}
                    y={0}
                    width={node.width}
                    height={4}
                    rx={2}
                    fill={node.accent}
                    fillOpacity={0.8}
                  />
                  <text
                    x={node.width / 2}
                    y={node.height / 2 - 2}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill="#f8fafc"
                    pointerEvents="none"
                  >
                    {node.title}
                  </text>
                  <text
                    x={node.width / 2}
                    y={node.height / 2 + 12}
                    textAnchor="middle"
                    fontSize={9.5}
                    fill="#94a3b8"
                    pointerEvents="none"
                  >
                    {node.subtitle}
                  </text>

                  {/* Terminal Pinleri */}
                  {node.pins.map((pin) => {
                    const isDraftStart =
                      draft?.fromNodeId === node.id && draft?.fromPinId === pin.id;
                    return (
                      <g
                        key={pin.id}
                        className="sch-pin"
                        onClick={(e) => handlePinClick(e, node.id, pin.id)}
                        style={{ cursor: tool === 'wire' ? 'crosshair' : 'pointer' }}
                      >
                        <title>{pin.title}</title>
                        <circle
                          cx={pin.dx}
                          cy={pin.dy}
                          r={isDraftStart ? 6.5 : 5}
                          fill={isDraftStart ? '#38bdf8' : '#0f172a'}
                          stroke={isDraftStart ? '#f8fafc' : '#cbd5e1'}
                          strokeWidth={1.6}
                        />
                        <text
                          x={pin.dx}
                          y={pin.side === 'top' ? 15 : node.height - (pin.subLabel ? 16 : 9)}
                          textAnchor="middle"
                          fontSize={8.5}
                          fontWeight={700}
                          fill="#f1f5f9"
                          pointerEvents="none"
                        >
                          {pin.label}
                        </text>
                        {pin.subLabel && (
                          <text
                            x={pin.dx}
                            y={pin.side === 'top' ? 25 : node.height - 6}
                            textAnchor="middle"
                            fontSize={7.2}
                            fontWeight={600}
                            fill={pin.subColor ?? '#94a3b8'}
                            pointerEvents="none"
                          >
                            {pin.subLabel}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* NUMARALI YÜKSÜK / BAYRAK ETİKETLERİ (Büyük, okunaklı, çakışmasız) */}
                  {displayMode === 'tags' &&
                    node.pins.map((pin, pinIdx) => {
                      const entries = pinAttachments.get(`${node.id}::${pin.id}`);
                      if (!entries || entries.length === 0) return null;
                      const dir = pin.side === 'top' ? -1 : 1;
                      const tierBase = pinIdx % 2 === 0 ? 22 : 44;
                      const stepGap = 23;
                      const maxDist = tierBase + (entries.length - 1) * stepGap;
                      const lastEntryColor = entries[entries.length - 1].wire.color;

                      return (
                        <g key={`flags-${pin.id}`}>
                          <line
                            x1={pin.dx}
                            y1={pin.dy + dir * 5}
                            x2={pin.dx}
                            y2={pin.dy + dir * maxDist}
                            stroke={lastEntryColor}
                            strokeWidth={2.6}
                          />
                          {entries.map((entry, subIdx) => {
                            const dist = tierBase + subIdx * stepGap;
                            const fy = pin.dy + dir * dist;
                            const { wire } = entry;
                            const isSel = selectedWireId === wire.id;
                            const isHov = hoveredWireId === wire.id;
                            const isNodeMatch =
                              focusedNodeId !== null &&
                              (wire.fromNodeId === focusedNodeId || wire.toNodeId === focusedNodeId);
                            const isActive = isSel || isHov || isNodeMatch;
                            const hasFocus =
                              dimOthersOnSelect &&
                              (selectedWireId !== null || focusedNodeId !== null || hoveredWireId !== null);
                            const badgeOpacity = hasFocus && !isActive ? 0.25 : 1;

                            const text = entry.badgeNumText;
                            const pillW = Math.max(28, text.length * 8 + 14);
                            const pillH = 20;
                            const textColor = isLightHex(wire.color) ? '#0b1120' : '#ffffff';
                            const colorSpec = getWireColorSpec(wire.color);

                            return (
                              <g
                                key={`${wire.id}-${subIdx}`}
                                opacity={badgeOpacity}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredWireId(wire.id)}
                                onMouseLeave={() => setHoveredWireId(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFocusedNodeId(null);
                                  setSelectedWireId(isSel ? null : wire.id);
                                }}
                              >
                                <title>
                                  {`#${entry.num} (${wire.label}) • ${colorSpec.name} • ${wire.sectionMm2} mm² → ${entry.partnerShort}`}
                                </title>
                                <rect
                                  x={pin.dx - pillW / 2}
                                  y={fy - pillH / 2}
                                  width={pillW}
                                  height={pillH}
                                  rx={5}
                                  fill={wire.color}
                                  stroke={isActive ? '#38bdf8' : colorSpec.stripeHex ?? '#0b1120'}
                                  strokeWidth={isActive ? 2.5 : colorSpec.stripeHex ? 2 : 1.2}
                                />
                                <text
                                  x={pin.dx}
                                  y={fy + 4}
                                  textAnchor="middle"
                                  fontSize={11.5}
                                  fontWeight={800}
                                  fill={textColor}
                                  pointerEvents="none"
                                >
                                  {text}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}
                </g>
              );
            })}

            {/* KATMAN 3 (EN ÜST): VURGULANAN / SEÇİLİ / ÜZERİNE GELİNEN KABLOLAR + AKTİF ÇİZİM (ASLA BLOK ARKASINDA KALMAZ!) */}
            {wires.map((w, wireIdx) => {
              if (!isWireVisibleByFilter(w)) return null;
              const isSelected = selectedWireId === w.id;
              const isHovered = hoveredWireId === w.id;
              const isConnectedToFocused =
                focusedNodeId !== null &&
                (w.fromNodeId === focusedNodeId || w.toNodeId === focusedNodeId);
              const isHighlighted = isSelected || isHovered || isConnectedToFocused;
              if (!isHighlighted) return null;

              const p1 = getPinAbsPos(w.fromNodeId, w.fromPinId);
              const p2 = getPinAbsPos(w.toNodeId, w.toPinId);
              if (!p1 || !p2) return null;
              const pts = [p1, ...w.waypoints, p2];
              const pathD = buildRoundedWirePath(
                pts,
                5,
                w.id,
                netByWire.get(w.id),
                allVisibleVerticalSegments
              );
              const labelPt = smartLabelMap.get(w.id) ?? getBestWireLabelPoint(pts, wireIdx);
              const strokeWidth = w.sectionMm2 === '2,5' ? 3.8 : 3.0;

              return (
                <g
                  key={`top-${w.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusedNodeId(null);
                    setSelectedWireId(w.id);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#0b1220"
                    strokeWidth={strokeWidth + 4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={strokeWidth + 3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={0.55}
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={w.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {getWireColorSpec(w.color).stripeHex && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={getWireColorSpec(w.color).stripeHex}
                      strokeWidth={strokeWidth}
                      strokeDasharray="6 6"
                      strokeLinecap="butt"
                      strokeLinejoin="round"
                    />
                  )}
                  <circle cx={p1.x} cy={p1.y} r={5} fill={w.color} stroke="#ffffff" strokeWidth={1.5} />
                  <circle cx={p2.x} cy={p2.y} r={5} fill={w.color} stroke="#ffffff" strokeWidth={1.5} />

                  {isSelected &&
                    w.waypoints.map((wp, wpIdx) => (
                      <circle
                        key={wpIdx}
                        cx={wp.x}
                        cy={wp.y}
                        r={6}
                        fill="#38bdf8"
                        stroke="#0b1220"
                        strokeWidth={1.8}
                        style={{ cursor: 'move' }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setDraggingWaypoint({ wireId: w.id, index: wpIdx });
                        }}
                      />
                    ))}

                  {w.label && (
                    <g pointerEvents="none">
                      <rect
                        x={labelPt.x - 18}
                        y={labelPt.y - 10}
                        width={36}
                        height={18}
                        rx={4}
                        fill="#0f172a"
                        stroke="#38bdf8"
                        strokeWidth={1.4}
                      />
                      <text
                        x={labelPt.x}
                        y={labelPt.y + 3}
                        textAnchor="middle"
                        fontSize={10.5}
                        fill="#f8fafc"
                        fontWeight={800}
                      >
                        {w.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* PROTEUS ORTAK HAT EK NOKTALARI (•) */}
            {displayMode === 'lines' &&
              junctionDots.map((dot, idx) => (
                <circle
                  key={`junc-${idx}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={4.2}
                  fill={dot.color}
                  stroke="#0b1220"
                  strokeWidth={1.3}
                  pointerEvents="none"
                />
              ))}

            {/* AKTİF KABLO ÇİZİM ÖNİZLEMESİ (EN ÜSTTE) */}
            {draft &&
              (() => {
                const startPt = getPinAbsPos(draft.fromNodeId, draft.fromPinId);
                if (!startPt) return null;
                const pts = cursorPt
                  ? [startPt, ...draft.waypoints, cursorPt]
                  : [startPt, ...draft.waypoints];
                return (
                  <polyline
                    points={buildPolyline(pts)}
                    fill="none"
                    stroke={wireColor}
                    strokeWidth={3}
                    strokeDasharray="7 5"
                    pointerEvents="none"
                  />
                );
              })()}
          </svg>
          </div>
          )}
        </div>
      </main>

      {/* SAĞ PANEL: SEÇİLİ KABLO & BAĞLANTI LİSTESİ (NETLIST) */}
      {!isFullscreen && (
      <aside className="inspector-panel">
        {focusedNodeId && onSelectInPanel && items.some((i) => i.id === focusedNodeId) && (
          <div className="sidebar-section">
            <div className="section-title">Odaklı Eleman</div>
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => onSelectInPanel(focusedNodeId)}
            >
              Pano Yerleşiminde Göster →
            </button>
          </div>
        )}
        <div className="sidebar-section">
          <div className="section-title">Seçili Kablo</div>
          {!selectedWire ? (
            <div className="metric-sub">
              Düzenlemek veya silmek için şemadan bir kabloya tıklayın.
            </div>
          ) : (
            <div className="prop-form">
              <div className="metric-sub" style={{ color: '#e2e8f0' }}>
                <strong>{formatEndpoint(selectedWire.fromNodeId, selectedWire.fromPinId)}</strong>
                {' → '}
                <strong>{formatEndpoint(selectedWire.toNodeId, selectedWire.toPinId)}</strong>
              </div>
              <label className="field">
                <span>Kablo Etiketi</span>
                <input
                  value={selectedWire.label}
                  onChange={(e) =>
                    onChangeWires(
                      wires.map((w) =>
                        w.id === selectedWire.id ? { ...w, label: e.target.value } : w
                      )
                    )
                  }
                />
              </label>
              <label className="field">
                <span>Kesit</span>
                <select
                  value={selectedWire.sectionMm2}
                  onChange={(e) =>
                    onChangeWires(
                      wires.map((w) =>
                        w.id === selectedWire.id ? { ...w, sectionMm2: e.target.value } : w
                      )
                    )
                  }
                >
                  <option value="0,75">0,75 mm²</option>
                  <option value="1,0">1,0 mm²</option>
                  <option value="1,5">1,5 mm²</option>
                  <option value="2,5">2,5 mm²</option>
                  <option value="4,0">4,0 mm²</option>
                  <option value="5,0">5,0 mm²</option>
                  <option value="6,0">6,0 mm²</option>
                </select>
              </label>
              <div className="field">
                <span>Sabit Renk: {getWireColorSpec(selectedWire.color).name}</span>
                <div className="fixed-color-grid compact">
                  {STANDARD_WIRE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      className={`color-swatch-btn ${selectedWire.color === c.hex ? 'active' : ''}`}
                      onClick={() =>
                        onChangeWires(
                          wires.map((w) =>
                            w.id === selectedWire.id ? { ...w, color: c.hex } : w
                          )
                        )
                      }
                    >
                      <span
                        className="color-swatch-fill"
                        style={{
                          background: c.stripeHex
                            ? `repeating-linear-gradient(45deg, ${c.hex}, ${c.hex} 4px, ${c.stripeHex} 4px, ${c.stripeHex} 8px)`
                            : c.hex,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn-sm btn-danger"
                onClick={() => {
                  onChangeWires(wires.filter((w) => w.id !== selectedWire.id));
                  setSelectedWireId(null);
                }}
              >
                Bu Kabloyu Sil (Del)
              </button>
            </div>
          )}
        </div>

        <div className="inspector-body">
          <div className="prop-head" style={{ marginBottom: 8 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              Kablo Bağlantı Listesi ({wires.length})
            </div>
            <button
              type="button"
              className="btn-sm"
              disabled={wires.length === 0}
              onClick={handleDownloadNetlistCsv}
            >
              CSV
            </button>
          </div>

          {wires.length === 0 ? (
            <div className="empty-state">
              Henüz kablo çizmediniz. Sol menüden kablo rengini seçip herhangi bir pine tıklayarak kendi kumanda şemanızı çizmeye başlayabilirsiniz.
            </div>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Bağlantı</th>
                  <th>mm²</th>
                </tr>
              </thead>
              <tbody>
                {wires.map((w, idx) => (
                  <tr
                    key={w.id}
                    className={selectedWireId === w.id || hoveredWireId === w.id ? 'selected-row' : ''}
                    onMouseEnter={() => setHoveredWireId(w.id)}
                    onMouseLeave={() => setHoveredWireId(null)}
                    onClick={() => {
                      setFocusedNodeId(null);
                      setSelectedWireId(w.id);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span
                        className="wire-num-pill"
                        style={{
                          backgroundColor: w.color,
                          color: isLightHex(w.color) ? '#0b1120' : '#ffffff',
                        }}
                      >
                        {w.label && !/^K\d+$/.test(w.label) ? w.label : idx + 1}
                      </span>
                    </td>
                    <td>
                      <div className="bom-codes" style={{ color: '#e2e8f0' }}>
                        {formatEndpoint(w.fromNodeId, w.fromPinId)} →{' '}
                        {formatEndpoint(w.toNodeId, w.toPinId)}
                      </div>
                      <div className="bom-codes">{getWireColorSpec(w.color).name}</div>
                    </td>
                    <td>{w.sectionMm2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </aside>
      )}
    </div>
  );
}
