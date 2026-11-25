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

/**
 * Left-Edge aralık paketleme: yatay veya dikey çakışan segmentlere
 * kesinlikle farklı paralel şeritler atar (0 üst üste binme garantisi).
 */
function assignNonOverlappingTracks(
  intervals: Array<{ id: string; a: number; b: number }>,
  minGap = 10
): { trackById: Map<string, number>; trackCount: number } {
  const sorted = [...intervals]
    .map((it) => ({
      id: it.id,
      start: Math.min(it.a, it.b),
      end: Math.max(it.a, it.b),
    }))
    .sort((x, y) => x.start - y.start || x.end - y.end);

  const trackEnds: number[] = [];
  const trackById = new Map<string, number>();

  for (const seg of sorted) {
    let assigned = -1;
    for (let t = 0; t < trackEnds.length; t++) {
      if (trackEnds[t] + minGap <= seg.start) {
        assigned = t;
        trackEnds[t] = seg.end;
        break;
      }
    }
    if (assigned === -1) {
      assigned = trackEnds.length;
      trackEnds.push(seg.end);
    }
    trackById.set(seg.id, assigned);
  }

  return { trackById, trackCount: Math.max(1, trackEnds.length) };
}

function getNodeRowIndex(node: RouterNode): number {
  const id = node.id;
  if (id === 'sys-supply' || id === 'sys-neutral' || id === 'sys-pe') return 0;
  if (id === 'blk-top-terminals' || id.startsWith('q') || id.startsWith('r')) return 1;
  if (id.startsWith('km') || id.startsWith('s')) return 2;
  if (id === 'blk-bottom-terminals') return 3;
  if (id.startsWith('sys-m') || id.startsWith('sys-sector')) return 4;
  // Varsayılan Y yüksekliğine göre en yakın satır
  if (node.defaultY < 130) return 0;
  if (node.defaultY < 340) return 1;
  if (node.defaultY < 590) return 2;
  if (node.defaultY < 800) return 3;
  return 4;
}

const ROW_Y_COORDS = [30, 235, 495, 735, 960];

function packRowPositions(
  rowNodes: RouterNode[],
  targetCenters: Map<string, number>,
  canvasW: number,
  minGap = 44
): Map<string, number> {
  const margin = 36;
  const totalNodeW = rowNodes.reduce((s, n) => s + n.width, 0);
  const availW = canvasW - margin * 2;
  const gap =
    rowNodes.length > 1
      ? Math.max(24, Math.min(minGap, Math.floor((availW - totalNodeW) / (rowNodes.length - 1))))
      : 0;

  // Başlangıç: istenen hedef merkezlere yakın yerleştir
  const xs = rowNodes.map((n) => {
    const t = targetCenters.get(n.id);
    return t !== undefined ? t - n.width / 2 : margin;
  });

  // Eğer hedef merkez yoksa satırı ortala
  if (rowNodes.every((n) => targetCenters.get(n.id) === undefined)) {
    const totalW = totalNodeW + gap * Math.max(0, rowNodes.length - 1);
    let cur = Math.max(margin, (canvasW - totalW) / 2);
    const out = new Map<string, number>();
    for (const n of rowNodes) {
      out.set(n.id, Math.round(cur / 10) * 10);
      cur += n.width + gap;
    }
    return out;
  }

  // Soldan sağa çakışmasız itme
  for (let i = 0; i < rowNodes.length; i++) {
    if (i === 0) {
      xs[i] = Math.max(margin, xs[i]);
    } else {
      const minAllowed = xs[i - 1] + rowNodes[i - 1].width + gap;
      if (xs[i] < minAllowed) xs[i] = minAllowed;
    }
  }

  // Sağ kenarı aşıyorsa sağdan sola geri çek
  const lastIdx = rowNodes.length - 1;
  if (lastIdx >= 0) {
    const rightOverflow = xs[lastIdx] + rowNodes[lastIdx].width - (canvasW - margin);
    if (rightOverflow > 0) {
      xs[lastIdx] -= rightOverflow;
      for (let i = lastIdx - 1; i >= 0; i--) {
        const maxAllowed = xs[i + 1] - gap - rowNodes[i].width;
        if (xs[i] > maxAllowed) xs[i] = maxAllowed;
      }
      if (xs[0] < margin) {
        let cur = margin;
        for (let i = 0; i < rowNodes.length; i++) {
          xs[i] = cur;
          cur += rowNodes[i].width + gap;
        }
      }
    }
  }

  const result = new Map<string, number>();
  rowNodes.forEach((n, i) => {
    result.set(n.id, Math.round(xs[i] / 10) * 10);
  });
  return result;
}

