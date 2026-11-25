import { useRef, useState } from 'react';
import type {
  AccessoryItem,
  EnclosureSpec,
  FieldCableSpec,
  GlandFillResult,
  LayoutAnalysis,
  MountLocation,
  PanelItem,
  ProjectMeta,
  RailSpec,
  ThermalAnalysis,
} from '../types/panel';
import { isRailMount } from '../utils/geometry';

type InspectorTab = 'props' | 'checks' | 'bom';

interface InspectorPanelProps {
  meta: ProjectMeta;
  enclosure: EnclosureSpec;
  rails: RailSpec[];
  items: PanelItem[];
  selectedItem: PanelItem | null;
  analysis: LayoutAnalysis;
  thermal: ThermalAnalysis;
  glandFills: GlandFillResult[];
  fieldCables: FieldCableSpec[];
  accessories: AccessoryItem[];
  onUpdateMeta: (patch: Partial<ProjectMeta>) => void;
  onUpdateItem: (id: string, patch: Partial<PanelItem>) => void;
  onMoveOnRail: (id: string, direction: -1 | 1) => void;
  onDuplicateItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onSelect: (id: string) => void;
  onChangeFieldCables: (next: FieldCableSpec[]) => void;
  onChangeAccessories: (next: AccessoryItem[]) => void;
  onImportJson: (raw: string) => void;
  onExportJson: () => void;
  onJumpToSchematic?: (itemId: string) => void;
}

const MOUNT_LABELS: Record<string, string> = {
  'top-rail': 'Ray 1 (Üst DIN)',
  'bottom-rail': 'Ray 2 (Alt DIN)',
  'rail-3': 'Ray 3 (DIN)',
  'rail-4': 'Ray 4 (DIN)',
  backplate: 'Pano İçi (Taban / Kanal)',
  'left-wall': 'Sol Yan Duvar',
  'right-wall': 'Sağ Yan Duvar',
  'bottom-wall': 'Alt Duvar',
  'top-wall': 'Üst Duvar',
};

