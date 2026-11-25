import { useState } from 'react';
import {
  getBlockTitlePositions,
  renderCleanPageToSvgString,
  type CleanPageData,
} from '../utils/twoPageSchematic';

interface CleanSchematicViewProps {
  page: CleanPageData;
  selectedWireId: string | null;
  onSelectWire: (id: string | null) => void;
  showLabels: boolean;
}

export default function CleanSchematicView({
  page,
  selectedWireId,
  onSelectWire,
  showLabels,
}: CleanSchematicViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleDownloadSvg = () => {
    const svg = renderCleanPageToSvgString(page, showLabels);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      page.kind === 'power'
        ? 'Bemis-BH6-6000-Sayfa1-Guc-Semasi.svg'
        : 'Bemis-BH6-6000-Sayfa2-Kumanda-Semasi.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeId = hoveredId ?? selectedWireId;

  return (
    <div className="clean-page-wrap">
      <div className="clean-page-subbar">
        <span>
          <strong>{page.title}</strong> — {page.wires.length} kablo bağlantısı
        </span>
        <button type="button" className="btn-sm" onClick={handleDownloadSvg}>
          Bu Sayfayı SVG İndir
        </button>
      </div>

      <div className="schematic-scroll-wrap">
        <svg
          viewBox={`0 0 ${page.width} ${page.height}`}
          className="cad-svg schematic-svg"
          style={{ width: '100%', maxHeight: 'calc(100vh - 156px)' }}
          onClick={() => onSelectWire(null)}
        >
          <defs>
            <pattern id={`cg-${page.kind}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#152036" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width={page.width} height={page.height} fill="#0b1220" />
          <rect width={page.width} height={page.height} fill={`url(#cg-${page.kind})`} />

          <text x={24} y={24} fill="#f8fafc" fontSize={14} fontWeight={700}>
            {page.title}
          </text>
          <text x={page.width - 24} y={24} textAnchor="end" fill="#94a3b8" fontSize={11}>
            {page.subtitle}
          </text>

          {/* Normal kablolar */}
          {page.wires.map((rw) => {
            const isActive = activeId === rw.wire.id;
            const opacity = activeId && !isActive ? 0.16 : 1;
            const sw = rw.wire.sectionMm2 === '2,5' ? 3.2 : 2.4;

            return (
              <g
                key={rw.wire.id}
                opacity={opacity}
                style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                onMouseEnter={() => setHoveredId(rw.wire.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWire(selectedWireId === rw.wire.id ? null : rw.wire.id);
                }}
              >
                <path d={rw.pathD} fill="none" stroke="transparent" strokeWidth={13} />
                <path
                  d={rw.pathD}
                  fill="none"
                  stroke="#0b1220"
                  strokeWidth={sw + 3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {isActive && (
                  <path
                    d={rw.pathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={sw + 4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={0.55}
                  />
                )}
                <path
                  d={rw.pathD}
                  fill="none"
                  stroke={rw.wire.color}
                  strokeWidth={isActive ? sw + 0.8 : sw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {rw.stripeHex && (
                  <path
                    d={rw.pathD}
                    fill="none"
                    stroke={rw.stripeHex}
                    strokeWidth={isActive ? sw + 0.8 : sw}
                    strokeDasharray="6 6"
                    strokeLinejoin="round"
                  />
                )}
                {(showLabels || isActive) && (
                  <g pointerEvents="none">
                    <rect
                      x={rw.labelPoint.x - 14}
                      y={rw.labelPoint.y - 8}
                      width={28}
                      height={16}
                      rx={3}
                      fill="#0f172a"
                      stroke={isActive ? '#38bdf8' : rw.wire.color}
                      strokeWidth={isActive ? 1.4 : 1}
                    />
                    <text
                      x={rw.labelPoint.x}
                      y={rw.labelPoint.y + 3}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize={9.2}
                      fontWeight={700}
                    >
                      {rw.wire.label || String(rw.index)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Ek noktaları */}
          {page.junctions.map((j, i) => (
            <circle
              key={i}
              cx={j.x}
              cy={j.y}
              r={4}
              fill={j.color}
              stroke="#0b1220"
              strokeWidth={1.2}
              pointerEvents="none"
            />
          ))}

          {/* Bloklar */}
          {page.blocks.map((b) => {
            const { titleY, subtitleY } = getBlockTitlePositions(b);
            return (
              <g key={b.id} transform={`translate(${b.x},${b.y})`}>
                <rect
                  width={b.width}
                  height={b.height}
                  rx={6}
                  fill="#131e33"
                  stroke={b.accent}
                  strokeWidth={1.6}
                />
                <rect width={b.width} height={4} rx={2} fill={b.accent} />
                <text
                  x={b.width / 2}
                  y={titleY}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={11.5}
                  fontWeight={700}
                >
                  {b.title}
                </text>
                <text
                  x={b.width / 2}
                  y={subtitleY}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={9}
                >
                  {b.subtitle}
                </text>

                {b.pins.map((p) => {
                  const ly = p.side === 'top' ? 15 : b.height - (p.subLabel ? 16 : 9);
                  const sy = p.side === 'top' ? 25 : b.height - 6;
                  return (
                    <g key={`${p.sourceNodeId}-${p.sourcePinId}`}>
                      <circle
                        cx={p.dx}
                        cy={p.dy}
                        r={4.8}
                        fill="#0f172a"
                        stroke="#cbd5e1"
                        strokeWidth={1.5}
                      />
                      <text
                        x={p.dx}
                        y={ly}
                        textAnchor="middle"
                        fill="#f1f5f9"
                        fontSize={8.8}
                        fontWeight={700}
                      >
                        {p.label}
                      </text>
                      {p.subLabel && (
                        <text
                          x={p.dx}
                          y={sy}
                          textAnchor="middle"
                          fill={p.subColor ?? '#94a3b8'}
                          fontSize={7.5}
                          fontWeight={600}
                        >
                          {p.subLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Notlar */}
          {page.notes.map((n, i) => (
            <text
              key={i}
              x={n.x}
              y={n.y}
              textAnchor="middle"
              fill={n.color}
              fontSize={10}
              fontWeight={600}
            >
              {n.text}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
