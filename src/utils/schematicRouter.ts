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

function snap10(v: number): number {
  return Math.round(v / 10) * 10;
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
  let prevY = 6;
  merged.forEach((m) => {
    if (m.y1 - prevY >= 14) {
      corridors.push({
        id: corridors.length,
        y1: prevY + 6,
        y2: m.y1 - 6,
        midY: (prevY + m.y1) / 2,
      });
    }
    prevY = m.y2;
  });

  if (canvasH - prevY >= 18) {
    corridors.push({
      id: corridors.length,
      y1: prevY + 8,
      y2: canvasH - 8,
      midY: (prevY + canvasH) / 2,
    });
  }

  return corridors;
}

function pickNearestCorridor(corridors: Corridor[], targetY: number, minY?: number, maxY?: number): Corridor {
  let candidates = corridors;
  if (minY !== undefined && maxY !== undefined) {
    const inside = corridors.filter((c) => c.midY >= minY && c.midY <= maxY);
    if (inside.length > 0) candidates = inside;
  }
  return candidates.reduce((best, cur) =>
    Math.abs(cur.midY - targetY) < Math.abs(best.midY - targetY) ? cur : best
  );
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
 * Tüm kabloları mevcut bağlantılarını bozmadan paralel yatay/dikey CAD kanallarına ayırır.
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

  // Her kablonun uç koordinatlarını çıkar
  interface WireMeta {
    wire: SchematicWire;
    p1: SchematicPoint;
    side1: 'top' | 'bottom';
    p2: SchematicPoint;
    side2: 'top' | 'bottom';
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
    const midY = (p1.y + p2.y) / 2;
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const corr = pickNearestCorridor(corridors, midY, minY - 2, maxY + 2);

    metas.push({
      wire: w,
      p1,
      side1: pin1.side,
      p2,
      side2: pin2.side,
      preferredCorridorId: corr.id,
      span: Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y),
      minX: Math.min(p1.x, p2.x),
    });
  }

  // Koridor içi kabloları soldan sağa ve kısadan uzuna sıralayarak kesişimleri azalt
  const sortedMetas = [...metas].sort(
    (a, b) => a.preferredCorridorId - b.preferredCorridorId || a.minX - b.minX || a.span - b.span
  );

  // Her koridordaki toplam kablo sayısını önceden say (eşit ve taşmayan paralel aralık için)
  const corridorTotals = new Map<number, number>();
  const corridorCursors = new Map<number, number>();
  for (const m of sortedMetas) {
    corridorTotals.set(m.preferredCorridorId, (corridorTotals.get(m.preferredCorridorId) ?? 0) + 1);
  }

  const allocateLaneY = (corr: Corridor): number => {
    const total = corridorTotals.get(corr.id) ?? 1;
    const idx = corridorCursors.get(corr.id) ?? 0;
    corridorCursors.set(corr.id, idx + 1);

    const usableH = Math.max(10, corr.y2 - corr.y1);
    const step = Math.min(9, usableH / (total + 1));
    const totalSpan = step * (total - 1);
    const startY = corr.midY - totalSpan / 2;
    return Math.round(Math.max(corr.y1, Math.min(corr.y2, startY + idx * step)));
  };

  // Dikey geçiş kanalları (birden fazla satırı atlayan kablolar için)
  const candidateVerticalXs = [
    18,
    canvasW - 18,
    275,
    435,
    695,
    985,
    1200,
    1320,
  ].filter((x) => x > 12 && x < canvasW - 12);
  const verticalTrackUse = new Map<number, number>();

  const pickClearVerticalX = (x1: number, x2: number, yA: number, yB: number, skipIds: Set<string>): number => {
    const midX = (x1 + x2) / 2;
    const blockingRects = rects.filter((r) => !skipIds.has(r.id));

    // Önce doğrudan x1 veya x2 veya orta X serbest mi kontrol et
    for (const directX of [x1, x2, snap10(midX)]) {
      const blocked = blockingRects.some((r) => rectIntersectsVertical(r, directX, yA, yB, 5));
      if (!blocked) {
        const use = verticalTrackUse.get(directX) ?? 0;
        verticalTrackUse.set(directX, use + 1);
        const offset = use === 0 ? 0 : (use % 2 === 1 ? 1 : -1) * Math.ceil(use / 2) * 7;
        const shifted = directX + offset;
        if (!blockingRects.some((r) => rectIntersectsVertical(r, shifted, yA, yB, 3))) {
          return shifted;
        }
        return directX;
      }
    }

    // Serbest aday dikey kanallardan en yakınını bul
    let bestX = 18;
    let bestScore = Infinity;
    for (const cx of candidateVerticalXs) {
      const blocked = blockingRects.some((r) => rectIntersectsVertical(r, cx, yA, yB, 4));
      const use = verticalTrackUse.get(cx) ?? 0;
      const score = Math.abs(cx - midX) + (blocked ? 5000 : 0) + use * 25;
      if (score < bestScore) {
        bestScore = score;
        bestX = cx;
      }
    }

    const use = verticalTrackUse.get(bestX) ?? 0;
    verticalTrackUse.set(bestX, use + 1);
    const sign = bestX < canvasW / 2 ? 1 : -1;
    const offset = (use % 5) * 6 * sign;
    return Math.max(8, Math.min(canvasW - 8, bestX + offset));
  };

  const routedById = new Map<string, SchematicWire>();

  for (const m of sortedMetas) {
    const { wire, p1, side1, p2, side2 } = m;
    const skipIds = new Set([wire.fromNodeId, wire.toNodeId]);
    const blockingRects = rects.filter((r) => !skipIds.has(r.id));

    // Uçların baktığı en yakın koridorlar
    const c1 = pickNearestCorridor(
      corridors,
      side1 === 'top' ? p1.y - 24 : p1.y + 24
    );
    const c2 = pickNearestCorridor(
      corridors,
      side2 === 'top' ? p2.y - 24 : p2.y + 24
    );

    const sameCorridor = c1.id === c2.id;
    const mainCorr = corridors.find((c) => c.id === m.preferredCorridorId) ?? c1;
    const laneY = allocateLaneY(sameCorridor ? c1 : mainCorr);

    // Basit tek-koridor L/Z yönlendirmesi bloklara çarpmıyor mu kontrol et
    const seg1Blocked = blockingRects.some((r) => rectIntersectsVertical(r, p1.x, p1.y, laneY, 4));
    const seg2Blocked = blockingRects.some((r) => rectIntersectsHorizontal(r, p1.x, p2.x, laneY, 4));
    const seg3Blocked = blockingRects.some((r) => rectIntersectsVertical(r, p2.x, laneY, p2.y, 4));

    let rawWaypoints: SchematicPoint[];

    if (!seg1Blocked && !seg2Blocked && !seg3Blocked) {
      rawWaypoints = [
        { x: p1.x, y: laneY },
        { x: p2.x, y: laneY },
      ];
    } else {
      // Çok katmanlı yönlendirme: p1 -> c1 -> temiz dikey kanal -> c2 -> p2
      const yStart = allocateLaneY(c1);
      const yEnd = c1.id === c2.id ? yStart : allocateLaneY(c2);
      const chanX = pickClearVerticalX(p1.x, p2.x, yStart, yEnd, skipIds);
      rawWaypoints = [
        { x: p1.x, y: yStart },
        { x: chanX, y: yStart },
        { x: chanX, y: yEnd },
        { x: p2.x, y: yEnd },
      ];
    }

    routedById.set(wire.id, {
      ...wire,
      waypoints: simplifyWaypoints(p1, rawWaypoints, p2),
    });
  }

  return wires.map((w) => routedById.get(w.id) ?? unresolved.get(w.id) ?? w);
}

/**
 * Köşeleri yumuşatılmış (6px) temiz SVG <path> dizesi üretir.
 */
export function buildRoundedWirePath(points: SchematicPoint[], radius = 6): string {
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