function countPairwiseCrossings(
  nodes: RouterNode[],
  positions: Record<string, SchematicNodePos>,
  wires: SchematicWire[]
): number {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number; n1: string; n2: string }> = [];

  for (const w of wires) {
    const n1 = nodeMap.get(w.fromNodeId);
    const n2 = nodeMap.get(w.toNodeId);
    const p1 = n1?.pins.find((p) => p.id === w.fromPinId);
    const p2 = n2?.pins.find((p) => p.id === w.toPinId);
    if (!n1 || !n2 || !p1 || !p2) continue;
    const pos1 = positions[n1.id] ?? { x: n1.defaultX, y: n1.defaultY };
    const pos2 = positions[n2.id] ?? { x: n2.defaultX, y: n2.defaultY };
    segs.push({
      x1: pos1.x + p1.dx,
      y1: pos1.y + p1.dy,
      x2: pos2.x + p2.dx,
      y2: pos2.y + p2.dy,
      n1: n1.id,
      n2: n2.id,
    });
  }

  let crossings = 0;
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);

  for (let i = 0; i < segs.length; i++) {
    const a = segs[i];
    for (let j = i + 1; j < segs.length; j++) {
      const b = segs[j];
      if (
        (Math.abs(a.x1 - b.x1) < 2 && Math.abs(a.y1 - b.y1) < 2) ||
        (Math.abs(a.x1 - b.x2) < 2 && Math.abs(a.y1 - b.y2) < 2) ||
        (Math.abs(a.x2 - b.x1) < 2 && Math.abs(a.y2 - b.y1) < 2) ||
        (Math.abs(a.x2 - b.x2) < 2 && Math.abs(a.y2 - b.y2) < 2)
      ) {
        continue;
      }
      if (
        ccw(a.x1, a.y1, b.x1, b.y1, b.x2, b.y2) !== ccw(a.x2, a.y2, b.x1, b.y1, b.x2, b.y2) &&
        ccw(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1) !== ccw(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2)
      ) {
        crossings += 1;
      }
    }
  }
  return crossings;
}

/**
 * Bağlı kablolara göre komponentleri Sugiyama Barycenter + ikili yer değiştirme ile
 * kesişimleri minimuma indirecek şekilde yerleştirir, ardından tüm kabloları çakışmasız yönlendirir.
 */
