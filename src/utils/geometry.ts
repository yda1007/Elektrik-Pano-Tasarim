import type {
  Box3D,
  EnclosureSpec,
  LayoutAnalysis,
  LayoutIssue,
  PanelItem,
  PlacedItem,
  RailMetrics,
  RailSpec,
} from '../types/panel';

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
  const posY = item.posYMm ?? 262;
  const posZ = item.posZMm ?? 48;
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
  const posZ = item.posZMm ?? 48;
  const halfW = item.widthMm / 2;
  const halfD = item.heightMm / 2; // dairesel somun/flanş için Z eksenindeki yarıçap
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

  // top-wall
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

export function analyzeLayout(
  items: PanelItem[],
  enclosure: EnclosureSpec,
  rails: Record<'top-rail' | 'bottom-rail', RailSpec>
): LayoutAnalysis {
  const walls = getWallOffsets(enclosure);
  const topItems = items.filter((i) => i.mount === 'top-rail');
  const bottomItems = items.filter((i) => i.mount === 'bottom-rail');
  const sideItems = items.filter((i) => i.mount === 'left-wall' || i.mount === 'right-wall');
  const horizWallItems = items.filter((i) => i.mount === 'bottom-wall' || i.mount === 'top-wall');

  const topResult = layoutRail(topItems, rails['top-rail'], enclosure);
  const bottomResult = layoutRail(bottomItems, rails['bottom-rail'], enclosure);
  const sidePlaced = sideItems.map((i) => layoutSideItem(i, enclosure));
  const horizPlaced = horizWallItems.map((i) => layoutHorizontalWallItem(i, enclosure));

  const wallPlaced = [...sidePlaced, ...horizPlaced];
  const railPlaced = [...topResult.placed, ...bottomResult.placed];
  const placed: PlacedItem[] = [...railPlaced, ...wallPlaced];
  const issues: LayoutIssue[] = [];
  const collidingItemIds = new Set<string>();

  // 1. Ray genişlik taşma kontrolleri
  for (const metrics of [topResult.metrics, bottomResult.metrics]) {
    const railSpec = rails[metrics.railId];
    const railName = railSpec.name;
    const railItemIds = placed
      .filter((p) => p.item.mount === metrics.railId)
      .map((p) => p.item.id);

    if (metrics.usedWidthMm > enclosure.innerWidthMm + 0.05) {
      railItemIds.forEach((id) => collidingItemIds.add(id));
      issues.push({
        id: `inner-overflow-${metrics.railId}`,
        severity: 'error',
        title: `${railName} iç gövde genişliğini aşıyor`,
        detail: `Toplam ${metrics.usedWidthMm} mm (Bemis iç genişlik ~${enclosure.innerWidthMm} mm).`,
        itemIds: railItemIds,
      });
    } else if (metrics.overflow) {
      railItemIds.forEach((id) => collidingItemIds.add(id));
      issues.push({
        id: `overflow-${metrics.railId}`,
        severity: 'error',
        title: `${railName} ray boyunu aşıyor`,
        detail: `Toplam ${metrics.usedWidthMm} mm (ray boyu ${metrics.usableWidthMm} mm, ${Math.abs(metrics.remainingMm)} mm taşma).`,
        itemIds: railItemIds,
      });
    } else if (metrics.remainingMm < 10 && metrics.itemCount > 0) {
      issues.push({
        id: `tight-${metrics.railId}`,
        severity: 'warning',
        title: `${railName} çok sıkı yerleşim`,
        detail: `${metrics.usedWidthMm} / ${metrics.usableWidthMm} mm kullanılıyor (kalan ${metrics.remainingMm} mm). 5,2 mm klemens kullanılıyorsa gerçek kumpas ölçüsünü kontrol edin.`,
        itemIds: railItemIds,
      });
    }
  }

  // 2. Üst ve alt ray arası kablo geçiş boşluğu
  const topMaxY2 =
    topResult.placed.length > 0
      ? Math.max(...topResult.placed.map((p) => p.box.y2))
      : rails['top-rail'].centerYMm + 18;
  const bottomMinY1 =
    bottomResult.placed.length > 0
      ? Math.min(...bottomResult.placed.map((p) => p.box.y1))
      : rails['bottom-rail'].centerYMm - 18;
  const interRailGapMm = Number((bottomMinY1 - topMaxY2).toFixed(1));

  if (topResult.placed.length > 0 && bottomResult.placed.length > 0) {
    if (interRailGapMm < 0) {
      issues.push({
        id: 'rail-vertical-overlap',
        severity: 'error',
        title: 'Üst ve alt ray elemanları dikeyde çakışıyor',
        detail: `${Math.abs(interRailGapMm)} mm bindirme var. Alt rayı aşağı kaydırın.`,
        itemIds: railPlaced.map((p) => p.item.id),
      });
      railPlaced.forEach((p) => collidingItemIds.add(p.item.id));
    } else if (interRailGapMm < 24) {
      issues.push({
        id: 'rail-vertical-tight',
        severity: 'warning',
        title: 'İki ray arası kablo geçiş payı dar',
        detail: `Kalan boşluk ${interRailGapMm} mm. Kablolama için en az 25–35 mm önerilir.`,
        itemIds: [],
      });
    }
  }

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
          detail: `Alt kasa yan/alt duvar derinliği ~${enclosure.baseDepthMm} mm; Z merkezini arka tarafa çekmeniz önerilir.`,
          itemIds: [p.item.id],
        });
      }
    }
  }

  // 4. 3D Elemanlar arası çakışma (Duvar elemanları vs Ray elemanları + Duvar elemanları kendi arasında)
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

  // 5. Sol ve sağ yan butonlar arasındaki net orta boşluk (mm)
  const leftSides = sidePlaced.filter((p) => p.item.mount === 'left-wall');
  const rightSides = sidePlaced.filter((p) => p.item.mount === 'right-wall');
  let sideButtonMiddleGapMm: number | null = null;
  if (leftSides.length > 0 && rightSides.length > 0) {
    const maxLeftX = Math.max(...leftSides.map((p) => p.box.x2));
    const minRightX = Math.min(...rightSides.map((p) => p.box.x1));
    sideButtonMiddleGapMm = Number((minRightX - maxLeftX).toFixed(1));
  }

  // 6. Bemis V12 dahili N/PE ve üst pencere bilgilendirmesi
  issues.push({
    id: 'info-v12-npe',
    severity: 'info',
    title: 'Dahili Nötr & Toprak Klemensleri',
    detail:
      'Bemis BH6-6000-0000 panosunun kendi 2 adet dahili klemens barası (N + PE) kullanılmaktadır; DIN rayında yer kaplamaz.',
    itemIds: [],
  });

  return {
    placed,
    topRail: topResult.metrics,
    bottomRail: bottomResult.metrics,
    interRailGapMm,
    sideButtonMiddleGapMm,
    issues,
    collidingItemIds,
  };
}