export default function InspectorPanel({
  meta,
  enclosure,
  rails,
  items,
  selectedItem,
  analysis,
  thermal,
  glandFills,
  fieldCables,
  accessories,
  onUpdateMeta,
  onUpdateItem,
  onMoveOnRail,
  onDuplicateItem,
  onDeleteItem,
  onSelect,
  onChangeFieldCables,
  onChangeAccessories,
  onImportJson,
  onExportJson,
  onJumpToSchematic,
}: InspectorPanelProps) {
  const [tab, setTab] = useState<InspectorTab>('props');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Yeni dış kablo ve aksesuar form durumları
  const [newCableName, setNewCableName] = useState('');
  const [newCableSection, setNewCableSection] = useState('4×1,5 mm²');
  const [newCableDia, setNewCableDia] = useState(9.5);
  const [newCableCount, setNewCableCount] = useState(1);

  const [newAccCode, setNewAccCode] = useState('');
  const [newAccModel, setNewAccModel] = useState('');
  const [newAccQty, setNewAccQty] = useState(1);
  const [newAccPrice, setNewAccPrice] = useState(0);

  const errorCount =
    analysis.issues.filter((i) => i.severity === 'error').length +
    (thermal.status === 'error' ? 1 : 0) +
    glandFills.filter((g) => g.status === 'error').length;
  const warnCount =
    analysis.issues.filter((i) => i.severity === 'warning').length +
    (thermal.status === 'warning' ? 1 : 0) +
    glandFills.filter((g) => g.status === 'warning').length;

  const bomGroups = (() => {
    const map = new Map<
      string,
      { model: string; name: string; mount: string; dims: string; count: number; codes: string[]; unitPrice: number }
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
          mount: MOUNT_LABELS[item.mount] ?? item.mount,
          dims,
          count: 1,
          codes: [item.code],
          unitPrice: item.unitPriceTry ?? 0,
        });
      }
    }
    return Array.from(map.values());
  })();

  const estimatedTotalTry =
    bomGroups.reduce((s, g) => s + g.count * g.unitPrice, 0) +
    accessories.reduce((s, a) => s + a.qty * (a.unitPriceTry ?? 0), 0);

  const handleDownloadCsv = () => {
    const header = ['Adet', 'Kodlar', 'Açıklama / Model', 'Konum', 'Ölçüler (G×Y×D)', 'Tahmini Tutar (TL)'];
    const rows: string[][] = [
      [
        '1',
        'PANO',
        `${enclosure.brand} ${enclosure.model} — ${enclosure.series} (${enclosure.ipRating})`,
        'Ana Gövde',
        `${enclosure.outerWidthMm}×${enclosure.outerHeightMm}×${enclosure.outerDepthMm} mm`,
        '',
      ],
      ...bomGroups.map((g) => [
        String(g.count),
        g.codes.join(', '),
        g.model,
        g.mount,
        g.dims,
        g.unitPrice > 0 ? String(g.count * g.unitPrice) : '',
      ]),
      ...accessories.map((a) => [
        String(a.qty),
        a.code,
        a.model,
        a.location,
        a.notes ?? 'Ray dışı aksesuar',
        a.unitPriceTry ? String(a.qty * a.unitPriceTry) : '',
      ]),
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
    a.download = `${meta.name.replace(/\s+/g, '-')}-Malzeme-Listesi.csv`;
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

  const handleAddFieldCable = () => {
    if (!newCableName.trim()) return;
    onChangeFieldCables([
      ...fieldCables,
      {
        id: `fc-${Date.now()}`,
        name: newCableName.trim(),
        section: newCableSection.trim() || '3×1,5 mm²',
        count: Math.max(1, newCableCount),
        outerDiameterMm: Math.max(3, newCableDia),
        jacketColor: 'Siyah',
      },
    ]);
    setNewCableName('');
  };

  const handleAddAccessory = () => {
    if (!newAccModel.trim()) return;
    onChangeAccessories([
      ...accessories,
      {
        id: `acc-${Date.now()}`,
        code: newAccCode.trim() || `AKS${accessories.length + 1}`,
        model: newAccModel.trim(),
        qty: Math.max(1, newAccQty),
        location: 'Pano İçi',
        unitPriceTry: newAccPrice > 0 ? newAccPrice : undefined,
      },
    ]);
    setNewAccCode('');
    setNewAccModel('');
    setNewAccQty(1);
    setNewAccPrice(0);
  };

  return (
    <aside className="inspector-panel">
      <div className="tab-bar">
        <button type="button" className={tab === 'props' ? 'active' : ''} onClick={() => setTab('props')}>
          Özellikler
        </button>
        <button type="button" className={tab === 'checks' ? 'active' : ''} onClick={() => setTab('checks')}>
          Mühendislik
          {(errorCount > 0 || warnCount > 0) && (
            <span className={`pill ${errorCount > 0 ? 'pill-error' : 'pill-warn'}`}>
              {errorCount > 0 ? errorCount : warnCount}
            </span>
          )}
        </button>
        <button type="button" className={tab === 'bom' ? 'active' : ''} onClick={() => setTab('bom')}>
          BOM ({items.length + accessories.length})
        </button>
      </div>

      <div className="inspector-body">
        {tab === 'props' && (
          <>
            {!selectedItem ? (
              <div className="empty-state">Düzenlemek için çizim üzerinden bir eleman seçin.</div>
            ) : (
              <div className="prop-form">
                <div className="prop-head">
                  <span className="code-badge" style={{ borderColor: selectedItem.color }}>
                    {selectedItem.code}
                  </span>
                  <div className="prop-head-actions">
                    {onJumpToSchematic && (
                      <button
                        type="button"
                        className="btn-sm"
                        title="Kumanda şemasında bu elemanı göster"
                        onClick={() => onJumpToSchematic(selectedItem.id)}
                      >
                        Şema
                      </button>
                    )}
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
                        patch.posYMm = selectedItem.posYMm ?? Math.min(264, enclosure.outerHeightMm - 55);
                        patch.posZMm = selectedItem.posZMm ?? 48;
                      } else if (nextMount === 'bottom-wall' || nextMount === 'top-wall') {
                        patch.posXMm = selectedItem.posXMm ?? enclosure.outerWidthMm / 2;
                        patch.posZMm = selectedItem.posZMm ?? 48;
                      } else if (nextMount === 'backplate') {
                        patch.posXMm = selectedItem.posXMm ?? enclosure.outerWidthMm / 2;
                        patch.posYMm = selectedItem.posYMm ?? 30;
                      }
                      onUpdateItem(selectedItem.id, patch);
                    }}
                  >
                    {rails.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                    <option value="backplate">Pano İçi (Taban / Kablo Kanalı)</option>
                    <option value="left-wall">Sol Yan Duvar</option>
                    <option value="right-wall">Sağ Yan Duvar</option>
                    <option value="bottom-wall">Alt Duvar (Rakor)</option>
                    <option value="top-wall">Üst Duvar (Rakor)</option>
                  </select>
                </label>

                {selectedItem.mount === 'backplate' && (
                  <div className="side-coords-box">
                    <div className="sub-title">
                      {selectedItem.category === 'duct' ? 'Kablo Kanalı Konumu' : 'Pano İçi Bara Konumu'}
                    </div>
                    <label className="field">
                      <span>Soldan X: {Math.round(selectedItem.posXMm ?? enclosure.outerWidthMm / 2)} mm</span>
                      <input
                        type="range"
                        min={24}
                        max={enclosure.outerWidthMm - 24}
                        step={1}
                        value={selectedItem.posXMm ?? enclosure.outerWidthMm / 2}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posXMm: Number(e.target.value) })}
                      />
                    </label>
                    <label className="field">
                      <span>Üstten Y: {Math.round(selectedItem.posYMm ?? 25)} mm</span>
                      <input
                        type="range"
                        min={18}
                        max={enclosure.outerHeightMm - 18}
                        step={1}
                        value={selectedItem.posYMm ?? 25}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posYMm: Number(e.target.value) })}
                      />
                    </label>
                    {selectedItem.category === 'duct' && (
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() =>
                          onUpdateItem(selectedItem.id, {
                            widthMm: selectedItem.heightMm,
                            heightMm: selectedItem.widthMm,
                          })
                        }
                      >
                        90° Döndür (Yatay ↔ Dikey)
                      </button>
                    )}
                  </div>
                )}

                {isRailMount(selectedItem.mount) && (
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
                        min={40}
                        max={enclosure.outerHeightMm - 35}
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
                        max={Math.max(95, enclosure.outerDepthMm - 25)}
                        step={1}
                        value={selectedItem.posZMm ?? 48}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posZMm: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                )}

                {(selectedItem.mount === 'bottom-wall' || selectedItem.mount === 'top-wall') && (
                  <div className="side-coords-box">
                    <div className="sub-title">
                      Rakor Delik Merkezi (Ø{selectedItem.holeDiameterMm ?? 47.5} mm Panç)
                    </div>
                    <label className="field">
                      <span>Soldan X: {selectedItem.posXMm ?? enclosure.outerWidthMm / 2} mm</span>
                      <input
                        type="range"
                        min={32}
                        max={enclosure.outerWidthMm - 32}
                        step={0.5}
                        value={selectedItem.posXMm ?? enclosure.outerWidthMm / 2}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posXMm: Number(e.target.value) })}
                      />
                    </label>
                    <label className="field">
                      <span>Arkadan Z: {selectedItem.posZMm ?? 48} mm</span>
                      <input
                        type="range"
                        min={26}
                        max={Math.max(85, enclosure.outerDepthMm - 24)}
                        step={1}
                        value={selectedItem.posZMm ?? 48}
                        onChange={(e) => onUpdateItem(selectedItem.id, { posZMm: Number(e.target.value) })}
                      />
                    </label>
                    <label className="field">
                      <span>İç Geçiş Çapı (mm — Doluluk Hesabı)</span>
                      <input
                        type="number"
                        min={8}
                        max={80}
                        value={selectedItem.innerPassageMm ?? 36}
                        onChange={(e) => onUpdateItem(selectedItem.id, { innerPassageMm: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                )}

                <div className="dims-grid">
                  <label className="field">
                    <span>Genişlik (mm)</span>
                    <input
                      type="number"
                      min={2}
                      max={450}
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
                      min={8}
                      max={600}
                      step={1}
                      value={selectedItem.heightMm}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { heightMm: Math.max(8, Number(e.target.value)) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Derinlik (mm)</span>
                    <input
                      type="number"
                      min={5}
                      max={220}
                      step={1}
                      value={selectedItem.depthMm}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { depthMm: Math.max(5, Number(e.target.value)) })
                      }
                    />
                  </label>
                </div>

                <div className="dims-grid-2">
                  <label className="field">
                    <span>Isıl Kayıp (W)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={selectedItem.powerLossW ?? 0}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { powerLossW: Math.max(0, Number(e.target.value)) })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Birim Fiyat (₺)</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={selectedItem.unitPriceTry ?? 0}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { unitPriceTry: Math.max(0, Number(e.target.value)) })
                      }
                    />
                  </label>
                </div>

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
            {/* Dinamik Ray Dolulukları */}
            {analysis.rails.map((m) => {
              const pct = Math.min(100, Math.round((m.usedWidthMm / Math.max(1, m.usableWidthMm)) * 100));
              return (
                <div className="metric-card" key={m.railId}>
                  <div className="metric-row">
                    <span>{m.railName}</span>
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

            {/* IEC 60890 Isıl Hesap Kartı */}
            <div className={`metric-card thermal-card status-border-${thermal.status}`}>
              <div className="sub-title">IEC 60890 Isıl Kayıp & Sıcaklık Artışı</div>
              <div className="metric-row">
                <span>Tahmini Pano İçi Sıcaklık</span>
                <strong className={thermal.status === 'ok' ? 'txt-ok' : thermal.status === 'warning' ? 'txt-warn' : 'txt-err'}>
                  {thermal.estimatedInternalTempC} °C (+{thermal.deltaTC} °C)
                </strong>
              </div>
              <div className="metric-sub" style={{ marginBottom: 6 }}>
                Toplam Kayıp: {thermal.totalPowerLossW} W • Yüzey: {thermal.effectiveSurfaceM2} m² (k={thermal.kValue})
              </div>
              <label className="field">
                <span>Ortam Sıcaklığı (Sera / Saha): {meta.ambientTempC} °C</span>
                <input
                  type="range"
                  min={15}
                  max={50}
                  value={meta.ambientTempC}
                  onChange={(e) => onUpdateMeta({ ambientTempC: Number(e.target.value) })}
                />
              </label>
              <div className="thermal-note">{thermal.recommendation}</div>
            </div>

            {/* Rakor & Kablo Doluluk Kartı */}
            <div className="metric-card">
              <div className="sub-title">Rakor & Spiral Doluluk (%) Hesabı</div>
              {glandFills.length === 0 ? (
                <div className="metric-sub">Panoda rakor yok. Sol katalogdan PG21/PG29/PG36 rakor ekleyin.</div>
              ) : (
                glandFills.map((g) => (
                  <div key={g.glandId} style={{ marginBottom: 8 }}>
                    <div className="metric-row">
                      <span>{g.glandCode} (İç Ø{g.innerDiameterMm} mm)</span>
                      <strong className={g.status === 'ok' ? 'txt-ok' : g.status === 'warning' ? 'txt-warn' : 'txt-err'}>
                        %{g.fillPercent} ({g.cableCount} kablo)
                      </strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${g.status === 'error' ? 'fill-error' : g.status === 'warning' ? 'fill-warn' : 'fill-ok'}`}
                        style={{ width: `${Math.min(100, g.fillPercent)}%` }}
                      />
                    </div>
                    {g.suggestedGland && (
                      <div className="metric-sub txt-warn">Öneri: {g.suggestedGland}</div>
                    )}
                  </div>
                ))
              )}

              <div className="sub-title" style={{ marginTop: 10 }}>Dış Saha Kabloları ({fieldCables.length})</div>
              {fieldCables.map((fc) => (
                <div key={fc.id} className="mini-list-row">
                  <span>
                    <strong>{fc.count}×</strong> {fc.name} <small>({fc.section}, Ø{fc.outerDiameterMm} mm)</small>
                  </span>
                  <button
                    type="button"
                    className="btn-xs-del"
                    onClick={() => onChangeFieldCables(fieldCables.filter((c) => c.id !== fc.id))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="inline-add-box">
                <input
                  placeholder="Kablo adı (ör. Motor)"
                  value={newCableName}
                  onChange={(e) => setNewCableName(e.target.value)}
                />
                <div className="inline-add-row">
                  <input
                    placeholder="Kesit"
                    value={newCableSection}
                    onChange={(e) => setNewCableSection(e.target.value)}
                  />
                  <input
                    type="number"
                    min={3}
                    max={35}
                    step={0.5}
                    title="Dış Çap (mm)"
                    value={newCableDia}
                    onChange={(e) => setNewCableDia(Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    title="Adet"
                    value={newCableCount}
                    onChange={(e) => setNewCableCount(Number(e.target.value))}
                  />
                  <button type="button" className="btn-sm" onClick={handleAddFieldCable}>
                    +
                  </button>
                </div>
              </div>
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
                        <td>{(MOUNT_LABELS[s.mount] ?? s.mount).replace(' Duvar', '')}</td>
                        <td>Ø{s.holeDiameterMm ?? 22}</td>
                        <td>
                          {s.mount === 'left-wall' || s.mount === 'right-wall'
                            ? `Y=${s.posYMm ?? 262}`
                            : `X=${s.posXMm ?? enclosure.outerWidthMm / 2}`}
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
              <div className="sub-title">Ana Pano Gövdesi</div>
              <div className="bom-pano-row">
                <strong>
                  1× {enclosure.brand} {enclosure.model}
                </strong>
                <span>
                  {enclosure.series} • {enclosure.ipRating} • {enclosure.outerWidthMm}×
                  {enclosure.outerHeightMm}×{enclosure.outerDepthMm} mm
                </span>
              </div>
              {estimatedTotalTry > 0 && (
                <div className="metric-row" style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #1e293b' }}>
                  <span>Tahmini Malzeme Toplamı</span>
                  <strong className="txt-ok">{estimatedTotalTry.toLocaleString('tr-TR')} ₺</strong>
                </div>
              )}
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
                        {g.unitPrice > 0 ? ` • ${(g.count * g.unitPrice).toLocaleString('tr-TR')} ₺` : ''}
                      </div>
                    </td>
                    <td>{g.mount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="metric-card" style={{ marginTop: 10 }}>
              <div className="sub-title">Ray Dışı Ek Aksesuarlar ({accessories.length})</div>
              {accessories.map((a) => (
                <div key={a.id} className="mini-list-row">
                  <span>
                    <strong>{a.qty}×</strong> [{a.code}] {a.model}
                    {a.unitPriceTry ? ` (${(a.qty * a.unitPriceTry).toLocaleString('tr-TR')} ₺)` : ''}
                  </span>
                  <button
                    type="button"
                    className="btn-xs-del"
                    onClick={() => onChangeAccessories(accessories.filter((x) => x.id !== a.id))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="inline-add-box">
                <input
                  placeholder="Aksesuar modeli (ör. ABB VM4 kilit)"
                  value={newAccModel}
                  onChange={(e) => setNewAccModel(e.target.value)}
                />
                <div className="inline-add-row">
                  <input
                    placeholder="Kod"
                    value={newAccCode}
                    onChange={(e) => setNewAccCode(e.target.value)}
                  />
                  <input
                    type="number"
                    min={1}
                    title="Adet"
                    value={newAccQty}
                    onChange={(e) => setNewAccQty(Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min={0}
                    step={10}
                    title="Birim TL"
                    value={newAccPrice}
                    onChange={(e) => setNewAccPrice(Number(e.target.value))}
                  />
                  <button type="button" className="btn-sm" onClick={handleAddAccessory}>
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
