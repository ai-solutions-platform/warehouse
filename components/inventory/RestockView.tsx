"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { InventoryFilters, InventoryRecord, Warehouse } from "@/types/inventory";

type Priority = "critical" | "high" | "medium";
type Recommendation = "restock" | "transfer" | "review";

interface RestockRow {
  record: InventoryRecord;
  shortage: number;
  pctOfMinimum: number;
  daysLeft: number;
  recommended: number;
  priority: Priority;
  recommendation: Recommendation;
}

interface RestockViewProps {
  title: string;
  subtitle: string;
  records: InventoryRecord[];
  allRecords: InventoryRecord[];
  warehouses: Warehouse[];
  categories: string[];
  filters: InventoryFilters;
  onFilterChange: <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => void;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
};

const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  restock: "Create restock",
  transfer: "Plan transfer",
  review: "Review",
};

function buildRow(record: InventoryRecord): RestockRow {
  const min = record.product.minimumStock;
  const qty = record.tag.quantity;
  const shortage = Math.max(0, min - qty);
  const pctOfMinimum = Math.round((qty / Math.max(min, 1)) * 100);
  const dailyBurn = Math.max(1, Math.round(min / 4));
  const daysLeft = Math.max(0, Math.round(qty / dailyBurn));
  const recommended = Math.max(shortage, Math.ceil((min * 2 - qty) / 10) * 10);
  const priority: Priority = daysLeft <= 2 ? "critical" : daysLeft <= 5 ? "high" : "medium";
  const recommendation: Recommendation =
    priority === "critical" ? "restock" : priority === "high" ? "transfer" : "review";
  return { record, shortage, pctOfMinimum, daysLeft, recommended, priority, recommendation };
}

