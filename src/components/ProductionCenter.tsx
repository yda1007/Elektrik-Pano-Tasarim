import { useMemo, useState } from 'react';
import type {
  AccessoryItem,
  EnclosureSpec,
  FieldCableSpec,
  GlandFillResult,
  LayoutAnalysis,
  PanelItem,
  ProjectMeta,
  RailSpec,
  SchematicWire,
  TerminalStripRow,
  ThermalAnalysis,
  WireCutRow,
} from '../types/panel';
import {
  exportPanelToDxf,
  openDoorLabelPrintWindow,
  openDrillTemplatePrintWindow,
  openFullProjectPrintWindow,
} from '../utils/clientExporters';

type SubTab = 'terminals' | 'wirecut' | 'assembly' | 'exports';

interface ProductionCenterProps {
  meta: ProjectMeta;
  enclosure: EnclosureSpec;
  rails: RailSpec[];
  items: PanelItem[];
  analysis: LayoutAnalysis;
  thermal: ThermalAnalysis;
  glandFills: GlandFillResult[];
  fieldCables: FieldCableSpec[];
  accessories: AccessoryItem[];
  wires: SchematicWire[];
  terminalRows: TerminalStripRow[];
  wireCutRows: WireCutRow[];
  assembledWireIds: string[];
  onToggleAssembledWire: (wireId: string) => void;
  onResetAssembly: () => void;
  onLocateInPanel: (itemIds: string[]) => void;
  onOpenSchematic: () => void;
}

