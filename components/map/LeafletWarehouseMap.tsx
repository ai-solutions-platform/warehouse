"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { warehouseLocations } from "@/config/warehouse-config";
import { WarehousePopupCard } from "@/components/map/WarehousePopupCard";
import type { InventoryMovement, InventoryRecord } from "@/types/inventory";

interface LeafletWarehouseMapProps {
  records: InventoryRecord[];
  movements?: InventoryMovement[];
  highlightedWarehouseIds: string[];
  highlightedTagIds: string[];
  selectedWarehouseId: string;
  onSelectWarehouse: (warehouseId: string) => void;
  onFilterWarehouse?: (warehouseId: string) => void;
}

function createMarkerIcon(color: string, highlighted: boolean) {
  return L.divIcon({
    className: "warehouse-div-icon",
    html: `<div class="warehouse-pin${highlighted ? " highlighted" : ""}" style="--pin-color:${color}"><span></span></div>`,
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    popupAnchor: [0, -34],
  });
}

function FitMexicoView({ selectedWarehouseId }: { selectedWarehouseId: string }) {
  const map = useMap();
  const previousSelectionRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousSelectionRef.current === selectedWarehouseId) return;
    previousSelectionRef.current = selectedWarehouseId;

    if (selectedWarehouseId === "all") {
      map.flyTo([23.6345, -102.5528], 5, { duration: 0.7 });
      return;
    }
    const selected = warehouseLocations.find((location) => location.warehouseId === selectedWarehouseId);
    if (selected) {
      map.flyTo([selected.coordinates.lat, selected.coordinates.lng], 7, { duration: 0.7 });
    }
  }, [map, selectedWarehouseId]);

  return null;
}

export function LeafletWarehouseMap({
  records,
  movements = [],
  highlightedWarehouseIds,
  highlightedTagIds,
  selectedWarehouseId,
  onSelectWarehouse,
  onFilterWarehouse,
}: LeafletWarehouseMapProps) {
  return (
    <MapContainer
      center={[23.6345, -102.5528]}
      zoom={5}
      minZoom={4}
      maxZoom={12}
      zoomControl={false}
      dragging
      touchZoom
      scrollWheelZoom
      doubleClickZoom
      keyboard
      className="leaflet-map"
    >
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitMexicoView selectedWarehouseId={selectedWarehouseId} />
      {warehouseLocations.map((location) => {
        const warehouseRecords = records.filter((record) => record.warehouse.id === location.warehouseId);
        const warehouseMovements = movements.filter((movement) => movement.warehouseId === location.warehouseId);
        const highlightedRecord = warehouseRecords.find((record) =>
          highlightedTagIds.includes(record.tag.id)
        );
        const markerColor =
          highlightedRecord?.product.color ??
          warehouseRecords[0]?.warehouse.color ??
          "#0F62A7";
        const highlighted =
          highlightedWarehouseIds.includes(location.warehouseId) ||
          selectedWarehouseId === location.warehouseId;

        return (
          <Marker
            key={location.warehouseId}
            position={[location.coordinates.lat, location.coordinates.lng]}
            icon={createMarkerIcon(markerColor, highlighted)}
            eventHandlers={{ click: () => onSelectWarehouse(location.warehouseId) }}
          >
            <Popup closeButton={false} minWidth={300} maxWidth={360} autoPan keepInView>
              <WarehousePopupCard
                location={location}
                records={warehouseRecords}
                recentMovements={warehouseMovements}
                onFilter={() => {
                  onSelectWarehouse(location.warehouseId);
                  onFilterWarehouse?.(location.warehouseId);
                }}
              />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
