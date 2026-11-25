import { useCallback, useEffect, useMemo, useState } from 'react';
import PanelCanvas, { type ViewMode } from './components/PanelCanvas';
import InspectorPanel from './components/InspectorPanel';
import SchematicEditor from './components/SchematicEditor';
import ProductionCenter from './components/ProductionCenter';
import {
  CIRCUIT_MACROS,
  ENCLOSURE_LIBRARY,
  FULL_COMPONENT_CATALOG,
  PROJECT_PRESETS,
} from './data/enclosuresAndPresets';
import type {
  AccessoryItem,
  CatalogTemplate,
  EnclosureSpec,
  FieldCableSpec,
  MountLocation,
  PanelItem,
  RailId,
  RailSpec,
  SavedProject,
  SchematicNodePos,
  SchematicWire,
} from './types/panel';
import { analyzeLayout, isRailMount, normalizeRails } from './utils/geometry';
import {
  buildTerminalStripPlan,
  calculateGlandFills,
  calculateThermalAnalysis,
  estimateWireCutList,
} from './utils/engineering';
import { exportPanelToDxf } from './utils/clientExporters';

const STORE_KEY = 'elektrik-pano-tasarim:v6:projects';
const LEGACY_KEYS = [
  'elektrik-pano-tasarim:v5:bemis-bh6-6000',
  'elektrik-pano-tasarim:v4:bemis-bh6-6000',
  'elektrik-pano-tasarim:v3:bemis-bh6-6000',
];

type AppTab = 'layout' | 'schematic' | 'production';

interface MultiProjectStore {
  activeId: string;
  projects: SavedProject[];
}

interface EditableSnapshot {
  enclosure: EnclosureSpec;
  rails: RailSpec[];
  items: PanelItem[];
  fieldCables: FieldCableSpec[];
  accessories: AccessoryItem[];
  schematicNodes: Record<string, SchematicNodePos>;
  schematicWires: SchematicWire[];
}

function createProjectFromPreset(presetId: string): SavedProject {
  const preset = PROJECT_PRESETS.find((p) => p.id === presetId) ?? PROJECT_PRESETS[0];
  const data = preset.create();
  const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    version: 6,
    meta: { ...data.meta, id },
    enclosure: data.enclosure,
    rails: data.rails,
    items: data.items,
    fieldCables: data.fieldCables,
    accessories: data.accessories,
    schematicNodes: {},
    schematicWires: [],
    assembledWireIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function loadStore(): MultiProjectStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MultiProjectStore>;
      if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        const activeId = parsed.projects.some((p) => p.meta.id === parsed.activeId)
          ? parsed.activeId!
          : parsed.projects[0].meta.id;
        return { activeId, projects: parsed.projects };
      }
    }

    // Eski v5/v4/v3 kaydı varsa otomatik v6 projesine aktar
    for (const key of LEGACY_KEYS) {
      const oldRaw = localStorage.getItem(key);
      if (oldRaw) {
        const old = JSON.parse(oldRaw) as {
          items?: PanelItem[];
          rails?: Record<'top-rail' | 'bottom-rail', RailSpec>;
          schematicNodes?: Record<string, SchematicNodePos>;
          schematicWires?: SchematicWire[];
        };
        const base = createProjectFromPreset('bemis-ikili-motor');
        if (Array.isArray(old.items) && old.items.length > 0) base.items = old.items;
        if (old.rails?.['top-rail'] && old.rails?.['bottom-rail']) {
          base.rails = normalizeRails(old.rails);
        }
        if (old.schematicNodes) base.schematicNodes = old.schematicNodes;
        if (Array.isArray(old.schematicWires)) base.schematicWires = old.schematicWires;
        return { activeId: base.meta.id, projects: [base] };
      }
    }
  } catch {
    // Bozuk kayıt varsa varsayılana dön
  }

  const initial = createProjectFromPreset('bemis-ikili-motor');
  return { activeId: initial.meta.id, projects: [initial] };
}

const RAIL_SLOT_ORDER: RailId[] = ['top-rail', 'bottom-rail', 'rail-3', 'rail-4'];