export default function ProductionCenter({
  meta,
  enclosure,
  rails,
  items,
  analysis,
  thermal,
  glandFills,
  fieldCables,
  accessories,
  wires,
  terminalRows,
  wireCutRows,
  assembledWireIds,
  onToggleAssembledWire,
  onResetAssembly,
  onLocateInPanel,
  onOpenSchematic,
}: ProductionCenterProps) {
  const [subTab, setSubTab] = useState<SubTab>('exports');
  const [assemblyFilter, setAssemblyFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [searchText, setSearchText] = useState('');

  const assembledSet = useMemo(() => new Set(assembledWireIds), [assembledWireIds]);

  const totalBySection = useMemo(() => {
    const map = new Map<string, { count: number; totalCm: number }>();
    for (const r of wireCutRows) {
      const cur = map.get(r.sectionMm2) ?? { count: 0, totalCm: 0 };
      cur.count += 1;
      cur.totalCm += r.estimatedLengthCm;
      map.set(r.sectionMm2, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].totalCm - a[1].totalCm);
  }, [wireCutRows]);

  const doneCount = wireCutRows.filter((w) => assembledSet.has(w.wireId)).length;
  const progressPct =
    wireCutRows.length > 0 ? Math.round((doneCount / wireCutRows.length) * 100) : 0;

  const filteredAssembly = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return wireCutRows.filter((row) => {
      const isDone = assembledSet.has(row.wireId);
      if (assemblyFilter === 'todo' && isDone) return false;
      if (assemblyFilter === 'done' && !isDone) return false;
      if (q) {
        const hay = `${row.wireNo} ${row.fromText} ${row.toText} ${row.sectionMm2}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [wireCutRows, assembledSet, assemblyFilter, searchText]);

  const handleDownloadFerruleCsv = () => {
    const header = ['Kablo No', 'Başlangıç', 'Bitiş', 'Kesit (mm²)', 'Tahmini Boy (cm)', 'Yüksük Baş', 'Yüksük Son'];
    const rows = wireCutRows.map((w) => [
      w.wireNo,
      w.fromText,
      w.toText,
      w.sectionMm2,
      String(w.estimatedLengthCm),
      w.ferruleFrom,
      w.ferruleTo,
    ]);
    const csv =
      '\uFEFF' +
      [header, ...rows]
        .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.name.replace(/\s+/g, '-')}-Kablo-Kesim-Yuksuk.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resolveWireItemIds = (wireId: string): string[] => {
    const w = wires.find((x) => x.id === wireId);
    if (!w) return [];
    const ids: string[] = [];
    for (const [nodeId, pinId] of [
      [w.fromNodeId, w.fromPinId],
      [w.toNodeId, w.toPinId],
    ]) {
      const direct = items.find((i) => i.id === nodeId);
      if (direct) {
        ids.push(direct.id);
      } else if (nodeId === 'blk-top-terminals' || nodeId === 'blk-bottom-terminals') {
        const code = pinId.replace(/-(in|out)$/i, '').toUpperCase();
        const term = items.find((i) => i.code.toUpperCase() === code);
        if (term) ids.push(term.id);
      }
    }
    return ids;
  };

  return (
    <div className="prod-shell">
      <div className="prod-subnav">
        <div className="segmented">
          <button type="button" className={subTab === 'exports' ? 'active' : ''} onClick={() => setSubTab('exports')}>
            Çıktı & Şablon Merkezi
          </button>
          <button type="button" className={subTab === 'terminals' ? 'active' : ''} onClick={() => setSubTab('terminals')}>
            Klemens Bağlantı Planı ({terminalRows.length})
          </button>
          <button type="button" className={subTab === 'wirecut' ? 'active' : ''} onClick={() => setSubTab('wirecut')}>
            Kablo Kesim & Yüksük ({wireCutRows.length})
          </button>
          <button type="button" className={subTab === 'assembly' ? 'active' : ''} onClick={() => setSubTab('assembly')}>
            Montaj Asistanı ({doneCount}/{wireCutRows.length})
          </button>
        </div>

        <div className="prod-meta-summary">
          <span>{meta.name}</span>
          <span>•</span>
          <span>
            {enclosure.brand} {enclosure.model}
          </span>
          <span>•</span>
          <span className={thermal.status === 'ok' ? 'txt-ok' : thermal.status === 'warning' ? 'txt-warn' : 'txt-err'}>
            Isıl: ~{thermal.estimatedInternalTempC}°C ({thermal.totalPowerLossW} W)
          </span>
        </div>
      </div>

      <div className="prod-body">
        {subTab === 'exports' && (
          <div className="export-hub-grid">
            <div className="export-card">
              <div className="export-tag">CAD / AutoCAD / ZWCAD</div>
              <h3>Katmanlı AutoCAD DXF İndir (1:1 mm)</h3>
              <p>
                Ön iç yerleşim, yan duvar buton delme, alt duvar rakor delme şablonları ve proje anteti ayrı
                AutoCAD katmanlarında (<code>PANO_DIS, DIN_RAY, ELEMANLAR, DELME_SABLONU, ANTET</code>) anında
                indirilir.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => exportPanelToDxf(meta, enclosure, rails, analysis)}
              >
                Katmanlı DXF İndir (.dxf)
              </button>
            </div>

            <div className="export-card">
              <div className="export-tag">SAHA MONTAJ • 1:1 GERÇEK ÖLÇEK</div>
              <h3>1:1 A4 Delme & Panç Şablonu (PDF)</h3>
              <p>
                50 mm kalibrasyon cetveli ile gerçek milimetre ölçekli alt duvar rakor (Ø47,5 / Ø37 / Ø28,5) ve yan
                duvar buton (Ø22 mm) delme şablonu. A4&apos;e %100 ölçekle basıp kasa üstüne yapıştırabilirsiniz.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openDrillTemplatePrintWindow(meta, enclosure, items)}
              >
                1:1 Delme Şablonu Aç / PDF
              </button>
            </div>

            <div className="export-card">
              <div className="export-tag">MARKALAMA • 18 MM MODÜL</div>
              <h3>Pano Kapak & DIN Rayı Şerit Etiketi</h3>
              <p>
                Her DIN rayındaki elemanların gerçek genişliklerine (mm) birebir hizalanmış, renk kodlu kapak/şalt
                etiket şeritleri ve pano kimlik kartı.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openDoorLabelPrintWindow(meta, enclosure, rails, items)}
              >
                Etiket Şeritlerini Aç / Yazdır
              </button>
            </div>

            <div className="export-card">
              <div className="export-tag">TEKNİK DOSYA • ÇOK SAYFALI</div>
              <h3>Tam Teknik Proje Dosyası (PDF)</h3>
              <p>
                Proje anteti, ray dolulukları, IEC 60890 ısıl hesap, rakor doluluk analizi, dinamik BOM (+ maliyet),
                klemens bağlantı planı ve kablo kesim listesini tek raporda derler.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  openFullProjectPrintWindow({
                    meta,
                    enclosure,
                    rails,
                    items,
                    analysis,
                    thermal,
                    glandFills,
                    fieldCables,
                    accessories,
                    terminalRows,
                    wireCutRows,
                  })
                }
              >
                Tam Teknik Dosya Aç / PDF
              </button>
            </div>
          </div>
        )}

        {subTab === 'terminals' && (
          <div className="prod-panel">
            <div className="prod-panel-head">
              <div>
                <h3>Klemens Bağlantı Planı (İç Pano ↔ Saha Kablosu)</h3>
                <p>
                  Her klemensin sol/üst tarafı pano içi bağlantıyı, sağ/alt tarafı saha/dış kablo çıkışını gösterir.
                  Bağlantılar Kumanda Şeması sekmesindeki kablolardan otomatik derlenir.
                </p>
              </div>
              {wires.length === 0 && (
                <button type="button" className="btn-sm" onClick={onOpenSchematic}>
                  Kumanda Şemasına Git →
                </button>
              )}
            </div>

            {terminalRows.length === 0 ? (
              <div className="empty-state">Panoda henüz ray klemensi bulunmuyor.</div>
            ) : (
              <table className="prod-table">
                <thead>
                  <tr>
                    <th>Klemens</th>
                    <th>Ray</th>
                    <th>Kesit</th>
                    <th>Pano İçi Bağlantı (İç Uç)</th>
                    <th>Köprü</th>
                    <th>Saha / Dış Bağlantı (Dış Uç)</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {terminalRows.map((row) => (
                    <tr key={row.terminalId}>
                      <td>
                        <span className="term-chip" style={{ borderColor: row.color }}>
                          {row.code}
                        </span>
                      </td>
                      <td>{row.mountLabel}</td>
                      <td>{row.rating}</td>
                      <td>
                        {row.internalConnections.length === 0 ? (
                          <span className="muted">—</span>
                        ) : (
                          row.internalConnections.map((c, i) => (
                            <div key={i} className="wire-inline">
                              <span className="dot" style={{ background: c.colorHex }} />
                              <strong>#{c.wireNo}</strong> {c.target} <small>({c.sectionMm2} mm²)</small>
                            </div>
                          ))
                        )}
                      </td>
                      <td>
                        {row.jumperToCodes.length > 0 ? (
                          <span className="jumper-pill">⇄ {row.jumperToCodes.join(', ')}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {row.fieldConnections.length === 0 ? (
                          <span className="muted">—</span>
                        ) : (
                          row.fieldConnections.map((c, i) => (
                            <div key={i} className="wire-inline">
                              <span className="dot" style={{ background: c.colorHex }} />
                              <strong>#{c.wireNo}</strong> {c.target} <small>({c.sectionMm2} mm²)</small>
                            </div>
                          ))
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() => onLocateInPanel([row.terminalId])}
                        >
                          Panoda Bul
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {subTab === 'wirecut' && (
          <div className="prod-panel">
            <div className="prod-panel-head">
              <div>
                <h3>Kablo Kesim & Yüksük Etiket Listesi</h3>
                <p>
                  Pano yerleşimindeki gerçek <code>(X, Y)</code> koordinatlarından Manhattan mesafesi + %25 kanal/bükülme
                  ve 6 cm uç soyma payı ile hesaplanır.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-primary" onClick={handleDownloadFerruleCsv} disabled={wireCutRows.length === 0}>
                  Kesim & Yüksük CSV İndir
                </button>
              </div>
            </div>

            {totalBySection.length > 0 && (
              <div className="section-totals-row">
                {totalBySection.map(([sec, data]) => (
                  <div key={sec} className="metric-card compact-metric">
                    <strong>{sec} mm² Kablo</strong>
                    <span>
                      {data.count} hat • Toplam ~{(data.totalCm / 100).toFixed(2)} m
                    </span>
                  </div>
                ))}
              </div>
            )}

            {wireCutRows.length === 0 ? (
              <div className="empty-state">
                Henüz şemada kablo çizilmemiş. Kumanda Şeması sekmesinden kabloları eklediğinizde kesim listesi otomatik
                oluşur.
              </div>
            ) : (
              <table className="prod-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Renk</th>
                    <th>Başlangıç</th>
                    <th>Bitiş</th>
                    <th>Kesit</th>
                    <th>Tahmini Boy</th>
                    <th>Yüksük (Baş → Son)</th>
                  </tr>
                </thead>
                <tbody>
                  {wireCutRows.map((w) => (
                    <tr key={w.wireId}>
                      <td><strong>{w.wireNo}</strong></td>
                      <td>
                        <span className="dot" style={{ background: w.colorHex }} />
                      </td>
                      <td>{w.fromText}</td>
                      <td>{w.toText}</td>
                      <td>{w.sectionMm2} mm²</td>
                      <td><strong>{w.estimatedLengthCm} cm</strong></td>
                      <td className="mono-cell">
                        {w.ferruleFrom} → {w.ferruleTo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {subTab === 'assembly' && (
          <div className="prod-panel">
            <div className="prod-panel-head">
              <div>
                <h3>İnteraktif Montaj & Kablolama Asistanı</h3>
                <p>
                  Pano toplarken bağladığınız her hattı işaretleyin. &quot;Panoda Göster&quot; ile ilgili iki elemanı CAD
                  çiziminde sarı çerçeveyle parlatabilirsiniz.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Hat no veya eleman ara..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <div className="segmented">
                  <button type="button" className={assemblyFilter === 'all' ? 'active' : ''} onClick={() => setAssemblyFilter('all')}>
                    Tümü
                  </button>
                  <button type="button" className={assemblyFilter === 'todo' ? 'active' : ''} onClick={() => setAssemblyFilter('todo')}>
                    Kalan ({wireCutRows.length - doneCount})
                  </button>
                  <button type="button" className={assemblyFilter === 'done' ? 'active' : ''} onClick={() => setAssemblyFilter('done')}>
                    Tamam ({doneCount})
                  </button>
                </div>
                {doneCount > 0 && (
                  <button type="button" className="btn-sm btn-danger" onClick={onResetAssembly}>
                    Tikleri Sıfırla
                  </button>
                )}
              </div>
            </div>

            <div className="metric-card" style={{ marginBottom: 12 }}>
              <div className="metric-row">
                <span>Montaj İlerlemesi</span>
                <strong>
                  {doneCount} / {wireCutRows.length} Hat (%{progressPct})
                </strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill fill-ok" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {filteredAssembly.length === 0 ? (
              <div className="empty-state">Gösterilecek montaj hattı yok.</div>
            ) : (
              <div className="assembly-list">
                {filteredAssembly.map((w) => {
                  const isDone = assembledSet.has(w.wireId);
                  const targetIds = resolveWireItemIds(w.wireId);
                  return (
                    <div key={w.wireId} className={`assembly-row ${isDone ? 'is-done' : ''}`}>
                      <label className="assembly-check">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => onToggleAssembledWire(w.wireId)}
                        />
                        <span className="dot" style={{ background: w.colorHex }} />
                        <strong>#{w.wireNo}</strong>
                        <span className="assembly-route">
                          {w.fromText} <strong>→</strong> {w.toText}
                        </span>
                        <span className="assembly-pill">{w.sectionMm2} mm²</span>
                        <span className="assembly-pill">~{w.estimatedLengthCm} cm</span>
                      </label>
                      {targetIds.length > 0 && (
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() => onLocateInPanel(targetIds)}
                        >
                          Panoda Göster
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
