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

export interface JunctionDot {
  x: number;
  y: number;
  color: string;
}

export interface RouteMetrics {
  wireCount: number;
  crossings: number;
  boxCollisions: number;
  timeMs: number;
}

// ---------- Yardımcı Binary Min-Heap (A* için yüksek hız) ----------
class MinHeap {
  private keys: number[] = [];
  private vals: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, val: number): void {
    let i = this.keys.length;
    this.keys.push(key);
    this.vals.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      const tk = this.keys[p];
      this.keys[p] = this.keys[i];
      this.keys[i] = tk;
      const tv = this.vals[p];
      this.vals[p] = this.vals[i];
      this.vals[i] = tv;
      i = p;
    }
  }

  pop(): number {
    const top = this.vals[0];
    const lastK = this.keys.pop()!;
    const lastV = this.vals.pop()!;
    const n = this.keys.length;
    if (n > 0) {
      this.keys[0] = lastK;
      this.vals[0] = lastV;
      let i = 0;
      while (true) {
        const l = (i << 1) + 1;
        const r = l + 1;
        let smallest = i;
        if (l < n && this.keys[l] < this.keys[smallest]) smallest = l;
        if (r < n && this.keys[r] < this.keys[smallest]) smallest = r;
        if (smallest === i) break;
        const tk = this.keys[i];
        this.keys[i] = this.keys[smallest];
        this.keys[smallest] = tk;
        const tv = this.vals[i];
        this.vals[i] = this.vals[smallest];
        this.vals[smallest] = tv;
        i = smallest;
      }
    }
    return top;
  }
}

// ---------- Ortak Net (Union-Find) ----------
function assignNetIds(wires: SchematicWire[], mergeSameNet: boolean): Map<string, number> {
  const result = new Map<string, number>();
  if (!mergeSameNet) {
    wires.forEach((w, idx) => result.set(w.id, idx + 1));
    return result;
  }

  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let cur = k;
    while (parent.get(cur) !== cur) {
      cur = parent.get(cur)!;
    }
    let tmp = k;
    while (parent.get(tmp) !== cur) {
      const nxt = parent.get(tmp)!;
      parent.set(tmp, cur);
      tmp = nxt;
    }
    return cur;
  };
  const union = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  // Aynı pin ve aynı renkteki kablolar ortak elektrik hattı (net) oluşturur
  for (const w of wires) {
    const k1 = `${w.fromNodeId}::${w.fromPinId}::${w.color}`;
    const k2 = `${w.toNodeId}::${w.toPinId}::${w.color}`;
    union(k1, k2);
  }

  const rootToId = new Map<string, number>();
  let nextId = 1;
  for (const w of wires) {
    const r = find(`${w.fromNodeId}::${w.fromPinId}::${w.color}`);
    if (!rootToId.has(r)) {
      rootToId.set(r, nextId++);
    }
    result.set(w.id, rootToId.get(r)!);
  }
  return result;
}

// ---------- Komponent Yerleşimi (Barycenter + İkili Çapraz Azaltma) ----------
function getNodeRowIndex(node: RouterNode): number {
  const id = node.id;
  if (id === 'sys-supply' || id === 'sys-neutral' || id === 'sys-pe') return 0;
  if (id.startsWith('sys-m') || id.startsWith('sys-sector')) return 4;
  if (id === 'blk-bottom-terminals') return 3;
  if (id === 'blk-top-terminals' || /^q\d/i.test(id) || /^r\d/i.test(id) || id.includes('mks') || id.includes('relay')) return 1;
  if (/^km\d/i.test(id) || /^s\d/i.test(id) || id.includes('contactor') || id.includes('button')) return 2;
  if (node.defaultY < 130) return 0;
  if (node.defaultY < 340) return 1;
  if (node.defaultY < 590) return 2;
  if (node.defaultY < 800) return 3;
  return 4;
}

const ROW_Y_COORDS = [30, 240, 500, 740, 960];

