import type { SchematicNodePos, SchematicPoint, SchematicWire } from '../types/panel';

export interface RouterPin {
  id: string;
  dx: number;
  dy: number;
  side: 'top' | 'bottom';
}

export interface RouterNode {
  id: string;
  width: number;
  height: number;
  defaultX: number;
  defaultY: number;
  pins: RouterPin[];
}

interface Rect {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Corridor {
  id: number;
  y1: number;
  y2: number;
  midY: number;
}

function rectIntersectsHorizontal(r: Rect, xA: number, xB: number, y: number, pad = 6): boolean {
  const minX = Math.min(xA, xB);
  const maxX = Math.max(xA, xB);
  return y > r.y1 - pad && y < r.y2 + pad && maxX > r.x1 - pad && minX < r.x2 + pad;
}

function rectIntersectsVertical(r: Rect, x: number, yA: number, yB: number, pad = 6): boolean {
  const minY = Math.min(yA, yB);
  const maxY = Math.max(yA, yB);
  return x > r.x1 - pad && x < r.x2 + pad && maxY > r.y1 - pad && minY < r.y2 + pad;
}

function buildCorridors(rects: Rect[], canvasH: number): Corridor[] {
  const bands = rects
    .map((r) => ({ y1: r.y1, y2: r.y2 }))
    .sort((a, b) => a.y1 - b.y1);

  const merged: Array<{ y1: number; y2: number }> = [];
  for (const b of bands) {
    const last = merged[merged.length - 1];
    if (!last || b.y1 > last.y2 + 16) {
      merged.push({ ...b });
    } else {
      last.y2 = Math.max(last.y2, b.y2);
    }
  }

  const corridors: Corridor[] = [];
  // Üst dış koridor (Satır 1 üst pinleri için)
  const firstTop = merged[0]?.y1 ?? 30;
  corridors.push({
    id: corridors.length,
    y1: -54,
    y2: Math.max(-12, firstTop - 10),
    midY: (-54 + Math.max(-12, firstTop - 10)) / 2,
  });

  // Satırlar arası iç koridorlar
  for (let i = 0; i < merged.length - 1; i++) {
    const g1 = merged[i].y2;
    const g2 = merged[i + 1].y1;
    if (g2 - g1 >= 18) {
      corridors.push({
        id: corridors.length,
        y1: g1 + 10,
        y2: g2 - 10,
        midY: (g1 + g2) / 2,
      });
    }
  }

  // Alt dış koridor
  const lastBottom = merged[merged.length - 1]?.y2 ?? canvasH - 60;
  corridors.push({
    id: corridors.length,
    y1: lastBottom + 12,
    y2: Math.max(lastBottom + 54, canvasH + 46),
    midY: lastBottom + 32,
  });

  return corridors;
}

function pickNearestCorridor(
  corridors: Corridor[],
  targetY: number,
  minY?: number,
  maxY?: number
): Corridor {
  let candidates = corridors;
  if (minY !== undefined && maxY !== undefined) {
    const inside = corridors.filter((c) => c.midY >= minY && c.midY <= maxY);
    if (inside.length > 0) candidates = inside;
  }
  return candidates.reduce((best, cur) =>
    Math.abs(cur.midY - targetY) < Math.abs(best.midY - targetY) ? cur : best
  );
}

/**
 * Blokların arasındaki gerçek açık dikey boşlukları ve sol/sağ dış dikey kablo kanallarını hesaplar.
 */
function findOpenVerticalChannels(rects: Rect[], yA: number, yB: number, canvasW: number): number[] {
  const minY = Math.min(yA, yB);
  const maxY = Math.max(yA, yB);
  const overlapping = rects.filter((r) => r.y2 > minY - 4 && r.y1 < maxY + 4);

  const gaps: number[] = [];
  if (overlapping.length > 0) {
    const sortedX = [...overlapping].sort((a, b) => a.x1 - b.x1);
    let maxEnd = sortedX[0].x2;
    for (let i = 1; i < sortedX.length; i++) {
      const gapStart = maxEnd;
      const gapEnd = sortedX[i].x1;
      if (gapEnd - gapStart >= 22) {
        gaps.push(Math.round((gapStart + gapEnd) / 2));
      }
      if (sortedX[i].x2 > maxEnd) maxEnd = sortedX[i].x2;
    }
  }

  // Sol dış kanal ve sağ dış kanal her zaman açık dikey otoyoldur
  gaps.unshift(-24);
  gaps.push(canvasW + 18);
  return gaps;
}

function simplifyWaypoints(
  start: SchematicPoint,
  waypoints: SchematicPoint[],
  end: SchematicPoint
): SchematicPoint[] {
  const all = [start, ...waypoints, end];
  const dedup: SchematicPoint[] = [];
  for (const pt of all) {
    const prev = dedup[dedup.length - 1];
    if (!prev || Math.abs(prev.x - pt.x) > 0.5 || Math.abs(prev.y - pt.y) > 0.5) {
      dedup.push(pt);
    }
  }
  const clean: SchematicPoint[] = [];
  for (let i = 0; i < dedup.length; i++) {
    const prev = clean[clean.length - 1];
    const curr = dedup[i];
    const next = dedup[i + 1];
    if (prev && next) {
      const sameX = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
      const sameY = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
      if (sameX || sameY) continue;
    }
    clean.push(curr);
  }
  return clean.slice(1, -1);
}

/**
 * Tüm kabloları mevcut bağlantılarını bozmadan açık yatay koridorlara ve
 * bloklardan kaçınan dikey kablo kanallarına (sol/sağ dış kanallar + blok araları) ayırır.
 */
export function autoRouteWires(
  wires: SchematicWire[],
  nodes: RouterNode[],
  nodePositions: Record<string, SchematicNodePos>,
  canvasW: number,
  canvasH: number
): SchematicWire[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const rects: Rect[] = nodes.map((n) => {
    const pos = nodePositions[n.id] ?? { x: n.defaultX, y: n.defaultY };
    return {
      id: n.id,
      x1: pos.x,
      y1: pos.y,
      x2: pos.x + n.width,
      y2: pos.y + n.height,
    };
  });

  const corridors = buildCorridors(rects, canvasH);
  if (corridors.length === 0) return wires;

  interface WireMeta {
    wire: SchematicWire;
    p1: SchematicPoint;
    side1: 'top' | 'bottom';
    p2: SchematicPoint;
    side2: 'top' | 'bottom';
    c1: Corridor;
    c2: Corridor;
    preferredCorridorId: number;
    span: number;
    minX: number;
  }

  const metas: WireMeta[] = [];
  const unresolved = new Map<string, SchematicWire>();

  for (const w of wires) {
    const n1 = nodeMap.get(w.fromNodeId);
    const n2 = nodeMap.get(w.toNodeId);
    const pin1 = n1?.pins.find((p) => p.id === w.fromPinId);
    const pin2 = n2?.pins.find((p) => p.id === w.toPinId);
    if (!n1 || !n2 || !pin1 || !pin2) {
      unresolved.set(w.id, w);
      continue;
    }
    const pos1 = nodePositions[n1.id] ?? { x: n1.defaultX, y: n1.defaultY };
    const pos2 = nodePositions[n2.id] ?? { x: n2.defaultX, y: n2.defaultY };
    const p1 = { x: pos1.x + pin1.dx, y: pos1.y + pin1.dy };
    const p2 = { x: pos2.x + pin2.dx, y: pos2.y + pin2.dy };

    const c1 = pickNearestCorridor(corridors, pin1.side === 'top' ? p1.y - 26 : p1.y + 26);
    const c2 = pickNearestCorridor(corridors, pin2.side === 'top' ? p2.y - 26 : p2.y + 26);
    const midY = (p1.y + p2.y) / 2;
    const pref = pickNearestCorridor(
      corridors,
      midY,
      Math.min(p1.y, p2.y) - 4,
      Math.max(p1.y, p2.y) + 4
    );

    metas.push({
      wire: w,
      p1,
      side1: pin1.side,
      p2,
      side2: pin2.side,
      c1,
      c2,
      preferredCorridorId: pref.id,
      span: Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y),
      minX: Math.min(p1.x, p2.x),
    });
  }

