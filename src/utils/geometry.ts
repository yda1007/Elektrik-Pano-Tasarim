import type {
  Box3D,
  EnclosureSpec,
  LayoutAnalysis,
  LayoutIssue,
  PanelItem,
  PlacedItem,
  RailGapMetric,
  RailId,
  RailMetrics,
  RailSpec,
} from '../types/panel';

const RAIL_IDS: Set<string> = new Set(['top-rail', 'bottom-rail', 'rail-3', 'rail-4']);

export function isRailMount(mount: string): mount is RailId {
  return RAIL_IDS.has(mount);
}

export function normalizeRails(
  railsInput: RailSpec[] | Record<'top-rail' | 'bottom-rail', RailSpec>
): RailSpec[] {
  if (Array.isArray(railsInput)) {
    return [...railsInput].sort((a, b) => a.centerYMm - b.centerYMm);
  }
  return [railsInput['top-rail'], railsInput['bottom-rail']].filter(Boolean);
}

function boxesOverlap3D(a: Box3D, b: Box3D, tolerance = 0.5): boolean {
  const ox = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
  const oy = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
  const oz = Math.min(a.z2, b.z2) - Math.max(a.z1, b.z1);
  return ox > tolerance && oy > tolerance && oz > tolerance;
}

export function getWallOffsets(enclosure: EnclosureSpec) {
  const wallX = (enclosure.outerWidthMm - enclosure.innerWidthMm) / 2;
  const wallY = (enclosure.outerHeightMm - enclosure.innerHeightMm) / 2;
  const backWallZ = 6;
  return {
    wallX,
    wallY,
    backWallZ,
    innerX1: wallX,
    innerX2: enclosure.outerWidthMm - wallX,
    innerY1: wallY,
    innerY2: enclosure.outerHeightMm - wallY,
    innerZ1: backWallZ,
    innerZ2: backWallZ + enclosure.innerDepthMm,
  };
}

function layoutRail(
  items: PanelItem[],
  rail: RailSpec,
  enclosure: EnclosureSpec
): { placed: PlacedItem[]; metrics: RailMetrics } {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const usedWidthMm = sorted.reduce((sum, item) => sum + item.widthMm, 0);
  const railStartX = (enclosure.outerWidthMm - rail.usableWidthMm) / 2;
  const backWallZ = getWallOffsets(enclosure).backWallZ;

  let cursorX =
    usedWidthMm <= rail.usableWidthMm
      ? railStartX + (rail.usableWidthMm - usedWidthMm) / 2
      : railStartX;

  let maxHeightMm = 0;
  let maxDepthMm = 0;

  const placed: PlacedItem[] = sorted.map((item) => {
    const x1 = cursorX;
    const x2 = cursorX + item.widthMm;
    const y1 = rail.centerYMm - item.heightMm / 2;
    const y2 = rail.centerYMm + item.heightMm / 2;
    const z1 = backWallZ + rail.standoffZMm;
    const z2 = z1 + item.depthMm;

    cursorX = x2;
    if (item.heightMm > maxHeightMm) maxHeightMm = item.heightMm;
    if (item.depthMm > maxDepthMm) maxDepthMm = item.depthMm;

    return {
      item,
      box: { x1, x2, y1, y2, z1, z2 },
    };
  });

  const remainingMm = Number((rail.usableWidthMm - usedWidthMm).toFixed(1));

  return {
    placed,
    metrics: {
      railId: rail.id,
      railName: rail.name,
      usedWidthMm: Number(usedWidthMm.toFixed(1)),
      usableWidthMm: rail.usableWidthMm,
      remainingMm,
      maxHeightMm,
      maxDepthMm,
      itemCount: sorted.length,
      overflow: usedWidthMm > rail.usableWidthMm + 0.05,
    },
  };
}

function layoutSideItem(item: PanelItem, enclosure: EnclosureSpec): PlacedItem {
  const { innerX1, innerX2 } = getWallOffsets(enclosure);
  const posY = item.posYMm ?? Math.min(262, enclosure.outerHeightMm - 55);
  const posZ = item.posZMm ?? Math.min(48, Math.round(enclosure.baseDepthMm * 0.55));
  const halfH = item.heightMm / 2;
  const halfW = item.widthMm / 2;
  const wire = item.wireClearanceMm ?? 10;

  if (item.mount === 'left-wall') {
    const box: Box3D = {
      x1: innerX1,
      x2: innerX1 + item.depthMm,
      y1: posY - halfH,
      y2: posY + halfH,
      z1: posZ - halfW,
      z2: posZ + halfW,
    };
    return { item, box, clearanceBox: { ...box, x2: box.x2 + wire } };
  }

  const box: Box3D = {
    x1: innerX2 - item.depthMm,
    x2: innerX2,
    y1: posY - halfH,
    y2: posY + halfH,
    z1: posZ - halfW,
    z2: posZ + halfW,
  };
  return { item, box, clearanceBox: { ...box, x1: box.x1 - wire } };
}

