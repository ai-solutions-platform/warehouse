"use client";

import { useEffect, useMemo, useState } from "react";
import { activeDatasetId, activeInventoryDataset } from "@/config/dataset-config";
import { warehouseConfig, warehouseLayoutConfig } from "@/config/warehouse-config";
import {
  buildInventoryRecords,
  buildMetrics,
  createDefaultFilters,
  filterInventoryRecords,
  filterMovementsByDateRange,
  getCategories,
  getRecentMovements,
  sortActionRequired,
} from "@/lib/inventory-utils";
import type {
  InventoryFilters,
  InventoryMovement,
  NfcSimulationDraft,
  NFCTag,
  Product,
} from "@/types/inventory";

const LEGACY_STORAGE_KEY = "bosch_warehouse_demo_v3";
const STORAGE_KEY = activeInventoryDataset.storageKey;

interface InventoryState {
  products: Product[];
  tags: NFCTag[];
  movements: InventoryMovement[];
}

function createInitialState(): InventoryState {
  return {
    products: activeInventoryDataset.products as Product[],
    tags: activeInventoryDataset.tags as NFCTag[],
    movements: activeInventoryDataset.movements as InventoryMovement[],
  };
}

function createMovement(params: {
  tagId: string;
  productId: string;
  warehouseId: string;
  zoneId: string;
  rackId: string;
  containerId: string;
  quantity: number;
  type: "stock-in" | "stock-out";
}): InventoryMovement {
  return {
    id: `mv-${crypto.randomUUID()}`,
    occurredAt: new Date().toISOString(),
    ...params,
  };
}

