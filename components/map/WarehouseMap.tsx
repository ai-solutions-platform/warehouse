"use client";

import dynamic from "next/dynamic";
import { activeInventoryDataset } from "@/config/dataset-config";
import { warehouseLocations } from "@/config/warehouse-config";
import { WarehouseDetailPanel } from "@/components/map/WarehouseDetailPanel";
import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import type { InventoryMovement, InventoryRecord } from "@/types/inventory";

const LeafletWarehouseMap = dynamic(
  () => import("@/components/map/LeafletWarehouseMap").then((mod) => mod.LeafletWarehouseMap),
  { ssr: false, loading: () => <div className="map-loading">Loading Mexico map...</div> }
);

interface WarehouseMapProps {
  records: InventoryRecord[];
  movements: InventoryMovement[];
  highlightedWarehouseIds: string[];
  highlightedTagIds: string[];
  selectedWarehouseId: string;
  onSelectWarehouse: (warehouseId: string) => void;
  onFilterWarehouse?: (warehouseId: string) => void;
}

export function WarehouseMap({
  records,
  movements,
  highlightedWarehouseIds,
  highlightedTagIds,
  selectedWarehouseId,
  onSelectWarehouse,
  onFilterWarehouse,
}: WarehouseMapProps) {
  const mapUi = activeInventoryDataset.ui.sections;
  const selectedLocation =
    selectedWarehouseId === "all"
      ? undefined
      : warehouseLocations.find((location) => location.warehouseId === selectedWarehouseId);
  const selectedRecords = selectedLocation
    ? records.filter((record) => record.warehouse.id === selectedLocation.warehouseId)
    : [];
  const selectedMovements = selectedLocation
    ? movements.filter((movement) => movement.warehouseId === selectedLocation.warehouseId)
    : [];

  return (
    <section className="map-view">
      <div className="section-header">
        <div>
          <h2>{mapUi.mapTitle}</h2>
          <p>{mapUi.mapSubtitle}</p>
        </div>
      </div>
      <div className="map-grid">
        <div className="map-frame">
          <LeafletWarehouseMap
            records={records}
            movements={movements}
            highlightedWarehouseIds={highlightedWarehouseIds}
            highlightedTagIds={highlightedTagIds}
            selectedWarehouseId={selectedWarehouseId}
            onSelectWarehouse={onSelectWarehouse}
            onFilterWarehouse={onFilterWarehouse}
          />
        </div>
        <WarehouseDetailPanel
          location={selectedLocation}
          records={selectedRecords}
          movements={selectedMovements}
          onFilterWarehouse={onFilterWarehouse}
        />
      </div>
      {selectedLocation ? (
        <WarehouseLayout
          warehouseId={selectedLocation.warehouseId}
          records={selectedRecords}
          highlightedTagIds={highlightedTagIds}
        />
      ) : null}
    </section>
  );
}
