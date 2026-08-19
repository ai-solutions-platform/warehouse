import { formatDate } from "@/lib/date";
import { getMovementTypeLabel, getStatusLabel } from "@/lib/inventory-utils";
import type { InventoryMovement, InventoryRecord, WarehouseLocation } from "@/types/inventory";

interface WarehouseDetailPanelProps {
  location?: WarehouseLocation;
  records: InventoryRecord[];
  movements: InventoryMovement[];
  onFilterWarehouse?: (warehouseId: string) => void;
}

export function WarehouseDetailPanel({
  location,
  records,
  movements,
  onFilterWarehouse,
}: WarehouseDetailPanelProps) {
  if (!location) {
    return (
      <div className="map-detail-panel">
        <strong>Select a warehouse</strong>
        <p>Pick a warehouse marker to inspect its products, stock, recent movements, and attention items.</p>
      </div>
    );
  }

  const totalInventory = records.reduce((sum, record) => sum + record.tag.quantity, 0);
  const attentionRecords = records.filter((record) => record.status !== "healthy");

  return (
    <div className="map-detail-panel">
      <div className="map-detail-header">
        <div>
          <strong>{location.label}</strong>
          <span>
            {location.city}, {location.state}
          </span>
        </div>
        <span className={`popup-status ${location.status}`}>{location.status}</span>
      </div>
      <div className="detail-stat-grid">
        <article>
          <span>Total inventory</span>
          <strong>{totalInventory.toLocaleString("en-US")}</strong>
        </article>
        <article>
          <span>Products</span>
          <strong>{new Set(records.map((record) => record.product.id)).size}</strong>
        </article>
        <article>
          <span>Recent movements</span>
          <strong>{movements.length}</strong>
        </article>
        <article>
          <span>Action required</span>
          <strong>{attentionRecords.length}</strong>
        </article>
      </div>

      <button
        className="btn primary full"
        type="button"
        onClick={() => onFilterWarehouse?.(location.warehouseId)}
      >
        Open filtered inventory
      </button>

      <div className="detail-block">
        <span className="popup-label">Available products</span>
        {records.slice(0, 6).map((record) => (
          <div className="detail-row" key={record.id}>
            <div>
              <strong>{record.product.name}</strong>
              <span>
                {record.zoneName} / {record.rackLabel} / {record.containerLabel}
              </span>
            </div>
            <span>{record.tag.quantity} units</span>
          </div>
        ))}
      </div>

      <div className="detail-block">
        <span className="popup-label">Recent movements</span>
        {movements.slice(0, 4).map((movement) => {
          const record = records.find((candidate) => candidate.tag.id === movement.tagId);
          return (
            <div className="detail-row" key={movement.id}>
              <div>
                <strong>{record?.product.name ?? "Product"}</strong>
                <span>{getMovementTypeLabel(movement.type)}</span>
              </div>
              <span>{formatDate(movement.occurredAt.slice(0, 10))}</span>
            </div>
          );
        })}
      </div>

      <div className="detail-block">
        <span className="popup-label">Products requiring attention</span>
        {attentionRecords.length === 0 ? (
          <p className="detail-empty">No urgent products in this warehouse.</p>
        ) : (
          attentionRecords.slice(0, 4).map((record) => (
            <div className="detail-row" key={record.id}>
              <div>
                <strong>{record.product.name}</strong>
                <span>
                  {record.zoneName} / {record.rackLabel} / {record.containerLabel}
                </span>
              </div>
              <span>{getStatusLabel(record.status)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