export default function App() {
  const initialStore = useMemo(() => loadStore(), []);
  const [projects, setProjects] = useState<SavedProject[]>(initialStore.projects);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialStore.activeId);

  const activeProject = useMemo(
    () => projects.find((p) => p.meta.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );

  const [appTab, setAppTab] = useState<AppTab>('layout');
  const [selectedId, setSelectedId] = useState<string | null>(activeProject.items[0]?.id ?? null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [schematicFocusItemId, setSchematicFocusItemId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showDimensions, setShowDimensions] = useState(true);
  const [showWindowOverlay, setShowWindowOverlay] = useState(true);
  const [showWireClearance, setShowWireClearance] = useState(true);
  const [showMetaDrawer, setShowMetaDrawer] = useState(false);

  const [addTarget, setAddTarget] = useState<MountLocation>('bottom-rail');
  const [catalogGroup, setCatalogGroup] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Undo / Redo geçmişi (aktif proje için)
  const [undoStack, setUndoStack] = useState<EditableSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditableSnapshot[]>([]);

  const takeSnapshot = useCallback((p: SavedProject): EditableSnapshot => ({
    enclosure: p.enclosure,
    rails: p.rails,
    items: p.items,
    fieldCables: p.fieldCables,
    accessories: p.accessories,
    schematicNodes: p.schematicNodes,
    schematicWires: p.schematicWires,
  }), []);

  const updateActiveProject = useCallback(
    (updater: (proj: SavedProject) => SavedProject, recordUndo = true) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.meta.id !== activeProjectId) return p;
          if (recordUndo) {
            setUndoStack((u) => [...u.slice(-39), takeSnapshot(p)]);
            setRedoStack([]);
          }
          return { ...updater(p), updatedAt: new Date().toISOString() };
        })
      );
    },
    [activeProjectId, takeSnapshot]
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const last = prevUndo[prevUndo.length - 1];
      setProjects((prevProjs) =>
        prevProjs.map((p) => {
          if (p.meta.id !== activeProjectId) return p;
          setRedoStack((r) => [...r.slice(-39), takeSnapshot(p)]);
          return { ...p, ...last, updatedAt: new Date().toISOString() };
        })
      );
      return prevUndo.slice(0, -1);
    });
  }, [activeProjectId, takeSnapshot]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1];
      setProjects((prevProjs) =>
        prevProjs.map((p) => {
          if (p.meta.id !== activeProjectId) return p;
          setUndoStack((u) => [...u.slice(-39), takeSnapshot(p)]);
          return { ...p, ...next, updatedAt: new Date().toISOString() };
        })
      );
      return prevRedo.slice(0, -1);
    });
  }, [activeProjectId, takeSnapshot]);

  // Global klavye kısayolları: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  // localStorage otomatik kayıt
  useEffect(() => {
    try {
      const payload: MultiProjectStore = { activeId: activeProjectId, projects };
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch {
      // Depolama doluysa sessiz geç
    }
  }, [activeProjectId, projects]);

  const { meta, enclosure, rails, items, fieldCables, accessories, schematicNodes, schematicWires } =
    activeProject;
  const assembledWireIds = activeProject.assembledWireIds ?? [];

  const analysis = useMemo(() => analyzeLayout(items, enclosure, rails), [items, enclosure, rails]);
  const thermal = useMemo(() => calculateThermalAnalysis(items, enclosure, meta), [items, enclosure, meta]);
  const glandFills = useMemo(() => calculateGlandFills(items, fieldCables), [items, fieldCables]);
  const terminalRows = useMemo(() => buildTerminalStripPlan(items, schematicWires), [items, schematicWires]);
  const wireCutRows = useMemo(
    () => estimateWireCutList(items, analysis, schematicWires),
    [items, analysis, schematicWires]
  );

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  const errorCount =
    analysis.issues.filter((i) => i.severity === 'error').length +
    (thermal.status === 'error' ? 1 : 0) +
    glandFills.filter((g) => g.status === 'error').length;
  const warnCount =
    analysis.issues.filter((i) => i.severity === 'warning').length +
    (thermal.status === 'warning' ? 1 : 0) +
    glandFills.filter((g) => g.status === 'warning').length;

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return FULL_COMPONENT_CATALOG.filter((tpl) => {
      if (catalogGroup !== 'all' && (tpl.group ?? 'altyapi') !== catalogGroup) return false;
      if (q) {
        const hay = `${tpl.name} ${tpl.model} ${tpl.brand ?? ''} ${tpl.rating ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalogGroup, catalogSearch]);

  // --- Proje Yönetimi ---
  const handleSwitchProject = (id: string) => {
    setActiveProjectId(id);
    setUndoStack([]);
    setRedoStack([]);
    setHighlightedIds(new Set());
    const found = projects.find((p) => p.meta.id === id);
    setSelectedId(found?.items[0]?.id ?? null);
  };

  const handleCreateFromPreset = (presetId: string) => {
    const created = createProjectFromPreset(presetId);
    setProjects((prev) => [...prev, created]);
    setActiveProjectId(created.meta.id);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedId(created.items[0]?.id ?? null);
  };

  const handleDeleteCurrentProject = () => {
    if (projects.length <= 1) return;
    if (!window.confirm(`"${meta.name}" projesini silmek istiyor musunuz?`)) return;
    const remaining = projects.filter((p) => p.meta.id !== activeProjectId);
    setProjects(remaining);
    setActiveProjectId(remaining[0].meta.id);
    setUndoStack([]);
    setRedoStack([]);
  };

  // --- Pano & Ray Yönetimi ---
  const handleSelectEnclosure = (enclosureId: string) => {
    const found = ENCLOSURE_LIBRARY.find((e) => e.id === enclosureId);
    if (!found) return;
    updateActiveProject((p) => {
      const nextRails = p.rails.map((r) => ({
        ...r,
        usableWidthMm: Math.min(r.usableWidthMm, found.innerWidthMm - 8),
        centerYMm: Math.min(r.centerYMm, found.outerHeightMm - 60),
      }));
      return { ...p, enclosure: { ...found }, rails: nextRails };
    });
  };

  const handleUpdateEnclosureDims = (patch: Partial<EnclosureSpec>) => {
    updateActiveProject((p) => {
      const next = { ...p.enclosure, ...patch };
      if (patch.outerWidthMm !== undefined) next.innerWidthMm = Math.max(100, patch.outerWidthMm - 24);
      if (patch.outerHeightMm !== undefined) next.innerHeightMm = Math.max(120, patch.outerHeightMm - 28);
      if (patch.outerDepthMm !== undefined) {
        next.innerDepthMm = Math.max(70, patch.outerDepthMm - 22);
        next.baseDepthMm = Math.min(next.baseDepthMm, next.innerDepthMm);
      }
      if (patch.materialType) {
        next.thermalK = patch.materialType === 'steel' ? 5.5 : patch.materialType === 'stainless' ? 4.5 : 3.5;
        next.material =
          patch.materialType === 'steel'
            ? 'DKP Boyalı Sac'
            : patch.materialType === 'stainless'
              ? 'Paslanmaz Çelik (AISI 304)'
              : 'ABS Halojen Free';
      }
      return { ...p, enclosure: next };
    });
  };

  const handleAddRail = () => {
    if (rails.length >= 4) return;
    const nextId = RAIL_SLOT_ORDER.find((rid) => !rails.some((r) => r.id === rid));
    if (!nextId) return;
    const maxY = rails.length > 0 ? Math.max(...rails.map((r) => r.centerYMm)) : 40;
    const newRail: RailSpec = {
      id: nextId,
      name: `Ray ${rails.length + 1} (DIN 35 mm)`,
      usableWidthMm: Math.max(160, enclosure.innerWidthMm - 14),
      centerYMm: Math.min(enclosure.outerHeightMm - 50, maxY + 100),
      railHeightMm: 35,
      standoffZMm: 12,
    };
    updateActiveProject((p) => ({ ...p, rails: [...p.rails, newRail] }));
  };

  const handleRemoveRail = (railId: RailId) => {
    if (rails.length <= 1) return;
    const fallbackRail = rails.find((r) => r.id !== railId)!.id;
    updateActiveProject((p) => ({
      ...p,
      rails: p.rails.filter((r) => r.id !== railId),
      items: p.items.map((it) => (it.mount === railId ? { ...it, mount: fallbackRail } : it)),
    }));
  };

  // --- Eleman İşlemleri ---
  const handleUpdateItem = (id: string, patch: Partial<PanelItem>) => {
    updateActiveProject((p) => ({
      ...p,
      items: p.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const handleUpdateSidePosY = (id: string, nextYMm: number) => {
    updateActiveProject(
      (p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, posYMm: nextYMm } : it)) }),
      false
    );
  };

  const handleUpdateHorizPosX = (id: string, nextXMm: number) => {
    updateActiveProject(
      (p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, posXMm: nextXMm } : it)) }),
      false
    );
  };

  const handleUpdateBackplatePos = (id: string, nextXMm: number, nextYMm: number) => {
    updateActiveProject(
      (p) => ({
        ...p,
        items: p.items.map((it) => (it.id === id ? { ...it, posXMm: nextXMm, posYMm: nextYMm } : it)),
      }),
      false
    );
  };

  const handleReorderRailItem = (itemId: string, targetRailId: RailId, targetIndex: number) => {
    updateActiveProject((p) => {
      const moving = p.items.find((i) => i.id === itemId);
      if (!moving || !isRailMount(moving.mount)) return p;

      const targetSiblings = p.items
        .filter((i) => i.mount === targetRailId && i.id !== itemId)
        .sort((a, b) => a.order - b.order);

      const clampedIdx = Math.max(0, Math.min(targetSiblings.length, targetIndex));
      const nextTargetList = [...targetSiblings];
      nextTargetList.splice(clampedIdx, 0, { ...moving, mount: targetRailId });
      const targetOrderMap = new Map(nextTargetList.map((it, idx) => [it.id, idx]));

      // Kaynak ray farklıysa kaynak rayın sıralamasını da sıkılaştır
      const sourceOrderMap = new Map<string, number>();
      if (moving.mount !== targetRailId) {
        p.items
          .filter((i) => i.mount === moving.mount && i.id !== itemId)
          .sort((a, b) => a.order - b.order)
          .forEach((it, idx) => sourceOrderMap.set(it.id, idx));
      }

      return {
        ...p,
        items: p.items.map((it) => {
          if (it.id === itemId) return { ...it, mount: targetRailId, order: targetOrderMap.get(it.id) ?? 0 };
          if (targetOrderMap.has(it.id)) return { ...it, order: targetOrderMap.get(it.id)! };
          if (sourceOrderMap.has(it.id)) return { ...it, order: sourceOrderMap.get(it.id)! };
          return it;
        }),
      };
    });
  };

  const handleAddFromCatalog = (tpl: CatalogTemplate) => {
    let mount: MountLocation = tpl.defaultMount;
    if (tpl.category === 'button') {
      mount = addTarget === 'right-wall' ? 'right-wall' : 'left-wall';
    } else if (tpl.category === 'gland') {
      mount = addTarget === 'top-wall' ? 'top-wall' : 'bottom-wall';
    } else if (tpl.category === 'busbar' || tpl.category === 'duct') {
      mount = 'backplate';
    } else if (isRailMount(addTarget) && rails.some((r) => r.id === addTarget)) {
      mount = addTarget;
    } else if (isRailMount(mount) && !rails.some((r) => r.id === mount)) {
      mount = rails[0]?.id ?? 'top-rail';
    }

    const sameMount = items.filter((i) => i.mount === mount);
    const samePrefixCount = items.filter((i) => i.code.startsWith(tpl.codePrefix)).length;
    const newId = `${tpl.key}-${Date.now()}`;

    const nextItem: PanelItem = {
      id: newId,
      code: `${tpl.codePrefix}${samePrefixCount + 1}`,
      name: tpl.name,
      model: tpl.model,
      brand: tpl.brand,
      category: tpl.category,
      mount,
      widthMm: tpl.category === 'duct' && tpl.widthMm > tpl.heightMm ? Math.min(tpl.widthMm, enclosure.innerWidthMm - 16) : tpl.widthMm,
      heightMm: tpl.heightMm,
      depthMm: tpl.depthMm,
      protrusionMm: tpl.protrusionMm,
      holeDiameterMm: tpl.holeDiameterMm,
      innerPassageMm: tpl.innerPassageMm,
      wireClearanceMm: tpl.wireClearanceMm,
      powerLossW: tpl.powerLossW,
      unitPriceTry: tpl.unitPriceTry,
      order: sameMount.length,
      posXMm:
        mount === 'bottom-wall' || mount === 'top-wall' || mount === 'backplate'
          ? Math.round(enclosure.outerWidthMm / 2)
          : undefined,
      posYMm:
        mount === 'left-wall' || mount === 'right-wall'
          ? Math.min(264, enclosure.outerHeightMm - 55)
          : mount === 'backplate'
            ? tpl.category === 'duct'
              ? Math.round(enclosure.outerHeightMm / 2)
              : 24
            : undefined,
      posZMm:
        mount === 'left-wall' || mount === 'right-wall' || mount === 'bottom-wall' || mount === 'top-wall'
          ? Math.min(48, Math.round(enclosure.baseDepthMm * 0.55))
          : undefined,
      rating: tpl.rating,
      color: tpl.color,
    };

    updateActiveProject((p) => ({ ...p, items: [...p.items, nextItem] }));
    setSelectedId(newId);
  };

  const handleInsertMacro = (macroId: string) => {
    const macro = CIRCUIT_MACROS.find((m) => m.id === macroId);
    if (!macro) return;
    const targetRail: RailId =
      isRailMount(addTarget) && rails.some((r) => r.id === addTarget)
        ? addTarget
        : rails[0]?.id ?? 'top-rail';
    const built = macro.buildItems(items, targetRail);
    updateActiveProject((p) => ({
      ...p,
      items: [...p.items, ...built.items],
      accessories: [...p.accessories, ...built.accessories],
    }));
    if (built.items[0]) setSelectedId(built.items[0].id);
  };

  const handleMoveOnRail = (id: string, direction: -1 | 1) => {
    updateActiveProject((p) => {
      const target = p.items.find((i) => i.id === id);
      if (!target) return p;
      const onSameRail = p.items
        .filter((i) => i.mount === target.mount)
        .sort((a, b) => a.order - b.order);
      const idx = onSameRail.findIndex((i) => i.id === id);
      const swapIdx = idx + direction;
      if (idx < 0 || swapIdx < 0 || swapIdx >= onSameRail.length) return p;

      const reordered = [...onSameRail];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(swapIdx, 0, moved);
      const orderMap = new Map(reordered.map((it, i) => [it.id, i]));

      return {
        ...p,
        items: p.items.map((it) => (orderMap.has(it.id) ? { ...it, order: orderMap.get(it.id)! } : it)),
      };
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
      posXMm: src.posXMm !== undefined ? Math.min(enclosure.outerWidthMm - 30, src.posXMm + 22) : undefined,
      posYMm: src.posYMm !== undefined ? Math.min(enclosure.outerHeightMm - 30, src.posYMm + 22) : undefined,
    };
    updateActiveProject((p) => ({ ...p, items: [...p.items, clone] }));
    setSelectedId(newId);
  };

  const handleDeleteItem = (id: string) => {
    updateActiveProject((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const handleExportJson = () => {
    const payload = JSON.stringify(activeProject, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.name.replace(/\s+/g, '-')}-Proje.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Partial<SavedProject> & {
        rails?: RailSpec[] | Record<'top-rail' | 'bottom-rail', RailSpec>;
      };
      updateActiveProject((p) => ({
        ...p,
        meta: parsed.meta ? { ...p.meta, ...parsed.meta, id: p.meta.id } : p.meta,
        enclosure: parsed.enclosure ? { ...p.enclosure, ...parsed.enclosure } : p.enclosure,
        rails: parsed.rails ? normalizeRails(parsed.rails) : p.rails,
        items: Array.isArray(parsed.items) ? parsed.items : p.items,
        fieldCables: Array.isArray(parsed.fieldCables) ? parsed.fieldCables : p.fieldCables,
        accessories: Array.isArray(parsed.accessories) ? parsed.accessories : p.accessories,
        schematicNodes: parsed.schematicNodes ?? p.schematicNodes,
        schematicWires: Array.isArray(parsed.schematicWires) ? parsed.schematicWires : p.schematicWires,
      }));
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
            <h1>Pano CAD</h1>
            <select
              className="project-select"
              value={activeProjectId}
              onChange={(e) => handleSwitchProject(e.target.value)}
              title="Kayıtlı projeler arasında geçiş yap"
            >
              {projects.map((p) => (
                <option key={p.meta.id} value={p.meta.id}>
                  {p.meta.name} ({p.enclosure.model})
                </option>
              ))}
            </select>
            <select
              className="preset-select"
              value=""
              onChange={(e) => {
                if (e.target.value) handleCreateFromPreset(e.target.value);
              }}
              title="Hazır şablondan yeni proje oluştur"
            >
              <option value="">+ Yeni Şablon...</option>
              {PROJECT_PRESETS.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`btn-sm ${showMetaDrawer ? 'btn-active-sm' : ''}`}
              onClick={() => setShowMetaDrawer((v) => !v)}
            >
              Antet
            </button>
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
              Kumanda Şeması ({schematicWires.length})
            </button>
            <button
              type="button"
              className={appTab === 'production' ? 'active' : ''}
              onClick={() => setAppTab('production')}
            >
              Üretim & Saha
            </button>
          </div>
        </div>

        <div className="topbar-right">
          <div className="undo-group">
            <button
              type="button"
              className="btn-sm"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              title="Geri Al (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              type="button"
              className="btn-sm"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              title="Yinele (Ctrl+Y)"
            >
              ↷
            </button>
          </div>

          {appTab === 'layout' && (
            <>
              {errorCount > 0 ? (
                <span className="status-badge status-error">✕ {errorCount} Hata</span>
              ) : warnCount > 0 ? (
                <span className="status-badge status-warn">✓ {warnCount} Uyarı</span>
              ) : (
                <span className="status-badge status-ok">✓ Uygun</span>
              )}

              <div className="segmented">
                <button type="button" className={viewMode === 'all' ? 'active' : ''} onClick={() => setViewMode('all')}>
                  Tümü
                </button>
                <button type="button" className={viewMode === 'front' ? 'active' : ''} onClick={() => setViewMode('front')}>
                  Ön İç
                </button>
                <button type="button" className={viewMode === 'sides' ? 'active' : ''} onClick={() => setViewMode('sides')}>
                  Delme
                </button>
              </div>
            </>
          )}

          <button
            type="button"
            className="btn-sm"
            onClick={() => exportPanelToDxf(meta, enclosure, rails, analysis)}
            title="Katmanlı 1:1 AutoCAD DXF indir"
          >
            DXF İndir
          </button>
        </div>
      </header>

      {/* PROJE ANTETİ (TITLE BLOCK) AÇILIR ÇUBUĞU */}
      {showMetaDrawer && (
        <div className="meta-drawer">
          <label className="field">
            <span>Proje Adı</span>
            <input
              value={meta.name}
              onChange={(e) =>
                updateActiveProject((p) => ({ ...p, meta: { ...p.meta, name: e.target.value } }), false)
              }
            />
          </label>
          <label className="field">
            <span>Müşteri / Firma</span>
            <input
              value={meta.customer}
              onChange={(e) =>
                updateActiveProject((p) => ({ ...p, meta: { ...p.meta, customer: e.target.value } }), false)
              }
            />
          </label>
          <label className="field">
            <span>Saha / Bölge</span>
            <input
              value={meta.location}
              onChange={(e) =>
                updateActiveProject((p) => ({ ...p, meta: { ...p.meta, location: e.target.value } }), false)
              }
            />
          </label>
          <label className="field">
            <span>Revizyon</span>
            <input
              value={meta.revision}
              onChange={(e) =>
                updateActiveProject((p) => ({ ...p, meta: { ...p.meta, revision: e.target.value } }), false)
              }
            />
          </label>
          <label className="field">
            <span>Tasarlayan</span>
            <input
              value={meta.author}
              onChange={(e) =>
                updateActiveProject((p) => ({ ...p, meta: { ...p.meta, author: e.target.value } }), false)
              }
            />
          </label>
          <div className="meta-drawer-actions">
            <button type="button" className="btn-sm" onClick={handleExportJson}>
              JSON Yedekle
            </button>
            {projects.length > 1 && (
              <button type="button" className="btn-sm btn-danger" onClick={handleDeleteCurrentProject}>
                Projeyi Sil
              </button>
            )}
          </div>
        </div>
      )}

      {appTab === 'layout' && (
        <div className="workspace">
          {/* SOL PANEL */}
          <aside className="left-sidebar">
            {/* PANO GÖVDESİ SEÇİMİ & ÖZEL ÖLÇÜ */}
            <section className="sidebar-section">
              <div className="section-title">Pano Gövdesi & Ölçü</div>
              <label className="field">
                <span>Hazır Kutu / Sac Pano</span>
                <select
                  value={enclosure.id ?? ''}
                  onChange={(e) => handleSelectEnclosure(e.target.value)}
                >
                  {ENCLOSURE_LIBRARY.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      {enc.brand} {enc.model} ({enc.outerWidthMm}×{enc.outerHeightMm}×{enc.outerDepthMm})
                    </option>
                  ))}
                </select>
              </label>
              <div className="dims-grid" style={{ marginTop: 6 }}>
                <label className="field">
                  <span>G (mm)</span>
                  <input
                    type="number"
                    min={150}
                    max={1200}
                    value={enclosure.outerWidthMm}
                    onChange={(e) => handleUpdateEnclosureDims({ outerWidthMm: Number(e.target.value) })}
                  />
                </label>
                <label className="field">
                  <span>Y (mm)</span>
                  <input
                    type="number"
                    min={180}
                    max={1600}
                    value={enclosure.outerHeightMm}
                    onChange={(e) => handleUpdateEnclosureDims({ outerHeightMm: Number(e.target.value) })}
                  />
                </label>
                <label className="field">
                  <span>D (mm)</span>
                  <input
                    type="number"
                    min={100}
                    max={500}
                    value={enclosure.outerDepthMm}
                    onChange={(e) => handleUpdateEnclosureDims({ outerDepthMm: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label className="field" style={{ marginTop: 6 }}>
                <span>Gövde Malzemesi (Isıl k)</span>
                <select
                  value={enclosure.materialType ?? 'abs'}
                  onChange={(e) =>
                    handleUpdateEnclosureDims({
                      materialType: e.target.value as 'abs' | 'steel' | 'stainless',
                    })
                  }
                >
                  <option value="abs">ABS / Polikarbonat (k=3,5)</option>
                  <option value="steel">Boyalı Sac Pano (k=5,5)</option>
                  <option value="stainless">Paslanmaz Çelik (k=4,5)</option>
                </select>
              </label>
            </section>

            {/* DİNAMİK DIN RAYLARI (1–4) */}
            <section className="sidebar-section">
              <div className="section-title-row">
                <span className="section-title" style={{ marginBottom: 0 }}>
                  DIN Rayları ({rails.length}/4)
                </span>
                {rails.length < 4 && (
                  <button type="button" className="btn-xs" onClick={handleAddRail}>
                    + Ray Ekle
                  </button>
                )}
              </div>

              {rails.map((rail, idx) => (
                <div key={rail.id} className="rail-config-card">
                  <div className="rail-config-head">
                    <strong>Ray {idx + 1}</strong>
                    <span>
                      Y={rail.centerYMm} • L={rail.usableWidthMm} mm
                    </span>
                    {rails.length > 1 && (
                      <button
                        type="button"
                        className="btn-xs-del"
                        title="Bu rayı kaldır"
                        onClick={() => handleRemoveRail(rail.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <input
                    type="range"
                    min={45}
                    max={enclosure.outerHeightMm - 45}
                    value={rail.centerYMm}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => ({
                          ...p,
                          rails: p.rails.map((r) =>
                            r.id === rail.id ? { ...r, centerYMm: Number(e.target.value) } : r
                          ),
                        }),
                        false
                      )
                    }
                  />
                  <input
                    type="range"
                    min={120}
                    max={Math.max(180, enclosure.innerWidthMm)}
                    value={rail.usableWidthMm}
                    onChange={(e) =>
                      updateActiveProject(
                        (p) => ({
                          ...p,
                          rails: p.rails.map((r) =>
                            r.id === rail.id ? { ...r, usableWidthMm: Number(e.target.value) } : r
                          ),
                        }),
                        false
                      )
                    }
                  />
                </div>
              ))}
            </section>

            {/* HAZIR DEVRE MAKROLARI */}
            <section className="sidebar-section">
              <div className="section-title">Hazır Devre Makroları</div>
              <div className="macro-list">
                {CIRCUIT_MACROS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="macro-btn"
                    title={m.description}
                    onClick={() => handleInsertMacro(m.id)}
                  >
                    <strong>⚡ {m.name}</strong>
                  </button>
                ))}
              </div>
            </section>

            {/* GÖRÜNÜM SEÇENEKLERİ */}
            <section className="sidebar-section">
              <div className="section-title">Görünüm</div>
              <label className="check-row">
                <input type="checkbox" checked={showDimensions} onChange={(e) => setShowDimensions(e.target.checked)} />
                <span>Ölçülendirme çizgileri (mm)</span>
              </label>
              {enclosure.hasWindow !== false && (
                <label className="check-row">
                  <input type="checkbox" checked={showWindowOverlay} onChange={(e) => setShowWindowOverlay(e.target.checked)} />
                  <span>Şeffaf kapak penceresi</span>
                </label>
              )}
              <label className="check-row">
                <input type="checkbox" checked={showWireClearance} onChange={(e) => setShowWireClearance(e.target.checked)} />
                <span>Kablo bükülme / giriş payları</span>
              </label>
            </section>

            {/* ELEMAN KATALOĞU */}
            <section className="sidebar-section">
              <div className="section-title">Eleman Kataloğu</div>
              <label className="field" style={{ marginBottom: 6 }}>
                <span>Hedef Konum</span>
                <select value={addTarget} onChange={(e) => setAddTarget(e.target.value as MountLocation)}>
                  {rails.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  <option value="backplate">Pano İçi (Kablo Kanalı / Bara)</option>
                  <option value="left-wall">Sol Yan Duvar</option>
                  <option value="right-wall">Sağ Yan Duvar</option>
                  <option value="bottom-wall">Alt Duvar (Rakor)</option>
                  <option value="top-wall">Üst Duvar (Rakor)</option>
                </select>
              </label>

              <input
                type="text"
                className="search-input"
                style={{ width: '100%', marginBottom: 6 }}
                placeholder="ABB, kontaktör, kanal, rakor..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />

              <div className="cat-chips">
                {[
                  ['all', 'Tümü'],
                  ['koruma', 'Koruma'],
                  ['kumanda', 'Kumanda'],
                  ['klemens', 'Klemens'],
                  ['duvar', 'Duvar'],
                  ['altyapi', 'Kanal/Bara'],
                ].map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    className={`cat-chip ${catalogGroup === k ? 'active' : ''}`}
                    onClick={() => setCatalogGroup(k)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="catalog-list">
                {filteredCatalog.map((tpl) => (
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
                        {tpl.powerLossW ? ` • ${tpl.powerLossW}W` : ''}
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
              enclosure={enclosure}
              rails={rails}
              analysis={analysis}
              selectedId={selectedId}
              highlightedIds={highlightedIds}
              viewMode={viewMode}
              showDimensions={showDimensions}
              showWindowOverlay={showWindowOverlay}
              showWireClearance={showWireClearance}
              onSelect={(id) => {
                setSelectedId(id);
                setHighlightedIds(new Set());
              }}
              onUpdateSidePosY={handleUpdateSidePosY}
              onUpdateHorizPosX={handleUpdateHorizPosX}
              onUpdateBackplatePos={handleUpdateBackplatePos}
              onReorderRailItem={handleReorderRailItem}
            />
          </main>

          {/* SAĞ DENETÇİ & MÜHENDİSLİK PANELİ */}
          <InspectorPanel
            meta={meta}
            enclosure={enclosure}
            rails={rails}
            items={items}
            selectedItem={selectedItem}
            analysis={analysis}
            thermal={thermal}
            glandFills={glandFills}
            fieldCables={fieldCables}
            accessories={accessories}
            onUpdateMeta={(patch) =>
              updateActiveProject((p) => ({ ...p, meta: { ...p.meta, ...patch } }), false)
            }
            onUpdateItem={handleUpdateItem}
            onMoveOnRail={handleMoveOnRail}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onSelect={(id) => {
              setSelectedId(id);
              setHighlightedIds(new Set([id]));
            }}
            onChangeFieldCables={(next) =>
              updateActiveProject((p) => ({ ...p, fieldCables: next }))
            }
            onChangeAccessories={(next) =>
              updateActiveProject((p) => ({ ...p, accessories: next }))
            }
            onImportJson={handleImportJson}
            onExportJson={handleExportJson}
            onJumpToSchematic={(id) => {
              setSchematicFocusItemId(id);
              setAppTab('schematic');
            }}
          />
        </div>
      )}

      {appTab === 'schematic' && (
        <SchematicEditor
          items={items}
          nodePositions={schematicNodes}
          wires={schematicWires}
          externalFocusItemId={schematicFocusItemId}
          onChangeNodePositions={(next) =>
            updateActiveProject((p) => ({ ...p, schematicNodes: next }), false)
          }
          onChangeWires={(next) =>
            updateActiveProject((p) => ({ ...p, schematicWires: next }))
          }
          onExportJson={handleExportJson}
          onSelectInPanel={(id) => {
            setSelectedId(id);
            setHighlightedIds(new Set([id]));
            setAppTab('layout');
          }}
        />
      )}

      {appTab === 'production' && (
        <ProductionCenter
          meta={meta}
          enclosure={enclosure}
          rails={rails}
          items={items}
          analysis={analysis}
          thermal={thermal}
          glandFills={glandFills}
          fieldCables={fieldCables}
          accessories={accessories}
          wires={schematicWires}
          terminalRows={terminalRows}
          wireCutRows={wireCutRows}
          assembledWireIds={assembledWireIds}
          onToggleAssembledWire={(wireId) =>
            updateActiveProject(
              (p) => {
                const cur = new Set(p.assembledWireIds ?? []);
                if (cur.has(wireId)) cur.delete(wireId);
                else cur.add(wireId);
                return { ...p, assembledWireIds: Array.from(cur) };
              },
              false
            )
          }
          onResetAssembly={() =>
            updateActiveProject((p) => ({ ...p, assembledWireIds: [] }), false)
          }
          onLocateInPanel={(ids) => {
            if (ids[0]) setSelectedId(ids[0]);
            setHighlightedIds(new Set(ids));
            setAppTab('layout');
          }}
          onOpenSchematic={() => setAppTab('schematic')}
        />
      )}
    </div>
  );
}
