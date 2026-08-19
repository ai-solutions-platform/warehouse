import { ContainerCard } from "@/components/inventory/ContainerCard";
import type { InventoryFilters, InventoryRecord, Warehouse } from "@/types/inventory";

interface InventorySectionProps {
  title: string;
  subtitle: string;
  records: InventoryRecord[];
  warehouses: Warehouse[];
  categories: string[];
  filters: InventoryFilters;
  highlightedTagIds: string[];
  onFilterChange: <K extends keyof InventoryFilters>(
    key: K,
    value: InventoryFilters[K]
  ) => void;
  onEdit: (record: InventoryRecord) => void;
  onDelete: (tagId: string) => void;
}

export function InventorySection({
  title,
  subtitle,
  records,
  warehouses,
  categories,
  filters,
  highlightedTagIds,
  onFilterChange,
  onEdit,
  onDelete,
}: InventorySectionProps) {
  const availableZones =
    filters.warehouseId === "all"
      ? warehouses.flatMap((warehouse) => warehouse.zones)
      : warehouses.find((warehouse) => warehouse.id === filters.warehouseId)?.zones ?? [];
  const totalUnits = records.reduce((sum, record) => sum + record.tag.quantity, 0);
  const attentionCount = records.filter((record) => record.status !== "healthy").length;
  const warehouseCount = new Set(records.map((record) => record.warehouse.id)).size;

  return (
    <section className="content-section">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="section-count">{records.length} containers</span>
      </div>
      <div className="inventory-summary">
        <div>
          <span>Total units</span>
          <strong>{totalUnits.toLocaleString("en-US")}</strong>
        </div>
        <div>
          <span>Needs attention</span>
          <strong>{attentionCount}</strong>
        </div>
        <div>
          <span>Warehouses shown</span>
          <strong>{warehouseCount}</strong>
        </div>
      </div>
      <div className="filter-panel">
        <label className="field">
          <span>Warehouse</span>
          <select
            className="select"
            value={filters.warehouseId}
            onChange={(event) => onFilterChange("warehouseId", event.target.value)}
          >
            <option value="all">All warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.shortName}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Zone</span>
          <select
            className="select"
            value={filters.zoneId}
            onChange={(event) => onFilterChange("zoneId", event.target.value)}
          >
            <option value="all">All zones</option>
            {availableZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Category</span>
          <select
            className="select"
            value={filters.category}
            onChange={(event) => onFilterChange("category", event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select
            className="select"
            value={filters.status}
            onChange={(event) => onFilterChange("status", event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="healthy">Healthy</option>
            <option value="low">Low stock</option>
            <option value="critical">Critical</option>
          </select>
        </label>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">
          <strong>No matching tagged containers</strong>
          <p>Try another product, warehouse, zone, or status filter.</p>
        </div>
      ) : (
        <div className="inventory-grid">
          {records.map((record) => (
            <ContainerCard
              key={record.id}
              record={record}
              highlighted={highlightedTagIds.includes(record.tag.id)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
