import { useEffect, useMemo, useState } from 'react';
import PanelCanvas, { type ViewMode } from './components/PanelCanvas';
import InspectorPanel from './components/InspectorPanel';
import SchematicEditor from './components/SchematicEditor';
import {
  BEMIS_BH6_6000,
  COMPONENT_CATALOG,
  createInitialItems,
  DEFAULT_RAILS,
} from './data/bemisPreset';
import type {
  CatalogTemplate,
  MountLocation,
  PanelItem,
  RailSpec,
  SchematicNodePos,
  SchematicWire,
} from './types/panel';
import { analyzeLayout } from './utils/geometry';

const STORAGE_KEY = 'elektrik-pano-tasarim:v3:bemis-bh6-6000';
const PREV_STORAGE_KEY = 'elektrik-pano-tasarim:v2:bemis-bh6-6000';

type AppTab = 'layout' | 'schematic';

interface SavedState {
  items: PanelItem[];
  rails: Record<'top-rail' | 'bottom-rail', RailSpec>;
  schematicNodes: Record<string, SchematicNodePos>;
  schematicWires: SchematicWire[];
}

function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Önceki sürümde çizilen manuel kablolar varsa koru
      const prevRaw = localStorage.getItem(PREV_STORAGE_KEY);
      const prev = prevRaw ? (JSON.parse(prevRaw) as Partial<SavedState>) : null;
      return {
        items: createInitialItems(),
        rails: DEFAULT_RAILS,
        schematicNodes: prev?.schematicNodes ?? {},
        schematicWires: Array.isArray(prev?.schematicWires) ? prev.schematicWires : [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    if (Array.isArray(parsed.items) && parsed.rails?.['top-rail'] && parsed.rails?.['bottom-rail']) {
      return {
        items: parsed.items,
        rails: parsed.rails,
        schematicNodes: parsed.schematicNodes ?? {},
        schematicWires: Array.isArray(parsed.schematicWires) ? parsed.schematicWires : [],
      };
    }
  } catch {
    // Bozuk depolama varsa varsayılana dön
  }
  return {
    items: createInitialItems(),
    rails: DEFAULT_RAILS,
    schematicNodes: {},
    schematicWires: [],
  };
}

