export type ComponentCategory =
  | 'mks'
  | 'relay'
  | 'contactor'
  | 'terminal'
  | 'busbar'
  | 'button'
  | 'gland'
  | 'breaker'
  | 'psu'
  | 'stopper'
  | 'duct'
  | 'plc';

export type RailId = 'top-rail' | 'bottom-rail' | 'rail-3' | 'rail-4';

export type MountLocation =
  | RailId
  | 'backplate'
  | 'left-wall'
  | 'right-wall'
  | 'bottom-wall'
  | 'top-wall';

export interface RailSpec {
  id: RailId;
  name: string;
  usableWidthMm: number;
  centerYMm: number;
  railHeightMm: number;
  standoffZMm: number;
}

export type EnclosureMaterialType = 'abs' | 'steel' | 'stainless';

export interface EnclosureSpec {
  id?: string;
  brand: string;
  model: string;
  series: string;
  ipRating: string;
  material: string;
  materialType?: EnclosureMaterialType;
  /** IEC 60890 ısıl iletim katsayısı W/(m²·K) — ABS ~3.5, Boyalı Sac ~5.5, Paslanmaz ~4.5 */
  thermalK?: number;
  hasWindow?: boolean;
  hasInternalNPe?: boolean;
  outerWidthMm: number;
  outerHeightMm: number;
  outerDepthMm: number;
  innerWidthMm: number;
  innerHeightMm: number;
  innerDepthMm: number;
  baseDepthMm: number;
  windowTopMm: number;
  windowHeightMm: number;
  windowWidthMm: number;
}

export interface PanelItem {
  id: string;
  code: string;
  name: string;
  model: string;
  brand?: string;
  category: ComponentCategory;
  mount: MountLocation;
  /** DIN rayı boyunca genişlik (mm), yan duvarda ön çerçeve genişliği veya rakorda dış somun çapı (mm) */
  widthMm: number;
  /** Dikey yükseklik (mm) — rakorda dış somun çapı (mm) */
  heightMm: number;
  /** Pano içine giren derinlik/diş+kontra somun uzunluğu (mm) */
  depthMm: number;
  /** Kasa dışına taşan buton başlığı veya rakor gövde uzunluğu (mm) */
  protrusionMm?: number;
  /** Montaj deliği / panç çapı (mm) — örn. Ø22 mm veya PG36 için Ø47,5 mm */
  holeDiameterMm?: number;
  /** Rakor/spiral iç geçiş çapı (mm) — doluluk hesabı için */
  innerPassageMm?: number;
  /** Kablo bükülme / giriş payı (mm) */
  wireClearanceMm?: number;
  /** IEC 60890 ısıl hesap için nominal güç kaybı (Watt) */
  powerLossW?: number;
  /** İsteğe bağlı yaklaşık birim maliyet (TL) */
  unitPriceTry?: number;
  /** Ray üzerindeki sıralama indeksi */
  order: number;
  /** Alt/üst duvar ve taban elemanları için sol dış kenardan merkez X mesafesi (mm) */
  posXMm?: number;
  /** Yan duvar ve taban elemanları için dış üst kenardan merkez Y mesafesi (mm) */
  posYMm?: number;
  /** Yan/alt/üst duvar elemanı için arka tabandan merkez Z mesafesi (mm) */
  posZMm?: number;
  rating?: string;
  color: string;
  notes?: string;
}

export interface CatalogTemplate {
  key: string;
  name: string;
  model: string;
  brand?: string;
  group?: 'koruma' | 'kumanda' | 'klemens' | 'duvar' | 'altyapi';
  category: ComponentCategory;
  defaultMount: MountLocation;
  codePrefix: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  protrusionMm?: number;
  holeDiameterMm?: number;
  innerPassageMm?: number;
  wireClearanceMm?: number;
  powerLossW?: number;
  unitPriceTry?: number;
  rating?: string;
  color: string;
}

export interface Box3D {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  z1: number;
  z2: number;
}

export interface PlacedItem {
  item: PanelItem;
  /** Fiziksel gövde 3D kutusu (dış pano köşesi 0,0,0 referanslı, mm) */
  box: Box3D;
  /** Kablo payı dahil güvenli hacim */
  clearanceBox?: Box3D;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface LayoutIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  itemIds: string[];
}

