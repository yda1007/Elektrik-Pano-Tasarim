import type {
  EnclosureSpec,
  FieldCableSpec,
  GlandFillResult,
  LayoutAnalysis,
  PanelItem,
  ProjectMeta,
  SchematicWire,
  TerminalStripRow,
  ThermalAnalysis,
  WireCutRow,
} from '../types/panel';

const DEFAULT_POWER_LOSS_W: Record<string, number> = {
  mks: 5.2,
  breaker: 2.5,
  contactor: 2.4,
  relay: 1.5,
  psu: 6.5,
  plc: 3.5,
  terminal: 0.2,
  busbar: 0.2,
  button: 0.1,
  gland: 0,
  stopper: 0,
  duct: 0,
};

export function getItemPowerLossW(item: PanelItem): number {
  if (typeof item.powerLossW === 'number' && !Number.isNaN(item.powerLossW)) {
    return Math.max(0, item.powerLossW);
  }
  return DEFAULT_POWER_LOSS_W[item.category] ?? 0;
}

/**
 * IEC 60890 duvar tipi kapalı pano (tüm yüzeyler açık hariç arka duvar) basitleştirilmiş ısıl hesabı.
 * Ae = 1.4*W*H + 1.4*H*D + 1.4*W*D (duvara monte, tek gövde yaklaşımı — IEC 60890 Tablo 1)
 * ΔT ≈ P / (k * Ae)  (ABS/Polikarbonat k ≈ 3.5 W/m²K, Boyalı Sac k ≈ 5.5 W/m²K)
 */
export function calculateThermalAnalysis(
  items: PanelItem[],
  enclosure: EnclosureSpec,
  meta: ProjectMeta
): ThermalAnalysis {
  const wM = enclosure.outerWidthMm / 1000;
  const hM = enclosure.outerHeightMm / 1000;
  const dM = enclosure.outerDepthMm / 1000;

  // Duvara monte kapalı pano etkin soğutma yüzey alanı (arka yüz hariç, IEC 60890 duvar montaj katsayıları)
  // Ön: 1.4*W*H, Yanlar: 2*0.9*H*D, Üst: 1.4*W*D, Alt: 0.7*W*D
  const effectiveSurfaceM2 = Number(
    (1.4 * wM * hM + 1.8 * hM * dM + 1.4 * wM * dM + 0.7 * wM * dM).toFixed(3)
  );

  const kValue =
    enclosure.thermalK ??
    (enclosure.materialType === 'steel'
      ? 5.5
      : enclosure.materialType === 'stainless'
        ? 4.5
        : 3.5);

  const sources = items
    .map((it) => ({ code: it.code, name: it.name, watts: getItemPowerLossW(it) }))
    .filter((s) => s.watts > 0)
    .sort((a, b) => b.watts - a.watts);

  // İç kablolama ısıl katkısı %10 güvenlik payı
  const componentWatts = sources.reduce((acc, s) => acc + s.watts, 0);
  const totalPowerLossW = Number((componentWatts * 1.1).toFixed(1));

  // Eşzamanlılık faktörü (RDF ~0.85, örn. yön değiştirmeli kontaktörlerin ikisi aynı anda çekmez)
  const effectiveWatts = totalPowerLossW * 0.85;
  const deltaTC = Number((effectiveWatts / Math.max(0.05, kValue * effectiveSurfaceM2)).toFixed(1));
  const ambientTempC = meta.ambientTempC ?? 35;
  const maxAllowedTempC = meta.maxInternalTempC ?? 55;
  const estimatedInternalTempC = Number((ambientTempC + deltaTC).toFixed(1));

  let status: 'ok' | 'warning' | 'error' = 'ok';
  let recommendation =
    'Doğal soğutma yeterli. Pano içi sıcaklık güvenli çalışma sınırları içinde kalıyor.';

  if (estimatedInternalTempC > maxAllowedTempC) {
    status = 'error';
    recommendation = `Pano içi sıcaklık (${estimatedInternalTempC}°C) sınırı (${maxAllowedTempC}°C) aşıyor! Daha büyük/sac pano, IP54 filtreli fan veya gölgeleme kalkanı önerilir.`;
  } else if (estimatedInternalTempC > maxAllowedTempC - 6) {
    status = 'warning';
    recommendation = `Pano içi sıcaklık sınıra yakın (${estimatedInternalTempC}°C / maks ${maxAllowedTempC}°C). Sıcak sera/güneş altında basınç dengeleme menfezi veya üst boy kasa düşünün.`;
  }

  return {
    totalPowerLossW,
    effectiveSurfaceM2,
    kValue,
    deltaTC,
    ambientTempC,
    estimatedInternalTempC,
    maxAllowedTempC,
    status,
    recommendation,
    topHeatSources: sources.slice(0, 5),
  };
}