  const sortedMetas = [...metas].sort(
    (a, b) => a.preferredCorridorId - b.preferredCorridorId || a.minX - b.minX || a.span - b.span
  );

  // Yatay koridor başına şerit tahsisi
  const corridorTotals = new Map<number, number>();
  const corridorCursors = new Map<number, number>();
  const bumpTotal = (cid: number) => corridorTotals.set(cid, (corridorTotals.get(cid) ?? 0) + 1);
  for (const m of sortedMetas) {
    bumpTotal(m.c1.id);
    if (m.c2.id !== m.c1.id) bumpTotal(m.c2.id);
  }

  const allocateLaneY = (corr: Corridor): number => {
    const total = Math.max(1, corridorTotals.get(corr.id) ?? 1);
    const idx = corridorCursors.get(corr.id) ?? 0;
    corridorCursors.set(corr.id, idx + 1);
    const usableH = Math.max(14, corr.y2 - corr.y1);
    const step = Math.min(9, usableH / (total + 1));
    const totalSpan = step * (total - 1);
    const startY = corr.midY - totalSpan / 2;
    return Math.round(Math.max(corr.y1, Math.min(corr.y2, startY + idx * step)));
  };

  // Dikey kanal başına paralel şerit sayacı
  let leftDuctCount = 0;
  let rightDuctCount = 0;
  const innerGapUse = new Map<number, number>();

  const routedById = new Map<string, SchematicWire>();

