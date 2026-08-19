import { warehouseLayoutConfig, warehouseLocations } from "@/config/warehouse-config";
import type {
  AssistantState,
  InventoryFilters,
  InventoryMetrics,
  InventoryMovement,
  InventoryRecord,
  ItemStatus,
  NFCTag,
  Product,
  VoiceAssistantResponse,
  Warehouse,
  WarehouseLayout,
} from "@/types/inventory";

export function getTagStatus(product: Product, tag: NFCTag): ItemStatus {
  if (tag.quantity <= 0) return "critical";
  if (tag.quantity <= product.minimumStock) return "low";
  return "healthy";
}

export function getStatusLabel(status: ItemStatus): string {
  return {
    healthy: "Healthy",
    low: "Low stock",
    critical: "Critical",
  }[status];
}

export function createDefaultFilters(): InventoryFilters {
  return {
    query: "",
    warehouseId: "all",
    zoneId: "all",
    category: "all",
    status: "all",
    dateRange: "30d",
  };
}

function getZoneName(warehouse: Warehouse, zoneId: string) {
  return warehouse.zones.find((zone) => zone.id === zoneId)?.name ?? zoneId;
}

function getRackLabel(layout: WarehouseLayout | undefined, rackId: string) {
  for (const zone of layout?.zones ?? []) {
    const rack = zone.racks.find((candidate) => candidate.id === rackId);
    if (rack) return rack.label;
  }
  return rackId;
}

function getContainerLabel(layout: WarehouseLayout | undefined, containerId: string) {
  for (const zone of layout?.zones ?? []) {
    for (const rack of zone.racks) {
      const container = rack.containers.find((candidate) => candidate.id === containerId);
      if (container) return container.label;
    }
  }
  return containerId;
}

export function buildInventoryRecords(params: {
  products: Product[];
  tags: NFCTag[];
  warehouses: Warehouse[];
  movements: InventoryMovement[];
}): InventoryRecord[] {
  const { products, tags, warehouses, movements } = params;

  return tags
    .map((tag) => {
      const product = products.find((candidate) => candidate.id === tag.productId);
      const warehouse = warehouses.find((candidate) => candidate.id === tag.warehouseId);
      if (!product || !warehouse) return null;
      const layout = warehouseLayoutConfig.find(
        (candidate) => candidate.warehouseId === warehouse.id
      );

      return {
        id: tag.id,
        product,
        tag,
        warehouse,
        zoneName: getZoneName(warehouse, tag.zoneId),
        rackLabel: getRackLabel(layout, tag.rackId),
        containerLabel: getContainerLabel(layout, tag.containerId),
        status: getTagStatus(product, tag),
        recentMovements: movements
          .filter((movement) => movement.tagId === tag.id)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
          .slice(0, 5),
      };
    })
    .filter(Boolean) as InventoryRecord[];
}

export function getCategories(products: Product[]) {
  return Array.from(new Set(products.map((product) => product.category))).sort();
}

export function filterInventoryRecords(records: InventoryRecord[], filters: InventoryFilters) {
  const query = filters.query.trim().toLowerCase();

  return records.filter((record) => {
    const matchesQuery =
      !query ||
      [
        record.product.name,
        record.product.category,
        record.tag.id,
        record.warehouse.name,
        record.zoneName,
        record.rackLabel,
        record.containerLabel,
      ].some((value) => value.toLowerCase().includes(query));

    const matchesWarehouse =
      filters.warehouseId === "all" || record.warehouse.id === filters.warehouseId;
    const matchesZone = filters.zoneId === "all" || record.tag.zoneId === filters.zoneId;
    const matchesCategory =
      filters.category === "all" || record.product.category === filters.category;
    const matchesStatus = filters.status === "all" || record.status === filters.status;

    return matchesQuery && matchesWarehouse && matchesZone && matchesCategory && matchesStatus;
  });
}

export function filterMovementsByDateRange(movements: InventoryMovement[], range: string) {
  const days = range === "7d" ? 7 : range === "14d" ? 14 : range === "90d" ? 90 : 30;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return movements.filter(
    (movement) => new Date(movement.occurredAt).getTime() >= threshold.getTime()
  );
}

export function buildMetrics(records: InventoryRecord[], movements: InventoryMovement[]): InventoryMetrics {
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalUnits: records.reduce((sum, record) => sum + record.tag.quantity, 0),
    lowStockCount: records.filter((record) => record.status === "low").length,
    criticalCount: records.filter((record) => record.status === "critical").length,
    warehouses: new Set(records.map((record) => record.warehouse.id)).size,
    movementsToday: movements.filter((movement) => movement.occurredAt.startsWith(today)).length,
  };
}