function packRowPositions(
  rowNodes: RouterNode[],
  targetCenters: Map<string, number>,
  canvasW: number,
  minGap = 50
): Map<string, number> {
  const margin = 40;
  const totalNodeW = rowNodes.reduce((s, n) => s + n.width, 0);
  const availW = canvasW - margin * 2;
  const gap =
    rowNodes.length > 1
      ? Math.max(30, Math.min(minGap, Math.floor((availW - totalNodeW) / (rowNodes.length - 1))))
      : 0;

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

  const xs = rowNodes.map((n) => {
    const t = targetCenters.get(n.id);
    return t !== undefined ? t - n.width / 2 : margin;
  });

  for (let i = 0; i < rowNodes.length; i++) {
    if (i === 0) xs[i] = Math.max(margin, xs[i]);
    else {
      const minAllowed = xs[i - 1] + rowNodes[i - 1].width + gap;
      if (xs[i] < minAllowed) xs[i] = minAllowed;
    }
  }

  const lastIdx = rowNodes.length - 1;
  if (lastIdx >= 0) {
    const overflow = xs[lastIdx] + rowNodes[lastIdx].width - (canvasW - margin);
    if (overflow > 0) {
      xs[lastIdx] -= overflow;
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
  rowNodes.forEach((n, i) => result.set(n.id, Math.round(xs[i] / 10) * 10));
  return result;
}

function countStraightCrossings(
  nodes: RouterNode[],
  positions: Record<string, SchematicNodePos>,
  wires: SchematicWire[]
): number {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
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

export function autoOptimizeSchematicLayout(
  nodes: RouterNode[],
  wires: SchematicWire[],
  canvasW: number,
  canvasH: number,
  mergeSameNet = true
): {
  nodePositions: Record<string, SchematicNodePos>;
  wires: SchematicWire[];
  metrics: RouteMetrics;
} {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const rows: RouterNode[][] = [[], [], [], [], []];
  for (const n of nodes) rows[getNodeRowIndex(n)].push(n);

  const positions: Record<string, SchematicNodePos> = {};
  rows.forEach((rowNodes, rowIdx) => {
    if (rowNodes.length === 0) return;
    const xs = packRowPositions(rowNodes, new Map(), canvasW, 54);
    for (const n of rowNodes) {
      positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rowIdx] };
    }
  });

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
          const dist = Math.abs(getNodeRowIndex(otherNode) - rowIdx);
          const wgt = dist === 1 ? 3 : dist === 0 ? 2 : 1;
          const otherPin = otherNode.pins.find((p) => p.id === otherPinId);
          const myPin = n.pins.find((p) => p.id === myPinId);
          const otherPos = positions[otherId] ?? { x: otherNode.defaultX, y: otherNode.defaultY };
          const otherPinX = otherPos.x + (otherPin?.dx ?? otherNode.width / 2);
          const desiredCenter = otherPinX - (myPin?.dx ?? n.width / 2) + n.width / 2;
          sumX += desiredCenter * wgt;
          weight += wgt;
        }
      }
      if (weight > 0) targets.set(n.id, sumX / weight);
    }
    return targets;
  };

  if (wires.length > 0) {
    for (let iter = 0; iter < 8; iter++) {
      const order = iter % 2 === 0 ? [1, 2, 3, 4, 0] : [3, 2, 1, 0, 4];
      for (const rIdx of order) {
        const targets = computeTargetsForRow(rIdx);
        if (rows[rIdx].length > 1) {
          rows[rIdx].sort(
            (a, b) => (targets.get(a.id) ?? canvasW + 500) - (targets.get(b.id) ?? canvasW + 500)
          );
        }
        const xs = packRowPositions(rows[rIdx], targets, canvasW, 54);
        rows[rIdx].forEach((n) => {
          positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rIdx] };
        });
      }
    }

    // İkili komşu takası (crossings azalt)
    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        if (row.length < 2) continue;
        for (let i = 0; i < row.length - 1; i++) {
          const before = countStraightCrossings(nodes, positions, wires);
          const saved = { ...positions };
          [row[i], row[i + 1]] = [row[i + 1], row[i]];
          const targets = computeTargetsForRow(rIdx);
          const xs = packRowPositions(row, targets, canvasW, 54);
          row.forEach((n) => {
            positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rIdx] };
          });
          const after = countStraightCrossings(nodes, positions, wires);
          if (after < before) {
            improved = true;
          } else {
            [row[i], row[i + 1]] = [row[i + 1], row[i]];
            Object.assign(positions, saved);
          }
        }
      }
      if (!improved) break;
    }

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      if (rows[rIdx].length === 0) continue;
      const targets = computeTargetsForRow(rIdx);
      const xs = packRowPositions(rows[rIdx], targets, canvasW, 54);
      rows[rIdx].forEach((n) => {
        positions[n.id] = { x: xs.get(n.id) ?? n.defaultX, y: ROW_Y_COORDS[rIdx] };
      });
    }
  }

  const routed = autoRouteWiresWithMetrics(wires, nodes, positions, canvasW, canvasH, mergeSameNet);
  return { nodePositions: positions, wires: routed.wires, metrics: routed.metrics };
}

