import type { SchematicPoint, SchematicWire } from '../types/panel';

export type CleanPageKind = 'power' | 'control';

export interface CleanPin {
  /** Orijinal şemadaki (nodeId, pinId) eşleştirmesi */
  sourceNodeId: string;
  sourcePinId: string;
  label: string;
  subLabel?: string;
  subColor?: string;
  dx: number;
  dy: number;
  side: 'top' | 'bottom';
}

export interface CleanBlock {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
  pins: CleanPin[];
}

export interface CleanRoutedWire {
  wire: SchematicWire;
  index: number;
  points: SchematicPoint[];
  pathD: string;
  labelPoint: SchematicPoint;
  stripeHex?: string;
}

export interface CleanPageData {
  kind: CleanPageKind;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  blocks: CleanBlock[];
  wires: CleanRoutedWire[];
  junctions: Array<{ x: number; y: number; color: string }>;
  unmappedWires: SchematicWire[];
  notes: Array<{ x: number; y: number; text: string; color: string }>;
}

const PE_HEX = '#22c55e';
const PE_STRIPE = '#facc15';

function makePins(
  width: number,
  height: number,
  top: Array<Omit<CleanPin, 'dx' | 'dy' | 'side'>>,
  bottom: Array<Omit<CleanPin, 'dx' | 'dy' | 'side'>>
): CleanPin[] {
  const out: CleanPin[] = [];
  const place = (list: Array<Omit<CleanPin, 'dx' | 'dy' | 'side'>>, side: 'top' | 'bottom') => {
    const step = width / (list.length + 1);
    list.forEach((p, idx) => {
      out.push({
        ...p,
        dx: Math.round(step * (idx + 1)),
        dy: side === 'top' ? 0 : height,
        side,
      });
    });
  };
  place(top, 'top');
  place(bottom, 'bottom');
  return out;
}

/**
 * Bir kablonun Güç Şemasına (Sayfa 1) mı yoksa Kumanda Şemasına (Sayfa 2) mı ait olduğunu belirler.
 */
export function classifyWirePage(w: SchematicWire): CleanPageKind {
  const ends = [
    { n: w.fromNodeId, p: w.fromPinId },
    { n: w.toNodeId, p: w.toPinId },
  ];

  // Kumanda-özel elemanlar kesinlikle Sayfa 2 (Kumanda)
  for (const e of ends) {
    if (
      e.n.startsWith('r') ||
      e.n === 's1' ||
      e.n === 's2' ||
      e.n.startsWith('sys-sector') ||
      e.n === 'blk-bottom-terminals'
    ) {
      return 'control';
    }
    if (e.n.startsWith('km') && ['21', '22', 'A1', 'A2', '13', '14'].includes(e.p)) {
      return 'control';
    }
    if ((e.n === 'sys-m1' || e.n === 'sys-m2') && ['5', '6', '7'].includes(e.p)) {
      return 'control';
    }
    if (e.n === 'sys-neutral' && e.p !== 'N1') {
      return 'control';
    }
  }

  return 'power';
}

