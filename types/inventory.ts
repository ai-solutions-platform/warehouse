export type MovementType = "stock-in" | "stock-out";
export type ItemStatus = "healthy" | "low" | "critical";
export type AssistantState =
  | "ready"
  | "listening"
  | "searching"
  | "product-found"
  | "speaking"
  | "not-found"
  | "error";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Warehouse {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  color: string;
  zones: Array<{
    id: string;
    name: string;
  }>;
}

export interface WarehouseLocation {
  warehouseId: string;
  city: string;
  state: string;
  label: string;
  coordinates: Coordinates;
  activityScore: number;
  status: "stable" | "attention" | "critical";
}

export interface Product {
  id: string;
  name: string;
  category: string;
  color: string;
  minimumStock: number;
}

export interface NFCTag {
  id: string;
  productId: string;
  warehouseId: string;
  zoneId: string;
  rackId: string;
  containerId: string;
  quantity: number;
  lastUpdated: string;
}

export interface InventoryMovement {
  id: string;
  tagId: string;
  productId: string;
  warehouseId: string;
  zoneId: string;
  rackId: string;
  containerId: string;
  quantity: number;
  type: MovementType;
  occurredAt: string;
}

export interface WarehouseLayoutContainer {
  id: string;
  label: string;
}

export interface WarehouseLayoutRack {
  id: string;
  label: string;
  containers: WarehouseLayoutContainer[];
}

export interface WarehouseLayoutZone {
  id: string;
  label: string;
  racks: WarehouseLayoutRack[];
}

export interface WarehouseLayout {
  warehouseId: string;
  zones: WarehouseLayoutZone[];
}

export interface ProductField {
  key:
    | "name"
    | "category"
    | "color"
    | "minimumStock"
    | "warehouseId"
    | "zoneId"
    | "rackId"
    | "containerId"
    | "quantity";
  label: string;
  type: "text" | "number" | "select" | "color";
  required?: boolean;
}

export interface InventoryRecord {
  id: string;
  product: Product;
  tag: NFCTag;
  warehouse: Warehouse;
  zoneName: string;
  rackLabel: string;
  containerLabel: string;
  status: ItemStatus;
  recentMovements: InventoryMovement[];
}

export interface InventoryFilters {
  query: string;
  warehouseId: string;
  zoneId: string;
  category: string;
  status: string;
  dateRange: string;
}

export interface InventoryMetrics {
  totalUnits: number;
  lowStockCount: number;
  criticalCount: number;
  warehouses: number;
  movementsToday: number;
}

export interface VoiceAssistantResponse {
  transcript: string;
  answer: string;
  state: AssistantState;
  highlightedProductIds: string[];
  highlightedWarehouseIds: string[];
  highlightedTagIds: string[];
  options?: Array<{
    label: string;
    query: string;
  }>;
}

export interface NfcSimulationDraft {
  tagId: string;
  productId: string;
  quantity: number;
  warehouseId: string;
  zoneId: string;
  rackId: string;
  containerId: string;
  color: string;
  name: string;
  category: string;
  minimumStock: number;
}
