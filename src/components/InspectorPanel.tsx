import { useRef, useState } from 'react';
import type { EnclosureSpec, LayoutAnalysis, MountLocation, PanelItem } from '../types/panel';

type InspectorTab = 'props' | 'checks' | 'bom';

interface InspectorPanelProps {
  enclosure: EnclosureSpec;
  items: PanelItem[];
  selectedItem: PanelItem | null;
  analysis: LayoutAnalysis;
  onUpdateItem: (id: string, patch: Partial<PanelItem>) => void;
  onMoveOnRail: (id: string, direction: -1 | 1) => void;
  onDuplicateItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onSelect: (id: string) => void;
  onImportJson: (raw: string) => void;
  onExportJson: () => void;
}

const MOUNT_LABELS: Record<MountLocation, string> = {
  'top-rail': 'Üst DIN Rayı',
  'bottom-rail': 'Alt DIN Rayı',
  'left-wall': 'Sol Yan Duvar',
  'right-wall': 'Sağ Yan Duvar',
  'bottom-wall': 'Alt Duvar',
  'top-wall': 'Üst Duvar',
};

export default function InspectorPanel({
  enclosure,
  items,
  selectedItem,
  analysis,
  onUpdateItem,
  onMoveOnRail,
  onDuplicateItem,
  onDeleteItem,
  onSelect,
  onImportJson,
  onExportJson,
}: InspectorPanelProps) {
  const [tab, setTab] = useState<InspectorTab>('props');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const errorCount = analysis.issues.filter((i) => i.severity === 'error').length;
  const warnCount = analysis.issues.filter((i) => i.severity === 'warning').length;

  const bomGroups = (() => {
    const map = new Map<
      string,
      { model: string; name: string; mount: string; dims: string; count: number; codes: string[] }
    >();
    for (const item of items) {
      const dims = `${item.widthMm}×${item.heightMm}×${item.depthMm} mm`;
      const key = `${item.model}__${dims}__${item.mount}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.codes.push(item.code);
      } else {
        map.set(key, {
          model: item.model,
          name: item.name,
          mount: MOUNT_LABELS[item.mount],
          dims,
          count: 1,
          codes: [item.code],
        });
      }
    }
    return Array.from(map.values());
  })();

  const handleDownloadCsv = () => {
    const header = ['Adet', 'Kodlar', 'Açıklama / Model', 'Konum', 'Ölçüler (G×Y×D)'];
    const rows: string[][] = [
      [
        '1',
        'PANO',
        `${enclosure.brand} ${enclosure.model} — ${enclosure.series} (${enclosure.ipRating})`,
        'Ana Gövde (Dahili N + PE Klemensli)',
        `${enclosure.outerWidthMm}×${enclosure.outerHeightMm}×${enclosure.outerDepthMm} mm`,
      ],
      ['1', 'DIN-2', '35 mm Ek DIN Rayı (Alt Ray)', 'Alt Ray', '226×35×7,5 mm'],
      ...bomGroups.map((g) => [String(g.count), g.codes.join(', '), g.model, g.mount, g.dims]),
    ];

    const csv =
      '\uFEFF' +
      [header, ...rows]
        .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bemis-${enclosure.model}-Malzeme-Listesi.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wallDrillItems = items.filter(
    (i) =>
      i.mount === 'left-wall' ||
      i.mount === 'right-wall' ||
      i.mount === 'bottom-wall' ||
      i.mount === 'top-wall'
  );

  return (
    <aside className="inspector-panel">
      <div className="tab-bar">
        <button
          type="button"
          className={tab === 'props' ? 'active' : ''}
          onClick={() => setTab('props')}
        >
          Özellikler
        </button>
        <button
          type="button"
          className={tab === 'checks' ? 'active' : ''}
          onClick={() => setTab('checks')}
        >
          Kontrol
          {(errorCount > 0 || warnCount > 0) && (
            <span className={`pill ${errorCount > 0 ? 'pill-error' : 'pill-warn'}`}>
              {errorCount > 0 ? errorCount : warnCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={tab === 'bom' ? 'active' : ''}
          onClick={() => setTab('bom')}
        >
          Malzeme ({items.length})
        </button>
      </div>

      <div className="inspector-body">
        {tab === 'props' && (
          <>
            {!selectedItem ? (
              <div className="empty-state">
                Düzenlemek için çizim üzerinden bir eleman seçin.
              </div>
            ) : (
              <div className="prop-form">
                <div className="prop-head">
                  <span className="code-badge" style={{ borderColor: selectedItem.color }}>
                    {selectedItem.code}
                  </span>
                  <div className="prop-head-actions">
                    <button type="button" className="btn-sm" onClick={() => onDuplicateItem(selectedItem.id)}>
                      Çoğalt
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-danger"
                      onClick={() => onDeleteItem(selectedItem.id)}
                    >
                      Sil
                    </button>
                  </div>
                </div>

                <label className="field">
                  <span>Etiket Kodu</span>
                  <input
                    value={selectedItem.code}
                    onChange={(e) => onUpdateItem(selectedItem.id, { code: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Eleman Adı</span>
                  <input
                    value={selectedItem.name}
                    onChange={(e) => onUpdateItem(selectedItem.id, { name: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Marka / Model</span>
                  <input
                    value={selectedItem.model}
                    onChange={(e) => onUpdateItem(selectedItem.id, { model: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Değer / Etiket</span>
                  <input
                    value={selectedItem.rating ?? ''}
                    onChange={(e) => onUpdateItem(selectedItem.id, { rating: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Montaj Konumu</span>
                  <select
                    value={selectedItem.mount}
                    onChange={(e) => {
                      const nextMount = e.target.value as MountLocation;
                      const patch: Partial<PanelItem> = { mount: nextMount };
                      if (nextMount === 'left-wall' || nextMount === 'right-wall') {
                        patch.posYMm = selectedItem.posYMm ?? 262;
                        patch.posZMm = selectedItem.posZMm ?? 48;
                      } else if (nextMount === 'bottom-wall' || nextMount === 'top-wall') {
                        patch.posXMm = selectedItem.posXMm ?? 122.5;
                        patch.posZMm = selectedItem.posZMm ?? 48;
                      }
                      onUpdateItem(selectedItem.id, patch);
                    }}
                  >
                    <option value="top-rail">Üst DIN Rayı</option>
                    <option value="bottom-rail">Alt DIN Rayı</option>
                    <option value="left-wall">Sol Yan Duvar</option>
                    <option value="right-wall">Sağ Yan Duvar</option>
                    <option value="bottom-wall">Alt Duvar (Rakor)</option>
                    <option value="top-wall">Üst Duvar (Rakor)</option>
                  </select>
                </label>

                {(selectedItem.mount === 'top-rail' || selectedItem.mount === 'bottom-rail') && (
                  <div className="rail-order-row">
                    <span>Ray Sırası</span>
                    <div className="btn-group">
                      <button type="button" className="btn-sm" onClick={() => onMoveOnRail(selectedItem.id, -1)}>
                        ← Sola Al
                      </button>
                      <button type="button" className="btn-sm" onClick={() => onMoveOnRail(selectedItem.id, 1)}>
                        Sağa Al →
                      </button>
                    </div>
                  </div>
                )}

                {(selectedItem.mount === 'left-wall' || selectedItem.mount === 'right-wall') && (
                  <div className="side-coords-box">
                    <div className="sub-title">
                      Yan Duvar Delik Merkezi (Ø{selectedItem.holeDiameterMm ?? 22} mm)
                    </div>
                    <label className="field">
                      <span>Üstten Y: {selectedItem.posYMm ?? 262} mm</span>
                      <input
                        type="range"
                        min={45}
                        max={290}
                        step={1}
                        value={selectedItem.posYMm ?? 262}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posYMm: Number(e.target.value) })}
                      />
                    </label>
                    <label className="field">
                      <span>Arkadan Z: {selectedItem.posZMm ?? 48} mm</span>
                      <input
                        type="range"
                        min={24}
                        max={95}
                        step={1}
                        value={selectedItem.posZMm ?? 48}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posZMm: Number(e.target.value) })}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => onUpdateItem(selectedItem.id, { posYMm: 262, posZMm: 48 })}
                    >
                      Güvenli Alt Konuma Al (Y=262, Z=48)
                    </button>
                  </div>
                )}

                {(selectedItem.mount === 'bottom-wall' || selectedItem.mount === 'top-wall') && (
                  <div className="side-coords-box">
                    <div className="sub-title">
                      Rakor Delik Merkezi (Ø{selectedItem.holeDiameterMm ?? 47.5} mm Panç)
                    </div>
                    <label className="field">
                      <span>Soldan X: {selectedItem.posXMm ?? 122.5} mm</span>
                      <input
                        type="range"
                        min={40}
                        max={205}
                        step={0.5}
                        value={selectedItem.posXMm ?? 122.5}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posXMm: Number(e.target.value) })}
                      />
                    </label>
                    <label className="field">
                      <span>Arkadan Z: {selectedItem.posZMm ?? 48} mm</span>
                      <input
                        type="range"
                        min={30}
                        max={85}
                        step={1}
                        value={selectedItem.posZMm ?? 48}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posZMm: Number(e.target.value) })}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => onUpdateItem(selectedItem.id, { posXMm: 122.5, posZMm: 48 })}
                    >
                      Merkeze Ortala (X=122,5, Z=48)
                    </button>
                  </div>
                )}

                <div className="dims-grid">
                  <label className="field">
                    <span>Genişlik / Ø (mm)</span>
                    <input
                      type="number"
                      min={2}
                      max={150}
                      step={0.5}
                      value={selectedItem.widthMm}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { widthMm: Math.max(2, Number(e.target.value)) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Yükseklik (mm)</span>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      step={1}
                      value={selectedItem.heightMm}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { heightMm: Math.max(10, Number(e.target.value)) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>İç Derinlik (mm)</span>
                    <input
                      type="number"
                      min={5}
                      max={130}
                      step={1}
                      value={selectedItem.depthMm}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { depthMm: Math.max(5, Number(e.target.value)) })
                      }
                    />
                  </label>
                </div>

                {selectedItem.category === 'relay' && (
                  <div className="hint-box">
                    Finder 94.04 soketi <strong>27 mm</strong>, Omron PYF14A soketi <strong>29,5 mm</strong> genişliğindedir.
                  </div>
                )}

                <label className="field">
                  <span>Notlar</span>
                  <textarea
                    rows={2}
                    value={selectedItem.notes ?? ''}
                    onChange={(e) => onUpdateItem(selectedItem.id, { notes: e.target.value })}
                  />
                </label>
              </div>
            )}
          </>
        )}

        {tab === 'checks' && (
          <div className="checks-view">
            {[
              { label: 'Üst DIN Rayı', m: analysis.topRail },
              { label: 'Alt DIN Rayı', m: analysis.bottomRail },
            ].map(({ label, m }) => {
              const pct = Math.min(100, Math.round((m.usedWidthMm / m.usableWidthMm) * 100));
              return (
                <div className="metric-card" key={m.railId}>
                  <div className="metric-row">
                    <span>{label}</span>
                    <strong>
                      {m.usedWidthMm} / {m.usableWidthMm} mm
                    </strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${m.overflow ? 'fill-error' : m.remainingMm < 10 ? 'fill-warn' : 'fill-ok'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="metric-sub">
                    {m.itemCount} eleman • Kalan: {m.remainingMm} mm • Maks. Derinlik: {m.maxDepthMm} mm
                  </div>
                </div>
              );
            })}

            <div className="metric-card">
              <div className="metric-row">
                <span>İki Ray Arası Kablo Boşluğu</span>
                <strong>{analysis.interRailGapMm} mm</strong>
              </div>
              {analysis.sideButtonMiddleGapMm !== null && (
                <div className="metric-row" style={{ marginTop: 6 }}>
                  <span>Yan Butonlar Arası Orta Koridor</span>
                  <strong>{analysis.sideButtonMiddleGapMm} mm</strong>
                </div>
              )}
            </div>

            {wallDrillItems.length > 0 && (
              <div className="metric-card">
                <div className="sub-title">Duvar Delik Delme Koordinatları</div>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Yüzey</th>
                      <th>Delik</th>
                      <th>Konum</th>
                      <th>Z</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallDrillItems.map((s) => (
                      <tr key={s.id} onClick={() => onSelect(s.id)} style={{ cursor: 'pointer' }}>
                        <td><strong>{s.code}</strong></td>
                        <td>{MOUNT_LABELS[s.mount].replace(' Duvar', '')}</td>
                        <td>Ø{s.holeDiameterMm ?? 22}</td>
                        <td>
                          {s.mount === 'left-wall' || s.mount === 'right-wall'
                            ? `Y=${s.posYMm ?? 262}`
                            : `X=${s.posXMm ?? 122.5}`}
                        </td>
                        <td>{s.posZMm ?? 48}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="issues-list">
              {analysis.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`issue-card issue-${issue.severity}`}
                  onClick={() => {
                    if (issue.itemIds[0]) onSelect(issue.itemIds[0]);
                  }}
                >
                  <strong>{issue.title}</strong>
                  <p>{issue.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'bom' && (
          <div className="bom-view">
            <div className="bom-actions">
              <button type="button" className="btn-primary" onClick={handleDownloadCsv}>
                CSV İndir
              </button>
              <button type="button" className="btn-sm" onClick={onExportJson}>
                JSON Kaydet
              </button>
              <button type="button" className="btn-sm" onClick={() => fileInputRef.current?.click()}>
                JSON Yükle
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  file.text().then(onImportJson);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="metric-card">
              <div className="sub-title">Ana Pano Gövdesi (Dahili N + PE Klemensli)</div>
              <div className="bom-pano-row">
                <strong>
                  1× {enclosure.brand} {enclosure.model}
                </strong>
                <span>
                  {enclosure.series} • {enclosure.ipRating} • {enclosure.outerWidthMm}×
                  {enclosure.outerHeightMm}×{enclosure.outerDepthMm} mm
                </span>
              </div>
            </div>

            <table className="mini-table bom-table">
              <thead>
                <tr>
                  <th>Adet</th>
                  <th>Model / Eleman</th>
                  <th>Konum</th>
                </tr>
              </thead>
              <tbody>
                {bomGroups.map((g, idx) => (
                  <tr key={idx}>
                    <td><strong>{g.count}</strong></td>
                    <td>
                      <div>{g.model}</div>
                      <div className="bom-codes">
                        {g.codes.join(', ')} • {g.dims}
                      </div>
                    </td>
                    <td>{g.mount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </aside>
  );
}