/** Rakor & Spiral Boru Doluluk (%) Hesabı */
export function calculateGlandFills(
  items: PanelItem[],
  fieldCables: FieldCableSpec[]
): GlandFillResult[] {
  const glands = items.filter((i) => i.category === 'gland');
  if (glands.length === 0) return [];

  const suggestGland = (neededAreaMm2: number): string | undefined => {
    // %50 doluluk hedefi için gereken iç çap
    const targetInnerD = Math.sqrt((neededAreaMm2 / 0.5 / Math.PI)) * 2;
    if (targetInnerD <= 18) return 'PG21 (İç Ø18 mm)';
    if (targetInnerD <= 25) return 'PG29 (İç Ø25 mm)';
    if (targetInnerD <= 36) return 'PG36 / ODB-42 (İç Ø36 mm)';
    if (targetInnerD <= 44) return 'PG42 / ODB-50 (İç Ø44 mm)';
    return '2× PG36 veya M50/M63 çift giriş';
  };

  return glands.map((g, idx) => {
    const innerDiameterMm =
      g.innerPassageMm ??
      (g.holeDiameterMm ? Math.max(10, Math.round(g.holeDiameterMm * 0.74)) : 36);
    const innerAreaMm2 = Math.PI * (innerDiameterMm / 2) ** 2;

    const assignedCables = fieldCables.filter((c) => {
      if (c.targetGlandId) return c.targetGlandId === g.id;
      return idx === 0; // Hedef seçilmemiş kablolar ilk rakora yazılır
    });

    const cableCount = assignedCables.reduce((s, c) => s + Math.max(0, c.count), 0);
    const totalCableAreaMm2 = assignedCables.reduce(
      (s, c) => s + Math.max(0, c.count) * Math.PI * (Math.max(1, c.outerDiameterMm) / 2) ** 2,
      0
    );

    const fillPercent = Math.round((totalCableAreaMm2 / Math.max(1, innerAreaMm2)) * 100);
    const status: 'ok' | 'warning' | 'error' =
      fillPercent > 70 ? 'error' : fillPercent > 50 ? 'warning' : 'ok';

    return {
      glandId: g.id,
      glandCode: g.code,
      glandModel: g.model,
      innerDiameterMm,
      innerAreaMm2: Math.round(innerAreaMm2),
      cableCount,
      totalCableAreaMm2: Math.round(totalCableAreaMm2),
      fillPercent,
      status,
      suggestedGland: status !== 'ok' ? suggestGland(totalCableAreaMm2) : undefined,
    };
  });
}

const MOUNT_SHORT: Record<string, string> = {
  'top-rail': 'Ray 1',
  'bottom-rail': 'Ray 2',
  'rail-3': 'Ray 3',
  'rail-4': 'Ray 4',
  backplate: 'Taban',
};

const EXTERNAL_NODES = new Set([
  'sys-supply',
  'sys-m1',
  'sys-m2',
  'sys-sector-1',
  'sys-sector-2',
]);

function friendlyNodeName(nodeId: string, items: PanelItem[]): string {
  const staticMap: Record<string, string> = {
    'sys-supply': 'Ana Besleme',
    'sys-neutral': 'N Barası',
    'sys-pe': 'PE Barası',
    'sys-m1': 'Motor 1 (M1)',
    'sys-m2': 'Motor 2 (M2)',
    'sys-sector-1': 'Sektör Kumanda 1',
    'sys-sector-2': 'Sektör Kumanda 2',
    'blk-top-terminals': 'Üst Klemens',
    'blk-bottom-terminals': 'Alt Klemens',
  };
  if (staticMap[nodeId]) return staticMap[nodeId];
  const found = items.find((i) => i.id === nodeId);
  return found ? found.code : nodeId;
}

/**
 * Klemens Bağlantı Planı (EPLAN / SkyCAD Terminal Strip Plan)
 * Her klemens için iç pano uçları, dış saha uçları ve köprüleri çıkarır.
 */