// ---------- GERÇEK PROTEUS TARZI 10px IZGARALI A* LABİRENT OTOROUTER ----------

function simplifyPolyline(pts: SchematicPoint[]): SchematicPoint[] {
  const dedup: SchematicPoint[] = [];
  for (const p of pts) {
    const prev = dedup[dedup.length - 1];
    if (!prev || Math.abs(prev.x - p.x) > 0.4 || Math.abs(prev.y - p.y) > 0.4) {
      dedup.push(p);
    }
  }
  const out: SchematicPoint[] = [];
  for (let i = 0; i < dedup.length; i++) {
    const prev = out[out.length - 1];
    const curr = dedup[i];
    const next = dedup[i + 1];
    if (prev && next) {
      const sameX = Math.abs(prev.x - curr.x) < 0.4 && Math.abs(curr.x - next.x) < 0.4;
      const sameY = Math.abs(prev.y - curr.y) < 0.4 && Math.abs(curr.y - next.y) < 0.4;
      if (sameX || sameY) continue;
    }
    out.push(curr);
  }
  return out;
}

export function autoRouteWires(
  wires: SchematicWire[],
  nodes: RouterNode[],
  nodePositions: Record<string, SchematicNodePos>,
  canvasW: number,
  canvasH: number,
  mergeSameNet = true
): SchematicWire[] {
  return autoRouteWiresWithMetrics(wires, nodes, nodePositions, canvasW, canvasH, mergeSameNet).wires;
}