export function autoOptimizeSchematicLayout(
  nodes: RouterNode[],
  wires: SchematicWire[],
  canvasW: number,
  canvasH: number
): { nodePositions: Record<string, SchematicNodePos>; wires: SchematicWire[] } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Satırlara ayır
  const rows: RouterNode[][] = [[], [], [], [], []];
  for (const n of nodes) {
    rows[getNodeRowIndex(n)].push(n);
  }

  // Başlangıç X konumları
  const positions: Record<string, SchematicNodePos> = {};
  const layoutAllRows = (targetCenters: Map<string, number>) => {
    rows.forEach((rowNodes, rowIdx) => {
      if (rowNodes.length === 0) return;
      const xs = packRowPositions(rowNodes, targetCenters, canvasW, 48);
      for (const n of rowNodes) {
        positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rowIdx] };
      }
    });
  };

  layoutAllRows(new Map());

  // Kablo bağlantı komşuluğu (hangi node hangi karşı pinlere bağlı)
  const computeTargetsForRow = (rowIdx: number): Map<string, number> => {
    const targets = new Map<string, number>();
    for (const n of rows[rowIdx]) {
      let sumX = 0;
      let weight = 0;
      for (const w of wires) {
        if (w.fromNodeId === n.id || w.toNodeId === n.id) {
          const otherId = w.fromNodeId === n.id ? w.toNodeId : w.fromNodeId;
          const otherPinId = w.fromNodeId === n.id ? w.toPinId : w.fromPinId;
          const myPinId = w.fromNodeId === n.id ? w.fromPinId : w.toPinId;
          const otherNode = nodeMap.get(otherId);
          if (!otherNode || otherId === n.id) continue;
          const otherRow = getNodeRowIndex(otherNode);
          // Yakın komşu satırlara daha yüksek ağırlık ver
          const rowDist = Math.abs(otherRow - rowIdx);
          const wgt = rowDist === 1 ? 3 : rowDist === 0 ? 2 : 1;
          const otherPin = otherNode.pins.find((p) => p.id === otherPinId);
          const myPin = n.pins.find((p) => p.id === myPinId);
          const otherPos = positions[otherId] ?? { x: otherNode.defaultX, y: otherNode.defaultY };
          const otherPinX = otherPos.x + (otherPin?.dx ?? otherNode.width / 2);
          // Kendi pin ofsetini çıkararak doğrudan dikey hizalama hedefle
          const desiredCenter = otherPinX - (myPin?.dx ?? n.width / 2) + n.width / 2;
          sumX += desiredCenter * wgt;
          weight += wgt;
        }
      }
      if (weight > 0) {
        targets.set(n.id, sumX / weight);
      }
    }
    return targets;
  };

  // 8 tur Yukarı→Aşağı ve Aşağı→Yukarı Barycenter sıralaması + hizalama
  if (wires.length > 0) {
    for (let iter = 0; iter < 8; iter++) {
      const order = iter % 2 === 0 ? [1, 2, 3, 4, 0] : [3, 2, 1, 0, 4];
      for (const rIdx of order) {
        if (rows[rIdx].length <= 1) {
          const t = computeTargetsForRow(rIdx);
          const xs = packRowPositions(rows[rIdx], t, canvasW, 48);
          rows[rIdx].forEach((n) => {
            positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rIdx] };
          });
          continue;
        }
        const targets = computeTargetsForRow(rIdx);
        rows[rIdx].sort((a, b) => {
          const ta = targets.get(a.id) ?? canvasW + 500;
          const tb = targets.get(b.id) ?? canvasW + 500;
          return ta - tb;
        });
        const xs = packRowPositions(rows[rIdx], targets, canvasW, 48);
        rows[rIdx].forEach((n) => {
          positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rIdx] };
        });
      }
    }

    // İkili yer değiştirme (Greedy adjacent swap) ile kalan çapraz geçişleri daha da düşür
    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        if (row.length < 2) continue;
        for (let i = 0; i < row.length - 1; i++) {
          const beforeCross = countPairwiseCrossings(nodes, positions, wires);
          // Yer değiştir ve test et
          const savedPos = { ...positions };
          [row[i], row[i + 1]] = [row[i + 1], row[i]];
          const targets = computeTargetsForRow(rIdx);
          const xs = packRowPositions(row, targets, canvasW, 48);
          row.forEach((n) => {
            positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rIdx] };
          });
          const afterCross = countPairwiseCrossings(nodes, positions, wires);
          if (afterCross < beforeCross) {
            improved = true;
          } else {
            // Geri al
            [row[i], row[i + 1]] = [row[i + 1], row[i]];
            Object.assign(positions, savedPos);
          }
        }
      }
      if (!improved) break;
    }

    // Son hizalama geçişi (blokları bağlı oldukları pinlerin altına/üstüne merkezle)
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      if (rows[rIdx].length === 0) continue;
      const targets = computeTargetsForRow(rIdx);
      const xs = packRowPositions(rows[rIdx], targets, canvasW, 48);
      rows[rIdx].forEach((n) => {
        positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rIdx] };
      });
    }
  }

  const routedWires = autoRouteWires(wires, nodes, positions, canvasW, canvasH);
  return { nodePositions: positions, wires: routedWires };
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
  const firstTop = merged[0]?.y1 ?? 30;
  corridors.push({
    id: corridors.length,
    y1: -56,
    y2: Math.max(-12, firstTop - 12),
    midY: (-56 + Math.max(-12, firstTop - 12)) / 2,
  });

  for (let i = 0; i < merged.length - 1; i++) {
    const g1 = merged[i].y2;
    const g2 = merged[i + 1].y1;
    if (g2 - g1 >= 18) {
      corridors.push({
        id: corridors.length,
        y1: g1 + 12,
        y2: g2 - 12,
        midY: (g1 + g2) / 2,
      });
    }
  }

  const lastBottom = merged[merged.length - 1]?.y2 ?? canvasH - 60;
  corridors.push({
    id: corridors.length,
    y1: lastBottom + 14,
    y2: Math.max(lastBottom + 60, canvasH + 50),
    midY: lastBottom + 36,
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
      if (gapEnd - gapStart >= 24) {
        gaps.push(Math.round((gapStart + gapEnd) / 2));
      }
      if (sortedX[i].x2 > maxEnd) maxEnd = sortedX[i].x2;
    }
  }

  gaps.unshift(-28);
  gaps.push(canvasW + 24);
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
 * Left-Edge aralık paketlemeli çakışmasız ortogonal kanal yönlendirici.
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

  interface WirePlan {
    wire: SchematicWire;
    p1: SchematicPoint;
    p2: SchematicPoint;
    c1: Corridor;
    c2: Corridor;
    singleCorridor: boolean;
    vChannelBaseX?: number;
  }

  const plans: WirePlan[] = [];
  const unresolved = new Map<string, SchematicWire>();

  // 1. Aşama: Her kablonun hangi yatay koridorları ve dikey kanalı kullanacağını belirle
  const innerGapLoad = new Map<number, number>();
  let leftLoad = 0;
  let rightLoad = 0;

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
    const skipIds = new Set([w.fromNodeId, w.toNodeId]);
    const blockingRects = rects.filter((r) => !skipIds.has(r.id));

    const c1 = pickNearestCorridor(corridors, pin1.side === 'top' ? p1.y - 26 : p1.y + 26);
    const c2 = pickNearestCorridor(corridors, pin2.side === 'top' ? p2.y - 26 : p2.y + 26);

    if (
      c1.id === c2.id &&
      !blockingRects.some((r) => rectIntersectsHorizontal(r, p1.x, p2.x, c1.midY, 4))
    ) {
      plans.push({ wire: w, p1, p2, c1, c2, singleCorridor: true });
      continue;
    }

    // Dikey geçiş için önce p1.x veya p2.x doğrudan temiz mi bak
    let vBase: number | null = null;
    for (const dx of [p1.x, p2.x]) {
      if (!blockingRects.some((r) => rectIntersectsVertical(r, dx, c1.midY, c2.midY, 5))) {
        vBase = dx;
        break;
      }
    }

    if (vBase === null) {
      const openXs = findOpenVerticalChannels(blockingRects, c1.midY, c2.midY, canvasW);
      const midX = (p1.x + p2.x) / 2;
      let bestX = openXs[0];
      let bestScore = Infinity;
      for (const ox of openXs) {
        const isOuter = ox < 0 || ox > canvasW;
        const load = isOuter ? (ox < 0 ? leftLoad : rightLoad) : innerGapLoad.get(ox) ?? 0;
        const score = Math.abs(ox - midX) + load * 32 + (isOuter ? 80 : 0);
        if (score < bestScore) {
          bestScore = score;
          bestX = ox;
        }
      }
      vBase = bestX;
      if (bestX < 0) leftLoad += 1;
      else if (bestX > canvasW) rightLoad += 1;
      else innerGapLoad.set(bestX, (innerGapLoad.get(bestX) ?? 0) + 1);
    }

    plans.push({
      wire: w,
      p1,
      p2,
      c1,
      c2,
      singleCorridor: false,
      vChannelBaseX: vBase,
    });
  }

  // 2. Aşama: Dikey kanalları Left-Edge ile çakışmasız paralel şeritlere dağıt
  const vChannelGroups = new Map<string, Array<{ id: string; a: number; b: number; baseX: number }>>();
  for (const pl of plans) {
    if (pl.singleCorridor || pl.vChannelBaseX === undefined) continue;
    const key =
      pl.vChannelBaseX < 0
        ? 'LEFT'
        : pl.vChannelBaseX > canvasW
          ? 'RIGHT'
          : `GAP_${Math.round(pl.vChannelBaseX / 12) * 12}`;
    const list = vChannelGroups.get(key) ?? [];
    list.push({ id: pl.wire.id, a: pl.c1.midY, b: pl.c2.midY, baseX: pl.vChannelBaseX });
    vChannelGroups.set(key, list);
  }

  const assignedVX = new Map<string, number>();
  for (const [key, segs] of vChannelGroups.entries()) {
    const { trackById, trackCount } = assignNonOverlappingTracks(segs, 10);
    for (const seg of segs) {
      const t = trackById.get(seg.id) ?? 0;
      if (key === 'LEFT') {
        assignedVX.set(seg.id, -10 - t * 8);
      } else if (key === 'RIGHT') {
        assignedVX.set(seg.id, canvasW + 10 + t * 8);
      } else {
        const span = (trackCount - 1) * 7;
        assignedVX.set(seg.id, Math.round(seg.baseX - span / 2 + t * 7));
      }
    }
  }

  // 3. Aşama: Yatay koridorları Left-Edge ile çakışmasız paralel şeritlere dağıt
  const hCorridorGroups = new Map<number, Array<{ id: string; a: number; b: number }>>();
  const pushH = (cid: number, segId: string, a: number, b: number) => {
    const list = hCorridorGroups.get(cid) ?? [];
    list.push({ id: segId, a, b });
    hCorridorGroups.set(cid, list);
  };

  for (const pl of plans) {
    if (pl.singleCorridor) {
      pushH(pl.c1.id, `${pl.wire.id}::single`, pl.p1.x, pl.p2.x);
    } else {
      const vx = assignedVX.get(pl.wire.id) ?? pl.p1.x;
      pushH(pl.c1.id, `${pl.wire.id}::start`, pl.p1.x, vx);
      pushH(pl.c2.id, `${pl.wire.id}::end`, vx, pl.p2.x);
    }
  }

  const assignedHY = new Map<string, number>();
  for (const [cid, segs] of hCorridorGroups.entries()) {
    const corr = corridors.find((c) => c.id === cid);
    if (!corr) continue;
    const { trackById, trackCount } = assignNonOverlappingTracks(segs, 12);
    const usableH = Math.max(16, corr.y2 - corr.y1);
    const step = Math.min(11, usableH / (trackCount + 1));
    const totalSpan = step * (trackCount - 1);
    const startY = corr.midY - totalSpan / 2;
    for (const seg of segs) {
      const t = trackById.get(seg.id) ?? 0;
      const y = Math.round(Math.max(corr.y1, Math.min(corr.y2, startY + t * step)));
      assignedHY.set(seg.id, y);
    }
  }

  // 4. Aşama: Temiz köşe noktalarını oluştur
  const routedById = new Map<string, SchematicWire>();
  for (const pl of plans) {
    if (pl.singleCorridor) {
      const laneY = assignedHY.get(`${pl.wire.id}::single`) ?? pl.c1.midY;
      routedById.set(pl.wire.id, {
        ...pl.wire,
        waypoints: simplifyWaypoints(
          pl.p1,
          [
            { x: pl.p1.x, y: laneY },
            { x: pl.p2.x, y: laneY },
          ],
          pl.p2
        ),
      });
    } else {
      const vx = assignedVX.get(pl.wire.id) ?? pl.p1.x;
      const yStart = assignedHY.get(`${pl.wire.id}::start`) ?? pl.c1.midY;
      const yEnd = assignedHY.get(`${pl.wire.id}::end`) ?? pl.c2.midY;
      routedById.set(pl.wire.id, {
        ...pl.wire,
        waypoints: simplifyWaypoints(
          pl.p1,
          [
            { x: pl.p1.x, y: yStart },
            { x: vx, y: yStart },
            { x: vx, y: yEnd },
            { x: pl.p2.x, y: yEnd },
          ],
          pl.p2
        ),
      });
    }
  }

  return wires.map((w) => routedById.get(w.id) ?? unresolved.get(w.id) ?? w);
}

