import chocolateMexicoWarehouses from "@/data/chocolates/mexico-warehouses.json";
import chocolateMovements from "@/data/chocolates/inventory-movements.json";
import chocolateProductFields from "@/data/chocolates/product-fields.json";
import chocolateProducts from "@/data/chocolates/products.json";
import chocolateTags from "@/data/chocolates/nfc-tags.json";
import chocolateWarehouseLayouts from "@/data/chocolates/warehouse-layouts.json";
import chocolateWarehouses from "@/data/chocolates/warehouses.json";
import toolMexicoWarehouses from "@/data/tools/mexico-warehouses.json";
import toolMovements from "@/data/tools/inventory-movements.json";
import toolProductFields from "@/data/tools/product-fields.json";
import toolProducts from "@/data/tools/products.json";
import toolTags from "@/data/tools/nfc-tags.json";
import toolWarehouseLayouts from "@/data/tools/warehouse-layouts.json";
import toolWarehouses from "@/data/tools/warehouses.json";

export type InventoryDatasetId = "tools" | "chocolates";

export const activeDatasetId: InventoryDatasetId = "chocolates";

export const inventoryDatasets = {
  tools: {
    appName: "TagStock Tools",
    tagline: "NFC-guided product location and stock movement",
    assistantName: "Warehouse Voice Assistant",
    storageKey: "warehouse_nfc_tools_demo_v1",
    ui: {
      nav: {
        inventory: "Inventory",
        movements: "Movements",
        warehouses: "Warehouses",
        map: "Mexico Map",
        action: "Action Required",
      },
      hero: {
        eyebrow: "Smart warehouse demo",
        title: "Scan a tag. Find the product. Move stock in seconds.",
        body:
          "NFC-tagged containers point users to the right warehouse, zone, rack, and bin while recording stock in and stock out movements.",
      },
      assistant: {
        initialAnswer: "Ask for a product by name, warehouse, rack, container, or NFC tag.",
        suggestions: [
          "Where are the screws?",
          "Check stock in Celaya",
          "Show low-stock products",
          "Which warehouse needs attention?",
        ],
      },
      search: {
        label: "Find a product or tag",
        placeholder: "Search by product, warehouse, zone, rack, container, or NFC tag",
      },
      sections: {
        inventoryTitle: "Inventory",
        inventorySubtitle: "Tagged containers grouped by product, location, and current quantity.",
        movementsTitle: "Inventory Movements",
        movementsSubtitle: "Every movement captured from an NFC-tagged container interaction.",
        warehousesTitle: "Warehouses",
        warehousesSubtitle: "Select a warehouse to inspect its internal zones, racks, and containers.",
        mapTitle: "Mexico warehouse map",
        mapSubtitle: "Locate the correct warehouse first, then follow the highlighted rack and container.",
        actionTitle: "Action Required",
        actionSubtitle: "Products that need replenishment stay visible here.",
        actionCardSubtitle: "Tagged containers that are at or below a safe stock level.",
      },
    },
    warehouses: toolWarehouses,
    warehouseLayouts: toolWarehouseLayouts,
    warehouseLocations: toolMexicoWarehouses,
    products: toolProducts,
    productFields: toolProductFields,
    tags: toolTags,
    movements: toolMovements,
  },
  chocolates: {
    appName: "Smart Warehouse",
    tagline: "NFC Warehouses",
    assistantName: "Assistant",
    storageKey: "warehouse_nfc_chocolates_demo_v1",
    ui: {
      nav: {
        inventory: "Inventory",
        movements: "Sales Flow",
        warehouses: "Warehouses",
        map: "Mexico Map",
        action: "Restock",
      },
      hero: {
        eyebrow: "Sweet goods inventory",
        title: "Track chocolate cases from shelf to shipment.",
        body:
          "NFC-tagged cases point teams to the right distribution center, storage zone, rack, and case slot while recording stock in, stock out, and estimated sales.",
      },
      assistant: {
        initialAnswer: "Ask for a chocolate, candy, mint, warehouse, rack, case slot, or NFC tag.",
        suggestions: [
          "Where are the REESE'S cups?",
          "Check KIT KAT stock",
          "Show chocolate cases that need restock",
          "Which candy sold the most?",
        ],
      },
      search: {
        label: "Find chocolate or tag",
        placeholder: "Search by chocolate, brand family, warehouse, rack, case slot, or NFC tag",
      },
      sections: {
        inventoryTitle: "Inventory",
        inventorySubtitle: "Chocolate, candy, and mint cases grouped by brand, location, and quantity.",
        movementsTitle: "Sales Flow",
        movementsSubtitle: "Stock-in and stock-out activity for chocolate, candy, and mint cases.",
        warehousesTitle: "Chocolate Warehouses",
        warehousesSubtitle: "Select a distribution center to inspect sweet goods zones, racks, and case slots.",
        mapTitle: "Mexico chocolate map",
        mapSubtitle: "Locate the right distribution center first, then follow the highlighted rack and case slot.",
        actionTitle: "Restock Watch",
        actionSubtitle: "Sweet goods that need replenishment stay visible here.",
        actionCardSubtitle: "Chocolate and candy cases at or below their safe stock level.",
      },
    },
    warehouses: chocolateWarehouses,
    warehouseLayouts: chocolateWarehouseLayouts,
    warehouseLocations: chocolateMexicoWarehouses,
    products: chocolateProducts,
    productFields: chocolateProductFields,
    tags: chocolateTags,
    movements: chocolateMovements,
  },
} as const;

export const activeInventoryDataset = inventoryDatasets[activeDatasetId];