function getPowerBlocks(): CleanBlock[] {
  return [
    // Satır 1 (Y = 44): Besleme, Nötr, Toprak
    {
      id: 'p-supply',
      title: 'BESLEME (5×2,5 mm²)',
      subtitle: '3~ 400V / 230V Ana Giriş',
      x: 80,
      y: 44,
      width: 300,
      height: 68,
      accent: '#ef4444',
      pins: makePins(
        300,
        68,
        [],
        [
          { sourceNodeId: 'sys-supply', sourcePinId: 'L1', label: 'L1', subLabel: 'Faz', subColor: '#d97706' },
          { sourceNodeId: 'sys-supply', sourcePinId: 'L2', label: 'L2', subLabel: 'Faz', subColor: '#94a3b8' },
          { sourceNodeId: 'sys-supply', sourcePinId: 'L3', label: 'L3', subLabel: 'Faz', subColor: '#e2e8f0' },
          { sourceNodeId: 'sys-supply', sourcePinId: 'N', label: 'N', subLabel: 'Nötr', subColor: '#3b82f6' },
          { sourceNodeId: 'sys-supply', sourcePinId: 'PE', label: 'PE', subLabel: 'Toprak', subColor: '#22c55e' },
        ]
      ),
    },
    {
      id: 'p-neutral',
      title: 'PANO NÖTR (N)',
      subtitle: 'Bemis Dahili Bara (N2–N4 → Sayfa 2)',
      x: 560,
      y: 44,
      width: 240,
      height: 68,
      accent: '#3b82f6',
      pins: makePins(
        240,
        68,
        [],
        [
          { sourceNodeId: 'sys-neutral', sourcePinId: 'N1', label: 'N1', subLabel: 'Ana N', subColor: '#60a5fa' },
        ]
      ),
    },
    {
      id: 'p-pe',
      title: 'PANO TOPRAK (PE)',
      subtitle: 'Bemis Dahili Bara',
      x: 980,
      y: 44,
      width: 260,
      height: 68,
      accent: '#22c55e',
      pins: makePins(
        260,
        68,
        [],
        [
          { sourceNodeId: 'sys-pe', sourcePinId: 'PE1', label: 'PE1', subLabel: 'Giriş', subColor: '#4ade80' },
          { sourceNodeId: 'sys-pe', sourcePinId: 'PE2', label: 'PE2', subLabel: 'M1 PE', subColor: '#4ade80' },
          { sourceNodeId: 'sys-pe', sourcePinId: 'PE3', label: 'PE3', subLabel: 'M2 PE', subColor: '#4ade80' },
        ]
      ),
    },

    // Satır 2 (Y = 180): Üst Klemens (X1–X3) tam Besleme L1/L2/L3 altında!
    {
      id: 'p-top-term',
      title: 'ÜST KLEMENS (X1–X3)',
      subtitle: 'Üst DIN Rayı • Faz Giriş',
      x: 80,
      y: 184,
      width: 200,
      height: 68,
      accent: '#64748b',
      pins: makePins(
        200,
        68,
        [
          { sourceNodeId: 'blk-top-terminals', sourcePinId: 'X1b', label: 'X1' },
          { sourceNodeId: 'blk-top-terminals', sourcePinId: 'X2b', label: 'X2' },
          { sourceNodeId: 'blk-top-terminals', sourcePinId: 'X3b', label: 'X3' },
        ],
        [
          { sourceNodeId: 'blk-top-terminals', sourcePinId: 'X1a', label: 'X1' },
          { sourceNodeId: 'blk-top-terminals', sourcePinId: 'X2a', label: 'X2' },
          { sourceNodeId: 'blk-top-terminals', sourcePinId: 'X3a', label: 'X3' },
        ]
      ),
    },

    // Satır 3 (Y = 334): Q1 (M1 MKŞ) ve Q2 (M2 MKŞ)
    {
      id: 'p-q1',
      title: 'Q1 • MKŞ (1–1,6A)',
      subtitle: 'Motor 1 Koruma',
      x: 190,
      y: 334,
      width: 200,
      height: 82,
      accent: '#0ea5e9',
      pins: makePins(
        200,
        82,
        [
          { sourceNodeId: 'q1', sourcePinId: '1', label: '1/L1' },
          { sourceNodeId: 'q1', sourcePinId: '3', label: '3/L2' },
          { sourceNodeId: 'q1', sourcePinId: '5', label: '5/L3' },
        ],
        [
          { sourceNodeId: 'q1', sourcePinId: '2', label: '2/T1' },
          { sourceNodeId: 'q1', sourcePinId: '4', label: '4/T2' },
          { sourceNodeId: 'q1', sourcePinId: '6', label: '6/T3' },
        ]
      ),
    },
    {
      id: 'p-q2',
      title: 'Q2 • MKŞ (1–1,6A)',
      subtitle: 'Motor 2 Koruma',
      x: 740,
      y: 334,
      width: 200,
      height: 82,
      accent: '#0ea5e9',
      pins: makePins(
        200,
        82,
        [
          { sourceNodeId: 'q2', sourcePinId: '1', label: '1/L1' },
          { sourceNodeId: 'q2', sourcePinId: '3', label: '3/L2' },
          { sourceNodeId: 'q2', sourcePinId: '5', label: '5/L3' },
        ],
        [
          { sourceNodeId: 'q2', sourcePinId: '2', label: '2/T1' },
          { sourceNodeId: 'q2', sourcePinId: '4', label: '4/T2' },
          { sourceNodeId: 'q2', sourcePinId: '6', label: '6/T3' },
        ]
      ),
    },

    // Satır 4 (Y = 516): KM1 & KM2 (M1) | KM3 & KM4 (M2) — Yalnızca Güç Pinleri (1-6)
    {
      id: 'p-km1',
      title: 'KM1 (M1 ↑)',
      subtitle: 'Güç Kontakları',
      x: 80,
      y: 516,
      width: 190,
      height: 84,
      accent: '#f59e0b',
      pins: makePins(
        190,
        84,
        [
          { sourceNodeId: 'km1', sourcePinId: '1', label: '1/L1' },
          { sourceNodeId: 'km1', sourcePinId: '3', label: '3/L2' },
          { sourceNodeId: 'km1', sourcePinId: '5', label: '5/L3' },
        ],
        [
          { sourceNodeId: 'km1', sourcePinId: '2', label: '2/T1' },
          { sourceNodeId: 'km1', sourcePinId: '4', label: '4/T2' },
          { sourceNodeId: 'km1', sourcePinId: '6', label: '6/T3' },
        ]
      ),
    },
    {
      id: 'p-km2',
      title: 'KM2 (M1 ↓)',
      subtitle: 'Ters Faz (U↔V)',
      x: 340,
      y: 516,
      width: 190,
      height: 84,
      accent: '#f59e0b',
      pins: makePins(
        190,
        84,
        [
          { sourceNodeId: 'km2', sourcePinId: '1', label: '1/L1' },
          { sourceNodeId: 'km2', sourcePinId: '3', label: '3/L2' },
          { sourceNodeId: 'km2', sourcePinId: '5', label: '5/L3' },
        ],
        [
          { sourceNodeId: 'km2', sourcePinId: '2', label: '2/T1' },
          { sourceNodeId: 'km2', sourcePinId: '4', label: '4/T2' },
          { sourceNodeId: 'km2', sourcePinId: '6', label: '6/T3' },
        ]
      ),
    },
    {
      id: 'p-km3',
      title: 'KM3 (M2 ↑)',
      subtitle: 'Güç Kontakları',
      x: 640,
      y: 516,
      width: 190,
      height: 84,
      accent: '#f59e0b',
      pins: makePins(
        190,
        84,
        [
          { sourceNodeId: 'km3', sourcePinId: '1', label: '1/L1' },
          { sourceNodeId: 'km3', sourcePinId: '3', label: '3/L2' },
          { sourceNodeId: 'km3', sourcePinId: '5', label: '5/L3' },
        ],
        [
          { sourceNodeId: 'km3', sourcePinId: '2', label: '2/T1' },
          { sourceNodeId: 'km3', sourcePinId: '4', label: '4/T2' },
          { sourceNodeId: 'km3', sourcePinId: '6', label: '6/T3' },
        ]
      ),
    },
    {
      id: 'p-km4',
      title: 'KM4 (M2 ↓)',
      subtitle: 'Ters Faz (U↔V)',
      x: 900,
      y: 516,
      width: 190,
      height: 84,
      accent: '#f59e0b',
      pins: makePins(
        190,
        84,
        [
          { sourceNodeId: 'km4', sourcePinId: '1', label: '1/L1' },
          { sourceNodeId: 'km4', sourcePinId: '3', label: '3/L2' },
          { sourceNodeId: 'km4', sourcePinId: '5', label: '5/L3' },
        ],
        [
          { sourceNodeId: 'km4', sourcePinId: '2', label: '2/T1' },
          { sourceNodeId: 'km4', sourcePinId: '4', label: '4/T2' },
          { sourceNodeId: 'km4', sourcePinId: '6', label: '6/T3' },
        ]
      ),
    },

    // Satır 5 (Y = 740): Motor 1 & Motor 2 Güç + PE
    {
      id: 'p-m1',
      title: 'MOTOR 1 (M1 • Güç)',
      subtitle: '3 Faz + Toprak (Limit → Sayfa 2)',
      x: 150,
      y: 744,
      width: 290,
      height: 76,
      accent: '#06b6d4',
      pins: makePins(
        290,
        76,
        [
          { sourceNodeId: 'sys-m1', sourcePinId: '1', label: '1', subLabel: 'U', subColor: '#d97706' },
          { sourceNodeId: 'sys-m1', sourcePinId: '2', label: '2', subLabel: 'V', subColor: '#94a3b8' },
          { sourceNodeId: 'sys-m1', sourcePinId: '3', label: '3', subLabel: 'W', subColor: '#e2e8f0' },
          { sourceNodeId: 'sys-m1', sourcePinId: '4', label: '4', subLabel: 'PE', subColor: '#22c55e' },
        ],
        []
      ),
    },
    {
      id: 'p-m2',
      title: 'MOTOR 2 (M2 • Güç)',
      subtitle: '3 Faz + Toprak (Limit → Sayfa 2)',
      x: 710,
      y: 744,
      width: 290,
      height: 76,
      accent: '#06b6d4',
      pins: makePins(
        290,
        76,
        [
          { sourceNodeId: 'sys-m2', sourcePinId: '1', label: '1', subLabel: 'U', subColor: '#d97706' },
          { sourceNodeId: 'sys-m2', sourcePinId: '2', label: '2', subLabel: 'V', subColor: '#94a3b8' },
          { sourceNodeId: 'sys-m2', sourcePinId: '3', label: '3', subLabel: 'W', subColor: '#e2e8f0' },
          { sourceNodeId: 'sys-m2', sourcePinId: '4', label: '4', subLabel: 'PE', subColor: '#22c55e' },
        ],
        []
      ),
    },
  ];
}

