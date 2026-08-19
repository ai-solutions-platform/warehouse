import type { InventoryRecord } from "@/types/inventory";
import { getStatusLabel } from "@/lib/inventory-utils";

export function FreshnessBadge({ record }: { record: InventoryRecord }) {
  return (
    <span className={`status-badge ${record.status}`}>
      <span className="status-dot" />
      {getStatusLabel(record.status)}
    </span>
  );
}
