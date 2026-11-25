import { useRef, useState } from 'react';
import type { EnclosureSpec, LayoutAnalysis, PlacedItem, RailId, RailSpec } from '../types/panel';
import { getWallOffsets, isRailMount } from '../utils/geometry';

export type ViewMode = 'all' | 'front' | 'sides';

interface PanelCanvasProps {
  enclosure: EnclosureSpec;
  rails: RailSpec[];
  analysis: LayoutAnalysis;
  selectedId: string | null;
  highlightedIds?: Set<string>;
  viewMode: ViewMode;
  showDimensions: boolean;
  showWindowOverlay: boolean;
  showWireClearance: boolean;
  onSelect: (id: string) => void;
  onUpdateSidePosY: (id: string, nextYMm: number) => void;
  onUpdateHorizPosX: (id: string, nextXMm: number) => void;
  onUpdateBackplatePos: (id: string, nextXMm: number, nextYMm: number) => void;
  onReorderRailItem?: (itemId: string, targetRailId: RailId, targetIndex: number) => void;
}

function renderRailComponentGraphic(
  p: PlacedItem,
  isSelected: boolean,
  isHighlighted: boolean,
  isColliding: boolean,
  isDragging: boolean,
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void
) {
  const { item, box } = p;
  const w = box.x2 - box.x1;
  const h = box.y2 - box.y1;
  const cx = box.x1 + w / 2;
  const cy = box.y1 + h / 2;
  const stroke = isColliding
    ? '#ef4444'
    : isHighlighted
      ? '#facc15'
      : isSelected
        ? '#38bdf8'
        : '#334155';
  const strokeW = isSelected || isColliding || isHighlighted ? 1.8 : 0.9;

  return (
    <g
      key={item.id}
      className="cad-item"
      onPointerDown={onPointerDown}
      style={{ cursor: 'grab', opacity: isDragging ? 0.5 : 1 }}
    >
      <rect
        x={box.x1 + 0.4}
        y={box.y1}
        width={Math.max(1, w - 0.8)}
        height={h}
        rx={item.category === 'terminal' ? 0.6 : 2}
        fill={
          isColliding
            ? 'rgba(239, 68, 68, 0.28)'
            : isHighlighted
              ? 'rgba(250, 204, 21, 0.22)'
              : '#1e293b'
        }
        stroke={stroke}
        strokeWidth={strokeW}
      />

      {item.category === 'mks' && (
        <>
          <rect x={box.x1 + 1.5} y={box.y1 + 1.5} width={w - 3} height={11} rx={1} fill="#0f172a" />
          <rect x={box.x1 + 1.5} y={box.y2 - 12.5} width={w - 3} height={11} rx={1} fill="#0f172a" />
          {[0.22, 0.5, 0.78].map((ratio, idx) => (
            <g key={idx}>
              <circle cx={box.x1 + w * ratio} cy={box.y1 + 7} r={2.3} fill="#64748b" />
              <circle cx={box.x1 + w * ratio} cy={box.y2 - 7} r={2.3} fill="#64748b" />
            </g>
          ))}
          <rect
            x={box.x1 + 2}
            y={cy - 18}
            width={w - 4}
            height={36}
            rx={1.5}
            fill={item.color}
            fillOpacity={0.18}
            stroke={item.color}
            strokeWidth={0.7}
          />
          <rect x={cx - 12} y={cy - 6} width={10} height={11} rx={1.5} fill="#0f172a" stroke="#94a3b8" strokeWidth={0.6} />
          <rect x={cx + 2} y={cy - 6} width={10} height={11} rx={1.5} fill="#dc2626" stroke="#fca5a5" strokeWidth={0.6} />
          <text x={cx - 7} y={cy + 2} textAnchor="middle" fontSize={5} fill="#e2e8f0" fontWeight={700}>I</text>
          <text x={cx + 7} y={cy + 2} textAnchor="middle" fontSize={5} fill="#fff" fontWeight={700}>O</text>
          <circle cx={cx - 10} cy={cy + 12} r={4.2} fill="#0f172a" stroke="#38bdf8" strokeWidth={0.7} />
          <line x1={cx - 10} y1={cy + 9} x2={cx - 10} y2={cy + 15} stroke="#38bdf8" strokeWidth={0.8} />
          <text x={cx} y={cy - 10} textAnchor="middle" fontSize={6.5} fill="#f8fafc" fontWeight={700}>
            {item.code}
          </text>
          <text x={cx + 6} y={cy + 14} textAnchor="middle" fontSize={4.8} fill="#7dd3fc">
            {item.rating ?? 'MKŞ'}
          </text>
        </>
      )}

      {item.category === 'relay' && (
        <>
          <rect x={box.x1 + 1.5} y={box.y1 + 1.5} width={Math.max(1, w - 3)} height={11} rx={1} fill="#0f172a" />
          <rect x={box.x1 + 1.5} y={box.y2 - 12.5} width={Math.max(1, w - 3)} height={11} rx={1} fill="#0f172a" />
          {w >= 14 &&
            [0.2, 0.4, 0.6, 0.8].map((ratio, idx) => (
              <g key={idx}>
                <circle cx={box.x1 + w * ratio} cy={box.y1 + 7} r={1.6} fill="#94a3b8" />
                <circle cx={box.x1 + w * ratio} cy={box.y2 - 7} r={1.6} fill="#94a3b8" />
              </g>
            ))}
          <rect
            x={box.x1 + 1.5}
            y={cy - 18}
            width={Math.max(1, w - 3)}
            height={36}
            rx={2}
            fill={item.color}
            fillOpacity={0.22}
            stroke={item.color}
            strokeWidth={0.8}
          />
          {w >= 18 && <circle cx={cx + 6} cy={cy - 12} r={1.6} fill="#ef4444" />}
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={w < 14 ? 4 : 6.2}
            fill="#f8fafc"
            fontWeight={700}
            transform={w < 14 ? `rotate(-90 ${cx} ${cy})` : undefined}
          >
            {item.code}
          </text>
        </>
      )}

      {item.category === 'contactor' && (
        <>
          <rect x={box.x1 + 1.5} y={box.y1 + 1.5} width={w - 3} height={9.5} rx={1} fill="#0f172a" />
          <rect x={box.x1 + 1.5} y={box.y2 - 11} width={w - 3} height={9.5} rx={1} fill="#0f172a" />
          {[0.18, 0.39, 0.61, 0.82].map((ratio, idx) => (
            <g key={idx}>
              <circle cx={box.x1 + w * ratio} cy={box.y1 + 6.2} r={1.9} fill="#94a3b8" />
              <circle cx={box.x1 + w * ratio} cy={box.y2 - 6.2} r={1.9} fill="#94a3b8" />
            </g>
          ))}
          <rect
            x={box.x1 + 2}
            y={cy - 14}
            width={w - 4}
            height={28}
            rx={1.5}
            fill={item.color}
            fillOpacity={0.2}
            stroke={item.color}
            strokeWidth={0.7}
          />
          <rect x={cx - 7} y={cy + 2} width={14} height={6} rx={1} fill="#0f172a" stroke="#fbbf24" strokeWidth={0.5} />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={6.5} fill="#f8fafc" fontWeight={700}>
            {item.code}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={4.8} fill="#fde68a">
            {item.rating ?? 'MINI'}
          </text>
        </>
      )}

      {item.category === 'plc' && (
        <>
          <rect x={box.x1 + 2} y={box.y1 + 2} width={w - 4} height={11} rx={1} fill="#0f172a" />
          <rect x={box.x1 + 2} y={box.y2 - 13} width={w - 4} height={11} rx={1} fill="#0f172a" />
          {[0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84].map((ratio, idx) => (
            <g key={idx}>
              <circle cx={box.x1 + w * ratio} cy={box.y1 + 7.5} r={1.6} fill="#94a3b8" />
              <circle cx={box.x1 + w * ratio} cy={box.y2 - 7.5} r={1.6} fill="#94a3b8" />
            </g>
          ))}
          <rect
            x={box.x1 + 3}
            y={cy - 22}
            width={w - 6}
            height={44}
            rx={2}
            fill={item.color}
            fillOpacity={0.18}
            stroke={item.color}
            strokeWidth={0.9}
          />
          <rect x={box.x1 + 8} y={cy - 16} width={Math.max(18, w * 0.45)} height={18} rx={1.5} fill="#020617" stroke="#2dd4bf" strokeWidth={0.6} />
          <circle cx={box.x2 - 12} cy={cy - 12} r={2} fill="#22c55e" />
          <circle cx={box.x2 - 12} cy={cy - 5} r={2} fill="#38bdf8" />
          <circle cx={box.x2 - 12} cy={cy + 2} r={2} fill="#f59e0b" />
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={6.8} fill="#f8fafc" fontWeight={700}>
            {item.code}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize={4.8} fill="#99f6e4">
            {item.rating ?? 'PLC / ESP32'}
          </text>
        </>
      )}

      {item.category === 'terminal' && (
        <>
          <rect
            x={box.x1 + 0.5}
            y={box.y1 + 0.5}
            width={Math.max(1, w - 1)}
            height={h - 1}
            fill={item.color}
            fillOpacity={0.28}
          />
          <circle cx={cx} cy={box.y1 + 6} r={1.2} fill="#cbd5e1" />
          <circle cx={cx} cy={box.y2 - 6} r={1.2} fill="#cbd5e1" />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={3.5}
            fill="#f8fafc"
            fontWeight={600}
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            {item.code}
          </text>
        </>
      )}

      {(item.category === 'breaker' || item.category === 'psu' || item.category === 'stopper') && (
        <>
          <rect
            x={box.x1 + 1.5}
            y={cy - 14}
            width={Math.max(1, w - 3)}
            height={28}
            rx={1}
            fill={item.color}
            fillOpacity={0.22}
            stroke={item.color}
            strokeWidth={0.7}
          />
          {item.category === 'breaker' && w >= 16 && (
            <rect x={cx - Math.min(8, w * 0.25)} y={cy + 2} width={Math.min(16, w * 0.5)} height={6} rx={1} fill="#0f172a" stroke="#7dd3fc" strokeWidth={0.6} />
          )}
          <text
            x={cx}
            y={item.category === 'breaker' && w >= 16 ? cy - 5 : cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={w < 14 ? 4.2 : 6}
            fill="#f8fafc"
            fontWeight={700}
            transform={w < 14 ? `rotate(-90 ${cx} ${cy})` : undefined}
          >
            {item.code}
          </text>
        </>
      )}
    </g>
  );
}

export default function PanelCanvas({
  enclosure,
  rails,
  analysis,
  selectedId,
  highlightedIds,
  viewMode,
  showDimensions,
  showWindowOverlay,
  showWireClearance,
  onSelect,
  onUpdateSidePosY,
  onUpdateHorizPosX,
  onUpdateBackplatePos,
  onReorderRailItem,
}: PanelCanvasProps) {
  const frontSvgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<
    | { kind: 'pos'; id: string; axis: 'y' | 'x' | 'xy' }
    | { kind: 'rail'; id: string; sourceRailId: RailId; targetRailId: RailId; targetIndex: number; indicatorX: number; indicatorY1: number; indicatorY2: number }
    | null
  >(null);

  const walls = getWallOffsets(enclosure);
  const primaryRail = rails[0];
  const topRailStartX = primaryRail
    ? (enclosure.outerWidthMm - enclosure.windowWidthMm) / 2
    : 14;

  const railPlaced = analysis.placed.filter((p) => isRailMount(p.item.mount));
  const backplatePlaced = analysis.placed.filter((p) => p.item.mount === 'backplate');
  const sidePlaced = analysis.placed.filter(
    (p) => p.item.mount === 'left-wall' || p.item.mount === 'right-wall'
  );
  const horizWallPlaced = analysis.placed.filter(
    (p) => p.item.mount === 'bottom-wall' || p.item.mount === 'top-wall'
  );
  const leftSides = sidePlaced.filter((p) => p.item.mount === 'left-wall');
  const rightSides = sidePlaced.filter((p) => p.item.mount === 'right-wall');
  const bottomGlands = horizWallPlaced.filter((p) => p.item.mount === 'bottom-wall');

  const padX = Math.max(42, Math.round(enclosure.outerWidthMm * 0.14));
  const padTop = 38;
  const padBottom = 66;
  const frontViewBox = `${-padX} ${-padTop} ${enclosure.outerWidthMm + padX * 2} ${enclosure.outerHeightMm + padTop + padBottom}`;
  const sideViewBox = `${-30} ${-30} ${enclosure.outerDepthMm + 68} ${enclosure.outerHeightMm + 60}`;
  const bottomViewBox = `${-36} ${-26} ${enclosure.outerWidthMm + 72} ${enclosure.outerDepthMm + 58}`;

  const toSvgCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = frontSvgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  const handleFrontPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState) return;
    const local = toSvgCoords(e);
    if (!local) return;

    if (dragState.kind === 'pos') {
      if (dragState.axis === 'y') {
        const clampedY = Math.round(Math.max(36, Math.min(enclosure.outerHeightMm - 36, local.y)));
        onUpdateSidePosY(dragState.id, clampedY);
      } else if (dragState.axis === 'x') {
        const clampedX = Math.round(Math.max(32, Math.min(enclosure.outerWidthMm - 32, local.x)));
        onUpdateHorizPosX(dragState.id, clampedX);
      } else {
        const clampedX = Math.round(Math.max(24, Math.min(enclosure.outerWidthMm - 24, local.x)));
        const clampedY = Math.round(Math.max(18, Math.min(enclosure.outerHeightMm - 18, local.y)));
        onUpdateBackplatePos(dragState.id, clampedX, clampedY);
      }
      return;
    }

    // Ray üzerinde sürükle-bırak sıralama (hatta raylar arası taşıma!)
    let closestRail = rails[0];
    let bestDist = Infinity;
    for (const r of rails) {
      const d = Math.abs(local.y - r.centerYMm);
      if (d < bestDist) {
        bestDist = d;
        closestRail = r;
      }
    }
    if (!closestRail) return;

    const siblings = railPlaced
      .filter((p) => p.item.mount === closestRail.id && p.item.id !== dragState.id)
      .sort((a, b) => a.item.order - b.item.order);

    let targetIndex = siblings.length;
    let indicatorX = (enclosure.outerWidthMm - closestRail.usableWidthMm) / 2 + closestRail.usableWidthMm / 2;
    if (siblings.length > 0) {
      indicatorX = siblings[siblings.length - 1].box.x2;
      for (let i = 0; i < siblings.length; i++) {
        const midX = (siblings[i].box.x1 + siblings[i].box.x2) / 2;
        if (local.x < midX) {
          targetIndex = i;
          indicatorX = siblings[i].box.x1;
          break;
        }
      }
    }

    setDragState({
      ...dragState,
      targetRailId: closestRail.id,
      targetIndex,
      indicatorX,
      indicatorY1: closestRail.centerYMm - 46,
      indicatorY2: closestRail.centerYMm + 46,
    });
  };

  const handleFrontPointerUp = () => {
    if (dragState?.kind === 'rail' && onReorderRailItem) {
      onReorderRailItem(dragState.id, dragState.targetRailId, dragState.targetIndex);
    }
    setDragState(null);
  };

  const renderSideElevation = (side: 'left-wall' | 'right-wall', title: string) => {
    const itemsOnSide = side === 'left-wall' ? leftSides : rightSides;
    const D = enclosure.outerDepthMm;
    const H = enclosure.outerHeightMm;

    return (
      <div className="cad-card">
        <div className="cad-card-header">
          <span>{title}</span>
          <span className="cad-meta">
            {D} × {H} mm • Delme Şablonu
          </span>
        </div>
        <svg viewBox={sideViewBox} className="cad-svg side-svg">
          <rect x={0} y={0} width={D} height={H} rx={6} fill="#111827" stroke="#475569" strokeWidth={1.6} />
          <line x1={enclosure.baseDepthMm} y1={0} x2={enclosure.baseDepthMm} y2={H} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" />
          <text x={enclosure.baseDepthMm / 2} y={-8} textAnchor="middle" fontSize={7} fill="#94a3b8">
            Gövde ({enclosure.baseDepthMm} mm)
          </text>
          {D - enclosure.baseDepthMm > 10 && (
            <text x={enclosure.baseDepthMm + (D - enclosure.baseDepthMm) / 2} y={-8} textAnchor="middle" fontSize={7} fill="#fbbf24">
              Kapak
            </text>
          )}
          <rect
            x={walls.innerZ1}
            y={walls.innerY1}
            width={enclosure.innerDepthMm}
            height={enclosure.innerHeightMm}
            fill="none"
            stroke="#334155"
            strokeWidth={0.8}
            strokeDasharray="3 2"
          />

          {rails.map((rail, idx) => {
            const rItems = railPlaced.filter((p) => p.item.mount === rail.id);
            if (rItems.length === 0) return null;
            const y1 = Math.min(...rItems.map((p) => p.box.y1));
            const y2 = Math.max(...rItems.map((p) => p.box.y2));
            const z1 = walls.backWallZ + rail.standoffZMm;
            const maxZ2 = Math.max(...rItems.map((p) => p.box.z2));
            return (
              <g key={rail.id} opacity={0.35}>
                <rect x={z1} y={y1} width={maxZ2 - z1} height={y2 - y1} fill="#38bdf8" stroke="#38bdf8" strokeWidth={0.7} strokeDasharray="2 2" />
                <text x={z1 + (maxZ2 - z1) / 2} y={(y1 + y2) / 2} textAnchor="middle" fontSize={6.5} fill="#bae6fd">
                  Ray {idx + 1} (İç)
                </text>
              </g>
            );
          })}

          {itemsOnSide.map((p) => {
            const { item } = p;
            const cy = item.posYMm ?? 262;
            const cz = item.posZMm ?? 48;
            const isSelected = selectedId === item.id;
            const isColliding = analysis.collidingItemIds.has(item.id);
            const rHole = (item.holeDiameterMm ?? 22) / 2;

            return (
              <g key={item.id} onClick={() => onSelect(item.id)} style={{ cursor: 'pointer' }}>
                <rect
                  x={cz - item.widthMm / 2}
                  y={cy - item.heightMm / 2}
                  width={item.widthMm}
                  height={item.heightMm}
                  rx={4}
                  fill={isColliding ? 'rgba(239,68,68,0.28)' : 'rgba(16,185,129,0.22)'}
                  stroke={isColliding ? '#ef4444' : isSelected ? '#38bdf8' : '#10b981'}
                  strokeWidth={isSelected ? 1.8 : 1.1}
                />
                <circle cx={cz} cy={cy} r={rHole} fill="none" stroke="#fbbf24" strokeWidth={0.8} strokeDasharray="2 2" />
                <line x1={cz - 4} y1={cy} x2={cz + 4} y2={cy} stroke="#fbbf24" strokeWidth={0.7} />
                <line x1={cz} y1={cy - 4} x2={cz} y2={cy + 4} stroke="#fbbf24" strokeWidth={0.7} />

                {showDimensions && (
                  <>
                    <line x1={-16} y1={0} x2={-16} y2={cy} stroke="#38bdf8" strokeWidth={0.7} />
                    <line x1={-20} y1={cy} x2={cz - item.widthMm / 2} y2={cy} stroke="#38bdf8" strokeWidth={0.5} strokeDasharray="2 2" />
                    <text x={-20} y={cy / 2} textAnchor="middle" fontSize={7} fill="#38bdf8" transform={`rotate(-90 ${-20} ${cy / 2})`}>
                      Y: {cy} mm
                    </text>
                    <line x1={0} y1={H + 14} x2={cz} y2={H + 14} stroke="#fbbf24" strokeWidth={0.7} />
                    <line x1={cz} y1={cy + item.heightMm / 2} x2={cz} y2={H + 18} stroke="#fbbf24" strokeWidth={0.5} strokeDasharray="2 2" />
                    <text x={cz / 2} y={H + 23} textAnchor="middle" fontSize={7} fill="#fbbf24">
                      Z: {cz} mm
                    </text>
                    <text x={D + 6} y={cy + 3} fontSize={7} fill="#f8fafc" fontWeight={700}>
                      {item.code} (Ø{item.holeDiameterMm ?? 22})
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className={`canvas-grid mode-${viewMode}`}>
      {/* ÖN / İÇ YERLEŞİM GÖRÜNÜŞÜ */}
      {(viewMode === 'all' || viewMode === 'front') && (
        <div className="cad-card front-card">
          <div className="cad-card-header">
            <span>Ön İç Yerleşim — {enclosure.brand} {enclosure.model}</span>
            <span className="cad-meta">
              {enclosure.outerWidthMm} × {enclosure.outerHeightMm} × {enclosure.outerDepthMm} mm • Ray elemanlarını sürükleyip sıralayabilirsiniz
            </span>
          </div>

          <svg
            ref={frontSvgRef}
            viewBox={frontViewBox}
            className="cad-svg front-svg"
            onPointerMove={handleFrontPointerMove}
            onPointerUp={handleFrontPointerUp}
            onPointerLeave={handleFrontPointerUp}
          >
            <defs>
              <pattern id="grid-10mm" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.4" />
              </pattern>
              <pattern id="danger-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.45" />
              </pattern>
            </defs>

            {/* Dış Kasa */}
            <rect
              x={0}
              y={0}
              width={enclosure.outerWidthMm}
              height={enclosure.outerHeightMm}
              rx={enclosure.materialType === 'steel' ? 4 : 10}
              fill={enclosure.materialType === 'steel' ? '#162032' : '#111827'}
              stroke="#64748b"
              strokeWidth={2}
            />

            {/* İç Kasa Hacmi + 10 mm ızgara */}
            <rect
              x={walls.innerX1}
              y={walls.innerY1}
              width={enclosure.innerWidthMm}
              height={enclosure.innerHeightMm}
              rx={4}
              fill="url(#grid-10mm)"
              stroke="#334155"
              strokeWidth={1.1}
            />

            {/* 4 Köşe Kapak Vidası */}
            {[
              [14, 16],
              [enclosure.outerWidthMm - 14, 16],
              [14, enclosure.outerHeightMm - 16],
              [enclosure.outerWidthMm - 14, enclosure.outerHeightMm - 16],
            ].map(([vx, vy], idx) => (
              <g key={idx}>
                <circle cx={vx} cy={vy} r={4} fill="#0f172a" stroke="#475569" strokeWidth={0.9} />
                <line x1={vx - 2} y1={vy} x2={vx + 2} y2={vy} stroke="#475569" strokeWidth={0.7} />
              </g>
            ))}

            {/* Taban Elemanları: Kablo Kanalları & N/PE Baraları */}
            {backplatePlaced.map((p) => {
              const { item, box } = p;
              const w = box.x2 - box.x1;
              const h = box.y2 - box.y1;
              const cx = box.x1 + w / 2;
              const cy = box.y1 + h / 2;
              const isSelected = selectedId === item.id;
              const isColliding = analysis.collidingItemIds.has(item.id);
              const isDuct = item.category === 'duct';

              if (isDuct) {
                const isHoriz = w >= h;
                const slotCount = Math.max(4, Math.floor((isHoriz ? w : h) / 14));
                return (
                  <g
                    key={item.id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onSelect(item.id);
                      setDragState({ kind: 'pos', id: item.id, axis: 'xy' });
                    }}
                    style={{ cursor: 'move' }}
                  >
                    <rect
                      x={box.x1}
                      y={box.y1}
                      width={w}
                      height={h}
                      rx={2}
                      fill={isColliding ? 'rgba(239,68,68,0.3)' : 'rgba(71, 85, 105, 0.42)'}
                      stroke={isColliding ? '#ef4444' : isSelected ? '#38bdf8' : '#64748b'}
                      strokeWidth={isSelected || isColliding ? 1.8 : 1}
                    />
                    {Array.from({ length: slotCount }).map((_, idx) => {
                      const ratio = (idx + 0.5) / slotCount;
                      if (isHoriz) {
                        const sx = box.x1 + w * ratio;
                        return (
                          <g key={idx}>
                            <line x1={sx} y1={box.y1} x2={sx} y2={box.y1 + 5} stroke="#94a3b8" strokeWidth={0.8} strokeOpacity={0.6} />
                            <line x1={sx} y1={box.y2 - 5} x2={sx} y2={box.y2} stroke="#94a3b8" strokeWidth={0.8} strokeOpacity={0.6} />
                          </g>
                        );
                      }
                      const sy = box.y1 + h * ratio;
                      return (
                        <g key={idx}>
                          <line x1={box.x1} y1={sy} x2={box.x1 + 5} y2={sy} stroke="#94a3b8" strokeWidth={0.8} strokeOpacity={0.6} />
                          <line x1={box.x2 - 5} y1={sy} x2={box.x2} y2={sy} stroke="#94a3b8" strokeWidth={0.8} strokeOpacity={0.6} />
                        </g>
                      );
                    })}
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={5.5}
                      fill="#e2e8f0"
                      fontWeight={600}
                      transform={isHoriz ? undefined : `rotate(-90 ${cx} ${cy})`}
                    >
                      {item.code} ({Math.round(w)}×{Math.round(h)} Kanal) ✥
                    </text>
                  </g>
                );
              }

              const isNeutral = item.color === '#3b82f6' || item.code.startsWith('N');
              return (
                <g
                  key={item.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelect(item.id);
                    setDragState({ kind: 'pos', id: item.id, axis: 'xy' });
                  }}
                  style={{ cursor: 'move' }}
                >
                  <rect
                    x={box.x1}
                    y={box.y1}
                    width={w}
                    height={h}
                    rx={3}
                    fill={
                      isColliding
                        ? 'rgba(239, 68, 68, 0.35)'
                        : isNeutral
                          ? 'rgba(37, 99, 235, 0.42)'
                          : 'rgba(22, 163, 74, 0.42)'
                    }
                    stroke={isColliding ? '#ef4444' : isSelected ? '#38bdf8' : item.color}
                    strokeWidth={isSelected || isColliding ? 1.8 : 1.1}
                  />
                  <rect x={box.x1 + 5} y={box.y1 + 2} width={Math.max(10, w - 10)} height={5} rx={1} fill="#d97706" fillOpacity={0.85} stroke="#fbbf24" strokeWidth={0.4} />
                  {[0.14, 0.28, 0.42, 0.58, 0.72, 0.86].map((ratio, idx) => (
                    <circle key={idx} cx={box.x1 + w * ratio} cy={box.y1 + 4.5} r={1.8} fill="#fef08a" stroke="#78350f" strokeWidth={0.4} />
                  ))}
                  <text x={cx} y={cy + 5.2} textAnchor="middle" fontSize={4.8} fontWeight={700} fill="#f8fafc">
                    {item.code} ({isNeutral ? 'NÖTR' : 'TOPRAK'}) ✥
                  </text>
                </g>
              );
            })}

            {/* Dinamik 1–4 adet 35 mm DIN Rayları */}
            {rails.map((rail) => {
              const railY = rail.centerYMm - rail.railHeightMm / 2;
              const rx = (enclosure.outerWidthMm - rail.usableWidthMm) / 2;
              const metrics = analysis.rails.find((m) => m.railId === rail.id);
              const isOverflow = metrics?.overflow ?? false;
              const slotCount = Math.max(4, Math.floor(rail.usableWidthMm / 25));

              return (
                <g key={rail.id}>
                  <rect
                    x={rx}
                    y={railY}
                    width={rail.usableWidthMm}
                    height={rail.railHeightMm}
                    rx={1.5}
                    fill="#1e293b"
                    stroke={isOverflow ? '#ef4444' : '#64748b'}
                    strokeWidth={1}
                  />
                  <rect x={rx + 2} y={rail.centerYMm - 10} width={rail.usableWidthMm - 4} height={20} fill="#0f172a" stroke="#334155" strokeWidth={0.5} />
                  {Array.from({ length: slotCount }).map((_, slot) => (
                    <rect key={slot} x={rx + 12 + slot * 24} y={rail.centerYMm - 2.2} width={10} height={4.4} rx={2} fill="#1e293b" />
                  ))}
                </g>
              );
            })}

            {/* DIN Ray Elemanları (Sürükle-Bırak Sıralamalı) */}
            {railPlaced.map((p) =>
              renderRailComponentGraphic(
                p,
                selectedId === p.item.id,
                Boolean(highlightedIds?.has(p.item.id)),
                analysis.collidingItemIds.has(p.item.id),
                dragState?.kind === 'rail' && dragState.id === p.item.id,
                (e) => {
                  e.stopPropagation();
                  onSelect(p.item.id);
                  if (onReorderRailItem && isRailMount(p.item.mount)) {
                    setDragState({
                      kind: 'rail',
                      id: p.item.id,
                      sourceRailId: p.item.mount,
                      targetRailId: p.item.mount,
                      targetIndex: p.item.order,
                      indicatorX: p.box.x1,
                      indicatorY1: p.box.y1 - 4,
                      indicatorY2: p.box.y2 + 4,
                    });
                  }
                }
              )
            )}

            {/* Sürükle-bırak hedef çizgisi */}
            {dragState?.kind === 'rail' && (
              <g pointerEvents="none">
                <line
                  x1={dragState.indicatorX}
                  y1={dragState.indicatorY1}
                  x2={dragState.indicatorX}
                  y2={dragState.indicatorY2}
                  stroke="#38bdf8"
                  strokeWidth={2.4}
                  strokeDasharray="4 2"
                />
                <circle cx={dragState.indicatorX} cy={dragState.indicatorY1} r={3} fill="#38bdf8" />
                <circle cx={dragState.indicatorX} cy={dragState.indicatorY2} r={3} fill="#38bdf8" />
              </g>
            )}

            {/* Yan Duvar İkiz Butonları */}
            {sidePlaced.map((p) => {
              const { item, box, clearanceBox } = p;
              const isLeft = item.mount === 'left-wall';
              const isSelected = selectedId === item.id;
              const isColliding = analysis.collidingItemIds.has(item.id);
              const protrusion = item.protrusionMm ?? 16;
              const cy = (box.y1 + box.y2) / 2;
              const h = box.y2 - box.y1;

              return (
                <g
                  key={item.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelect(item.id);
                    setDragState({ kind: 'pos', id: item.id, axis: 'y' });
                  }}
                  style={{ cursor: 'ns-resize' }}
                >
                  {showWireClearance && clearanceBox && (
                    <rect
                      x={clearanceBox.x1}
                      y={clearanceBox.y1}
                      width={clearanceBox.x2 - clearanceBox.x1}
                      height={h}
                      rx={2}
                      fill={isColliding ? 'url(#danger-hatch)' : 'rgba(251, 191, 36, 0.08)'}
                      stroke="#fbbf24"
                      strokeWidth={0.7}
                      strokeDasharray="2.5 2.5"
                    />
                  )}
                  <rect
                    x={box.x1}
                    y={box.y1}
                    width={box.x2 - box.x1}
                    height={h}
                    rx={2}
                    fill={isColliding ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.16)'}
                    stroke={isColliding ? '#ef4444' : isSelected ? '#38bdf8' : '#10b981'}
                    strokeWidth={isSelected || isColliding ? 1.6 : 1}
                    strokeDasharray="4 2"
                  />
                  <rect
                    x={isLeft ? -protrusion : enclosure.outerWidthMm}
                    y={box.y1}
                    width={protrusion}
                    height={h}
                    rx={3}
                    fill={isColliding ? '#991b1b' : '#065f46'}
                    stroke={isColliding ? '#ef4444' : isSelected ? '#38bdf8' : '#34d399'}
                    strokeWidth={isSelected ? 1.8 : 1.1}
                  />
                  <text x={isLeft ? -protrusion / 2 : enclosure.outerWidthMm + protrusion / 2} y={cy - 10} textAnchor="middle" fontSize={7} fill="#6ee7b7">▲</text>
                  <text x={isLeft ? -protrusion / 2 : enclosure.outerWidthMm + protrusion / 2} y={cy + 15} textAnchor="middle" fontSize={7} fill="#fca5a5">▼</text>
                  <text x={(box.x1 + box.x2) / 2} y={cy - 4} textAnchor="middle" fontSize={6.5} fill={isColliding ? '#fecaca' : '#a7f3d0'} fontWeight={700}>
                    {item.code} (Yan)
                  </text>
                  <text x={(box.x1 + box.x2) / 2} y={cy + 5} textAnchor="middle" fontSize={5} fill="#cbd5e1">
                    Derinlik: {item.depthMm} mm
                  </text>
                  <text x={(box.x1 + box.x2) / 2} y={cy + 13} textAnchor="middle" fontSize={4.8} fill="#94a3b8">
                    Y={Math.round(cy)} mm ↕
                  </text>
                </g>
              );
            })}

            {/* Alt / Üst Duvar Rakorları */}
            {horizWallPlaced.map((p) => {
              const { item, box, clearanceBox } = p;
              const isBottom = item.mount === 'bottom-wall';
              const isSelected = selectedId === item.id;
              const isColliding = analysis.collidingItemIds.has(item.id);
              const protrusion = item.protrusionMm ?? 40;
              const cx = (box.x1 + box.x2) / 2;
              const w = box.x2 - box.x1;
              const holeW = item.holeDiameterMm ?? 37;
              const extY = isBottom ? enclosure.outerHeightMm : -protrusion;
              const shortTag = (item.rating ?? item.model).split('•')[0].trim();

              return (
                <g
                  key={item.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelect(item.id);
                    setDragState({ kind: 'pos', id: item.id, axis: 'x' });
                  }}
                  style={{ cursor: 'ew-resize' }}
                >
                  {showWireClearance && clearanceBox && (
                    <rect
                      x={cx - holeW / 2}
                      y={clearanceBox.y1}
                      width={holeW}
                      height={clearanceBox.y2 - clearanceBox.y1}
                      rx={2}
                      fill="rgba(6, 182, 212, 0.08)"
                      stroke="#22d3ee"
                      strokeWidth={0.6}
                      strokeDasharray="2.5 2.5"
                    />
                  )}
                  <rect
                    x={box.x1}
                    y={box.y1}
                    width={w}
                    height={box.y2 - box.y1}
                    rx={2}
                    fill={isColliding ? 'rgba(239,68,68,0.35)' : 'rgba(6, 182, 212, 0.22)'}
                    stroke={isColliding ? '#ef4444' : isSelected ? '#38bdf8' : '#06b6d4'}
                    strokeWidth={isSelected || isColliding ? 1.6 : 1}
                  />
                  <rect x={box.x1 + 2} y={extY} width={w - 4} height={14} rx={2} fill="#155e75" stroke={isSelected ? '#38bdf8' : '#22d3ee'} strokeWidth={1.1} />
                  <rect
                    x={cx - holeW / 2 + 2}
                    y={isBottom ? extY + 14 : extY}
                    width={Math.max(8, holeW - 4)}
                    height={Math.max(10, protrusion - 14)}
                    rx={3}
                    fill="#0e7490"
                    stroke={isSelected ? '#38bdf8' : '#22d3ee'}
                    strokeWidth={1}
                  />
                  <text x={cx} y={isBottom ? extY + 9.5 : extY + protrusion - 4} textAnchor="middle" fontSize={5.4} fill="#ecfeff" fontWeight={700}>
                    {item.code} • {shortTag}
                  </text>
                  <text x={cx} y={isBottom ? extY + 29 : extY + 15} textAnchor="middle" fontSize={5} fill="#cffafe">
                    Ø{holeW} ↔ X={Math.round(cx)}
                  </text>
                </g>
              );
            })}

            {/* Şeffaf Kapak Penceresi İzdüşümü (Sadece pencereli panolarda) */}
            {showWindowOverlay && enclosure.hasWindow !== false && enclosure.windowWidthMm > 0 && (
              <g pointerEvents="none">
                <rect
                  x={topRailStartX}
                  y={enclosure.windowTopMm}
                  width={enclosure.windowWidthMm}
                  height={enclosure.windowHeightMm}
                  rx={3}
                  fill="rgba(56, 189, 248, 0.04)"
                  stroke="#38bdf8"
                  strokeWidth={0.8}
                  strokeDasharray="6 3"
                />
                <text x={topRailStartX + enclosure.windowWidthMm - 3} y={enclosure.windowTopMm + 7} textAnchor="end" fontSize={4.8} fill="#38bdf8">
                  Şeffaf Pencere ({Math.round(enclosure.windowWidthMm / 18)} Modül)
                </text>
              </g>
            )}

            {/* Ölçülendirme Çizgileri */}
            {showDimensions && (
              <g pointerEvents="none">
                <line x1={0} y1={-16} x2={enclosure.outerWidthMm} y2={-16} stroke="#94a3b8" strokeWidth={0.8} />
                <line x1={0} y1={-21} x2={0} y2={-4} stroke="#64748b" strokeWidth={0.6} />
                <line x1={enclosure.outerWidthMm} y1={-21} x2={enclosure.outerWidthMm} y2={-4} stroke="#64748b" strokeWidth={0.6} />
                <text x={enclosure.outerWidthMm / 2} y={-20} textAnchor="middle" fontSize={8} fill="#e2e8f0" fontWeight={600}>
                  {enclosure.outerWidthMm} mm (İç: {enclosure.innerWidthMm} mm)
                </text>

                <line x1={-28} y1={0} x2={-28} y2={enclosure.outerHeightMm} stroke="#94a3b8" strokeWidth={0.8} />
                <line x1={-33} y1={0} x2={-4} y2={0} stroke="#64748b" strokeWidth={0.6} />
                <line x1={-33} y1={enclosure.outerHeightMm} x2={-4} y2={enclosure.outerHeightMm} stroke="#64748b" strokeWidth={0.6} />
                <text
                  x={-32}
                  y={enclosure.outerHeightMm / 2}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#e2e8f0"
                  fontWeight={600}
                  transform={`rotate(-90 ${-32} ${enclosure.outerHeightMm / 2})`}
                >
                  {enclosure.outerHeightMm} mm (İç: {enclosure.innerHeightMm} mm)
                </text>

                {rails.map((rail, idx) => {
                  const m = analysis.rails.find((rm) => rm.railId === rail.id);
                  if (!m) return null;
                  const labelY = rail.centerYMm + Math.max(24, m.maxHeightMm / 2 + 8);
                  return (
                    <text
                      key={rail.id}
                      x={enclosure.outerWidthMm / 2}
                      y={labelY}
                      textAnchor="middle"
                      fontSize={5.2}
                      fill={m.overflow ? '#f87171' : m.remainingMm < 8 ? '#fbbf24' : '#94a3b8'}
                    >
                      Ray {idx + 1}: {m.usedWidthMm} / {m.usableWidthMm} mm (Kalan: {m.remainingMm} mm)
                    </text>
                  );
                })}

                {analysis.sideButtonMiddleGapMm !== null && leftSides.length > 0 && rightSides.length > 0 && (
                  <>
                    <line
                      x1={Math.max(...leftSides.map((p) => p.box.x2))}
                      y1={enclosure.outerHeightMm - 68}
                      x2={Math.min(...rightSides.map((p) => p.box.x1))}
                      y2={enclosure.outerHeightMm - 68}
                      stroke="#34d399"
                      strokeWidth={0.8}
                      strokeDasharray="3 2"
                    />
                    <text
                      x={enclosure.outerWidthMm / 2}
                      y={enclosure.outerHeightMm - 73}
                      textAnchor="middle"
                      fontSize={5.8}
                      fill="#6ee7b7"
                      fontWeight={600}
                    >
                      ↔ Orta Koridor: {analysis.sideButtonMiddleGapMm} mm
                    </text>
                  </>
                )}
              </g>
            )}
          </svg>
        </div>
      )}

      {/* YAN GÖRÜNÜŞLER VE ALT DUVAR RAKOR DELME ŞABLONU */}
      {(viewMode === 'all' || viewMode === 'sides') && (
        <div className="secondary-views">
          <div className="side-pair">
            {renderSideElevation('left-wall', 'Sol Yan Görünüş')}
            {renderSideElevation('right-wall', 'Sağ Yan Görünüş')}
          </div>

          <div className="cad-card">
            <div className="cad-card-header">
              <span>Alt Duvar Delme Şablonu (Rakor) & Derinlik Kesiti</span>
              <span className="cad-meta">
                {enclosure.outerWidthMm} × {enclosure.outerDepthMm} mm • {bottomGlands.length} Rakor
              </span>
            </div>
            <svg viewBox={bottomViewBox} className="cad-svg top-svg">
              <rect x={0} y={0} width={enclosure.outerWidthMm} height={enclosure.outerDepthMm} rx={6} fill="#111827" stroke="#475569" strokeWidth={1.5} />
              <rect x={walls.innerX1} y={walls.innerZ1} width={enclosure.innerWidthMm} height={enclosure.innerDepthMm} fill="#0b1220" stroke="#334155" strokeWidth={0.8} />
              <line x1={0} y1={enclosure.baseDepthMm} x2={enclosure.outerWidthMm} y2={enclosure.baseDepthMm} stroke="#f59e0b" strokeWidth={0.9} strokeDasharray="4 3" />
              <text x={enclosure.outerWidthMm / 2} y={-8} textAnchor="middle" fontSize={7} fill="#94a3b8">
                Arka Duvar (Z=0) — Alt Gövde ({enclosure.baseDepthMm} mm)
              </text>
              <text x={enclosure.outerWidthMm / 2} y={enclosure.outerDepthMm + 16} textAnchor="middle" fontSize={7} fill="#94a3b8">
                Ön Kapak (Z={enclosure.outerDepthMm} mm)
              </text>

              {sidePlaced.map((p) => {
                const isLeft = p.item.mount === 'left-wall';
                const prot = p.item.protrusionMm ?? 16;
                const isColliding = analysis.collidingItemIds.has(p.item.id);
                return (
                  <g key={p.item.id} onClick={() => onSelect(p.item.id)} style={{ cursor: 'pointer' }}>
                    <rect x={p.box.x1} y={p.box.z1} width={p.box.x2 - p.box.x1} height={p.box.z2 - p.box.z1} fill={isColliding ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.28)'} stroke={isColliding ? '#ef4444' : '#10b981'} strokeWidth={1} />
                    <rect x={isLeft ? -prot : enclosure.outerWidthMm} y={p.box.z1} width={prot} height={p.box.z2 - p.box.z1} rx={2} fill="#065f46" stroke="#34d399" strokeWidth={0.9} />
                    <text x={(p.box.x1 + p.box.x2) / 2} y={(p.box.z1 + p.box.z2) / 2 + 2.5} textAnchor="middle" fontSize={6.2} fill="#ecfdf5" fontWeight={700}>
                      {p.item.code} ({p.item.depthMm}mm)
                    </text>
                  </g>
                );
              })}

              {bottomGlands.map((p) => {
                const { item } = p;
                const cx = item.posXMm ?? enclosure.outerWidthMm / 2;
                const cz = item.posZMm ?? 48;
                const rOuter = item.widthMm / 2;
                const rHole = (item.holeDiameterMm ?? 37) / 2;
                const isSelected = selectedId === item.id;
                const isColliding = analysis.collidingItemIds.has(item.id);

                return (
                  <g key={item.id} onClick={() => onSelect(item.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cz} r={rOuter} fill={isColliding ? 'rgba(239,68,68,0.3)' : 'rgba(6, 182, 212, 0.22)'} stroke={isColliding ? '#ef4444' : isSelected ? '#38bdf8' : '#06b6d4'} strokeWidth={isSelected ? 1.8 : 1.1} />
                    <circle cx={cx} cy={cz} r={rHole} fill="#0f172a" fillOpacity={0.65} stroke="#fbbf24" strokeWidth={0.9} strokeDasharray="3 2" />
                    <line x1={cx - 6} y1={cz} x2={cx + 6} y2={cz} stroke="#fbbf24" strokeWidth={0.8} />
                    <line x1={cx} y1={cz - 6} x2={cx} y2={cz + 6} stroke="#fbbf24" strokeWidth={0.8} />
                    <text x={cx} y={cz - 9} textAnchor="middle" fontSize={6.5} fill="#ecfeff" fontWeight={700}>
                      {item.code}
                    </text>
                    <text x={cx} y={cz + 14} textAnchor="middle" fontSize={5.5} fill="#fde68a">
                      Ø{item.holeDiameterMm ?? 37} • X={Math.round(cx)} Z={Math.round(cz)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