export function useInventory() {
  const [state, setState] = useState<InventoryState>(createInitialState);
  const [filters, setFilters] = useState<InventoryFilters>(createDefaultFilters);
  const [highlightedProductIds, setHighlightedProductIds] = useState<string[]>([]);
  const [highlightedWarehouseIds, setHighlightedWarehouseIds] = useState<string[]>([]);
  const [highlightedTagIds, setHighlightedTagIds] = useState<string[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("all");

  useEffect(() => {
    const saved =
      window.localStorage.getItem(STORAGE_KEY) ??
      (activeDatasetId === "tools" ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null);
    if (!saved) return;
    try {
      setState(JSON.parse(saved) as InventoryState);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const records = useMemo(
    () =>
      buildInventoryRecords({
        products: state.products,
        tags: state.tags,
        warehouses: warehouseConfig,
        movements: state.movements,
      }),
    [state]
  );

  const filteredRecords = useMemo(
    () => filterInventoryRecords(records, filters),
    [filters, records]
  );

  const filteredMovements = useMemo(() => {
    const scoped = filterMovementsByDateRange(state.movements, filters.dateRange);
    return scoped.filter((movement) => {
      if (filters.warehouseId !== "all" && movement.warehouseId !== filters.warehouseId) {
        return false;
      }
      if (filters.zoneId !== "all" && movement.zoneId !== filters.zoneId) return false;
      if (filters.query.trim()) {
        const query = filters.query.trim().toLowerCase();
        const related = records.find((record) => record.tag.id === movement.tagId);
        const haystack = [
          related?.product.name ?? "",
          related?.warehouse.shortName ?? "",
          related?.zoneName ?? "",
          related?.rackLabel ?? "",
          related?.containerLabel ?? "",
          movement.tagId,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [filters, records, state.movements]);

  const metrics = useMemo(() => buildMetrics(records, filteredMovements), [filteredMovements, records]);
  const categories = useMemo(() => getCategories(state.products), [state.products]);
  const recentMovements = useMemo(() => getRecentMovements(filteredMovements), [filteredMovements]);
  const actionRequired = useMemo(
    () => sortActionRequired(records.filter((record) => record.status !== "healthy")),
    [records]
  );

  function setFilter<K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "warehouseId" ? { zoneId: "all" } : {}),
    }));
  }

  function resetFilters() {
    setFilters(createDefaultFilters());
    setSelectedWarehouseId("all");
  }

  function clearHighlights() {
    setHighlightedProductIds([]);
    setHighlightedWarehouseIds([]);
    setHighlightedTagIds([]);
  }

  function highlightSelection(payload: {
    productIds?: string[];
    warehouseIds?: string[];
    tagIds?: string[];
  }) {
    setHighlightedProductIds(payload.productIds ?? []);
    setHighlightedWarehouseIds(payload.warehouseIds ?? []);
    setHighlightedTagIds(payload.tagIds ?? []);
    if (payload.warehouseIds?.[0]) {
      setSelectedWarehouseId(payload.warehouseIds[0]);
    }
    window.setTimeout(clearHighlights, 9000);
  }

  function updateProduct(nextProduct: Product) {
    setState((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === nextProduct.id ? nextProduct : product
      ),
    }));
  }

  function deleteTag(tagId: string) {
    setState((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag.id !== tagId),
    }));
  }

  function adjustTagQuantity(tagId: string, type: "stock-in" | "stock-out", quantity: number) {
    setState((current) => {
      const tag = current.tags.find((candidate) => candidate.id === tagId);
      if (!tag) return current;
      const nextQuantity =
        type === "stock-in"
          ? tag.quantity + quantity
          : Math.max(0, tag.quantity - quantity);
      return {
        ...current,
        tags: current.tags.map((candidate) =>
          candidate.id === tagId
            ? { ...candidate, quantity: nextQuantity, lastUpdated: new Date().toISOString() }
            : candidate
        ),
        movements: [
          createMovement({
            tagId,
            productId: tag.productId,
            warehouseId: tag.warehouseId,
            zoneId: tag.zoneId,
            rackId: tag.rackId,
            containerId: tag.containerId,
            quantity,
            type,
          }),
          ...current.movements,
        ],
      };
    });
  }

  function registerUnknownTag(draft: NfcSimulationDraft) {
    const newProductId = draft.productId || `prod-${crypto.randomUUID()}`;
    const newTag: NFCTag = {
      id: draft.tagId,
      productId: newProductId,
      warehouseId: draft.warehouseId,
      zoneId: draft.zoneId,
      rackId: draft.rackId,
      containerId: draft.containerId,
      quantity: draft.quantity,
      lastUpdated: new Date().toISOString(),
    };

    const newProduct: Product = {
      id: newProductId,
      name: draft.name.trim(),
      category: draft.category.trim(),
      color: draft.color,
      minimumStock: draft.minimumStock,
    };

    setState((current) => ({
      products: current.products.some((product) => product.id === newProductId)
        ? current.products.map((product) =>
            product.id === newProductId ? newProduct : product
          )
        : [newProduct, ...current.products],
      tags: [newTag, ...current.tags],
      movements: [
        createMovement({
          tagId: newTag.id,
          productId: newTag.productId,
          warehouseId: newTag.warehouseId,
          zoneId: newTag.zoneId,
          rackId: newTag.rackId,
          containerId: newTag.containerId,
          quantity: draft.quantity,
          type: "stock-in",
        }),
        ...current.movements,
      ],
    }));

    highlightSelection({
      productIds: [newProduct.id],
      warehouseIds: [newTag.warehouseId],
      tagIds: [newTag.id],
    });
  }

  function resetDemo() {
    setState(createInitialState());
    resetFilters();
    clearHighlights();
  }

  return {
    warehouses: warehouseConfig,
    warehouseLayouts: warehouseLayoutConfig,
    products: state.products,
    tags: state.tags,
    categories,
    records,
    allMovements: state.movements,
    filteredRecords,
    movements: filteredMovements,
    recentMovements,
    metrics,
    actionRequired,
    filters,
    selectedWarehouseId,
    highlightedProductIds,
    highlightedWarehouseIds,
    highlightedTagIds,
    setFilter,
    setSelectedWarehouseId,
    resetFilters,
    updateProduct,
    deleteTag,
    adjustTagQuantity,
    registerUnknownTag,
    resetDemo,
    highlightSelection,
  };
}
