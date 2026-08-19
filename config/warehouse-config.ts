import { activeInventoryDataset } from "@/config/dataset-config";
import type {
  Product,
  ProductField,
  Warehouse,
  WarehouseLayout,
  WarehouseLocation,
} from "@/types/inventory";

export const boschTheme = {
  red: "#E20015",
  redDark: "#B3121F",
  blue: "#0F62A7",
  ink: "#16181C",
  sidebar: "#2D2F33",
  surface: "#F1F3F5",
  border: "#D3D9DF",
  white: "#FFFFFF",
};

export const appConfig = {
  name: activeInventoryDataset.appName,
  tagline: activeInventoryDataset.tagline,
  assistantName: activeInventoryDataset.assistantName,
};

export const warehouseConfig = activeInventoryDataset.warehouses as Warehouse[];
export const warehouseLocations = activeInventoryDataset.warehouseLocations as WarehouseLocation[];
export const warehouseLayoutConfig = activeInventoryDataset.warehouseLayouts as WarehouseLayout[];
export const productCatalog = activeInventoryDataset.products as Product[];
export const productFieldConfig = activeInventoryDataset.productFields as ProductField[];

export function getWarehouseById(id: string) {
  return warehouseConfig.find((warehouse) => warehouse.id === id);
}

export function getWarehouseLayout(warehouseId: string) {
  return warehouseLayoutConfig.find((layout) => layout.warehouseId === warehouseId);
}