export interface VerticalSegment {
  wireId: string;
  x: number;
  yMin: number;
  yMax: number;
}

export function extractVerticalSegments(
  wireEntries: Array<{ wireId: string; points: SchematicPoint[] }>
): VerticalSegment[] {
  const result: VerticalSegment[] = [];
  for (const entry of wireEntries) {
    for (let i = 0; i < entry.points.length - 1; i++) {
      const a = entry.points[i];
      const b = entry.points[i + 1];
      if (Math.abs(a.x - b.x) < 0.8 && Math.abs(a.y - b.y) > 8) {
        result.push({
          wireId: entry.wireId,
          x: a.x,
          yMin: Math.min(a.y, b.y),
          yMax: Math.max(a.y, b.y),
        });
      }
    }
  }
  return result;
}

/**
 * Yumuşatılmış köşeli + dikey kesişimlerde EPLAN tarzı yarım daire atlama yaylı (∩) SVG <path> üretir.
 */
export function buildRoundedWirePath(
  points: SchematicPoint[],
  radius = 6,
  wireId?: string,
  verticalSegments?: VerticalSegment[]
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const hopR = 5;

  const appendSegmentWithHops = (a: SchematicPoint, b: SchematicPoint): string => {
    const isHoriz = Math.abs(a.y - b.y) < 0.8 && Math.abs(a.x - b.x) > hopR * 3;
    if (!isHoriz || !verticalSegments || !wireId) {
      return ` L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    const y = a.y;
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const goingRight = b.x > a.x;

    const rawCrossings = verticalSegments
      .filter(
        (vs) =>
          vs.wireId !== wireId &&
          vs.x > minX + hopR + 3 &&
          vs.x < maxX - hopR - 3 &&
          y > vs.yMin + 3 &&
          y < vs.yMax - 3
      )
      .map((vs) => vs.x)
      .sort((u, v) => (goingRight ? u - v : v - u));

    // Çok yakın kesişimleri tek atlamada birleştir
    const crossings: number[] = [];
    for (const cx of rawCrossings) {
      const prev = crossings[crossings.length - 1];
      if (prev === undefined || Math.abs(cx - prev) >= hopR * 2 + 2) {
        crossings.push(cx);
      }
    }

    if (crossings.length === 0) {
      return ` L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }

    let segD = '';
    for (const cx of crossings) {
      if (goingRight) {
        segD += ` L ${(cx - hopR).toFixed(1)} ${y.toFixed(1)} A ${hopR} ${hopR} 0 0 1 ${(cx + hopR).toFixed(1)} ${y.toFixed(1)}`;
      } else {
        segD += ` L ${(cx + hopR).toFixed(1)} ${y.toFixed(1)} A ${hopR} ${hopR} 0 0 0 ${(cx - hopR).toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    segD += ` L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    return segD;
  };

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y}${appendSegmentWithHops(points[0], points[1])}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  let curStart: SchematicPoint = points[0];

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
      d += appendSegmentWithHops(curStart, curr);
      curStart = curr;
      continue;
    }

    const pBefore: SchematicPoint = {
      x: curr.x - (v1x / len1) * r,
      y: curr.y - (v1y / len1) * r,
    };
    const pAfter: SchematicPoint = {
      x: curr.x + (v2x / len2) * r,
      y: curr.y + (v2y / len2) * r,
    };

    d += appendSegmentWithHops(curStart, pBefore);
    d += ` Q ${curr.x} ${curr.y} ${pAfter.x.toFixed(1)} ${pAfter.y.toFixed(1)}`;
    curStart = pAfter;
  }

  const last = points[points.length - 1];
  d += appendSegmentWithHops(curStart, last);
  return d;
}

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