export default function App() {
  const initial = useMemo(() => loadSavedState(), []);
  const [appTab, setAppTab] = useState<AppTab>('layout');
  const [items, setItems] = useState<PanelItem[]>(initial.items);
  const [rails, setRails] = useState<Record<'top-rail' | 'bottom-rail', RailSpec>>(initial.rails);
  const [schematicNodes, setSchematicNodes] = useState<Record<string, SchematicNodePos>>(
    initial.schematicNodes
  );
  const [schematicWires, setSchematicWires] = useState<SchematicWire[]>(initial.schematicWires);

  const [selectedId, setSelectedId] = useState<string | null>(initial.items[0]?.id ?? null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showDimensions, setShowDimensions] = useState(true);
  const [showWindowOverlay, setShowWindowOverlay] = useState(true);
  const [showWireClearance, setShowWireClearance] = useState(true);
  const [addTarget, setAddTarget] = useState<MountLocation>('bottom-rail');

  useEffect(() => {
    try {
      const payload: SavedState = { items, rails, schematicNodes, schematicWires };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Depolama doluysa sessiz geç
    }
  }, [items, rails, schematicNodes, schematicWires]);

  const analysis = useMemo(() => analyzeLayout(items, BEMIS_BH6_6000, rails), [items, rails]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  const errorCount = analysis.issues.filter((i) => i.severity === 'error').length;
  const warnCount = analysis.issues.filter((i) => i.severity === 'warning').length;

  const handleUpdateItem = (id: string, patch: Partial<PanelItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleUpdateSidePosY = (id: string, nextYMm: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, posYMm: nextYMm } : item)));
  };

  const handleUpdateHorizPosX = (id: string, nextXMm: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, posXMm: nextXMm } : item)));
  };

  const handleAddFromCatalog = (tpl: CatalogTemplate) => {
    let mount: MountLocation = tpl.defaultMount;
    if (tpl.category === 'button') {
      mount = addTarget === 'right-wall' ? 'right-wall' : 'left-wall';
    } else if (tpl.category === 'gland') {
      mount = addTarget === 'top-wall' ? 'top-wall' : 'bottom-wall';
    } else if (addTarget === 'top-rail' || addTarget === 'bottom-rail') {
      mount = addTarget;
    }

    const sameMount = items.filter((i) => i.mount === mount);
    const samePrefixCount = items.filter((i) => i.code.startsWith(tpl.codePrefix)).length;
    const newId = `${tpl.key}-${Date.now()}`;

    const nextItem: PanelItem = {
      id: newId,
      code: `${tpl.codePrefix}${samePrefixCount + 1}`,
      name: tpl.name,
      model: tpl.model,
      category: tpl.category,
      mount,
      widthMm: tpl.widthMm,
      heightMm: tpl.heightMm,
      depthMm: tpl.depthMm,
      protrusionMm: tpl.protrusionMm,
      holeDiameterMm: tpl.holeDiameterMm,
      wireClearanceMm: tpl.wireClearanceMm,
      order: sameMount.length,
      posXMm: mount === 'bottom-wall' || mount === 'top-wall' ? 122.5 : undefined,
      posYMm: mount === 'left-wall' || mount === 'right-wall' ? 262 : undefined,
      posZMm:
        mount === 'left-wall' ||
        mount === 'right-wall' ||
        mount === 'bottom-wall' ||
        mount === 'top-wall'
          ? 48
          : undefined,
      rating: tpl.rating,
      color: tpl.color,
    };

    setItems((prev) => [...prev, nextItem]);
    setSelectedId(newId);
  };

  const handleMoveOnRail = (id: string, direction: -1 | 1) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (!target) return prev;
      const onSameRail = prev
        .filter((i) => i.mount === target.mount)
        .sort((a, b) => a.order - b.order);
      const idx = onSameRail.findIndex((i) => i.id === id);
      const swapIdx = idx + direction;
      if (idx < 0 || swapIdx < 0 || swapIdx >= onSameRail.length) return prev;

      const reordered = [...onSameRail];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(swapIdx, 0, moved);
      const orderMap = new Map(reordered.map((it, i) => [it.id, i]));

      return prev.map((it) => (orderMap.has(it.id) ? { ...it, order: orderMap.get(it.id)! } : it));
    });
  };

  const handleDuplicateItem = (id: string) => {
    const src = items.find((i) => i.id === id);
    if (!src) return;
    const newId = `copy-${Date.now()}`;
    const sameMountCount = items.filter((i) => i.mount === src.mount).length;
    const clone: PanelItem = {
      ...src,
      id: newId,
      code: `${src.code}*`,
      order: sameMountCount,
      posXMm: src.posXMm !== undefined ? Math.min(200, src.posXMm + 25) : undefined,
      posYMm: src.posYMm !== undefined ? Math.min(285, src.posYMm - 20) : undefined,
    };
    setItems((prev) => [...prev, clone]);
    setSelectedId(newId);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleReset = () => {
    const fresh = createInitialItems();
    setItems(fresh);
    setRails(DEFAULT_RAILS);
    setSelectedId(fresh[0]?.id ?? null);
  };

  const handleExportJson = () => {
    const payload = JSON.stringify(
      { enclosure: BEMIS_BH6_6000, items, rails, schematicNodes, schematicWires },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bemis-${BEMIS_BH6_6000.model}-Proje.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Partial<SavedState>;
      if (Array.isArray(parsed.items)) {
        setItems(parsed.items);
        setSelectedId(parsed.items[0]?.id ?? null);
      }
      if (parsed.rails?.['top-rail'] && parsed.rails?.['bottom-rail']) {
        setRails(parsed.rails);
      }
      if (parsed.schematicNodes) setSchematicNodes(parsed.schematicNodes);
      if (Array.isArray(parsed.schematicWires)) setSchematicWires(parsed.schematicWires);
    } catch {
      alert('JSON dosyası okunamadı.');
    }
  };

  return (
    <div className="studio">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand-title">
            <span className="brand-dot" />
            <h1>Elektrik Pano Tasarım</h1>
            <span className="pano-chip">
              {BEMIS_BH6_6000.brand} {BEMIS_BH6_6000.model} ({BEMIS_BH6_6000.outerWidthMm}×
              {BEMIS_BH6_6000.outerHeightMm}×{BEMIS_BH6_6000.outerDepthMm} mm)
            </span>
          </div>
        </div>

        <div className="topbar-center">
          <div className="segmented primary-nav">
            <button
              type="button"
              className={appTab === 'layout' ? 'active' : ''}
              onClick={() => setAppTab('layout')}
            >
              Pano Yerleşimi (CAD)
            </button>
            <button
              type="button"
              className={appTab === 'schematic' ? 'active' : ''}
              onClick={() => setAppTab('schematic')}
            >
              Kumanda Şeması (Manuel • {schematicWires.length})
            </button>
          </div>
        </div>

        <div className="topbar-right">
          {appTab === 'layout' && (
            <>
              {errorCount > 0 ? (
                <span className="status-badge status-error">✕ {errorCount} Hata</span>
              ) : warnCount > 0 ? (
                <span className="status-badge status-warn">✓ Çakışma Yok • {warnCount} Uyarı</span>
              ) : (
                <span className="status-badge status-ok">✓ Sorunsuz Sığıyor</span>
              )}

              <div className="segmented">
                <button
                  type="button"
                  className={viewMode === 'all' ? 'active' : ''}
                  onClick={() => setViewMode('all')}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  className={viewMode === 'front' ? 'active' : ''}
                  onClick={() => setViewMode('front')}
                >
                  Ön İç
                </button>
                <button
                  type="button"
                  className={viewMode === 'sides' ? 'active' : ''}
                  onClick={() => setViewMode('sides')}
                >
                  Delme Şablonu
                </button>
              </div>
              <button type="button" className="btn-sm" onClick={handleReset}>
                Sıfırla
              </button>
            </>
          )}

          <button type="button" className="btn-sm" onClick={() => window.print()}>
            Yazdır / PDF
          </button>
        </div>
      </header>

      {appTab === 'layout' ? (
        <div className="workspace">
          {/* SOL PANEL */}
          <aside className="left-sidebar">
            <section className="sidebar-section">
              <div className="section-title">Görünüm Seçenekleri</div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={showDimensions}
                  onChange={(e) => setShowDimensions(e.target.checked)}
                />
                <span>Ölçülendirme çizgileri (mm)</span>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={showWindowOverlay}
                  onChange={(e) => setShowWindowOverlay(e.target.checked)}
                />
                <span>V12 12-modül şeffaf pencere</span>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={showWireClearance}
                  onChange={(e) => setShowWireClearance(e.target.checked)}
                />
                <span>Kablo bükülme / giriş payları</span>
              </label>
            </section>

            <section className="sidebar-section">
              <div className="section-title">DIN Rayı Ayarları</div>
              <label className="field">
                <span>Üst Ray Merkez Y: {rails['top-rail'].centerYMm} mm</span>
                <input
                  type="range"
                  min={56}
                  max={95}
                  value={rails['top-rail'].centerYMm}
                  onChange={(e) =>
                    setRails((prev) => ({
                      ...prev,
                      'top-rail': { ...prev['top-rail'], centerYMm: Number(e.target.value) },
                    }))
                  }
                />
              </label>
              <label className="field" style={{ marginTop: 8 }}>
                <span>Alt Ray Merkez Y: {rails['bottom-rail'].centerYMm} mm</span>
                <input
                  type="range"
                  min={140}
                  max={250}
                  value={rails['bottom-rail'].centerYMm}
                  onChange={(e) =>
                    setRails((prev) => ({
                      ...prev,
                      'bottom-rail': { ...prev['bottom-rail'], centerYMm: Number(e.target.value) },
                    }))
                  }
                />
              </label>
              <label className="field" style={{ marginTop: 8 }}>
                <span>Alt Ek Ray Uzunluğu: {rails['bottom-rail'].usableWidthMm} mm</span>
                <input
                  type="range"
                  min={190}
                  max={228}
                  value={rails['bottom-rail'].usableWidthMm}
                  onChange={(e) =>
                    setRails((prev) => ({
                      ...prev,
                      'bottom-rail': { ...prev['bottom-rail'], usableWidthMm: Number(e.target.value) },
                    }))
                  }
                />
              </label>
              <div className="metric-sub">
                Standart üst ray: 216 mm • İç gövde limiti: ~228 mm
              </div>
            </section>

            <section className="sidebar-section">
              <div className="section-title">Eleman Ekle</div>
              <label className="field" style={{ marginBottom: 8 }}>
                <span>Hedef Konum</span>
                <select
                  value={addTarget}
                  onChange={(e) => setAddTarget(e.target.value as MountLocation)}
                >
                  <option value="top-rail">Üst DIN Rayı</option>
                  <option value="bottom-rail">Alt DIN Rayı</option>
                  <option value="left-wall">Sol Yan Duvar</option>
                  <option value="right-wall">Sağ Yan Duvar</option>
                  <option value="bottom-wall">Alt Duvar (Rakor)</option>
                  <option value="top-wall">Üst Duvar (Rakor)</option>
                </select>
              </label>

              <div className="catalog-list">
                {COMPONENT_CATALOG.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    className="catalog-btn"
                    onClick={() => handleAddFromCatalog(tpl)}
                  >
                    <span className="swatch" style={{ backgroundColor: tpl.color }} />
                    <span className="catalog-info">
                      <strong>{tpl.name}</strong>
                      <small>
                        {tpl.widthMm}×{tpl.heightMm}×{tpl.depthMm} mm
                      </small>
                    </span>
                    <span className="plus">+</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {/* ORTA CAD ALANI */}
          <main className="canvas-stage">
            <PanelCanvas
              enclosure={BEMIS_BH6_6000}
              rails={rails}
              analysis={analysis}
              selectedId={selectedId}
              viewMode={viewMode}
              showDimensions={showDimensions}
              showWindowOverlay={showWindowOverlay}
              showWireClearance={showWireClearance}
              onSelect={setSelectedId}
              onUpdateSidePosY={handleUpdateSidePosY}
              onUpdateHorizPosX={handleUpdateHorizPosX}
            />
          </main>

          {/* SAĞ INSPECTOR */}
          <InspectorPanel
            enclosure={BEMIS_BH6_6000}
            items={items}
            selectedItem={selectedItem}
            analysis={analysis}
            onUpdateItem={handleUpdateItem}
            onMoveOnRail={handleMoveOnRail}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onSelect={setSelectedId}
            onImportJson={handleImportJson}
            onExportJson={handleExportJson}
          />
        </div>
      ) : (
        <SchematicEditor
          items={items}
          nodePositions={schematicNodes}
          wires={schematicWires}
          onChangeNodePositions={setSchematicNodes}
          onChangeWires={setSchematicWires}
        />
      )}
    </div>
  );
}
