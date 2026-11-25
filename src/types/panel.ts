export type ComponentCategory =
  | 'mks'
  | 'relay'
  | 'contactor'
  | 'terminal'
  | 'button'
  | 'gland'
  | 'breaker'
  | 'psu'
  | 'stopper';

export type MountLocation =
  | 'top-rail'
  | 'bottom-rail'
  | 'left-wall'
  | 'right-wall'
  | 'bottom-wall'
  | 'top-wall';

export interface RailSpec {
  id: 'top-rail' | 'bottom-rail';
  name: string;
  usableWidthMm: number;
  centerYMm: number;
  railHeightMm: number;
  standoffZMm: number;
}

export interface EnclosureSpec {
  brand: string;
  model: string;
  series: string;
  ipRating: string;
  material: string;
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
  /** Kablo bükülme / giriş payı (mm) */
  wireClearanceMm?: number;
  /** Ray üzerindeki sıralama indeksi */
  order: number;
  /** Alt/üst duvar elemanları için sol dış kenardan merkez X mesafesi (mm) */
  posXMm?: number;
  /** Yan duvar elemanı için dış üst kenardan merkez Y mesafesi (mm) */
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
  category: ComponentCategory;
  defaultMount: MountLocation;
  codePrefix: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  protrusionMm?: number;
  holeDiameterMm?: number;
  wireClearanceMm?: number;
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
  railId: 'top-rail' | 'bottom-rail';
  usedWidthMm: number;
  usableWidthMm: number;
  remainingMm: number;
  maxHeightMm: number;
  maxDepthMm: number;
  itemCount: number;
  overflow: boolean;
}

export interface LayoutAnalysis {
  placed: PlacedItem[];
  topRail: RailMetrics;
  bottomRail: RailMetrics;
  interRailGapMm: number;
  sideButtonMiddleGapMm: number | null;
  issues: LayoutIssue[];
  collidingItemIds: Set<string>;
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
