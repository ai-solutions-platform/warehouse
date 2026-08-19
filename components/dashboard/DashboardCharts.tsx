import { getMovementTypeLabel } from "@/lib/inventory-utils";
import type { InventoryMovement, InventoryRecord, Warehouse } from "@/types/inventory";

interface DashboardChartsProps {
  records: InventoryRecord[];
  movements: InventoryMovement[];
  warehouses: Warehouse[];
}

function groupByWarehouse(records: InventoryRecord[], warehouses: Warehouse[]) {
  return warehouses.map((warehouse) => {
    const total = records
      .filter((record) => record.warehouse.id === warehouse.id)
      .reduce((sum, record) => sum + record.tag.quantity, 0);
    return { label: warehouse.shortName, value: total, color: warehouse.color };
  });
}

function groupByCategory(records: InventoryRecord[]) {
  const map = new Map<string, { label: string; value: number; color: string }>();
  records.forEach((record) => {
    const current = map.get(record.product.category);
    if (current) {
      current.value += record.tag.quantity;
    } else {
      map.set(record.product.category, {
        label: record.product.category,
        value: record.tag.quantity,
        color: record.product.color,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

function groupMostMoved(records: InventoryRecord[], movements: InventoryMovement[]) {
  const totals = new Map<string, { label: string; value: number; color: string }>();
  movements.forEach((movement) => {
    const record = records.find((candidate) => candidate.tag.id === movement.tagId);
    if (!record) return;
    const current = totals.get(record.product.id);
    if (current) {
      current.value += movement.quantity;
    } else {
      totals.set(record.product.id, {
        label: record.product.name,
        value: movement.quantity,
        color: record.product.color,
      });
    }
  });
  return Array.from(totals.values()).sort((a, b) => b.value - a.value).slice(0, 5);
}

function groupStockDirection(movements: InventoryMovement[]) {
  const stockIn = movements
    .filter((movement) => movement.type === "stock-in")
    .reduce((sum, movement) => sum + movement.quantity, 0);
  const stockOut = movements
    .filter((movement) => movement.type === "stock-out")
    .reduce((sum, movement) => sum + movement.quantity, 0);
  return [
    { label: getMovementTypeLabel("stock-in"), value: stockIn, color: "#0F62A7" },
    { label: getMovementTypeLabel("stock-out"), value: stockOut, color: "#E20015" },
  ];
}

function groupMovementTimeline(movements: InventoryMovement[]) {
  const dates = new Map<string, number>();
  movements.forEach((movement) => {
    const dateKey = movement.occurredAt.slice(5, 10);
    dates.set(dateKey, (dates.get(dateKey) ?? 0) + movement.quantity);
  });
  return Array.from(dates.entries())
    .map(([label, value]) => ({ label, value, color: "#6B7280" }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-6);
}

function groupLowStock(records: InventoryRecord[]) {
  return records
    .filter((record) => record.status !== "healthy")
    .map((record) => ({
      label: record.product.name,
      value: record.tag.quantity,
      color: record.product.color,
    }))
    .slice(0, 5);
}

function ChartCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; color: string }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <article className="content-card chart-card">
      <div className="section-header compact">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="chart-stack">
        {items.map((item) => (
          <div className="chart-row" key={`${title}-${item.label}`}>
            <div className="chart-label">
              <span className="chart-dot" style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
            <div className="chart-bar-group">
              <div className="chart-bar-track">
                <div
                  className="chart-bar-fill"
                  style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
                />
              </div>
              <strong>{item.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function DashboardCharts({
  records,
  movements,
  warehouses,
}: DashboardChartsProps) {
  return (
    <div className="chart-grid">
      <ChartCard
        title="Current Stock by Warehouse"
        subtitle="Units currently available in each warehouse."
        items={groupByWarehouse(records, warehouses)}
      />
      <ChartCard
        title="Stock In vs Stock Out"
        subtitle="Movement balance across the filtered period."
        items={groupStockDirection(movements)}
      />
      <ChartCard
        title="Most Frequently Moved Products"
        subtitle="Products with the highest movement volume."
        items={groupMostMoved(records, movements)}
      />
      <ChartCard
        title="Low-Stock Products"
        subtitle="Products currently below healthy stock."
        items={groupLowStock(records)}
      />
      <ChartCard
        title="Inventory Movements Over Time"
        subtitle="Recent movement volume by day."
        items={groupMovementTimeline(movements)}
      />
      <ChartCard
        title="Products by Category"
        subtitle="Current stock distribution across categories."
        items={groupByCategory(records)}
      />
    </div>
  );
}