function layoutHorizontalWallItem(item: PanelItem, enclosure: EnclosureSpec): PlacedItem {
  const { innerY1, innerY2 } = getWallOffsets(enclosure);
  const posX = item.posXMm ?? enclosure.outerWidthMm / 2;
  const posZ = item.posZMm ?? Math.min(48, Math.round(enclosure.baseDepthMm * 0.55));
  const halfW = item.widthMm / 2;
  const halfD = item.heightMm / 2;
  const wire = item.wireClearanceMm ?? 15;

  if (item.mount === 'bottom-wall') {
    const box: Box3D = {
      x1: posX - halfW,
      x2: posX + halfW,
      y1: innerY2 - item.depthMm,
      y2: innerY2,
      z1: posZ - halfD,
      z2: posZ + halfD,
    };
    return { item, box, clearanceBox: { ...box, y1: box.y1 - wire } };
  }

  const box: Box3D = {
    x1: posX - halfW,
    x2: posX + halfW,
    y1: innerY1,
    y2: innerY1 + item.depthMm,
    z1: posZ - halfD,
    z2: posZ + halfD,
  };
  return { item, box, clearanceBox: { ...box, y2: box.y2 + wire } };
}

function layoutBackplateItem(item: PanelItem, enclosure: EnclosureSpec): PlacedItem {
  const { backWallZ } = getWallOffsets(enclosure);
  const posX = item.posXMm ?? enclosure.outerWidthMm / 2;
  const posY = item.posYMm ?? 21;
  const halfW = item.widthMm / 2;
  const halfH = item.heightMm / 2;
  const box: Box3D = {
    x1: posX - halfW,
    x2: posX + halfW,
    y1: posY - halfH,
    y2: posY + halfH,
    z1: backWallZ,
    z2: backWallZ + item.depthMm,
  };
  return { item, box };
}

function emptyRailMetrics(id: RailId, name: string): RailMetrics {
  return {
    railId: id,
    railName: name,
    usedWidthMm: 0,
    usableWidthMm: 216,
    remainingMm: 216,
    maxHeightMm: 0,
    maxDepthMm: 0,
    itemCount: 0,
    overflow: false,
  };
}

