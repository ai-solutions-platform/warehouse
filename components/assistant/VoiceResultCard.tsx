import type { CSSProperties } from "react";
import type { InventoryRecord } from "@/types/inventory";

export function VoiceResultCard({ record }: { record: InventoryRecord }) {
  return (
    <article
      className="assistant-result-card"
      style={{ "--product-color": record.product.color } as CSSProperties}
    >
      <div className="assistant-result-top">
        <span className="item-color-dot" />
        <strong>{record.product.name}</strong>
      </div>
      <div className="assistant-result-grid">
        <span>{record.warehouse.shortName}</span>
        <span>{record.zoneName}</span>
        <span>Rack {record.rackLabel}</span>
        <span>C{record.containerLabel}</span>
      </div>
      <p>{record.tag.quantity} units available</p>
    </article>
  );
}
