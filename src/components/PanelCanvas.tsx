import { useRef, useState } from 'react';
import type { EnclosureSpec, LayoutAnalysis, PlacedItem, RailSpec } from '../types/panel';
import { getWallOffsets } from '../utils/geometry';

export type ViewMode = 'all' | 'front' | 'sides';

interface PanelCanvasProps {
  enclosure: EnclosureSpec;
  rails: Record<'top-rail' | 'bottom-rail', RailSpec>;
  analysis: LayoutAnalysis;
  selectedId: string | null;
  viewMode: ViewMode;
  showDimensions: boolean;
  showWindowOverlay: boolean;
  showWireClearance: boolean;
  onSelect: (id: string) => void;
  onUpdateSidePosY: (id: string, nextYMm: number) => void;
}

function renderRailComponentGraphic(
  p: PlacedItem,
  isSelected: boolean,
  isColliding: boolean,
  onSelect: (id: string) => void
) {
  const { item, box } = p;
  const w = box.x2 - box.x1;
  const h = box.y2 - box.y1;
  const cx = box.x1 + w / 2;
  const cy = box.y1 + h / 2;
  const stroke = isColliding ? '#ef4444' : isSelected ? '#38bdf8' : '#334155';
  const strokeW = isSelected || isColliding ? 1.8 : 0.9;

  return (
    <g
      key={item.id}
      className="cad-item"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Gövde */}
      <rect
        x={box.x1 + 0.4}
        y={box.y1}
        width={Math.max(1, w - 0.8)}
        height={h}
        rx={item.category === 'terminal' ? 0.6 : 2}
        fill={isColliding ? 'rgba(239, 68, 68, 0.28)' : '#1e293b'}
        stroke={stroke}
        strokeWidth={strokeW}
      />

      {/* Kategoriye özel gerçekçi detaylar */}
      {item.category === 'mks' && (
        <>
          <rect
            x={box.x1 + 1.5}
            y={box.y1 + 1.5}
            width={w - 3}
            height={11}
            rx={1}
            fill="#0f172a"
          />
          <rect
            x={box.x1 + 1.5}
            y={box.y2 - 12.5}
            width={w - 3}
            height={11}
            rx={1}
            fill="#0f172a"
          />
          {/* 3 kutup üst-alt vida */}
          {[0.22, 0.5, 0.78].map((ratio, idx) => (
            <g key={idx}>
              <circle cx={box.x1 + w * ratio} cy={box.y1 + 7} r={2.3} fill="#64748b" />
              <circle cx={box.x1 + w * ratio} cy={box.y2 - 7} r={2.3} fill="#64748b" />
            </g>
          ))}
          {/* Ön yüz şerit ve Start/Stop düğmeleri */}
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
          {/* Start (siyah) ve Stop (kırmızı) butonları */}
          <rect x={cx - 12} y={cy - 6} width={10} height={11} rx={1.5} fill="#0f172a" stroke="#94a3b8" strokeWidth={0.6} />
          <rect x={cx + 2} y={cy - 6} width={10} height={11} rx={1.5} fill="#dc2626" stroke="#fca5a5" strokeWidth={0.6} />
          <text x={cx - 7} y={cy + 2} textAnchor="middle" fontSize={5} fill="#e2e8f0" fontWeight={700}>I</text>
          <text x={cx + 7} y={cy + 2} textAnchor="middle" fontSize={5} fill="#fff" fontWeight={700}>O</text>
          {/* Termik ayar kadranı */}
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
          {/* 14 pin soket üst/alt klemens sırası */}
          <rect x={box.x1 + 1.5} y={box.y1 + 1.5} width={w - 3} height={11} rx={1} fill="#0f172a" />
          <rect x={box.x1 + 1.5} y={box.y2 - 12.5} width={w - 3} height={11} rx={1} fill="#0f172a" />
          {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => (
            <g key={idx}>
              <circle cx={box.x1 + w * ratio} cy={box.y1 + 7} r={1.6} fill="#94a3b8" />
              <circle cx={box.x1 + w * ratio} cy={box.y2 - 7} r={1.6} fill="#94a3b8" />
            </g>
          ))}
          {/* Şeffaf röle gövdesi */}
          <rect
            x={box.x1 + 2.5}
            y={cy - 18}
            width={w - 5}
            height={36}
            rx={2}
            fill={item.color}
            fillOpacity={0.22}
            stroke={item.color}
            strokeWidth={0.8}
          />
          {/* Bobin / LED göstergesi */}
          <circle cx={cx + 6} cy={cy - 12} r={1.6} fill="#ef4444" />
          <rect x={cx - 6} y={cy + 4} width={12} height={8} rx={1} fill="#312e81" stroke="#a78bfa" strokeWidth={0.5} />
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize={6.5} fill="#f8fafc" fontWeight={700}>
            {item.code}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={4.2} fill="#ddd6fe">
            14P
          </text>
        </>
      )}

      {item.category === 'contactor' && (
        <>
          {/* Mini kontaktör üst-alt 4 kutup vidaları */}
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
          {/* Kontak pozisyon penceresi */}
          <rect x={cx - 7} y={cy + 2} width={14} height={6} rx={1} fill="#0f172a" stroke="#fbbf24" strokeWidth={0.5} />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={6.5} fill="#f8fafc" fontWeight={700}>
            {item.code}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={4.8} fill="#fde68a">
            {item.rating ?? 'MINI'}
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
            fillOpacity={item.color === '#22c55e' ? 0.35 : 0.25}
          />
          <circle cx={cx} cy={box.y1 + 6} r={1.2} fill="#cbd5e1" />
          <circle cx={cx} cy={box.y2 - 6} r={1.2} fill="#cbd5e1" />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={3.6}
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
            y={cy - 12}
            width={Math.max(1, w - 3)}
            height={24}
            rx={1}
            fill={item.color}
            fillOpacity={0.22}
            stroke={item.color}
            strokeWidth={0.7}
          />
          <text
            x={cx}
            y={cy}
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
  viewMode,
  showDimensions,
  showWindowOverlay,
  showWireClearance,
  onSelect,
  onUpdateSidePosY,
}: PanelCanvasProps) {
  const frontSvgRef = useRef<SVGSVGElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const walls = getWallOffsets(enclosure);
  const railStartX = (enclosure.outerWidthMm - rails['top-rail'].usableWidthMm) / 2;

  const railPlaced = analysis.placed.filter(
    (p) => p.item.mount === 'top-rail' || p.item.mount === 'bottom-rail'
  );
  const sidePlaced = analysis.placed.filter(
    (p) => p.item.mount === 'left-wall' || p.item.mount === 'right-wall'
  );
  const leftSides = sidePlaced.filter((p) => p.item.mount === 'left-wall');
  const rightSides = sidePlaced.filter((p) => p.item.mount === 'right-wall');

  const pad = 42;
  const frontViewBox = `${-pad} ${-pad} ${enclosure.outerWidthMm + pad * 2} ${enclosure.outerHeightMm + pad * 2}`;
  const sideViewBox = `${-30} ${-30} ${enclosure.outerDepthMm + 68} ${enclosure.outerHeightMm + 60}`;
  const topViewBox = `${-36} ${-26} ${enclosure.outerWidthMm + 72} ${enclosure.outerDepthMm + 56}`;

  const handleFrontPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingId || !frontSvgRef.current) return;
    const svg = frontSvgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const clampedY = Math.round(Math.max(40, Math.min(enclosure.outerHeightMm - 40, local.y)));
    onUpdateSidePosY(draggingId, clampedY);
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
            {D} × {H} mm • Delik Delme Şablonu
          </span>
        </div>
        <svg viewBox={sideViewBox} className="cad-svg side-svg">
          {/* Pano yan profili */}
          <rect
            x={0}
            y={0}
            width={D}
            height={H}
            rx={6}
            fill="#111827"
            stroke="#475569"
            strokeWidth={1.6}
          />
          {/* Taban / Kapak birleşim çizgisi */}
          <line
            x1={enclosure.baseDepthMm}
            y1={0}
            x2={enclosure.baseDepthMm}
            y2={H}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text x={enclosure.baseDepthMm / 2} y={-8} textAnchor="middle" fontSize={7} fill="#94a3b8">
            Gövde ({enclosure.baseDepthMm} mm)
          </text>
          <text
            x={enclosure.baseDepthMm + (D - enclosure.baseDepthMm) / 2}
            y={-8}
            textAnchor="middle"
            fontSize={7}
            fill="#fbbf24"
          >
            Kapak
          </text>

          {/* İç hacim arka ve ön sınırı */}
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

          {/* İçerideki DIN rayı elemanlarının hayalet silüeti (Z derinlik kontrolü için) */}
          {(['top-rail', 'bottom-rail'] as const).map((railId) => {
            const railItems = railPlaced.filter((p) => p.item.mount === railId);
            if (railItems.length === 0) return null;
            const y1 = Math.min(...railItems.map((p) => p.box.y1));
            const y2 = Math.max(...railItems.map((p) => p.box.y2));
            const z1 = walls.backWallZ + rails[railId].standoffZMm;
            const maxZ2 = Math.max(...railItems.map((p) => p.box.z2));
            return (
              <g key={railId} opacity={0.35}>
                <rect
                  x={z1}
                  y={y1}
                  width={maxZ2 - z1}
                  height={y2 - y1}
                  fill="#38bdf8"
                  stroke="#38bdf8"
                  strokeWidth={0.7}
                  strokeDasharray="2 2"
                />
                <text
                  x={z1 + (maxZ2 - z1) / 2}
                  y={(y1 + y2) / 2}
                  textAnchor="middle"
                  fontSize={6.5}
                  fill="#bae6fd"
                >
                  {railId === 'top-rail' ? 'Üst Ray (İç)' : 'Alt Ray (İç)'}
                </text>
              </g>
            );
          })}

          {/* Yan duvar butonları */}
          {itemsOnSide.map((p) => {
            const { item } = p;
            const cy = item.posYMm ?? 262;
            const cz = item.posZMm ?? 48;
            const isSelected = selectedId === item.id;
            const isColliding = analysis.collidingItemIds.has(item.id);
            const rHole = (item.holeDiameterMm ?? 22) / 2;

            return (
              <g
                key={item.id}
                onClick={() => onSelect(item.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Ön çerçeve (30 x 55 mm) */}
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
                {/* Yukarı / Aşağı tuşları */}
                <rect
                  x={cz - 9}
                  y={cy - 21}
                  width={18}
                  height={18}
                  rx={2}
                  fill="#0f172a"
                  stroke="#34d399"
                  strokeWidth={0.7}
                />
                <text x={cz} y={cy - 10} textAnchor="middle" fontSize={8} fill="#34d399">
                  ▲
                </text>
                <rect
                  x={cz - 9}
                  y={cy + 3}
                  width={18}
                  height={18}
                  rx={2}
                  fill="#0f172a"
                  stroke="#f87171"
                  strokeWidth={0.7}
                />
                <text x={cz} y={cy + 14.5} textAnchor="middle" fontSize={8} fill="#f87171">
                  ▼
                </text>
                {/* Ø22 mm delme dairesi */}
                <circle
                  cx={cz}
                  cy={cy}
                  r={rHole}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                />
                <line x1={cz - 4} y1={cy} x2={cz + 4} y2={cy} stroke="#fbbf24" strokeWidth={0.7} />
                <line x1={cz} y1={cy - 4} x2={cz} y2={cy + 4} stroke="#fbbf24" strokeWidth={0.7} />

                {/* Delik merkezi ölçü çizgileri */}
                {showDimensions && (
                  <>
                    <line x1={-16} y1={0} x2={-16} y2={cy} stroke="#38bdf8" strokeWidth={0.7} />
                    <line x1={-20} y1={cy} x2={cz - item.widthMm / 2} y2={cy} stroke="#38bdf8" strokeWidth={0.5} strokeDasharray="2 2" />
                    <text
                      x={-20}
                      y={cy / 2}
                      textAnchor="middle"
                      fontSize={7}
                      fill="#38bdf8"
                      transform={`rotate(-90 ${-20} ${cy / 2})`}
                    >
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
              {enclosure.outerWidthMm} × {enclosure.outerHeightMm} × {enclosure.outerDepthMm} mm • Yan butonları dikey sürükleyebilirsiniz
            </span>
          </div>

          <svg
            ref={frontSvgRef}
            viewBox={frontViewBox}
            className="cad-svg front-svg"
            onPointerMove={handleFrontPointerMove}
            onPointerUp={() => setDraggingId(null)}
            onPointerLeave={() => setDraggingId(null)}
          >
            <defs>
              <pattern id="grid-10mm" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.4" />
              </pattern>
              <pattern id="danger-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.45" />
              </pattern>
            </defs>

            {/* Dış ABS Kasa (245 x 325 mm) */}
            <rect
              x={0}
              y={0}
              width={enclosure.outerWidthMm}
              height={enclosure.outerHeightMm}
              rx={10}
              fill="#111827"
              stroke="#64748b"
              strokeWidth={2}
            />

            {/* İç Kasa Hacmi (228 x 300 mm) + 10 mm ızgara */}
            <rect
              x={walls.innerX1}
              y={walls.innerY1}
              width={enclosure.innerWidthMm}
              height={enclosure.innerHeightMm}
              rx={5}
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

            {/* Nötr ve Toprak Klemens Barası Referansı (Bemis 2 klemensli standart) */}
            <rect x={44} y={14} width={64} height={6} rx={1.5} fill="#1d4ed8" fillOpacity={0.35} stroke="#3b82f6" strokeWidth={0.6} />
            <text x={76} y={18.7} textAnchor="middle" fontSize={4.2} fill="#93c5fd">N Bara</text>
            <rect x={137} y={14} width={64} height={6} rx={1.5} fill="#15803d" fillOpacity={0.35} stroke="#22c55e" strokeWidth={0.6} />
            <text x={169} y={18.7} textAnchor="middle" fontSize={4.2} fill="#86efac">PE Bara</text>

            {/* Üst ve Alt 35 mm DIN Rayları */}
            {(['top-rail', 'bottom-rail'] as const).map((railId) => {
              const rail = rails[railId];
              const railY = rail.centerYMm - rail.railHeightMm / 2;
              const rx = (enclosure.outerWidthMm - rail.usableWidthMm) / 2;
              const isOverflow =
                railId === 'top-rail' ? analysis.topRail.overflow : analysis.bottomRail.overflow;

              return (
                <g key={railId}>
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
                  {/* Ray orta oluk ve montaj slotları */}
                  <rect
                    x={rx + 2}
                    y={rail.centerYMm - 10}
                    width={rail.usableWidthMm - 4}
                    height={20}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={0.5}
                  />
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((slot) => (
                    <rect
                      key={slot}
                      x={rx + 12 + slot * 23}
                      y={rail.centerYMm - 2.2}
                      width={10}
                      height={4.4}
                      rx={2}
                      fill="#1e293b"
                    />
                  ))}
                  {/* 12 Modül çizgileri */}
                  {Array.from({ length: 13 }).map((_, mod) => (
                    <line
                      key={mod}
                      x1={rx + mod * 18}
                      y1={railY - 2}
                      x2={rx + mod * 18}
                      y2={railY + 2}
                      stroke="#475569"
                      strokeWidth={0.5}
                    />
                  ))}
                </g>
              );
            })}

            {/* DIN Ray Elemanları */}
            {railPlaced.map((p) =>
              renderRailComponentGraphic(
                p,
                selectedId === p.item.id,
                analysis.collidingItemIds.has(p.item.id),
                onSelect
              )
            )}

            {/* Yan Duvar İkiz Butonları (Dış çıkıntı + İç derinlik X-Ray projeksiyonu) */}
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
                    setDraggingId(item.id);
                  }}
                  style={{ cursor: 'ns-resize' }}
                >
                  {/* Kablo bükülme payı bölgesi */}
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

                  {/* Pano içine giren kontak bloğu derinliği (~54 mm) */}
                  <rect
                    x={box.x1}
                    y={box.y1}
                    width={box.x2 - box.x1}
                    height={h}
                    rx={2}
                    fill={
                      isColliding
                        ? 'rgba(239, 68, 68, 0.35)'
                        : 'rgba(16, 185, 129, 0.16)'
                    }
                    stroke={isColliding ? '#ef4444' : isSelected ? '#38bdf8' : '#10b981'}
                    strokeWidth={isSelected || isColliding ? 1.6 : 1}
                    strokeDasharray="4 2"
                  />

                  {/* Kasa dışına taşan SW-BL4252 buton başlığı */}
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
                  {/* Dış başlık ok göstergeleri */}
                  <text
                    x={isLeft ? -protrusion / 2 : enclosure.outerWidthMm + protrusion / 2}
                    y={cy - 10}
                    textAnchor="middle"
                    fontSize={7}
                    fill="#6ee7b7"
                  >
                    ▲
                  </text>
                  <text
                    x={isLeft ? -protrusion / 2 : enclosure.outerWidthMm + protrusion / 2}
                    y={cy + 15}
                    textAnchor="middle"
                    fontSize={7}
                    fill="#fca5a5"
                  >
                    ▼
                  </text>

                  {/* İç etiket */}
                  <text
                    x={(box.x1 + box.x2) / 2}
                    y={cy - 4}
                    textAnchor="middle"
                    fontSize={6.5}
                    fill={isColliding ? '#fecaca' : '#a7f3d0'}
                    fontWeight={700}
                  >
                    {item.code} (Yan)
                  </text>
                  <text
                    x={(box.x1 + box.x2) / 2}
                    y={cy + 5}
                    textAnchor="middle"
                    fontSize={5}
                    fill="#cbd5e1"
                  >
                    Derinlik: {item.depthMm} mm
                  </text>
                  <text
                    x={(box.x1 + box.x2) / 2}
                    y={cy + 13}
                    textAnchor="middle"
                    fontSize={4.8}
                    fill="#94a3b8"
                  >
                    Y={Math.round(cy)} mm ↕
                  </text>
                </g>
              );
            })}

            {/* Bemis V12 12 Modül Şeffaf Kapak Penceresi İzdüşümü */}
            {showWindowOverlay && (
              <g pointerEvents="none">
                <rect
                  x={railStartX}
                  y={enclosure.windowTopMm}
                  width={enclosure.windowWidthMm}
                  height={enclosure.windowHeightMm}
                  rx={3}
                  fill="rgba(56, 189, 248, 0.04)"
                  stroke="#38bdf8"
                  strokeWidth={0.8}
                  strokeDasharray="6 3"
                />
                <text
                  x={railStartX + enclosure.windowWidthMm - 3}
                  y={enclosure.windowTopMm + 7}
                  textAnchor="end"
                  fontSize={4.8}
                  fill="#38bdf8"
                >
                  V12 Şeffaf Pencere (12 Modül)
                </text>
              </g>
            )}

            {/* Ölçülendirme Çizgileri (mm) */}
            {showDimensions && (
              <g pointerEvents="none">
                {/* Üst toplam genişlik 245 mm */}
                <line x1={0} y1={-18} x2={enclosure.outerWidthMm} y2={-18} stroke="#94a3b8" strokeWidth={0.8} />
                <line x1={0} y1={-23} x2={0} y2={-4} stroke="#64748b" strokeWidth={0.6} />
                <line x1={enclosure.outerWidthMm} y1={-23} x2={enclosure.outerWidthMm} y2={-4} stroke="#64748b" strokeWidth={0.6} />
                <text x={enclosure.outerWidthMm / 2} y={-22} textAnchor="middle" fontSize={8} fill="#e2e8f0" fontWeight={600}>
                  {enclosure.outerWidthMm} mm (İç: {enclosure.innerWidthMm} mm)
                </text>

                {/* Sol toplam yükseklik 325 mm */}
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

                {/* Üst / Alt ray kullanım etiketi */}
                <text
                  x={enclosure.outerWidthMm / 2}
                  y={rails['top-rail'].centerYMm - 48}
                  textAnchor="middle"
                  fontSize={5.5}
                  fill={analysis.topRail.overflow ? '#f87171' : '#94a3b8'}
                >
                  Üst Ray: {analysis.topRail.usedWidthMm} / {analysis.topRail.usableWidthMm} mm (Kalan: {analysis.topRail.remainingMm} mm)
                </text>

                <text
                  x={enclosure.outerWidthMm / 2}
                  y={rails['bottom-rail'].centerYMm + 37}
                  textAnchor="middle"
                  fontSize={5.5}
                  fill={analysis.bottomRail.overflow ? '#f87171' : '#94a3b8'}
                >
                  Alt Ray: {analysis.bottomRail.usedWidthMm} / {analysis.bottomRail.usableWidthMm} mm (Kalan: {analysis.bottomRail.remainingMm} mm)
                </text>

                {/* İki ray arası kablo boşluğu */}
                <text
                  x={enclosure.outerWidthMm / 2}
                  y={(rails['top-rail'].centerYMm + rails['bottom-rail'].centerYMm) / 2 + 8}
                  textAnchor="middle"
                  fontSize={5.6}
                  fill={analysis.interRailGapMm < 24 ? '#fbbf24' : '#38bdf8'}
                >
                  ↕ Kablo Geçiş Boşluğu: {analysis.interRailGapMm} mm
                </text>

                {/* İki yan buton arasındaki orta net açıklık */}
                {analysis.sideButtonMiddleGapMm !== null && leftSides.length > 0 && rightSides.length > 0 && (
                  <>
                    <line
                      x1={Math.max(...leftSides.map((p) => p.box.x2))}
                      y1={262}
                      x2={Math.min(...rightSides.map((p) => p.box.x1))}
                      y2={262}
                      stroke="#34d399"
                      strokeWidth={0.8}
                      strokeDasharray="3 2"
                    />
                    <text
                      x={enclosure.outerWidthMm / 2}
                      y={257}
                      textAnchor="middle"
                      fontSize={6}
                      fill="#6ee7b7"
                      fontWeight={600}
                    >
                      ↔ Net Orta Boşluk: {analysis.sideButtonMiddleGapMm} mm
                    </text>
                  </>
                )}
              </g>
            )}
          </svg>
        </div>
      )}

      {/* YAN GÖRÜNÜŞLER VE ÜST KESİT */}
      {(viewMode === 'all' || viewMode === 'sides') && (
        <div className="secondary-views">
          <div className="side-pair">
            {renderSideElevation('left-wall', 'Sol Yan Görünüş (S1)')}
            {renderSideElevation('right-wall', 'Sağ Yan Görünüş (S2)')}
          </div>

          {/* ÜSTTEN KESİT (DERİNLİK ANALİZİ) */}
          <div className="cad-card">
            <div className="cad-card-header">
              <span>Üstten Kesit — Derinlik (Z) Analizi</span>
              <span className="cad-meta">
                {enclosure.outerWidthMm} × {enclosure.outerDepthMm} mm (İç Derinlik: {enclosure.innerDepthMm} mm)
              </span>
            </div>
            <svg viewBox={topViewBox} className="cad-svg top-svg">
              {/* Dış kasa üst kesiti */}
              <rect
                x={0}
                y={0}
                width={enclosure.outerWidthMm}
                height={enclosure.outerDepthMm}
                rx={6}
                fill="#111827"
                stroke="#475569"
                strokeWidth={1.5}
              />
              {/* İç derinlik */}
              <rect
                x={walls.innerX1}
                y={walls.innerZ1}
                width={enclosure.innerWidthMm}
                height={enclosure.innerDepthMm}
                fill="#0b1220"
                stroke="#334155"
                strokeWidth={0.8}
              />
              {/* Kapak birleşim çizgisi */}
              <line
                x1={0}
                y1={enclosure.baseDepthMm}
                x2={enclosure.outerWidthMm}
                y2={enclosure.baseDepthMm}
                stroke="#f59e0b"
                strokeWidth={0.9}
                strokeDasharray="4 3"
              />
              <text x={enclosure.outerWidthMm + 4} y={enclosure.baseDepthMm + 2} fontSize={6} fill="#fbbf24">
                Kapak ({enclosure.baseDepthMm}mm)
              </text>
              <text x={enclosure.outerWidthMm / 2} y={-8} textAnchor="middle" fontSize={7} fill="#94a3b8">
                Arka Duvar (Z=0) — DIN Ray Elemanları (Üst + Alt İzdüşüm)
              </text>
              <text x={enclosure.outerWidthMm / 2} y={enclosure.outerDepthMm + 16} textAnchor="middle" fontSize={7} fill="#94a3b8">
                Ön Kapak (Z={enclosure.outerDepthMm} mm)
              </text>

              {/* Üst ray elemanları (derinlik) */}
              {railPlaced.map((p) => (
                <rect
                  key={p.item.id}
                  x={p.box.x1 + 0.5}
                  y={p.box.z1}
                  width={Math.max(1, p.box.x2 - p.box.x1 - 1)}
                  height={p.box.z2 - p.box.z1}
                  fill={p.item.mount === 'top-rail' ? 'rgba(56, 189, 248, 0.22)' : 'rgba(245, 158, 11, 0.22)'}
                  stroke={selectedId === p.item.id ? '#38bdf8' : p.item.color}
                  strokeWidth={selectedId === p.item.id ? 1.5 : 0.7}
                  onClick={() => onSelect(p.item.id)}
                  style={{ cursor: 'pointer' }}
                />
              ))}

              {/* Yan butonların üstten kesit derinlikleri */}
              {sidePlaced.map((p) => {
                const isLeft = p.item.mount === 'left-wall';
                const prot = p.item.protrusionMm ?? 16;
                const isColliding = analysis.collidingItemIds.has(p.item.id);
                return (
                  <g key={p.item.id} onClick={() => onSelect(p.item.id)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={p.box.x1}
                      y={p.box.z1}
                      width={p.box.x2 - p.box.x1}
                      height={p.box.z2 - p.box.z1}
                      fill={isColliding ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.35)'}
                      stroke={isColliding ? '#ef4444' : '#10b981'}
                      strokeWidth={1.1}
                    />
                    <rect
                      x={isLeft ? -prot : enclosure.outerWidthMm}
                      y={p.box.z1}
                      width={prot}
                      height={p.box.z2 - p.box.z1}
                      rx={2}
                      fill="#065f46"
                      stroke="#34d399"
                      strokeWidth={0.9}
                    />
                    <text
                      x={(p.box.x1 + p.box.x2) / 2}
                      y={(p.box.z1 + p.box.z2) / 2 + 2.5}
                      textAnchor="middle"
                      fontSize={6.5}
                      fill="#ecfdf5"
                      fontWeight={700}
                    >
                      {p.item.code} ({p.item.depthMm}mm)
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