export function buildTerminalStripPlan(
  items: PanelItem[],
  wires: SchematicWire[]
): TerminalStripRow[] {
  const terminals = items
    .filter((i) => i.category === 'terminal')
    .sort((a, b) => {
      if (a.mount !== b.mount) return a.mount.localeCompare(b.mount);
      return a.order - b.order;
    });

  return terminals.map((t) => {
    const codeUpper = t.code.toUpperCase();
    const internalConnections: TerminalStripRow['internalConnections'] = [];
    const fieldConnections: TerminalStripRow['fieldConnections'] = [];
    const jumperSet = new Set<string>();

    const matchesTerminalEnd = (nodeId: string, pinId: string): boolean => {
      if (nodeId === t.id) return true;
      if (nodeId === 'blk-top-terminals' || nodeId === 'blk-bottom-terminals') {
        const pinCode = pinId.replace(/-(in|out)$/i, '').toUpperCase();
        return pinCode === codeUpper;
      }
      return false;
    };

    for (let i = 0; i < wires.length; i++) {
      const w = wires[i];
      const wireNo = w.label || String(i + 1);
      const fromIsThis = matchesTerminalEnd(w.fromNodeId, w.fromPinId);
      const toIsThis = matchesTerminalEnd(w.toNodeId, w.toPinId);
      if (!fromIsThis && !toIsThis) continue;

      const otherNode = fromIsThis ? w.toNodeId : w.fromNodeId;
      const otherPin = fromIsThis ? w.toPinId : w.fromPinId;
      const thisPin = fromIsThis ? w.fromPinId : w.toPinId;

      // Başka bir klemense gidiyorsa köprü (jumper) olarak da işaretle
      if (
        (otherNode === 'blk-top-terminals' || otherNode === 'blk-bottom-terminals') &&
        otherPin.replace(/-(in|out)$/i, '').toUpperCase() !== codeUpper
      ) {
        jumperSet.add(otherPin.replace(/-(in|out)$/i, '').toUpperCase());
      }

      const targetLabel = `${friendlyNodeName(otherNode, items)}:${otherPin}`;
      const entry = {
        wireNo,
        target: targetLabel,
        colorHex: w.color,
        sectionMm2: w.sectionMm2,
      };

      const isFieldSide =
        EXTERNAL_NODES.has(otherNode) || thisPin.toLowerCase().endsWith('-out');
      if (isFieldSide) {
        fieldConnections.push(entry);
      } else {
        internalConnections.push(entry);
      }
    }

    return {
      terminalId: t.id,
      code: t.code,
      mountLabel: MOUNT_SHORT[t.mount] ?? t.mount,
      rating: t.rating ?? `${t.widthMm} mm`,
      color: t.color,
      internalConnections,
      fieldConnections,
      jumperToCodes: Array.from(jumperSet),
    };
  });
}

/**
 * Gerçek pano yerleşimindeki (X, Y) koordinatlarına göre kablo kesim & yüksük listesi hesaplar.
 * Manhattan mesafesi + %25 kanal/bükülme payı + 6 cm soyma/uç payı.
 */
export function estimateWireCutList(
  items: PanelItem[],
  analysis: LayoutAnalysis,
  wires: SchematicWire[]
): WireCutRow[] {
  const posById = new Map<string, { x: number; y: number }>();
  const posByCode = new Map<string, { x: number; y: number }>();

  for (const p of analysis.placed) {
    const pt = {
      x: (p.box.x1 + p.box.x2) / 2,
      y: (p.box.y1 + p.box.y2) / 2,
    };
    posById.set(p.item.id, pt);
    posByCode.set(p.item.code.toUpperCase(), pt);
  }

  const gland = analysis.placed.find((p) => p.item.category === 'gland');
  const glandPt = gland
    ? { x: (gland.box.x1 + gland.box.x2) / 2, y: (gland.box.y1 + gland.box.y2) / 2 }
    : { x: 122, y: 300 };

  const resolvePoint = (nodeId: string, pinId: string): { x: number; y: number } => {
    if (posById.has(nodeId)) return posById.get(nodeId)!;
    if (nodeId === 'sys-neutral') return posById.get('n-bar') ?? { x: 80, y: 22 };
    if (nodeId === 'sys-pe') return posById.get('pe-bar') ?? { x: 165, y: 22 };
    if (EXTERNAL_NODES.has(nodeId)) return glandPt;
    if (nodeId === 'blk-top-terminals' || nodeId === 'blk-bottom-terminals') {
      const code = pinId.replace(/-(in|out)$/i, '').toUpperCase();
      if (posByCode.has(code)) return posByCode.get(code)!;
    }
    return { x: 120, y: 150 };
  };

  return wires.map((w, idx) => {
    const p1 = resolvePoint(w.fromNodeId, w.fromPinId);
    const p2 = resolvePoint(w.toNodeId, w.toPinId);
    const manhattanMm = Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
    // %25 kanal/dönüş payı + 60 mm iki uç soyma/bağlantı payı
    const estimatedLengthCm = Math.max(10, Math.round((manhattanMm * 1.25 + 60) / 10));
    const wireNo = w.label || String(idx + 1);
    const fromCode = friendlyNodeName(w.fromNodeId, items);
    const toCode = friendlyNodeName(w.toNodeId, items);

    return {
      wireId: w.id,
      wireNo,
      fromText: `${fromCode}:${w.fromPinId}`,
      toText: `${toCode}:${w.toPinId}`,
      colorHex: w.color,
      sectionMm2: w.sectionMm2,
      estimatedLengthCm,
      ferruleFrom: `${wireNo} / ${fromCode}.${w.fromPinId}`,
      ferruleTo: `${wireNo} / ${toCode}.${w.toPinId}`,
    };
  });
}