  for (const m of sortedMetas) {
    const { wire, p1, p2, c1, c2 } = m;
    const skipIds = new Set([wire.fromNodeId, wire.toNodeId]);
    const blockingRects = rects.filter((r) => !skipIds.has(r.id));

    if (c1.id === c2.id) {
      const laneY = allocateLaneY(c1);
      const horizClear = !blockingRects.some((r) => rectIntersectsHorizontal(r, p1.x, p2.x, laneY, 4));
      if (horizClear) {
        routedById.set(wire.id, {
          ...wire,
          waypoints: simplifyWaypoints(
            p1,
            [
              { x: p1.x, y: laneY },
              { x: p2.x, y: laneY },
            ],
            p2
          ),
        });
        continue;
      }
    }

    const yStart = allocateLaneY(c1);
    const yEnd = c1.id === c2.id ? yStart : allocateLaneY(c2);

    // Önce doğrudan p1.x veya p2.x boyunca blok yoksa en kısa dikey geçişi kullan
    const directCandidates = [p1.x, p2.x];
    let chosenX: number | null = null;
    for (const dx of directCandidates) {
      const vClear = !blockingRects.some((r) => rectIntersectsVertical(r, dx, yStart, yEnd, 5));
      if (vClear) {
        chosenX = dx;
        break;
      }
    }

    // Doğrudan dikey yol kapalıysa gerçek açık blok aralıklarını veya sol/sağ dış dikey kanalı seç
    if (chosenX === null) {
      const openXs = findOpenVerticalChannels(blockingRects, yStart, yEnd, canvasW);
      const midX = (p1.x + p2.x) / 2;

      // En yakın açık iç kanalı veya dış kenar kanalını seç
      let bestBaseX = openXs[0];
      let bestScore = Infinity;
      for (const ox of openXs) {
        const isOuter = ox < 0 || ox > canvasW;
        const used = isOuter
          ? ox < 0
            ? leftDuctCount
            : rightDuctCount
          : innerGapUse.get(ox) ?? 0;
        const score = Math.abs(ox - midX) + used * 28 + (isOuter ? 60 : 0);
        if (score < bestScore) {
          bestScore = score;
          bestBaseX = ox;
        }
      }

      if (bestBaseX < 0) {
        // Sol dış dikey kablo kanalı (-8, -16, -24, -32, -40, -48, -56 ...)
        chosenX = -8 - (leftDuctCount % 8) * 7;
        leftDuctCount += 1;
      } else if (bestBaseX > canvasW) {
        // Sağ dış dikey kablo kanalı (canvasW+8, +16, +24 ...)
        chosenX = canvasW + 8 + (rightDuctCount % 8) * 7;
        rightDuctCount += 1;
      } else {
        const u = innerGapUse.get(bestBaseX) ?? 0;
        innerGapUse.set(bestBaseX, u + 1);
        const shift = u === 0 ? 0 : (u % 2 === 1 ? 1 : -1) * Math.ceil(u / 2) * 6;
        chosenX = bestBaseX + shift;
      }
    }

    const rawWaypoints: SchematicPoint[] = [
      { x: p1.x, y: yStart },
      { x: chosenX, y: yStart },
      { x: chosenX, y: yEnd },
      { x: p2.x, y: yEnd },
    ];

    routedById.set(wire.id, {
      ...wire,
      waypoints: simplifyWaypoints(p1, rawWaypoints, p2),
    });
  }

  return wires.map((w) => routedById.get(w.id) ?? unresolved.get(w.id) ?? w);
}

/**
 * Köşeleri yumuşatılmış (7px) temiz SVG <path> dizesi üretir.
 */
export function buildRoundedWirePath(points: SchematicPoint[], radius = 7): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    const r = Math.min(radius, len1 / 2, len2 / 2);
    if (r < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const pBeforeX = curr.x - (v1x / len1) * r;
    const pBeforeY = curr.y - (v1y / len1) * r;
    const pAfterX = curr.x + (v2x / len2) * r;
    const pAfterY = curr.y + (v2y / len2) * r;

    d += ` L ${pBeforeX.toFixed(1)} ${pBeforeY.toFixed(1)} Q ${curr.x} ${curr.y} ${pAfterX.toFixed(1)} ${pAfterY.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Etiketlerin üst üste binmemesi için en uzun segment üzerinde kademeli bir nokta seçer.
 */
export function getBestWireLabelPoint(points: SchematicPoint[], wireIndex: number): SchematicPoint {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  let bestIdx = 0;
  let bestLen = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    if (len > bestLen) {
      bestLen = len;
      bestIdx = i;
    }
  }
  const a = points[bestIdx];
  const b = points[bestIdx + 1];
  const tSlots = [0.5, 0.36, 0.64, 0.43, 0.57];
  const t = tSlots[wireIndex % tSlots.length];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