function getControlBlocks(): CleanBlock[] {
  return [
    // Satır 1 (Y = 38): Sektör Kumanda 1 & 2 (5×1) + Manuel Besleme Ref + Pano Nötr (N2–N4)
    {
      id: 'c-sec1',
      title: 'SEKTÖR KUMANDA 1 (5×1 mm²)',
      subtitle: 'Sektör Kumanda Girişi',
      x: 50,
      y: 38,
      width: 270,
      height: 68,
      accent: '#ec4899',
      pins: makePins(
        270,
        68,
        [],
        [
          { sourceNodeId: 'sys-sector-1', sourcePinId: '1', label: '1', subLabel: 'D1', subColor: '#f472b6' },
          { sourceNodeId: 'sys-sector-1', sourcePinId: '2', label: '2', subLabel: 'D2', subColor: '#f472b6' },
          { sourceNodeId: 'sys-sector-1', sourcePinId: '3', label: '3', subLabel: 'D3', subColor: '#f472b6' },
          { sourceNodeId: 'sys-sector-1', sourcePinId: '4', label: '4', subLabel: 'D4', subColor: '#f472b6' },
          { sourceNodeId: 'sys-sector-1', sourcePinId: '5', label: '5', subLabel: 'D5', subColor: '#f472b6' },
        ]
      ),
    },
    {
      id: 'c-sec2',
      title: 'SEKTÖR KUMANDA 2 (5×1 mm²)',
      subtitle: 'Sektör Kumanda Paralel Çıkış',
      x: 370,
      y: 38,
      width: 270,
      height: 68,
      accent: '#ec4899',
      pins: makePins(
        270,
        68,
        [],
        [
          { sourceNodeId: 'sys-sector-2', sourcePinId: '1', label: '1', subLabel: 'D1', subColor: '#f472b6' },
          { sourceNodeId: 'sys-sector-2', sourcePinId: '2', label: '2', subLabel: 'D2', subColor: '#f472b6' },
          { sourceNodeId: 'sys-sector-2', sourcePinId: '3', label: '3', subLabel: 'D3', subColor: '#f472b6' },
          { sourceNodeId: 'sys-sector-2', sourcePinId: '4', label: '4', subLabel: 'D4', subColor: '#f472b6' },
          { sourceNodeId: 'sys-sector-2', sourcePinId: '5', label: '5', subLabel: 'D5', subColor: '#f472b6' },
        ]
      ),
    },
    {
      id: 'c-q1ref',
      title: 'Q1 ÇIKIŞ (Sayfa 1)',
      subtitle: 'M1 Manuel Kumanda Fazı',
      x: 740,
      y: 38,
      width: 180,
      height: 62,
      accent: '#0ea5e9',
      pins: makePins(
        180,
        62,
        [],
        [{ sourceNodeId: 'q1', sourcePinId: '2', label: 'Q1:2', subLabel: 'L1', subColor: '#d97706' }]
      ),
    },
    {
      id: 'c-q2ref',
      title: 'Q2 ÇIKIŞ (Sayfa 1)',
      subtitle: 'M2 Manuel Kumanda Fazı',
      x: 980,
      y: 38,
      width: 180,
      height: 62,
      accent: '#0ea5e9',
      pins: makePins(
        180,
        62,
        [],
        [{ sourceNodeId: 'q2', sourcePinId: '2', label: 'Q2:2', subLabel: 'L1', subColor: '#d97706' }]
      ),
    },
    {
      id: 'c-neutral',
      title: 'PANO NÖTR (N)',
      subtitle: 'Bemis Dahili Bara',
      x: 1230,
      y: 38,
      width: 240,
      height: 66,
      accent: '#3b82f6',
      pins: makePins(
        240,
        66,
        [],
        [
          { sourceNodeId: 'sys-neutral', sourcePinId: 'N4', label: 'N4', subLabel: 'R1', subColor: '#60a5fa' },
          { sourceNodeId: 'sys-neutral', sourcePinId: 'N2', label: 'N2', subLabel: 'M1', subColor: '#60a5fa' },
          { sourceNodeId: 'sys-neutral', sourcePinId: 'N3', label: 'N3', subLabel: 'M2', subColor: '#60a5fa' },
        ]
      ),
    },

    // Satır 2 (Y = 205): Alt Klemens Sektör Kısmı (X6–X10) + İkiz Butonlar S1, S2
    {
      id: 'c-klem-sec',
      title: 'ALT KLEMENS (X6 – X10)',
      subtitle: 'Sektör Kumanda & Röle Bobin Girişi',
      x: 150,
      y: 205,
      width: 380,
      height: 70,
      accent: '#64748b',
      pins: makePins(
        380,
        70,
        [
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X6b', label: 'X6' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X7b', label: 'X7' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X8b', label: 'X8' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X9b', label: 'X9' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X10b', label: 'X10' },
        ],
        [
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X6a', label: 'X6' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X7a', label: 'X7' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X8a', label: 'X8' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X9a', label: 'X9' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X10a', label: 'X10' },
        ]
      ),
    },
    {
      id: 'c-s1',
      title: 'S1 (Sol Yan Buton)',
      subtitle: 'SW-BL4252 • M1 Manuel',
      x: 730,
      y: 200,
      width: 195,
      height: 82,
      accent: '#10b981',
      pins: makePins(
        195,
        82,
        [
          { sourceNodeId: 's1', sourcePinId: '13', label: '▲13' },
          { sourceNodeId: 's1', sourcePinId: '23', label: '▼23' },
        ],
        [
          { sourceNodeId: 's1', sourcePinId: '14', label: '▲14' },
          { sourceNodeId: 's1', sourcePinId: '24', label: '▼24' },
        ]
      ),
    },
    {
      id: 'c-s2',
      title: 'S2 (Sağ Yan Buton)',
      subtitle: 'SW-BL4252 • M2 Manuel',
      x: 975,
      y: 200,
      width: 195,
      height: 82,
      accent: '#10b981',
      pins: makePins(
        195,
        82,
        [
          { sourceNodeId: 's2', sourcePinId: '13', label: '▲13' },
          { sourceNodeId: 's2', sourcePinId: '23', label: '▼23' },
        ],
        [
          { sourceNodeId: 's2', sourcePinId: '14', label: '▲14' },
          { sourceNodeId: 's2', sourcePinId: '24', label: '▼24' },
        ]
      ),
    },

    // Satır 3 (Y = 395): R1 14 Pin Röle — Üst pinler X6..X10 + S1/S2 altında, Alt pinler KM1..KM4 hizasında!
    {
      id: 'c-r1',
      title: 'R1 • 14 PİN MİNİ RÖLE (OTO / MANUEL SEÇİCİ)',
      subtitle: 'Pasif (NC 1–4): Sektör Otomatik  |  Aktif (NO 5–8): Yan İkiz Butonlar Manuel',
      x: 150,
      y: 395,
      width: 1120,
      height: 110,
      accent: '#8b5cf6',
      pins: makePins(
        1120,
        110,
        [
          { sourceNodeId: 'r1', sourcePinId: '1', label: '1', subLabel: 'NC1', subColor: '#fbbf24' },
          { sourceNodeId: 'r1', sourcePinId: '2', label: '2', subLabel: 'NC2', subColor: '#fbbf24' },
          { sourceNodeId: 'r1', sourcePinId: '3', label: '3', subLabel: 'NC3', subColor: '#fbbf24' },
          { sourceNodeId: 'r1', sourcePinId: '4', label: '4', subLabel: 'NC4', subColor: '#fbbf24' },
          { sourceNodeId: 'r1', sourcePinId: '13', label: '13', subLabel: 'A1', subColor: '#f87171' },
          { sourceNodeId: 'r1', sourcePinId: '5', label: '5', subLabel: 'NO1', subColor: '#34d399' },
          { sourceNodeId: 'r1', sourcePinId: '6', label: '6', subLabel: 'NO2', subColor: '#34d399' },
          { sourceNodeId: 'r1', sourcePinId: '7', label: '7', subLabel: 'NO3', subColor: '#34d399' },
          { sourceNodeId: 'r1', sourcePinId: '8', label: '8', subLabel: 'NO4', subColor: '#34d399' },
          { sourceNodeId: 'r1', sourcePinId: '14', label: '14', subLabel: 'A2', subColor: '#60a5fa' },
        ],
        [
          { sourceNodeId: 'r1', sourcePinId: '10', label: '10', subLabel: 'C2→KM1', subColor: '#38bdf8' },
          { sourceNodeId: 'r1', sourcePinId: '9', label: '9', subLabel: 'C1→KM2', subColor: '#38bdf8' },
          { sourceNodeId: 'r1', sourcePinId: '12', label: '12', subLabel: 'C4→KM3', subColor: '#38bdf8' },
          { sourceNodeId: 'r1', sourcePinId: '11', label: '11', subLabel: 'C3→KM4', subColor: '#38bdf8' },
        ]
      ),
    },

    // Satır 4 (Y = 620): KM1–KM4 Kumanda & Elektriksel Kilitleme (Yalnızca 22, 21, A1, A2!)
    {
      id: 'c-km1',
      title: 'KM1 (M1 ↑)',
      subtitle: 'Kilitleme & Bobin',
      x: 110,
      y: 620,
      width: 220,
      height: 92,
      accent: '#f59e0b',
      pins: makePins(
        220,
        92,
        [
          { sourceNodeId: 'km1', sourcePinId: '22', label: '22', subLabel: 'NC', subColor: '#fbbf24' },
          { sourceNodeId: 'km1', sourcePinId: '21', label: '21', subLabel: 'NC', subColor: '#fbbf24' },
          { sourceNodeId: 'km1', sourcePinId: 'A1', label: 'A1', subLabel: 'Bobin', subColor: '#f87171' },
        ],
        [{ sourceNodeId: 'km1', sourcePinId: 'A2', label: 'A2', subLabel: 'Bobin (-)', subColor: '#60a5fa' }]
      ),
    },
    {
      id: 'c-km2',
      title: 'KM2 (M1 ↓)',
      subtitle: 'Kilitleme & Bobin',
      x: 410,
      y: 620,
      width: 220,
      height: 92,
      accent: '#f59e0b',
      pins: makePins(
        220,
        92,
        [
          { sourceNodeId: 'km2', sourcePinId: 'A1', label: 'A1', subLabel: 'Bobin', subColor: '#f87171' },
          { sourceNodeId: 'km2', sourcePinId: '21', label: '21', subLabel: 'NC', subColor: '#fbbf24' },
          { sourceNodeId: 'km2', sourcePinId: '22', label: '22', subLabel: 'NC', subColor: '#fbbf24' },
        ],
        [{ sourceNodeId: 'km2', sourcePinId: 'A2', label: 'A2', subLabel: 'Bobin (-)', subColor: '#60a5fa' }]
      ),
    },
    {
      id: 'c-km3',
      title: 'KM3 (M2 ↑)',
      subtitle: 'Kilitleme & Bobin',
      x: 770,
      y: 620,
      width: 220,
      height: 92,
      accent: '#f59e0b',
      pins: makePins(
        220,
        92,
        [
          { sourceNodeId: 'km3', sourcePinId: '22', label: '22', subLabel: 'NC', subColor: '#fbbf24' },
          { sourceNodeId: 'km3', sourcePinId: '21', label: '21', subLabel: 'NC', subColor: '#fbbf24' },
          { sourceNodeId: 'km3', sourcePinId: 'A1', label: 'A1', subLabel: 'Bobin', subColor: '#f87171' },
        ],
        [{ sourceNodeId: 'km3', sourcePinId: 'A2', label: 'A2', subLabel: 'Bobin (-)', subColor: '#60a5fa' }]
      ),
    },
    {
      id: 'c-km4',
      title: 'KM4 (M2 ↓)',
      subtitle: 'Kilitleme & Bobin',
      x: 1070,
      y: 620,
      width: 220,
      height: 92,
      accent: '#f59e0b',
      pins: makePins(
        220,
        92,
        [
          { sourceNodeId: 'km4', sourcePinId: 'A1', label: 'A1', subLabel: 'Bobin', subColor: '#f87171' },
          { sourceNodeId: 'km4', sourcePinId: '21', label: '21', subLabel: 'NC', subColor: '#fbbf24' },
          { sourceNodeId: 'km4', sourcePinId: '22', label: '22', subLabel: 'NC', subColor: '#fbbf24' },
        ],
        [{ sourceNodeId: 'km4', sourcePinId: 'A2', label: 'A2', subLabel: 'Bobin (-)', subColor: '#60a5fa' }]
      ),
    },

    // Satır 5 (Y = 795): Alt Klemens Limit Switch Kısmı (X4–X5 ve X11–X12)
    {
      id: 'c-klem-m1',
      title: 'ALT KLEMENS (X4 – X5)',
      subtitle: 'M1 Limit Dönüşleri',
      x: 170,
      y: 795,
      width: 400,
      height: 66,
      accent: '#64748b',
      pins: makePins(
        400,
        66,
        [
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X4a', label: 'X4' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X5a', label: 'X5' },
        ],
        [
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X4b', label: 'X4' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X5b', label: 'X5' },
        ]
      ),
    },
    {
      id: 'c-klem-m2',
      title: 'ALT KLEMENS (X11 – X12)',
      subtitle: 'M2 Limit Dönüşleri',
      x: 830,
      y: 795,
      width: 400,
      height: 66,
      accent: '#64748b',
      pins: makePins(
        400,
        66,
        [
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X11a', label: 'X11' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X12a', label: 'X12' },
        ],
        [
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X11b', label: 'X11' },
          { sourceNodeId: 'blk-bottom-terminals', sourcePinId: 'X12b', label: 'X12' },
        ]
      ),
    },

    // Satır 6 (Y = 945): Motor 1 & Motor 2 Limit Switch Uçları
    {
      id: 'c-m1',
      title: 'MOTOR 1 (M1 • Limit Switch)',
      subtitle: 'Damar 5 (Ortak N), 6 (L↑), 7 (L↓)',
      x: 170,
      y: 945,
      width: 400,
      height: 70,
      accent: '#06b6d4',
      pins: makePins(
        400,
        70,
        [
          { sourceNodeId: 'sys-m1', sourcePinId: '6', label: '6', subLabel: 'L↑', subColor: '#10b981' },
          { sourceNodeId: 'sys-m1', sourcePinId: '7', label: '7', subLabel: 'L↓', subColor: '#ec4899' },
          { sourceNodeId: 'sys-m1', sourcePinId: '5', label: '5', subLabel: 'C (N)', subColor: '#3b82f6' },
        ],
        []
      ),
    },
    {
      id: 'c-m2',
      title: 'MOTOR 2 (M2 • Limit Switch)',
      subtitle: 'Damar 5 (Ortak N), 6 (L↑), 7 (L↓)',
      x: 830,
      y: 945,
      width: 400,
      height: 70,
      accent: '#06b6d4',
      pins: makePins(
        400,
        70,
        [
          { sourceNodeId: 'sys-m2', sourcePinId: '6', label: '6', subLabel: 'L↑', subColor: '#10b981' },
          { sourceNodeId: 'sys-m2', sourcePinId: '7', label: '7', subLabel: 'L↓', subColor: '#ec4899' },
          { sourceNodeId: 'sys-m2', sourcePinId: '5', label: '5', subLabel: 'C (N)', subColor: '#3b82f6' },
        ],
        []
      ),
    },
  ];
}