export function autoRouteWiresWithMetrics(
  wires: SchematicWire[],
  nodes: RouterNode[],
  nodePositions: Record<string, SchematicNodePos>,
  canvasW: number,
  canvasH: number,
  mergeSameNet = true
): { wires: SchematicWire[]; metrics: RouteMetrics } {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (wires.length === 0) {
    return {
      wires,
      metrics: { wireCount: 0, crossings: 0, boxCollisions: 0, timeMs: 0 },
    };
  }

  const STEP = 10;
  const MIN_X = -80;
  const MIN_Y = -70;
  const MAX_X = canvasW + 80;
  const MAX_Y = canvasH + 70;
  const cols = Math.floor((MAX_X - MIN_X) / STEP) + 1;
  const rows = Math.floor((MAX_Y - MIN_Y) / STEP) + 1;
  const cellCount = cols * rows;

  const toGX = (x: number) => Math.max(0, Math.min(cols - 1, Math.round((x - MIN_X) / STEP)));
  const toGY = (y: number) => Math.max(0, Math.min(rows - 1, Math.round((y - MIN_Y) / STEP)));
  const fromGX = (gx: number) => MIN_X + gx * STEP;
  const fromGY = (gy: number) => MIN_Y + gy * STEP;
  const cellIdx = (gx: number, gy: number) => gy * cols + gx;

  // 1. Engel Haritası (Komponent blokları geçilmez duvar + 1 hücre dış duvar yakınlık cezası)
  const blocked = new Uint8Array(cellCount);
  const nearWall = new Uint8Array(cellCount);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const rects: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }> = [];

  for (const n of nodes) {
    const pos = nodePositions[n.id] ?? { x: n.defaultX, y: n.defaultY };
    const x1 = pos.x;
    const y1 = pos.y;
    const x2 = pos.x + n.width;
    const y2 = pos.y + n.height;
    rects.push({ id: n.id, x1, y1, x2, y2 });

    // Blok içini (sol/sağ 6px pay dahil) tamamen kapat
    const gx1 = toGX(x1 - 4);
    const gx2 = toGX(x2 + 4);
    const gy1 = toGY(y1);
    const gy2 = toGY(y2);
    for (let gy = gy1; gy <= gy2; gy++) {
      for (let gx = gx1; gx <= gx2; gx++) {
        blocked[cellIdx(gx, gy)] = 1;
      }
    }

    // Duvar etrafındaki 1 hücreye yumuşak uzak durma maliyeti ekle (kablolar blok kenarına yapışmasın)
    for (let gy = Math.max(0, gy1 - 1); gy <= Math.min(rows - 1, gy2 + 1); gy++) {
      for (let gx = Math.max(0, gx1 - 1); gx <= Math.min(cols - 1, gx2 + 1); gx++) {
        nearWall[cellIdx(gx, gy)] = 1;
      }
    }
  }

  // Kenar sahipleri (edgeH: (gx,gy)->(gx+1,gy), edgeV: (gx,gy)->(gx,gy+1))
  // 0 = boş, >0 = netId
  const edgeHOwner = new Int32Array(cellCount);
  const edgeVOwner = new Int32Array(cellCount);
  const edgeHCount = new Uint16Array(cellCount);
  const edgeVCount = new Uint16Array(cellCount);
  const cornerOwner = new Int32Array(cellCount);
  const cornerCount = new Uint16Array(cellCount);

  const netIdByWire = assignNetIds(wires, mergeSameNet);

  // Her kablonun başlangıç / bitiş pin portunu hesapla (kutunun tam 10px dışında açık hücre)
  interface RoutableWire {
    wire: SchematicWire;
    netId: number;
    p1: SchematicPoint;
    p2: SchematicPoint;
    sGX: number;
    sGY: number;
    eGX: number;
    eGY: number;
    manhattan: number;
    gridPath: Array<{ gx: number; gy: number }>;
    crossingScore: number;
  }

  const routables: RoutableWire[] = [];
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

    const sGX = toGX(p1.x);
    let sGY = toGY(pin1.side === 'top' ? p1.y - 10 : p1.y + 10);
    while (blocked[cellIdx(sGX, sGY)] && sGY > 1 && sGY < rows - 2) {
      sGY += pin1.side === 'top' ? -1 : 1;
    }

    const eGX = toGX(p2.x);
    let eGY = toGY(pin2.side === 'top' ? p2.y - 10 : p2.y + 10);
    while (blocked[cellIdx(eGX, eGY)] && eGY > 1 && eGY < rows - 2) {
      eGY += pin2.side === 'top' ? -1 : 1;
    }

    routables.push({
      wire: w,
      netId: netIdByWire.get(w.id) ?? 1,
      p1,
      p2,
      sGX,
      sGY,
      eGX,
      eGY,
      manhattan: Math.abs(eGX - sGX) + Math.abs(eGY - sGY),
      gridPath: [],
      crossingScore: 0,
    });
  }

  // Izgara kenarlarına kablo yaz / sil (Rip-Up & Reroute desteği)
  const stampWire = (rw: RoutableWire, delta: 1 | -1) => {
    const path = rw.gridPath;
    if (path.length < 2) return;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      if (a.gy === b.gy) {
        const minX = Math.min(a.gx, b.gx);
        const idx = cellIdx(minX, a.gy);
        if (delta === 1) {
          edgeHCount[idx] += 1;
          edgeHOwner[idx] = rw.netId;
        } else {
          if (edgeHCount[idx] > 0) edgeHCount[idx] -= 1;
          if (edgeHCount[idx] === 0) edgeHOwner[idx] = 0;
        }
      } else {
        const minY = Math.min(a.gy, b.gy);
        const idx = cellIdx(a.gx, minY);
        if (delta === 1) {
          edgeVCount[idx] += 1;
          edgeVOwner[idx] = rw.netId;
        } else {
          if (edgeVCount[idx] > 0) edgeVCount[idx] -= 1;
          if (edgeVCount[idx] === 0) edgeVOwner[idx] = 0;
        }
      }

      // Köşe noktalarını işaretle (başka net köşeden geçip sahte T-bağlantı yapmasın)
      if (i > 0) {
        const prev = path[i - 1];
        const turned = (prev.gx === a.gx) !== (a.gx === b.gx);
        if (turned) {
          const cIdx = cellIdx(a.gx, a.gy);
          if (delta === 1) {
            cornerCount[cIdx] += 1;
            cornerOwner[cIdx] = rw.netId;
          } else {
            if (cornerCount[cIdx] > 0) cornerCount[cIdx] -= 1;
            if (cornerCount[cIdx] === 0) cornerOwner[cIdx] = 0;
          }
        }
      }
    }
  };

  // A* için yeniden kullanılabilir tamponlar (GC sıfır, çok hızlı)
  const stateCount = cellCount * 2; // 0 = H ile geldi, 1 = V ile geldi
  const gScore = new Float32Array(stateCount);
  const parentState = new Int32Array(stateCount);
  const visitedStamp = new Uint32Array(stateCount);
  let currentStamp = 0;

  // Dirs: 0=Sağ(+x,H), 1=Sol(-x,H), 2=Aşağı(+y,V), 3=Yukarı(-y,V)
  const DX = [1, -1, 0, 0];
  const DY = [0, 0, 1, -1];
  const ORIENT = [0, 0, 1, 1];

  const runAStar = (
    rw: RoutableWire,
    strictNoOverlap: boolean
  ): { path: Array<{ gx: number; gy: number }>; crossings: number } | null => {
    currentStamp += 1;
    const stamp = currentStamp;
    const heap = new MinHeap();
    const { sGX, sGY, eGX, eGY, netId } = rw;

    if (sGX === eGX && sGY === eGY) {
      return { path: [{ gx: sGX, gy: sGY }], crossings: 0 };
    }

    const startCell = cellIdx(sGX, sGY);
    // Başlangıç pini dikey çıkış yaptığı için başlangıç yönü V (1)
    const startState = (startCell << 1) | 1;
    visitedStamp[startState] = stamp;
    gScore[startState] = 0;
    parentState[startState] = -1;
    heap.push(Math.abs(eGX - sGX) + Math.abs(eGY - sGY), startState);

    let foundState = -1;
    let expanded = 0;
    const MAX_EXPAND = 36000;

    while (heap.size > 0 && expanded < MAX_EXPAND) {
      const state = heap.pop();
      const cIdx = state >> 1;
      const curOrient = state & 1;
      const gx = cIdx % cols;
      const gy = (cIdx - gx) / cols;

      if (gx === eGX && gy === eGY) {
        foundState = state;
        break;
      }

      expanded += 1;
      const curG = gScore[state];

      for (let d = 0; d < 4; d++) {
        const ngx = gx + DX[d];
        const ngy = gy + DY[d];
        if (ngx < 0 || ngx >= cols || ngy < 0 || ngy >= rows) continue;

        const nextCell = ngy * cols + ngx;
        const isGoal = ngx === eGX && ngy === eGY;

        // Komponent gövdesi kesinlikle geçilmez!
        if (blocked[nextCell] && !isGoal) continue;

        const nextOrient = ORIENT[d];
        const edgeCell =
          nextOrient === 0 ? cellIdx(Math.min(gx, ngx), gy) : cellIdx(gx, Math.min(gy, ngy));
        const owner = nextOrient === 0 ? edgeHOwner[edgeCell] : edgeVOwner[edgeCell];

        let stepCost = 1.0;

        if (owner !== 0 && owner !== netId) {
          // Başka bir kablonun üstüne paralel binme!
          if (strictNoOverlap) continue;
          stepCost += 450;
        } else if (owner === netId) {
          // Aynı elektrik hattı (Proteus ortak hat paylaşımı)
          stepCost = 0.35;
        } else {
          // Kesişim kontrolü: hedef hücrede dikey/yatay farklı bir kablo geçiyor mu?
          let crossesOther = false;
          if (!isGoal) {
            if (nextOrient === 0) {
              // Yatay hareket ederken dikey başka kablo geçiyor mu?
              const vUp = ngy > 0 ? edgeVOwner[cellIdx(ngx, ngy - 1)] : 0;
              const vDown = edgeVOwner[nextCell];
              if ((vUp !== 0 && vUp !== netId) || (vDown !== 0 && vDown !== netId)) {
                crossesOther = true;
              }
            } else {
              // Dikey hareket ederken yatay başka kablo geçiyor mu?
              const hLeft = ngx > 0 ? edgeHOwner[cellIdx(ngx - 1, ngy)] : 0;
              const hRight = edgeHOwner[nextCell];
              if ((hLeft !== 0 && hLeft !== netId) || (hRight !== 0 && hRight !== netId)) {
                crossesOther = true;
              }
            }
          }

          // Başka bir kablonun köşe noktasına dokunma (sahte T-bağlantıyı önle)
          const cOwner = cornerOwner[nextCell];
          if (cOwner !== 0 && cOwner !== netId && !isGoal) {
            if (strictNoOverlap) continue;
            stepCost += 250;
          }

          if (crossesOther) {
            stepCost += 72; // Kesişimden kaçınmak için yüksek maliyet
          }

          // Komşu paralel hatlara çok yapışmayı hafifçe cezalandır (ferah aralık)
          if (nearWall[nextCell]) stepCost += 2.5;
          if (nextOrient === 0) {
            const adjUp = ngy > 0 ? edgeHOwner[cellIdx(Math.min(gx, ngx), ngy - 1)] : 0;
            const adjDn = ngy < rows - 1 ? edgeHOwner[cellIdx(Math.min(gx, ngx), ngy + 1)] : 0;
            if ((adjUp !== 0 && adjUp !== netId) || (adjDn !== 0 && adjDn !== netId)) {
              stepCost += 1.4;
            }
          } else {
            const adjL = ngx > 0 ? edgeVOwner[cellIdx(ngx - 1, Math.min(gy, ngy))] : 0;
            const adjR = ngx < cols - 1 ? edgeVOwner[cellIdx(ngx + 1, Math.min(gy, ngy))] : 0;
            if ((adjL !== 0 && adjL !== netId) || (adjR !== 0 && adjR !== netId)) {
              stepCost += 1.4;
            }
          }
        }

        // 90° yön değişimi cezası (gereksiz merdiven/zikzak önleme)
        if (curOrient !== nextOrient) {
          stepCost += 9.5;
        }

        const nextState = (nextCell << 1) | nextOrient;
        const nextG = curG + stepCost;

        if (visitedStamp[nextState] !== stamp || nextG < gScore[nextState]) {
          visitedStamp[nextState] = stamp;
          gScore[nextState] = nextG;
          parentState[nextState] = state;
          const h = Math.abs(eGX - ngx) + Math.abs(eGY - ngy);
          heap.push(nextG + h * 1.15, nextState);
        }
      }
    }

    if (foundState === -1) return null;

    // Yolu geriye doğru çıkar
    const rev: Array<{ gx: number; gy: number }> = [];
    let cur = foundState;
    while (cur !== -1) {
      const cIdx = cur >> 1;
      const gx = cIdx % cols;
      const gy = (cIdx - gx) / cols;
      rev.push({ gx, gy });
      cur = parentState[cur];
    }
    rev.reverse();

    // Kesişim sayısını yaklaşıkla
    let crossings = 0;
    for (let i = 1; i < rev.length - 1; i++) {
      const p = rev[i];
      const prev = rev[i - 1];
      const cIdx = cellIdx(p.gx, p.gy);
      if (prev.gy === p.gy) {
        const vUp = p.gy > 0 ? edgeVOwner[cellIdx(p.gx, p.gy - 1)] : 0;
        if (vUp !== 0 && vUp !== netId) crossings += 1;
      } else {
        const hLeft = p.gx > 0 ? edgeHOwner[cellIdx(p.gx - 1, p.gy)] : 0;
        if (hLeft !== 0 && hLeft !== netId) crossings += 1;
      }
      if (blocked[cIdx]) crossings += 10;
    }

    return { path: rev, crossings };
  };

  // Geçiş 1: Kısa bağlantılardan uzuna doğru yönlendir (yerel bağlantılar düz, uzunlar etraftan dolaşır)
  const order = [...routables].sort((a, b) => a.manhattan - b.manhattan);
  for (const rw of order) {
    const res = runAStar(rw, true) ?? runAStar(rw, false);
    if (res) {
      rw.gridPath = res.path;
      rw.crossingScore = res.crossings;
      stampWire(rw, 1);
    }
  }

  // Geçiş 2 (Rip-Up & Reroute): En çok kesişen hatları söküp güncel haritada daha temiz yoldan yeniden çiz
  const highCross = [...order]
    .filter((rw) => rw.crossingScore > 0)
    .sort((a, b) => b.crossingScore - a.crossingScore)
    .slice(0, 12);

  for (const rw of highCross) {
    const oldPath = rw.gridPath;
    const oldScore = rw.crossingScore;
    stampWire(rw, -1);
    const retry = runAStar(rw, true);
    if (retry && retry.crossings <= oldScore) {
      rw.gridPath = retry.path;
      rw.crossingScore = retry.crossings;
    } else {
      rw.gridPath = oldPath;
    }
    stampWire(rw, 1);
  }

  // Grid yollarını temiz SVG köşe noktalarına dönüştür
  const routedById = new Map<string, SchematicWire>();
  let totalCrossings = 0;
  let boxCollisions = 0;

  for (const rw of routables) {
    totalCrossings += rw.crossingScore;
    if (rw.gridPath.length === 0) {
      routedById.set(rw.wire.id, rw.wire);
      continue;
    }
    const worldPts: SchematicPoint[] = [
      rw.p1,
      { x: rw.p1.x, y: fromGY(rw.sGY) },
      ...rw.gridPath.map((pt) => ({ x: fromGX(pt.gx), y: fromGY(pt.gy) })),
      { x: rw.p2.x, y: fromGY(rw.eGY) },
      rw.p2,
    ];
    const simplified = simplifyPolyline(worldPts);

    // Kutu içi ihlal kontrolü (doğrulama metriği)
    for (let i = 1; i < simplified.length - 2; i++) {
      const a = simplified[i];
      const b = simplified[i + 1];
      for (const r of rects) {
        if (r.id === rw.wire.fromNodeId || r.id === rw.wire.toNodeId) continue;
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        if (maxX > r.x1 + 2 && minX < r.x2 - 2 && maxY > r.y1 + 2 && minY < r.y2 - 2) {
          boxCollisions += 1;
        }
      }
    }

    routedById.set(rw.wire.id, {
      ...rw.wire,
      waypoints: simplified.slice(1, -1),
    });
  }

  const finalWires = wires.map((w) => routedById.get(w.id) ?? unresolved.get(w.id) ?? w);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    wires: finalWires,
    metrics: {
      wireCount: wires.length,
      crossings: totalCrossings,
      boxCollisions,
      timeMs: Math.round(t1 - t0),
    },
  };
}