export function RestockView({
  title,
  subtitle,
  records,
  allRecords,
  warehouses,
  categories,
  filters,
  onFilterChange,
}: RestockViewProps) {
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [recommendationFilter, setRecommendationFilter] = useState<"all" | Recommendation>("all");

  const rows = useMemo(() => {
    const built = records.map(buildRow);
    built.sort((a, b) => a.daysLeft - b.daysLeft || a.pctOfMinimum - b.pctOfMinimum);
    return built;
  }, [records]);

  const visibleRows = rows.filter(
    (row) =>
      (priorityFilter === "all" || row.priority === priorityFilter) &&
      (recommendationFilter === "all" || row.recommendation === recommendationFilter)
  );

  const productsAtRisk = rows.length;
  const unitsBelowMinimum = rows.reduce((sum, row) => sum + row.shortage, 0);
  const criticalCount = rows.filter((row) => row.priority === "critical").length;
  const warehousesAffected = new Set(rows.map((row) => row.record.warehouse.id)).size;

  const totalNeed = rows.reduce((sum, row) => sum + row.recommended, 0);
  const availableSurplus = allRecords
    .filter((record) => record.status === "healthy")
    .reduce((sum, record) => sum + Math.max(0, record.tag.quantity - record.product.minimumStock), 0);
  const transferUnits = Math.min(availableSurplus, totalNeed);
  const purchaseUnits = Math.max(0, totalNeed - transferUnits);

  const topRow = rows[0] ?? null;
  const consolidation = useMemo(() => {
    const byWarehouse = new Map<string, RestockRow[]>();
    rows.forEach((row) => {
      const list = byWarehouse.get(row.record.warehouse.id) ?? [];
      list.push(row);
      byWarehouse.set(row.record.warehouse.id, list);
    });
    for (const list of byWarehouse.values()) {
      if (list.length >= 2) return list;
    }
    return null;
  }, [rows]);

  const hasActiveFilters =
    filters.query !== "" ||
    filters.warehouseId !== "all" ||
    filters.category !== "all" ||
    priorityFilter !== "all" ||
    recommendationFilter !== "all";

  function clearFilters() {
    onFilterChange("query", "");
    onFilterChange("warehouseId", "all");
    onFilterChange("category", "all");
    setPriorityFilter("all");
    setRecommendationFilter("all");
  }

  const stats = [
    {
      key: "risk",
      label: "Products at risk",
      value: productsAtRisk,
      caption: "Requiring attention",
      icon: <ShieldIcon />,
      tone: "warn" as const,
    },
    {
      key: "units",
      label: "Units below minimum",
      value: unitsBelowMinimum,
      caption: "Across all products",
      icon: <BoxIcon />,
    },
    {
      key: "critical",
      label: "Critical",
      value: criticalCount,
      caption: "0–2 days remaining",
      icon: <AlertTriangleIcon />,
      tone: "warn" as const,
    },
    {
      key: "warehouses",
      label: "Warehouses affected",
      value: warehousesAffected,
      caption: "With low stock items",
      icon: <BuildingIcon />,
    },
  ];

  return (
    <div className="restock-view">
      <div className="inventory-topbar">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="inventory-topbar-actions">
          <label className="search-box">
            <SearchIcon />
            <input
              type="search"
              value={filters.query}
              placeholder="Search product, warehouse or NFC tag"
              onChange={(event) => onFilterChange("query", event.target.value)}
            />
          </label>
          <label className="select-inline">
            <select
              className="select"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as "all" | Priority)}
            >
              <option value="all">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
          </label>
          <button className="btn ghost" type="button">
            <ExportIcon />
            Export
          </button>
          <button className="btn primary" type="button">
            <PlusIcon />
            Create restock
          </button>
        </div>
      </div>

      <div className="inventory-stats">
        {stats.map((stat) => (
          <article className={`inv-stat ${stat.tone === "warn" ? "warn" : ""}`} key={stat.key}>
            <span className="inv-stat-icon">{stat.icon}</span>
            <div>
              <span className="inv-stat-label">{stat.label}</span>
              <strong className="inv-stat-value">{stat.value}</strong>
              <span className="inv-stat-caption">{stat.caption}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="filter-panel restock-filters">
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
          <span>Recommendation</span>
          <select
            className="select"
            value={recommendationFilter}
            onChange={(event) =>
              setRecommendationFilter(event.target.value as "all" | Recommendation)
            }
          >
            <option value="all">All recommendations</option>
            <option value="restock">Create restock</option>
            <option value="transfer">Plan transfer</option>
            <option value="review">Review</option>
          </select>
        </label>
        <div className="filter-tools">
          <button
            className="clear-filters"
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="restock-grid">
        <section className="content-card restock-table-card">
          <div className="section-header">
            <div>
              <h3>Restock priorities</h3>
              <p>Sorted by urgency</p>
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="empty-state">
              <strong>No products need restocking</strong>
              <p>Adjust the filters or check back after the next stock movement.</p>
            </div>
          ) : (
            <div className="restock-table">
              <div className="restock-row restock-head">
                <span>Priority</span>
                <span>Product</span>
                <span>Location</span>
                <span>Stock vs Minimum</span>
                <span>Shortage</span>
                <span>Days left</span>
                <span>Recommended</span>
                <span>Action</span>
              </div>
              {visibleRows.map((row, index) => (
                <div className="restock-row" key={row.record.id}>
                  <div className="restock-priority">
                    <span className={`priority-badge ${row.priority}`}>{index + 1}</span>
                    <span className={`priority-word ${row.priority}`}>
                      {PRIORITY_LABEL[row.priority]}
                    </span>
                  </div>

                  <div className="restock-product">
                    <div
                      className="restock-thumb"
                      style={{ "--product-color": row.record.product.color } as CSSProperties}
                    >
                      {row.record.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.record.product.image} alt={row.record.product.name} />
                      ) : (
                        <span>{row.record.product.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <strong>{row.record.product.name}</strong>
                      <span className="restock-tag">NFC {row.record.tag.id}</span>
                    </div>
                  </div>

                  <div className="restock-location">
                    <strong>
                      {row.record.warehouse.shortName} &middot; {row.record.zoneName}
                    </strong>
                    <span>
                      {row.record.rackLabel} &middot; {row.record.containerLabel}
                    </span>
                  </div>

                  <div className="restock-stock">
                    <span className="restock-stock-value">
                      <strong>{row.record.tag.quantity}</strong> / {row.record.product.minimumStock}
                    </span>
                    <div className="restock-bar">
                      <div
                        className={`restock-bar-fill ${row.priority}`}
                        style={{ width: `${Math.min(100, row.pctOfMinimum)}%` }}
                      />
                    </div>
                    <span className="restock-stock-caption">{row.pctOfMinimum}% of minimum</span>
                  </div>

                  <div className="restock-metric shortage">
                    <strong>{row.shortage}</strong>
                    <span>units</span>
                  </div>

                  <div className="restock-metric">
                    <strong>{row.daysLeft}</strong>
                    <span>days</span>
                  </div>

                  <div className="restock-metric">
                    <strong>{row.recommended}</strong>
                    <span>units</span>
                  </div>

                  <div className="restock-action">
                    <button
                      className={`btn ${row.recommendation === "restock" ? "primary" : "ghost"} small`}
                      type="button"
                    >
                      {RECOMMENDATION_LABEL[row.recommendation]}
                    </button>
                    <button className="icon-btn" type="button" aria-label="More options">
                      <DotsIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="inventory-pagination">
            <span className="pagination-summary">
              Showing {visibleRows.length} of {rows.length} products
            </span>
            <div className="pagination-controls">
              <button className="page-btn" type="button" disabled aria-label="First page">
                &laquo;
              </button>
              <button className="page-btn" type="button" disabled aria-label="Previous page">
                &lsaquo;
              </button>
              <button className="page-btn active" type="button">
                1
              </button>
              <button className="page-btn" type="button" disabled aria-label="Next page">
                &rsaquo;
              </button>
              <button className="page-btn" type="button" disabled aria-label="Last page">
                &raquo;
              </button>
            </div>
          </div>
        </section>

        <aside className="restock-side">
          <section className="content-card smart-plan">
            <div className="smart-plan-head">
              <span className="smart-plan-title">
                <SparkIcon />
                Smart plan
              </span>
              <span className="smart-plan-tag">AI-generated · Review before applying</span>
            </div>
            <strong className="smart-plan-headline">
              Restock {purchaseUnits} units and transfer {transferUnits} units
            </strong>
            <p className="smart-plan-sub">Covers projected demand for the next 14 days.</p>
            <div className="smart-plan-stats">
              <div>
                <span className="smart-plan-icon purchase">
                  <CartIcon />
                </span>
                <strong>{purchaseUnits}</strong>
                <span>Purchase units</span>
              </div>
              <div>
                <span className="smart-plan-icon transfer">
                  <TransferIcon />
                </span>
                <strong>{transferUnits}</strong>
                <span>Transfer units</span>
              </div>
              <div>
                <span className="smart-plan-icon">
                  <BuildingIcon />
                </span>
                <strong>{warehousesAffected}</strong>
                <span>Warehouses</span>
              </div>
            </div>
            <button className="btn primary block-btn" type="button">
              Review plan
            </button>
          </section>

          {topRow ? (
            <button className="content-card suggestion-card" type="button">
              <span className="suggestion-icon">
                <TransferIcon />
              </span>
              <div>
                <strong>Transfer before purchasing</strong>
                <p>
                  Transfer {topRow.recommended} {topRow.record.product.name.split(" ")[0]} units from
                  available regional surplus to {topRow.record.warehouse.shortName}.
                </p>
              </div>
              <ChevronIcon />
            </button>
          ) : null}

          {consolidation ? (
            <button className="content-card suggestion-card" type="button">
              <span className="suggestion-icon">
                <TruckIcon />
              </span>
              <div>
                <strong>Consolidate delivery</strong>
                <p>
                  {consolidation[0].record.product.name.split(" ")[0]} and{" "}
                  {consolidation[1].record.product.name.split(" ")[0]} can share the{" "}
                  {consolidation[0].record.warehouse.shortName} shipment.
                </p>
                <span className="suggestion-efficiency">Estimated efficiency: 1 fewer delivery.</span>
              </div>
              <ChevronIcon />
            </button>
          ) : null}

          <section className="content-card priority-legend-card">
            <strong className="priority-legend-title">Priority legend</strong>
            <div className="priority-legend-row">
              <span className="priority-dot critical" />
              <span>Critical</span>
              <span className="priority-range">0–2 days</span>
            </div>
            <div className="priority-legend-row">
              <span className="priority-dot high" />
              <span>High</span>
              <span className="priority-range">3–5 days</span>
            </div>
            <div className="priority-legend-row">
              <span className="priority-dot medium" />
              <span>Medium</span>
              <span className="priority-range">6–10 days</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 15V4m0 0 4 4m-4-4-4 4M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M12 3 5 6v5c0 4.4 3 8.4 7 10 4-1.6 7-5.6 7-10V6l-7-3Z"
      />
      <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1" fill="currentColor" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Zm0 0v18M3 7.5l9 4.5 9-4.5"
      />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M12 4 2.5 20h19L12 4Z"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M4 21V6l7-3v18M11 21h9V10l-9-4"
      />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3l1.8 4.9L18.7 9l-4.9 1.8L12 15.7l-1.8-4.9L5.3 9l4.9-1.8L12 3Zm6 11 .9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9L18 14Z"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4h2l2.2 11h10L20 7H6.5"
      />
      <circle cx="9" cy="19" r="1.4" fill="currentColor" />
      <circle cx="17" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8h13l-3-3m6 11H7l3 3"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M3 6h10v9H3zM13 9h4l3 3v3h-7z"
      />
      <circle cx="7" cy="18" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="18" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="suggestion-chevron">
      <path
        d="m9 6 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