// Temiz, deterministik, Left-Edge çakışmasız kanal yönlendirici (sıfır zikzak!)
function routeCleanPage(
  kind: CleanPageKind,
  blocks: CleanBlock[],
  allWires: SchematicWire[],
  width: number,
  height: number
): CleanPageData {
  // (sourceNodeId::sourcePinId) -> abs pin konumu
  const pinLookup = new Map<
    string,
    { x: number; y: number; side: 'top' | 'bottom'; blockId: string; blockY1: number; blockY2: number }
  >();
  for (const b of blocks) {
    for (const p of b.pins) {
      pinLookup.set(`${p.sourceNodeId}::${p.sourcePinId}`, {
        x: b.x + p.dx,
        y: b.y + p.dy,
        side: p.side,
        blockId: b.id,
        blockY1: b.y,
        blockY2: b.y + b.height,
      });
    }
  }

  // Koridor bantlarını blok satırlarından çıkar
  const rowBands: Array<{ y1: number; y2: number }> = [];
  for (const b of [...blocks].sort((a, c) => a.y - c.y)) {
    const last = rowBands[rowBands.length - 1];
    if (!last || b.y > last.y2 + 20) rowBands.push({ y1: b.y, y2: b.y + b.height });
    else last.y2 = Math.max(last.y2, b.y + b.height);
  }

  const corridors: Array<{ id: number; y1: number; y2: number; midY: number }> = [];
  corridors.push({ id: 0, y1: 10, y2: Math.max(24, rowBands[0].y1 - 12), midY: 18 });
  for (let i = 0; i < rowBands.length - 1; i++) {
    const a = rowBands[i].y2 + 12;
    const b = rowBands[i + 1].y1 - 12;
    corridors.push({ id: corridors.length, y1: a, y2: b, midY: (a + b) / 2 });
  }
  const lastBot = rowBands[rowBands.length - 1].y2;
  corridors.push({
    id: corridors.length,
    y1: lastBot + 14,
    y2: height - 14,
    midY: (lastBot + 14 + height - 14) / 2,
  });

  const nearestCorridor = (y: number) =>
    corridors.reduce((best, cur) =>
      Math.abs(cur.midY - y) < Math.abs(best.midY - y) ? cur : best
    );

  // Bu sayfaya ait kabloları filtrele ve planla
  const pageWires = allWires
    .map((w, idx) => ({ wire: w, index: idx + 1 }))
    .filter(({ wire }) => classifyWirePage(wire) === kind);

  const unmappedWires: SchematicWire[] = [];

  interface Planned {
    wire: SchematicWire;
    index: number;
    p1: { x: number; y: number; side: 'top' | 'bottom'; blockId: string };
    p2: { x: number; y: number; side: 'top' | 'bottom'; blockId: string };
    c1: number;
    c2: number;
    useRightTrunk: boolean;
    rightTrunkLane?: number;
  }

  const planned: Planned[] = [];
  let rightTrunkNext = 0;

  for (const { wire, index } of pageWires) {
    const a = pinLookup.get(`${wire.fromNodeId}::${wire.fromPinId}`);
    const b = pinLookup.get(`${wire.toNodeId}::${wire.toPinId}`);
    if (!a || !b) {
      unmappedWires.push(wire);
      continue;
    }

    const c1 = nearestCorridor(a.side === 'top' ? a.y - 26 : a.y + 26).id;
    const c2 = nearestCorridor(b.side === 'top' ? b.y - 26 : b.y + 26).id;

    // Birden fazla satır atlayan (örn. PE -> M1/M2 veya N2/N3 -> M1/M2) kablolar temiz sağ dış kanaldan geçer!
    const rowJump = Math.abs(c1 - c2) >= 2;
    const isRightBus =
      rowJump ||
      wire.fromNodeId === 'sys-pe' ||
      wire.toNodeId === 'sys-pe' ||
      (kind === 'control' &&
        (wire.fromNodeId === 'sys-neutral' || wire.toNodeId === 'sys-neutral') &&
        (wire.fromNodeId.startsWith('sys-m') || wire.toNodeId.startsWith('sys-m')));

    planned.push({
      wire,
      index,
      p1: a,
      p2: b,
      c1,
      c2,
      useRightTrunk: isRightBus,
      rightTrunkLane: isRightBus ? rightTrunkNext++ : undefined,
    });
  }

  // Her koridordaki yatay segmentleri Left-Edge ile çakışmasız paralel şeritlere ayır
  const corridorIntervals = new Map<number, Array<{ id: string; a: number; b: number; color: string }>>();
  const pushH = (cid: number, id: string, a: number, b: number, color: string) => {
    const list = corridorIntervals.get(cid) ?? [];
    list.push({ id, a, b, color });
    corridorIntervals.set(cid, list);
  };

  const trunkBaseX = width - 78;
  const trunkXFor = (lane: number) => trunkBaseX + lane * 14;

  for (const pl of planned) {
    if (pl.useRightTrunk && pl.rightTrunkLane !== undefined) {
      const tx = trunkXFor(pl.rightTrunkLane);
      pushH(pl.c1, `${pl.wire.id}:1`, pl.p1.x, tx, pl.wire.color);
      pushH(pl.c2, `${pl.wire.id}:2`, tx, pl.p2.x, pl.wire.color);
    } else if (pl.c1 === pl.c2) {
      pushH(pl.c1, `${pl.wire.id}:s`, pl.p1.x, pl.p2.x, pl.wire.color);
    } else {
      // Komşu koridor geçişi (arada blok satırı varsa açık koridor ortasından dikey geçiş)
      const midX = (pl.p1.x + pl.p2.x) / 2;
      pushH(pl.c1, `${pl.wire.id}:1`, pl.p1.x, midX, pl.wire.color);
      pushH(pl.c2, `${pl.wire.id}:2`, midX, pl.p2.x, pl.wire.color);
    }
  }

  // Left-Edge şerit dağıtımı (aynı koridorda hiçbir iki yatay kablo çakışmaz)
  const laneYMap = new Map<string, number>();
  for (const [cid, list] of corridorIntervals.entries()) {
    const corr = corridors[cid];
    const sorted = [...list]
      .map((it) => ({ ...it, s: Math.min(it.a, it.b), e: Math.max(it.a, it.b) }))
      .sort((u, v) => u.s - v.s || u.e - v.e);

    const trackEnds: number[] = [];
    const segTrack = new Map<string, number>();
    for (const seg of sorted) {
      if (seg.e - seg.s < 2) {
        segTrack.set(seg.id, 0);
        continue;
      }
      let assigned = -1;
      for (let t = 0; t < trackEnds.length; t++) {
        if (trackEnds[t] + 12 <= seg.s) {
          assigned = t;
          trackEnds[t] = seg.e;
          break;
        }
      }
      if (assigned === -1) {
        assigned = trackEnds.length;
        trackEnds.push(seg.e);
      }
      segTrack.set(seg.id, assigned);
    }

    const count = Math.max(1, trackEnds.length);
    const usable = Math.max(14, corr.y2 - corr.y1);
    const step = Math.min(13, usable / (count + 1));
    const span = step * (count - 1);
    const startY = corr.midY - span / 2;
    for (const seg of sorted) {
      const t = segTrack.get(seg.id) ?? 0;
      laneYMap.set(seg.id, Math.round(startY + t * step));
    }
  }

  // Noktaları oluştur
  const rawRouted: Array<{ wire: SchematicWire; index: number; points: SchematicPoint[] }> = [];
  for (const pl of planned) {
    let pts: SchematicPoint[];
    if (pl.useRightTrunk && pl.rightTrunkLane !== undefined) {
      const tx = trunkXFor(pl.rightTrunkLane);
      const y1 = laneYMap.get(`${pl.wire.id}:1`) ?? corridors[pl.c1].midY;
      const y2 = laneYMap.get(`${pl.wire.id}:2`) ?? corridors[pl.c2].midY;
      pts = [
        { x: pl.p1.x, y: pl.p1.y },
        { x: pl.p1.x, y: y1 },
        { x: tx, y: y1 },
        { x: tx, y: y2 },
        { x: pl.p2.x, y: y2 },
        { x: pl.p2.x, y: pl.p2.y },
      ];
    } else if (pl.c1 === pl.c2) {
      if (Math.abs(pl.p1.x - pl.p2.x) <= 4 && pl.p1.side !== pl.p2.side) {
        // Tam hizalı dikey düz çizgi!
        pts = [
          { x: pl.p1.x, y: pl.p1.y },
          { x: pl.p2.x, y: pl.p2.y },
        ];
      } else {
        const y = laneYMap.get(`${pl.wire.id}:s`) ?? corridors[pl.c1].midY;
        pts = [
          { x: pl.p1.x, y: pl.p1.y },
          { x: pl.p1.x, y },
          { x: pl.p2.x, y },
          { x: pl.p2.x, y: pl.p2.y },
        ];
      }
    } else {
      const y1 = laneYMap.get(`${pl.wire.id}:1`) ?? corridors[pl.c1].midY;
      const y2 = laneYMap.get(`${pl.wire.id}:2`) ?? corridors[pl.c2].midY;
      // Aradaki bloklara çarpmayan en yakın açık dikey boşluğu bul
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const midBlocks = blocks
        .filter((b) => b.y + b.height > minY + 4 && b.y < maxY - 4)
        .sort((u, v) => u.x - v.x);
      let vx = Math.round((pl.p1.x + pl.p2.x) / 2);
      const hitsBlock = (x: number) => midBlocks.some((b) => x > b.x - 10 && x < b.x + b.width + 10);
      if (hitsBlock(vx)) {
        const candidates: number[] = [24, width - 30];
        for (let i = 0; i < midBlocks.length - 1; i++) {
          const g1 = midBlocks[i].x + midBlocks[i].width;
          const g2 = midBlocks[i + 1].x;
          if (g2 - g1 >= 26) candidates.push(Math.round((g1 + g2) / 2));
        }
        vx = candidates.reduce((best, c) =>
          Math.abs(c - vx) < Math.abs(best - vx) ? c : best
        );
      }
      pts = [
        { x: pl.p1.x, y: pl.p1.y },
        { x: pl.p1.x, y: y1 },
        { x: vx, y: y1 },
        { x: vx, y: y2 },
        { x: pl.p2.x, y: y2 },
        { x: pl.p2.x, y: pl.p2.y },
      ];
    }

    // Ardışık çakışan noktaları sadeleştir
    const cleanPts: SchematicPoint[] = [];
    for (const pt of pts) {
      const prev = cleanPts[cleanPts.length - 1];
      if (!prev || Math.abs(prev.x - pt.x) > 0.5 || Math.abs(prev.y - pt.y) > 0.5) {
        cleanPts.push(pt);
      }
    }
    rawRouted.push({ wire: pl.wire, index: pl.index, points: cleanPts });
  }

  // Kesişim atlama yayları (∩) için tüm dikey segmentleri topla
  const vSegs: Array<{ id: string; x: number; y1: number; y2: number }> = [];
  for (const r of rawRouted) {
    for (let i = 0; i < r.points.length - 1; i++) {
      const a = r.points[i];
      const b = r.points[i + 1];
      if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) > 6) {
        vSegs.push({ id: r.wire.id, x: a.x, y1: Math.min(a.y, b.y), y2: Math.max(a.y, b.y) });
      }
    }
  }

  const buildPath = (id: string, pts: SchematicPoint[]): string => {
    if (pts.length < 2) return '';
    const hopR = 5;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const isH = Math.abs(a.y - b.y) < 1 && Math.abs(a.x - b.x) > hopR * 3;
      if (!isH) {
        d += ` L ${b.x} ${b.y}`;
        continue;
      }
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const right = b.x > a.x;
      const xs = vSegs
        .filter(
          (vs) =>
            vs.id !== id &&
            vs.x > minX + hopR + 3 &&
            vs.x < maxX - hopR - 3 &&
            a.y > vs.y1 + 3 &&
            a.y < vs.y2 - 3
        )
        .map((vs) => vs.x)
        .sort((u, v) => (right ? u - v : v - u));

      const filtered: number[] = [];
      for (const cx of xs) {
        const last = filtered[filtered.length - 1];
        if (last === undefined || Math.abs(cx - last) >= hopR * 2 + 2) filtered.push(cx);
      }
      for (const cx of filtered) {
        if (right) d += ` L ${cx - hopR} ${a.y} A ${hopR} ${hopR} 0 0 1 ${cx + hopR} ${a.y}`;
        else d += ` L ${cx + hopR} ${a.y} A ${hopR} ${hopR} 0 0 0 ${cx - hopR} ${a.y}`;
      }
      d += ` L ${b.x} ${b.y}`;
    }
    return d;
  };

  // Aynı pine bağlanan çoklu kablolar için pin ucuna ek noktası (•) ekle
  const pinCounts = new Map<string, { x: number; y: number; color: string; count: number }>();
  for (const r of rawRouted) {
    const p1 = r.points[0];
    const p2 = r.points[r.points.length - 1];
    for (const pt of [p1, p2]) {
      const k = `${Math.round(pt.x)},${Math.round(pt.y)}`;
      const cur = pinCounts.get(k);
      if (cur) cur.count += 1;
      else pinCounts.set(k, { x: pt.x, y: pt.y, color: r.wire.color, count: 1 });
    }
  }
  const junctions = Array.from(pinCounts.values())
    .filter((v) => v.count >= 2)
    .map(({ x, y, color }) => ({ x, y, color }));

  const routedWires: CleanRoutedWire[] = rawRouted.map((r, i) => {
    // En uzun segmentte kademeli etiket noktası
    let bestIdx = 0;
    let bestLen = -1;
    for (let k = 0; k < r.points.length - 1; k++) {
      const len = Math.hypot(r.points[k + 1].x - r.points[k].x, r.points[k + 1].y - r.points[k].y);
      if (len > bestLen) {
        bestLen = len;
        bestIdx = k;
      }
    }
    const a = r.points[bestIdx];
    const b = r.points[bestIdx + 1];
    const slots = [0.5, 0.35, 0.65, 0.42, 0.58];
    const t = slots[i % slots.length];
    return {
      wire: r.wire,
      index: r.index,
      points: r.points,
      pathD: buildPath(r.wire.id, r.points),
      labelPoint: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
      stripeHex: r.wire.color.toLowerCase() === PE_HEX ? PE_STRIPE : undefined,
    };
  });

  const notes =
    kind === 'power'
      ? [
          { x: 290, y: 432, text: 'Q1:2 → S1 (Sayfa 2)', color: '#38bdf8' },
          { x: 840, y: 432, text: 'Q2:2 → S2 (Sayfa 2)', color: '#38bdf8' },
        ]
      : [
          { x: 370, y: 668, text: 'KM1 ↔ KM2', color: '#84cc16' },
          { x: 370, y: 682, text: 'Kilitleme', color: '#84cc16' },
          { x: 1030, y: 668, text: 'KM3 ↔ KM4', color: '#84cc16' },
          { x: 1030, y: 682, text: 'Kilitleme', color: '#84cc16' },
        ];

  return {
    kind,
    title:
      kind === 'power'
        ? 'SAYFA 1 — 3 FAZ GÜÇ ŞEMASI (Bemis BH6-6000-0000)'
        : 'SAYFA 2 — KUMANDA & OTOMASYON ŞEMASI (Bemis BH6-6000-0000)',
    subtitle:
      kind === 'power'
        ? 'Besleme 5×2,5 → X1–X3 → Q1/Q2 → KM1–KM4 Güç → M1/M2 Motorlar & PE'
        : 'Sektör Kumanda 1–2 & S1/S2 İkiz Butonlar → R1 (14 Pin) → KM1–KM4 Kilitleme → Limit Switchler & N',
    width,
    height,
    blocks,
    wires: routedWires,
    junctions,
    unmappedWires,
    notes,
  };
}

