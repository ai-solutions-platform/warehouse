import type { CSSProperties } from "react";
import type { InventoryRecord } from "@/types/inventory";
import { FreshnessBadge } from "@/components/inventory/FreshnessBadge";

interface ContainerCardProps {
  record: InventoryRecord;
  highlighted: boolean;
  onEdit: (record: InventoryRecord) => void;
  onDelete: (tagId: string) => void;
}

export function ContainerCard({
  record,
  highlighted,
  onEdit,
  onDelete,
}: ContainerCardProps) {
  const fill = Math.min(
    100,
    Math.round((record.tag.quantity / Math.max(record.product.minimumStock * 2, 1)) * 100)
  );

  return (
    <article
      className={`item-card ${highlighted ? "highlighted" : ""}`}
      style={{ "--product-color": record.product.color } as CSSProperties}
    >
      <div className="item-card-top">
        <FreshnessBadge record={record} />
        <span className="item-category">{record.product.category}</span>
      </div>
      <div className="item-headline">
        <div className="item-title-group">
          <span className="item-color-dot" />
          <h3 className="item-title">{record.product.name}</h3>
        </div>
        <span className="nfc-chip">{record.tag.id}</span>
      </div>
      <div className="item-details-grid">
        <div className="detail-pair">
          <span className="detail-label">Warehouse</span>
          <strong>{record.warehouse.shortName}</strong>
        </div>
        <div className="detail-pair">
          <span className="detail-label">Zone</span>
          <strong>{record.zoneName}</strong>
        </div>
        <div className="detail-pair">
          <span className="detail-label">Rack</span>
          <strong>{record.rackLabel}</strong>
        </div>
        <div className="detail-pair">
          <span className="detail-label">Container</span>
          <strong>{record.containerLabel}</strong>
        </div>
      </div>
      <div className="quantity-row">
        <div className="quantity-value">
          <strong>{record.tag.quantity}</strong>
          <span>units</span>
        </div>
        <div className="quantity-meta">
          <div className="detail-pair compact">
            <span className="detail-label">Minimum</span>
            <strong>{record.product.minimumStock}</strong>
          </div>
          <div className="detail-pair compact">
            <span className="detail-label">Updated</span>
            <strong>{new Date(record.tag.lastUpdated).toLocaleDateString("en-US")}</strong>
          </div>
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${fill}%` }} />
      </div>
      <div className="item-actions">
        <button className="btn ghost small" type="button" onClick={() => onEdit(record)}>
          Edit product
        </button>
        <button className="btn danger small" type="button" onClick={() => onDelete(record.tag.id)}>
          Remove tag
        </button>
      </div>
    </article>
  );
}