export function analyzeLayout(
  items: PanelItem[],
  enclosure: EnclosureSpec,
  railsInput: RailSpec[] | Record<'top-rail' | 'bottom-rail', RailSpec>
): LayoutAnalysis {
  const walls = getWallOffsets(enclosure);
  const railList = normalizeRails(railsInput);

  const railResults = railList.map((rail) => {
    const rItems = items.filter((i) => i.mount === rail.id);
    return { rail, ...layoutRail(rItems, rail, enclosure) };
  });

  const backplateItems = items.filter((i) => i.mount === 'backplate');
  const sideItems = items.filter((i) => i.mount === 'left-wall' || i.mount === 'right-wall');
  const horizWallItems = items.filter((i) => i.mount === 'bottom-wall' || i.mount === 'top-wall');

  const backplatePlaced = backplateItems.map((i) => layoutBackplateItem(i, enclosure));
  const sidePlaced = sideItems.map((i) => layoutSideItem(i, enclosure));
  const horizPlaced = horizWallItems.map((i) => layoutHorizontalWallItem(i, enclosure));

  const wallPlaced = [...sidePlaced, ...horizPlaced];
  const railPlaced = railResults.flatMap((r) => r.placed);
  const placed: PlacedItem[] = [...railPlaced, ...backplatePlaced, ...wallPlaced];
  const issues: LayoutIssue[] = [];
  const collidingItemIds = new Set<string>();

  // 1. Ray genişlik taşma kontrolleri
  for (const res of railResults) {
    const { metrics, rail } = res;
    const railItemIds = res.placed.map((p) => p.item.id);

    if (metrics.usedWidthMm > enclosure.innerWidthMm + 0.05) {
      railItemIds.forEach((id) => collidingItemIds.add(id));
      issues.push({
        id: `inner-overflow-${metrics.railId}`,
        severity: 'error',
        title: `${rail.name} iç gövde genişliğini aşıyor`,
        detail: `Toplam ${metrics.usedWidthMm} mm (iç gövde genişliği ${enclosure.innerWidthMm} mm).`,
        itemIds: railItemIds,
      });
    } else if (metrics.overflow) {
      railItemIds.forEach((id) => collidingItemIds.add(id));
      issues.push({
        id: `overflow-${metrics.railId}`,
        severity: 'error',
        title: `${rail.name} ray boyunu aşıyor`,
        detail: `Toplam ${metrics.usedWidthMm} mm (ray boyu ${metrics.usableWidthMm} mm, ${Math.abs(metrics.remainingMm)} mm taşma).`,
        itemIds: railItemIds,
      });
    } else if (metrics.remainingMm < 10 && metrics.itemCount > 0) {
      issues.push({
        id: `tight-${metrics.railId}`,
        severity: 'warning',
        title: `${rail.name} çok sıkı yerleşim`,
        detail: `${metrics.usedWidthMm} / ${metrics.usableWidthMm} mm kullanılıyor (kalan ${metrics.remainingMm} mm). Gerçek kumpas ölçüsünü kontrol edin.`,
        itemIds: railItemIds,
      });
    }
  }

  // 2. Ardışık DIN rayları arası dikey boşluk kontrolü
  const railGaps: RailGapMetric[] = [];
  for (let i = 0; i < railResults.length - 1; i++) {
    const upper = railResults[i];
    const lower = railResults[i + 1];
    const upperMaxY2 =
      upper.placed.length > 0
        ? Math.max(...upper.placed.map((p) => p.box.y2))
        : upper.rail.centerYMm + 18;
    const lowerMinY1 =
      lower.placed.length > 0
        ? Math.min(...lower.placed.map((p) => p.box.y1))
        : lower.rail.centerYMm - 18;
    const gapMm = Number((lowerMinY1 - upperMaxY2).toFixed(1));
    railGaps.push({ upperRailId: upper.rail.id, lowerRailId: lower.rail.id, gapMm });

    if (upper.placed.length > 0 && lower.placed.length > 0) {
      if (gapMm < 0) {
        const bothIds = [...upper.placed, ...lower.placed].map((p) => p.item.id);
        bothIds.forEach((id) => collidingItemIds.add(id));
        issues.push({
          id: `rail-vertical-overlap-${upper.rail.id}-${lower.rail.id}`,
          severity: 'error',
          title: `${upper.rail.name} ↔ ${lower.rail.name} dikeyde çakışıyor`,
          detail: `${Math.abs(gapMm)} mm bindirme var. Alt rayı aşağı kaydırın.`,
          itemIds: bothIds,
        });
      } else if (gapMm < 24) {
        issues.push({
          id: `rail-vertical-tight-${upper.rail.id}-${lower.rail.id}`,
          severity: 'warning',
          title: `${upper.rail.name} ↔ ${lower.rail.name} arası kablolama payı dar`,
          detail: `Kalan boşluk ${gapMm} mm. Kablolama için en az 25–35 mm önerilir.`,
          itemIds: [],
        });
      }
    }
  }

  const interRailGapMm = railGaps[0]?.gapMm ?? 0;

  // 3. İç sınır (X/Y/Z) ve kapak birleşim kontrolleri
  for (const p of placed) {
    if (p.box.x1 < walls.innerX1 - 0.1) {
      collidingItemIds.add(p.item.id);
      issues.push({
        id: `left-bound-${p.item.id}`,
        severity: 'error',
        title: `${p.item.code} sol iç duvara çarpıyor`,
        detail: `Sol kenar ${Math.round(walls.innerX1 - p.box.x1)} mm dışarı taşıyor.`,
        itemIds: [p.item.id],
      });
    }
    if (p.box.x2 > walls.innerX2 + 0.1) {
      collidingItemIds.add(p.item.id);
      issues.push({
        id: `right-bound-${p.item.id}`,
        severity: 'error',
        title: `${p.item.code} sağ iç duvara çarpıyor`,
        detail: `Sağ kenar ${Math.round(p.box.x2 - walls.innerX2)} mm dışarı taşıyor.`,
        itemIds: [p.item.id],
      });
    }
    if (p.box.y1 < walls.innerY1 - 0.1) {
      collidingItemIds.add(p.item.id);
      issues.push({
        id: `top-bound-${p.item.id}`,
        severity: 'error',
        title: `${p.item.code} üst iç duvara çarpıyor`,
        detail: `Üst kenar ${Math.round(walls.innerY1 - p.box.y1)} mm dışarı taşıyor.`,
        itemIds: [p.item.id],
      });
    }
    if (p.box.y2 > walls.innerY2 + 0.1) {
      collidingItemIds.add(p.item.id);
      issues.push({
        id: `bottom-bound-${p.item.id}`,
        severity: 'error',
        title: `${p.item.code} alt iç duvara çarpıyor`,
        detail: `Alt kenar ${Math.round(p.box.y2 - walls.innerY2)} mm dışarı taşıyor.`,
        itemIds: [p.item.id],
      });
    }
    if (p.box.z2 > walls.innerZ2 + 0.1) {
      collidingItemIds.add(p.item.id);
      issues.push({
        id: `depth-bound-${p.item.id}`,
        severity: 'error',
        title: `${p.item.code} ön kapağa çarpıyor`,
        detail: `Gerekli derinlik iç derinliği (${enclosure.innerDepthMm} mm) aşıyor.`,
        itemIds: [p.item.id],
      });
    }
    if (
      p.item.mount === 'left-wall' ||
      p.item.mount === 'right-wall' ||
      p.item.mount === 'bottom-wall' ||
      p.item.mount === 'top-wall'
    ) {
      if (p.box.z1 < walls.innerZ1) {
        collidingItemIds.add(p.item.id);
        issues.push({
          id: `back-bound-${p.item.id}`,
          severity: 'error',
          title: `${p.item.code} arka tabana çarpıyor`,
          detail: `Z konumunu (arkadan mesafe) artırın.`,
          itemIds: [p.item.id],
        });
      }
      if (p.box.z2 > enclosure.baseDepthMm) {
        issues.push({
          id: `lid-seam-${p.item.id}`,
          severity: 'warning',
          title: `${p.item.code} gövde-kapak birleşim çizgisine yakın`,
          detail: `Alt kasa derinliği ~${enclosure.baseDepthMm} mm; Z merkezini arka tarafa çekmeniz önerilir.`,
          itemIds: [p.item.id],
        });
      }
    }
  }

  // 4. 3D Elemanlar arası çakışma (Duvar vs Ray + Duvar vs Duvar)
  for (let i = 0; i < wallPlaced.length; i++) {
    const wItem = wallPlaced[i];
    for (const rItem of railPlaced) {
      if (boxesOverlap3D(wItem.box, rItem.box)) {
        collidingItemIds.add(wItem.item.id);
        collidingItemIds.add(rItem.item.id);
        issues.push({
          id: `collision-${wItem.item.id}-${rItem.item.id}`,
          severity: 'error',
          title: `3D Çakışma: ${wItem.item.code} ↔ ${rItem.item.code}`,
          detail: `${wItem.item.code} iç gövdesi (${wItem.item.depthMm} mm) içeride ${rItem.item.code} elemanı ile çakışıyor!`,
          itemIds: [wItem.item.id, rItem.item.id],
        });
      } else if (wItem.clearanceBox && boxesOverlap3D(wItem.clearanceBox, rItem.box)) {
        issues.push({
          id: `wire-tight-${wItem.item.id}-${rItem.item.id}`,
          severity: 'warning',
          title: `Dar Kablo Payı: ${wItem.item.code} ↔ ${rItem.item.code}`,
          detail: `${wItem.item.code} kablo geçiş payı ${rItem.item.code} gövdesine çok yakın.`,
          itemIds: [wItem.item.id, rItem.item.id],
        });
      }
    }

    for (let j = i + 1; j < wallPlaced.length; j++) {
      const other = wallPlaced[j];
      if (boxesOverlap3D(wItem.box, other.box)) {
        collidingItemIds.add(wItem.item.id);
        collidingItemIds.add(other.item.id);
        issues.push({
          id: `wall-collision-${wItem.item.id}-${other.item.id}`,
          severity: 'error',
          title: `3D Çakışma: ${wItem.item.code} ↔ ${other.item.code}`,
          detail: `İki duvar elemanı (buton/rakor) içeride birbirine çarpıyor.`,
          itemIds: [wItem.item.id, other.item.id],
        });
      } else if (
        wItem.clearanceBox &&
        other.clearanceBox &&
        boxesOverlap3D(wItem.clearanceBox, other.clearanceBox)
      ) {
        issues.push({
          id: `wall-tight-${wItem.item.id}-${other.item.id}`,
          severity: 'warning',
          title: `Yakın Yerleşim: ${wItem.item.code} ↔ ${other.item.code}`,
          detail: `Kablo payları birbirine yaklaşıyor; kablolamayı kontrol edin.`,
          itemIds: [wItem.item.id, other.item.id],
        });
      }
    }
  }

  // 4b. Taban (backplate) baraları & kablo kanalları çakışma kontrolü
  const nonBackplate = [...railPlaced, ...wallPlaced];
  for (let i = 0; i < backplatePlaced.length; i++) {
    const bp = backplatePlaced[i];
    for (const other of nonBackplate) {
      if (boxesOverlap3D(bp.box, other.box)) {
        collidingItemIds.add(bp.item.id);
        collidingItemIds.add(other.item.id);
        issues.push({
          id: `bp-collision-${bp.item.id}-${other.item.id}`,
          severity: 'error',
          title: `3D Çakışma: ${bp.item.code} ↔ ${other.item.code}`,
          detail: `${bp.item.code} (${bp.item.category === 'duct' ? 'kablo kanalı' : 'klemens barası'}) ${other.item.code} ile çakışıyor. Boş alana sürükleyin.`,
          itemIds: [bp.item.id, other.item.id],
        });
      }
    }
    for (let j = i + 1; j < backplatePlaced.length; j++) {
      const otherBp = backplatePlaced[j];
      // Yatay + dikey kablo kanalı kesişimine (T/L birleşimi) izin ver, sadece aynı tiplerde çakışma uyar
      const isCrossDuct =
        bp.item.category === 'duct' &&
        otherBp.item.category === 'duct' &&
        (bp.item.widthMm > bp.item.heightMm) !== (otherBp.item.widthMm > otherBp.item.heightMm);
      if (!isCrossDuct && boxesOverlap3D(bp.box, otherBp.box)) {
        collidingItemIds.add(bp.item.id);
        collidingItemIds.add(otherBp.item.id);
        issues.push({
          id: `bp-bp-${bp.item.id}-${otherBp.item.id}`,
          severity: 'error',
          title: `Çakışma: ${bp.item.code} ↔ ${otherBp.item.code}`,
          detail: `İki taban elemanı üst üste biniyor.`,
          itemIds: [bp.item.id, otherBp.item.id],
        });
      }
    }
  }

  // 5. Sol ve sağ yan butonlar arasındaki net orta boşluk (mm)
  const leftSides = sidePlaced.filter((p) => p.item.mount === 'left-wall');
  const rightSides = sidePlaced.filter((p) => p.item.mount === 'right-wall');
  let sideButtonMiddleGapMm: number | null = null;
  if (leftSides.length > 0 && rightSides.length > 0) {
    const maxLeftX = Math.max(...leftSides.map((p) => p.box.x2));
    const minRightX = Math.min(...rightSides.map((p) => p.box.x1));
    sideButtonMiddleGapMm = Number((minRightX - maxLeftX).toFixed(1));
  }

  // 6. Tutarlılık (Plausibility) kontrolleri — WAGO / WMC tarzı
  const hasPeElement = items.some(
    (i) =>
      i.code.toUpperCase().startsWith('PE') ||
      (i.category === 'busbar' && i.code.toUpperCase().includes('PE'))
  );
  if (items.length > 0 && !hasPeElement && !enclosure.hasInternalNPe) {
    issues.push({
      id: 'plausibility-no-pe',
      severity: 'warning',
      title: 'Toprak (PE) Klemensi / Barası Eksik',
      detail: 'Panoda PE toprak klemensi veya barası görünmüyor. En az bir PE bağlantısı eklemeniz önerilir.',
      itemIds: [],
    });
  }

  if (enclosure.hasInternalNPe) {
    issues.push({
      id: 'info-v12-npe',
      severity: 'info',
      title: 'Dahili Nötr & Toprak Klemensleri',
      detail: `${enclosure.brand} ${enclosure.model} panosunun dahili N + PE klemens barası yuvaları kullanılabilir; DIN rayında yer kaplamaz.`,
      itemIds: [],
    });
  }

  const allRailMetrics = railResults.map((r) => r.metrics);
  const topRail =
    allRailMetrics.find((m) => m.railId === 'top-rail') ??
    allRailMetrics[0] ??
    emptyRailMetrics('top-rail', 'Üst DIN Rayı');
  const bottomRail =
    allRailMetrics.find((m) => m.railId === 'bottom-rail') ??
    allRailMetrics[1] ??
    emptyRailMetrics('bottom-rail', 'Alt DIN Rayı');

  return {
    placed,
    rails: allRailMetrics,
    topRail,
    bottomRail,
    railGaps,
    interRailGapMm,
    sideButtonMiddleGapMm,
    issues,
    collidingItemIds,
  };
}