export function sortActionRequired(records: InventoryRecord[]) {
  return [...records].sort((a, b) => {
    const score = { critical: 0, low: 1, healthy: 2 };
    const statusDiff = score[a.status] - score[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.tag.quantity - b.tag.quantity;
  });
}

export function getLocationSummary(record: InventoryRecord) {
  return `${record.warehouse.shortName} / ${record.zoneName} / ${record.rackLabel} / ${record.containerLabel}`;
}

export function getExactLocationSummary(record: InventoryRecord) {
  return `${record.warehouse.name}, ${record.zoneName}, ${record.rackLabel}, Container ${record.containerLabel}`;
}

export function getMovementTypeLabel(type: InventoryMovement["type"]) {
  return type === "stock-in" ? "Stock In" : "Stock Out";
}

export function getRecentMovements(movements: InventoryMovement[], limit = 8) {
  return [...movements]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
}

export function getWarehouseMarkerColor(records: InventoryRecord[], warehouseId: string) {
  const highlighted = records.find((record) => record.warehouse.id === warehouseId);
  return highlighted?.product.color ?? "#0F62A7";
}

export function getLocationMatches(records: InventoryRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const stopWords = new Set([
    "where",
    "is",
    "are",
    "the",
    "in",
    "check",
    "stock",
    "show",
    "which",
    "warehouse",
    "needs",
    "attention",
    "how",
    "many",
    "there",
    "available",
  ]);

  const tokens = normalized
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !stopWords.has(token));

  return records
    .map((record) => {
      const haystack = [
        record.product.name,
        record.product.category,
        record.tag.id,
        record.warehouse.name,
        record.warehouse.shortName,
        record.zoneName,
        record.rackLabel,
        record.containerLabel,
      ]
        .join(" ")
        .toLowerCase();
      const score = tokens.reduce(
        (sum, token) => sum + (haystack.includes(token) ? 1 : 0),
        0
      );
      return { record, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.record.tag.quantity - a.record.tag.quantity)
    .map((entry) => entry.record);
}

function buildVoiceAnswer(records: InventoryRecord[]) {
  if (records.length === 0) {
    return {
      answer: "Hi, I could not find it with that name. Which product do you need help with?",
      state: "not-found" as AssistantState,
    };
  }

  const best = records[0];
  const allLocations = records
    .slice(0, 3)
    .map(
      (record) =>
        `${record.warehouse.shortName}, ${record.zoneName}, ${record.rackLabel}, ${record.containerLabel}: ${record.tag.quantity} units`
    )
    .join(". ");

  return {
    answer: `${best.product.name} is in the ${best.warehouse.shortName} warehouse, ${best.zoneName}, ${best.rackLabel}, Container ${best.containerLabel}. There are ${best.tag.quantity} units available. ${records.length > 1 ? `Other locations: ${allLocations}.` : ""}`.trim(),
    state: "product-found" as AssistantState,
  };
}

export function buildVoiceAssistantResponse(
  records: InventoryRecord[],
  query: string
): VoiceAssistantResponse {
  const normalized = query.trim().toLowerCase();
  const warehouseOptions = Array.from(
    new Map(
      records.map((record) => [
        record.warehouse.id,
        {
          label: record.warehouse.shortName,
          query: `Show inventory in ${record.warehouse.shortName}`,
        },
      ])
    ).values()
  );

  const mentionsWarehouse = records.some((record) => {
    const warehouseNames = [record.warehouse.name, record.warehouse.shortName].map((value) =>
      value.toLowerCase()
    );
    return warehouseNames.some((name) => normalized.includes(name));
  });

  const asksWarehouseChoice =
    (normalized.includes("almacen") ||
      normalized.includes("almacén") ||
      normalized.includes("warehouse")) &&
    !mentionsWarehouse;

  if (asksWarehouseChoice && normalized.split(/\s+/).length <= 5) {
    return {
      transcript: query,
      answer: "Sure. Which warehouse do you want to review for inventory or location?",
      state: "product-found",
      highlightedProductIds: [],
      highlightedWarehouseIds: [],
      highlightedTagIds: [],
      options: warehouseOptions,
    };
  }

  if (normalized.includes("low stock") || normalized.includes("needs attention")) {
    const action = sortActionRequired(records.filter((record) => record.status !== "healthy")).slice(0, 4);
    if (action.length === 0) {
      return {
        transcript: query,
      answer: "Good news, no products currently require attention.",
        state: "product-found",
        highlightedProductIds: [],
        highlightedWarehouseIds: [],
        highlightedTagIds: [],
        options: [],
      };
    }

    return {
      transcript: query,
      answer: action
        .map(
          (record) =>
            `${record.product.name} is ${getStatusLabel(record.status).toLowerCase()} in ${record.warehouse.shortName}, ${record.zoneName}, ${record.rackLabel}, ${record.containerLabel}. ${record.tag.quantity} units available.`
        )
        .join(" "),
      state: "product-found",
      highlightedProductIds: action.map((record) => record.product.id),
      highlightedWarehouseIds: action.map((record) => record.warehouse.id),
      highlightedTagIds: action.map((record) => record.tag.id),
      options: action.map((record) => ({
        label: record.product.name,
        query: `Where is ${record.product.name}?`,
      })),
    };
  }

  const matches = getLocationMatches(records, query);
  const answer = buildVoiceAnswer(matches);

  return {
    transcript: query,
    answer: answer.answer,
    state: answer.state,
    highlightedProductIds: matches.map((record) => record.product.id),
    highlightedWarehouseIds: matches.map((record) => record.warehouse.id),
    highlightedTagIds: matches.map((record) => record.tag.id),
    options:
      matches.length === 0
        ? warehouseOptions
        : matches.slice(0, 3).map((record) => ({
            label: record.product.name,
            query: `Where is ${record.product.name}?`,
          })),
  };
}

export function getWarehouseLocation(warehouseId: string) {
  return warehouseLocations.find((location) => location.warehouseId === warehouseId);
}