export interface RailMetrics {
  railId: RailId;
  railName: string;
  usedWidthMm: number;
  usableWidthMm: number;
  remainingMm: number;
  maxHeightMm: number;
  maxDepthMm: number;
  itemCount: number;
  overflow: boolean;
}

export interface RailGapMetric {
  upperRailId: RailId;
  lowerRailId: RailId;
  gapMm: number;
}

export interface LayoutAnalysis {
  placed: PlacedItem[];
  rails: RailMetrics[];
  /** Geriye dönük uyumluluk için ilk iki ray */
  topRail: RailMetrics;
  bottomRail: RailMetrics;
  railGaps: RailGapMetric[];
  interRailGapMm: number;
  sideButtonMiddleGapMm: number | null;
  issues: LayoutIssue[];
  collidingItemIds: Set<string>;
}

/** Proje Anteti (Title Block) ve Ortam Şartları */
export interface ProjectMeta {
  id: string;
  name: string;
  customer: string;
  location: string;
  revision: string;
  author: string;
  date: string;
  /** Pano dış ortam sıcaklığı (°C) — Sera için genelde 35–45 °C */
  ambientTempC: number;
  /** İzin verilen maksimum pano içi sıcaklığı (°C) — Standart 55 °C */
  maxInternalTempC: number;
}

/** Pano Dış Giriş/Çıkış Kablosu (Rakor doluluk hesabı için) */
export interface FieldCableSpec {
  id: string;
  name: string;
  section: string;
  count: number;
  outerDiameterMm: number;
  jacketColor: string;
  targetGlandId?: string;
  notes?: string;
}

/** Rayda yer kaplamayan ek malzeme (VM4 kilit, ek DIN ray, köprü tarağı, yüksük vb.) */
export interface AccessoryItem {
  id: string;
  code: string;
  model: string;
  qty: number;
  location: string;
  unitPriceTry?: number;
  notes?: string;
}

/** Rakor Doluluk Hesap Sonucu */
export interface GlandFillResult {
  glandId: string;
  glandCode: string;
  glandModel: string;
  innerDiameterMm: number;
  innerAreaMm2: number;
  cableCount: number;
  totalCableAreaMm2: number;
  fillPercent: number;
  status: 'ok' | 'warning' | 'error';
  suggestedGland?: string;
}

/** IEC 60890 Basitleştirilmiş Isıl Hesap Sonucu */
export interface ThermalAnalysis {
  totalPowerLossW: number;
  effectiveSurfaceM2: number;
  kValue: number;
  deltaTC: number;
  ambientTempC: number;
  estimatedInternalTempC: number;
  maxAllowedTempC: number;
  status: 'ok' | 'warning' | 'error';
  recommendation: string;
  topHeatSources: Array<{ code: string; name: string; watts: number }>;
}

/** Klemens Bağlantı Planı Satırı */
export interface TerminalStripRow {
  terminalId: string;
  code: string;
  mountLabel: string;
  rating: string;
  color: string;
  internalConnections: Array<{ wireNo: string; target: string; colorHex: string; sectionMm2: string }>;
  fieldConnections: Array<{ wireNo: string; target: string; colorHex: string; sectionMm2: string }>;
  jumperToCodes: string[];
}

/** Kablo Kesim & Yüksük Listesi Satırı */
export interface WireCutRow {
  wireId: string;
  wireNo: string;
  fromText: string;
  toText: string;
  colorHex: string;
  sectionMm2: string;
  estimatedLengthCm: number;
  ferruleFrom: string;
  ferruleTo: string;
}

/** Manuel Kumanda Şeması Tipleri */
export interface SchematicNodePos {
  x: number;
  y: number;
}

export interface SchematicPoint {
  x: number;
  y: number;
}

export interface SchematicWire {
  id: string;
  fromNodeId: string;
  fromPinId: string;
  toNodeId: string;
  toPinId: string;
  waypoints: SchematicPoint[];
  color: string;
  sectionMm2: string;
  label: string;
}

/** Tam Proje Kayıt Formatı */
export interface SavedProject {
  version: number;
  meta: ProjectMeta;
  enclosure: EnclosureSpec;
  rails: RailSpec[];
  items: PanelItem[];
  fieldCables: FieldCableSpec[];
  accessories: AccessoryItem[];
  schematicNodes: Record<string, SchematicNodePos>;
  schematicWires: SchematicWire[];
  assembledWireIds?: string[];
  updatedAt: string;
}