/**
 * Aynı net ve renkteki kabloların birleştiği T-ek / 4-yol bağlantı noktalarını (Proteus •) bulur.
 */
export function computeNetJunctions(
  wireEntries: Array<{ wire: SchematicWire; points: SchematicPoint[] }>
): JunctionDot[] {
  const netByWire = assignNetIds(
    wireEntries.map((e) => e.wire),
    true
  );

  // Her (netId, gridNokta) için çıkan benzersiz 10px komşu yönlerini say
  const neighbors = new Map<string, { x: number; y: number; color: string; dirs: Set<string> }>();

  const addDir = (netId: number, x: number, y: number, color: string, dirKey: string) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const key = `${netId}::${rx},${ry}`;
    let rec = neighbors.get(key);
    if (!rec) {
      rec = { x: rx, y: ry, color, dirs: new Set() };
      neighbors.set(key, rec);
    }
    rec.dirs.add(dirKey);
  };

  for (const { wire, points } of wireEntries) {
    const netId = netByWire.get(wire.id) ?? 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      if (dx === 0 && dy === 0) continue;

      if (Math.abs(a.y - b.y) < 0.5) {
        const steps = Math.round(Math.abs(b.x - a.x) / 10);
        for (let s = 0; s < steps; s++) {
          const x1 = a.x + dx * s * 10;
          const x2 = x1 + dx * 10;
          addDir(netId, x1, a.y, wire.color, dx > 0 ? 'R' : 'L');
          addDir(netId, x2, a.y, wire.color, dx > 0 ? 'L' : 'R');
        }
      } else if (Math.abs(a.x - b.x) < 0.5) {
        const steps = Math.round(Math.abs(b.y - a.y) / 10);
        for (let s = 0; s < steps; s++) {
          const y1 = a.y + dy * s * 10;
          const y2 = y1 + dy * 10;
          addDir(netId, a.x, y1, wire.color, dy > 0 ? 'D' : 'U');
          addDir(netId, a.x, y2, wire.color, dy > 0 ? 'U' : 'D');
        }
      }
    }
  }

  const dots: JunctionDot[] = [];
  for (const rec of neighbors.values()) {
    if (rec.dirs.size >= 3) {
      dots.push({ x: rec.x, y: rec.y, color: rec.color });
    }
  }
  return dots;
}

