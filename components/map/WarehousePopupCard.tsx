import { formatDate } from "@/lib/date";
import { getMovementTypeLabel, getStatusLabel } from "@/lib/inventory-utils";
import type { InventoryMovement, InventoryRecord, WarehouseLocation } from "@/types/inventory";

interface WarehousePopupCardProps {
  location: WarehouseLocation;
  records: InventoryRecord[];
  recentMovements: InventoryMovement[];
  onFilter: () => void;
}

export function WarehousePopupCard({
  location,
  records,
  recentMovements,
  onFilter,
}: WarehousePopupCardProps) {
  const totalInventory = records.reduce((sum, record) => sum + record.tag.quantity, 0);
  const attention = records.filter((record) => record.status !== "healthy");
  const productCount = new Set(records.map((record) => record.product.id)).size;

  return (
    <div className="popup-card">
      <div className="popup-head">
        <strong>{location.label}</strong>
        <span className={`popup-status ${location.status}`}>{location.status}</span>
      </div>
      <div className="popup-metrics">
        <div>
          <span>Tagged</span>
          <strong>{records.length}</strong>
        </div>
        <div>
          <span>Units</span>
          <strong>{totalInventory.toLocaleString("en-US")}</strong>
        </div>
        <div>
          <span>Products</span>
          <strong>{productCount}</strong>
        </div>
      </div>
      <div className="popup-section">
        <span className="popup-label">Available products</span>
        {records.length === 0 ? (
          <p className="popup-empty">No tagged cases in this warehouse.</p>
        ) : (
          <div className="popup-list">
            {records.slice(0, 4).map((record) => (
              <div className="popup-list-row" key={record.id}>
                <strong>{record.product.name}</strong>
                <span>{record.tag.quantity} units</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="popup-section">
        <span className="popup-label">Recent movements</span>
        {recentMovements.length === 0 ? (
          <p className="popup-empty">No recent movements.</p>
        ) : (
          <div className="popup-list">
            {recentMovements.slice(0, 3).map((movement) => {
              const record = records.find((candidate) => candidate.tag.id === movement.tagId);
              return (
                <div className="popup-list-row" key={movement.id}>
                  <strong>{record?.product.name ?? "Product"}</strong>
                  <span>
                    {getMovementTypeLabel(movement.type)} / {movement.quantity} /{" "}
                    {formatDate(movement.occurredAt.slice(0, 10))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="popup-section">
        <span className="popup-label">Products requiring attention</span>
        {attention.length === 0 ? (
          <p className="popup-empty">No urgent products.</p>
        ) : (
          <div className="popup-list">
            {attention.slice(0, 3).map((record) => (
              <div className="popup-list-row" key={record.id}>
                <strong>{record.product.name}</strong>
                <span>{getStatusLabel(record.status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button className="btn primary small full" type="button" onClick={onFilter}>
        Filter to this warehouse
      </button>
    </div>
  );
}