export function buildTwoPageSchematics(wires: SchematicWire[]): {
  power: CleanPageData;
  control: CleanPageData;
} {
  return {
    power: routeCleanPage('power', getPowerBlocks(), wires, 1360, 880),
    control: routeCleanPage('control', getControlBlocks(), wires, 1580, 1080),
  };
}

export function getBlockTitlePositions(b: CleanBlock): { titleY: number; subtitleY: number } {
  const hasTop = b.pins.some((p) => p.side === 'top');
  const hasBot = b.pins.some((p) => p.side === 'bottom');
  if (hasBot && !hasTop) {
    return { titleY: 22, subtitleY: 35 };
  }
  if (hasTop && !hasBot) {
    return { titleY: b.height - 23, subtitleY: b.height - 10 };
  }
  return { titleY: b.height / 2 - 2, subtitleY: b.height / 2 + 12 };
}

/**
 * Doğrudan indirilebilir / önizlenebilir tek başına SVG metni üretir.
 */
export function renderCleanPageToSvgString(page: CleanPageData, showLabels = false): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" width="${page.width}" height="${page.height}" style="background:#0b1220;font-family:system-ui,sans-serif">`
  );
  lines.push(
    `<defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#152036" stroke-width="0.8"/></pattern></defs>`
  );
  lines.push(`<rect width="${page.width}" height="${page.height}" fill="#0b1220"/>`);
  lines.push(`<rect width="${page.width}" height="${page.height}" fill="url(#g)"/>`);
  lines.push(
    `<text x="24" y="24" fill="#f8fafc" font-size="14" font-weight="700">${esc(page.title)}</text>`
  );
  lines.push(
    `<text x="${page.width - 24}" y="24" text-anchor="end" fill="#94a3b8" font-size="11">${esc(page.subtitle)} (${page.wires.length} kablo)</text>`
  );

  // Kablolar
  for (const rw of page.wires) {
    const sw = rw.wire.sectionMm2 === '2,5' ? 3.2 : 2.4;
    lines.push(
      `<path d="${rw.pathD}" fill="none" stroke="#0b1220" stroke-width="${sw + 3.2}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
    lines.push(
      `<path d="${rw.pathD}" fill="none" stroke="${rw.wire.color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
    );
    if (rw.stripeHex) {
      lines.push(
        `<path d="${rw.pathD}" fill="none" stroke="${rw.stripeHex}" stroke-width="${sw}" stroke-dasharray="6 6" stroke-linejoin="round"/>`
      );
    }
    if (showLabels) {
      lines.push(
        `<rect x="${rw.labelPoint.x - 13}" y="${rw.labelPoint.y - 8}" width="26" height="15" rx="3" fill="#0f172a" stroke="${rw.wire.color}" stroke-width="1"/>`
      );
      lines.push(
        `<text x="${rw.labelPoint.x}" y="${rw.labelPoint.y + 3}" text-anchor="middle" fill="#f8fafc" font-size="9" font-weight="700">${esc(rw.wire.label || String(rw.index))}</text>`
      );
    }
  }

  // Ek noktaları
  for (const j of page.junctions) {
    lines.push(`<circle cx="${j.x}" cy="${j.y}" r="4" fill="${j.color}" stroke="#0b1220" stroke-width="1.2"/>`);
  }

  // Bloklar ve pinler
  for (const b of page.blocks) {
    const { titleY, subtitleY } = getBlockTitlePositions(b);
    lines.push(`<g transform="translate(${b.x},${b.y})">`);
    lines.push(
      `<rect width="${b.width}" height="${b.height}" rx="6" fill="#131e33" stroke="${b.accent}" stroke-width="1.6"/>`
    );
    lines.push(`<rect width="${b.width}" height="4" rx="2" fill="${b.accent}"/>`);
    lines.push(
      `<text x="${b.width / 2}" y="${titleY}" text-anchor="middle" fill="#f8fafc" font-size="11.5" font-weight="700">${esc(b.title)}</text>`
    );
    lines.push(
      `<text x="${b.width / 2}" y="${subtitleY}" text-anchor="middle" fill="#94a3b8" font-size="9">${esc(b.subtitle)}</text>`
    );
    for (const p of b.pins) {
      lines.push(
        `<circle cx="${p.dx}" cy="${p.dy}" r="4.8" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.5"/>`
      );
      const ly = p.side === 'top' ? 15 : b.height - (p.subLabel ? 16 : 9);
      lines.push(
        `<text x="${p.dx}" y="${ly}" text-anchor="middle" fill="#f1f5f9" font-size="8.8" font-weight="700">${esc(p.label)}</text>`
      );
      if (p.subLabel) {
        const sy = p.side === 'top' ? 25 : b.height - 6;
        lines.push(
          `<text x="${p.dx}" y="${sy}" text-anchor="middle" fill="${p.subColor ?? '#94a3b8'}" font-size="7.5" font-weight="600">${esc(p.subLabel)}</text>`
        );
      }
    }
    lines.push(`</g>`);
  }

  // Notlar
  for (const n of page.notes) {
    lines.push(`<text x="${n.x}" y="${n.y}" text-anchor="middle" fill="${n.color}" font-size="10" font-weight="600">${esc(n.text)}</text>`);
  }

  lines.push(`</svg>`);
  return lines.join('\n');
}