export interface VerticalSegment {
  wireId: string;
  netId: number;
  x: number;
  yMin: number;
  yMax: number;
}

export function extractVerticalSegments(
  wireEntries: Array<{ wire: SchematicWire; points: SchematicPoint[] }>
): { segments: VerticalSegment[]; netByWire: Map<string, number> } {
  const netByWire = assignNetIds(
    wireEntries.map((e) => e.wire),
    true
  );
  const segments: VerticalSegment[] = [];
  for (const entry of wireEntries) {
    const netId = netByWire.get(entry.wire.id) ?? 0;
    for (let i = 0; i < entry.points.length - 1; i++) {
      const a = entry.points[i];
      const b = entry.points[i + 1];
      if (Math.abs(a.x - b.x) < 0.8 && Math.abs(a.y - b.y) > 8) {
        segments.push({
          wireId: entry.wire.id,
          netId,
          x: a.x,
          yMin: Math.min(a.y, b.y),
          yMax: Math.max(a.y, b.y),
        });
      }
    }
  }
  return { segments, netByWire };
}

/**
 * Yumuşatılmış köşeli + farklı netlerin dikey kesişimlerinde atlama yaylı (∩) SVG <path> üretir.
 */
export function buildRoundedWirePath(
  points: SchematicPoint[],
  radius = 5,
  wireId?: string,
  wireNetId?: number,
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
          (wireNetId === undefined || vs.netId !== wireNetId) &&
          vs.x > minX + hopR + 3 &&
          vs.x < maxX - hopR - 3 &&
          y > vs.yMin + 3 &&
          y < vs.yMax - 3
      )
      .map((vs) => vs.x)
      .sort((u, v) => (goingRight ? u - v : v - u));

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
