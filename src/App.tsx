import { useEffect, useMemo, useState } from 'react';
import PanelCanvas, { type ViewMode } from './components/PanelCanvas';
import InspectorPanel from './components/InspectorPanel';
import {
  BEMIS_BH6_6000,
  COMPONENT_CATALOG,
  createInitialItems,
  DEFAULT_RAILS,
} from './data/bemisPreset';
import type { CatalogTemplate, MountLocation, PanelItem, RailSpec } from './types/panel';
import { analyzeLayout } from './utils/geometry';

const STORAGE_KEY = 'elektrik-pano-tasarim:v1:bemis-bh6-6000';

interface SavedState {
  items: PanelItem[];
  rails: Record<'top-rail' | 'bottom-rail', RailSpec>;
}

function loadSavedState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: createInitialItems(), rails: DEFAULT_RAILS };
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    if (Array.isArray(parsed.items) && parsed.rails?.['top-rail'] && parsed.rails?.['bottom-rail']) {
      return { items: parsed.items, rails: parsed.rails };
    }
  } catch {
    // Bozuk depolama varsa varsayılana dön
  }
  return { items: createInitialItems(), rails: DEFAULT_RAILS };
}

export default function App() {
  const initial = useMemo(() => loadSavedState(), []);
  const [items, setItems] = useState<PanelItem[]>(initial.items);
  const [rails, setRails] = useState<Record<'top-rail' | 'bottom-rail', RailSpec>>(initial.rails);
  const [selectedId, setSelectedId] = useState<string | null>(initial.items[0]?.id ?? null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showDimensions, setShowDimensions] = useState(true);
  const [showWindowOverlay, setShowWindowOverlay] = useState(true);
  const [showWireClearance, setShowWireClearance] = useState(true);
  const [addTarget, setAddTarget] = useState<MountLocation>('top-rail');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, rails }));
    } catch {
      // Depolama doluysa sessiz geç
    }
  }, [items, rails]);

  const analysis = useMemo(
    () => analyzeLayout(items, BEMIS_BH6_6000, rails),
    [items, rails]
  );

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
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, posYMm: nextYMm } : item))
    );
  };

  const handleAddFromCatalog = (tpl: CatalogTemplate) => {
    const mount: MountLocation =
      tpl.category === 'button'
        ? addTarget === 'right-wall'
          ? 'right-wall'
          : 'left-wall'
        : addTarget === 'top-rail' || addTarget === 'bottom-rail'
          ? addTarget
          : tpl.defaultMount;

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
      posYMm: mount === 'left-wall' || mount === 'right-wall' ? 262 : undefined,
      posZMm: mount === 'left-wall' || mount === 'right-wall' ? 48 : undefined,
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

      return prev.map((it) =>
        orderMap.has(it.id) ? { ...it, order: orderMap.get(it.id)! } : it
      );
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

  const handleImportJson = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as { items?: PanelItem[] };
      if (Array.isArray(parsed.items)) {
        setItems(parsed.items);
        setSelectedId(parsed.items[0]?.id ?? null);
      }
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
              {BEMIS_BH6_6000.outerHeightMm}×{BEMIS_BH6_6000.outerDepthMm} mm • {BEMIS_BH6_6000.ipRating})
            </span>
          </div>
        </div>

        <div className="topbar-center">
          {errorCount > 0 ? (
            <span className="status-badge status-error">✕ {errorCount} Çakışma / Sığma Hatası</span>
          ) : warnCount > 0 ? (
            <span className="status-badge status-warn">
              ✓ Çakışma Yok • {warnCount} Dikkat Notu
            </span>
          ) : (
            <span className="status-badge status-ok">✓ Tüm Elemanlar Sorunsuz Sığıyor</span>
          )}
        </div>

        <div className="topbar-right">
          <div className="segmented">
            <button
              type="button"
              className={viewMode === 'all' ? 'active' : ''}
              onClick={() => setViewMode('all')}
            >
              Tüm Görünüşler
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
              Yan & Kesit
            </button>
          </div>

          <button type="button" className="btn-sm" onClick={() => window.print()}>
            Yazdır / PDF
          </button>
          <button type="button" className="btn-sm" onClick={handleReset}>
            Varsayılana Sıfırla
          </button>
        </div>
      </header>

      <div className="workspace">
        {/* SOL PANEL: Kütüphane ve Ray Ayarları */}
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
              <span>Yan buton kablo bükülme payı</span>
            </label>
          </section>

          <section className="sidebar-section">
            <div className="section-title">DIN Rayı Yükseklikleri</div>
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
            <label className="field">
              <span>Alt Ray Merkez Y: {rails['bottom-rail'].centerYMm} mm</span>
              <input
                type="range"
                min={140}
                max={265}
                value={rails['bottom-rail'].centerYMm}
                onChange={(e) =>
                  setRails((prev) => ({
                    ...prev,
                    'bottom-rail': { ...prev['bottom-rail'], centerYMm: Number(e.target.value) },
                  }))
                }
              />
            </label>
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

        {/* ORTA ALAN: Ölçekli CAD Çizimi */}
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
          />
        </main>

        {/* SAĞ PANEL: Özellikler, 3D Kontrol ve BOM */}
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
        />
      </div>
    </div>
  );
}
