"use client";

import { useMemo } from "react";
import { formatDate } from "@/lib/date";
import { getLocationSummary, getMovementTypeLabel } from "@/lib/inventory-utils";
import type {
  InventoryMetrics,
  InventoryMovement,
  InventoryRecord,
  Warehouse,
} from "@/types/inventory";

interface OverviewProps {
  records: InventoryRecord[];
  warehouses: Warehouse[];
  movements: InventoryMovement[];
  allMovements: InventoryMovement[];
  recentMovements: InventoryMovement[];
  metrics: InventoryMetrics;
  actionRequired: InventoryRecord[];
  dateRange: string;
  searchQuery: string;
  onDateRangeChange: (value: string) => void;
  onSearch: (value: string) => void;
  onScan: () => void;
  onViewMovements: () => void;
  onViewRestock: () => void;
}

const DATE_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "14d", label: "Last 14 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const RANK_COLORS = ["#1f9d55", "#e20015", "#6b7280"];

export function Overview({
  records,
  warehouses,
  movements,
  allMovements,
  recentMovements,
  metrics,
  actionRequired,
  dateRange,
  searchQuery,
  onDateRangeChange,
  onSearch,
  onScan,
  onViewMovements,
  onViewRestock,
}: OverviewProps) {
  const dateRangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.value === dateRange)?.label ?? "Last 30 days";
  const lowStockTotal = metrics.lowStockCount + metrics.criticalCount;

  const stockFlow = useMemo(() => {
    let stockIn = 0;
    let stockOut = 0;
    movements.forEach((movement) => {
      if (movement.type === "stock-in") stockIn += movement.quantity;
      else if (movement.type === "stock-out") stockOut += movement.quantity;
    });
    return { stockIn, stockOut, net: stockIn - stockOut };
  }, [movements]);

  const inventoryDelta = useMemo(() => {
    const base = metrics.totalUnits - stockFlow.net;
    const pct = base > 0 ? (stockFlow.net / base) * 100 : 0;
    const direction: "up" | "down" | "flat" =
      stockFlow.net === 0 ? "flat" : stockFlow.net > 0 ? "up" : "down";
    return { pct, direction };
  }, [metrics.totalUnits, stockFlow.net]);

  const movementsToday = useMemo(() => {
    const dayCounts = new Map<string, number>();
    allMovements.forEach((movement) => {
      const day = movement.occurredAt.slice(0, 10);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    });
    const days = Array.from(dayCounts.keys()).sort();
    const latest = days[days.length - 1];
    const previous = days[days.length - 2];
    const today = latest ? dayCounts.get(latest) ?? 0 : 0;
    const yesterday = previous ? dayCounts.get(previous) ?? 0 : 0;
    return { today, delta: today - yesterday };
  }, [allMovements]);

  const warehouseBars = useMemo(() => {
    const bars = warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.shortName ?? warehouse.name,
      color: warehouse.color,
      value: records
        .filter((record) => record.warehouse.id === warehouse.id)
        .reduce((sum, record) => sum + record.tag.quantity, 0),
    }));
    const maxUnits = Math.max(...bars.map((bar) => bar.value), 1);
    const scaleMax = Math.max(250, Math.ceil((maxUnits * 1.2) / 250) * 250);
    const ticks = Array.from({ length: scaleMax / 250 + 1 }, (_, index) => index * 250);
    return { bars, scaleMax, ticks };
  }, [records, warehouses]);

  const topMovers = useMemo(() => {
    const volume = new Map<string, number>();
    movements.forEach((movement) => {
      volume.set(movement.productId, (volume.get(movement.productId) ?? 0) + movement.quantity);
    });
    return Array.from(volume.entries())
      .map(([productId, value]) => {
        const record = records.find((candidate) => candidate.product.id === productId);
        return {
          productId,
          value,
          name: record?.product.name ?? productId,
          color: record?.product.color ?? "#6b7280",
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [movements, records]);

  const categoryMix = useMemo(() => {
    const totals = new Map<string, { value: number; color: string }>();
    records.forEach((record) => {
      const existing = totals.get(record.product.category);
      totals.set(record.product.category, {
        value: (existing?.value ?? 0) + record.tag.quantity,
        color: existing?.color ?? record.product.color,
      });
    });
    const total = Array.from(totals.values()).reduce((sum, entry) => sum + entry.value, 0) || 1;
    const segments = Array.from(totals.entries())
      .map(([category, entry]) => ({
        category,
        value: entry.value,
        color: entry.color,
        pct: (entry.value / total) * 100,
      }))
      .sort((a, b) => b.value - a.value);
    let cursor = 0;
    const stops = segments
      .map((segment) => {
        const start = cursor;
        cursor += segment.pct;
        return `${segment.color} ${start}% ${cursor}%`;
      })
      .join(", ");
    return { segments, total, gradient: `conic-gradient(${stops})` };
  }, [records]);

  const restockWatch = actionRequired.slice(0, 4);

  return (
    <div className="overview">
      <header className="overview-topbar">
        <div className="overview-heading">
          <h1>Warehouse overview</h1>
          <p>Live inventory and NFC movement across Mexico</p>
        </div>
        <div className="overview-controls">
          <label className="overview-select">
            <CalendarIcon />
            <select
              value={dateRange}
              onChange={(event) => onDateRangeChange(event.target.value)}
              aria-label="Date range"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronIcon />
          </label>
          <div className="overview-search">
            <SearchIcon />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search products, locations, warehouses..."
            />
          </div>
          <button className="btn primary" type="button" onClick={onScan}>
            <ScanIcon />
            Scan NFC
          </button>
        </div>
      </header>

      <section className="overview-stats">
        <StatCard
          icon={<BoxIcon />}
          tone="blue"
          label="Total inventory"
          value={metrics.totalUnits.toLocaleString()}
          unit="units"
          delta={
            inventoryDelta.direction === "flat"
              ? { text: "No change", direction: "flat" }
              : {
                  text: `${Math.abs(inventoryDelta.pct).toFixed(1)}% vs prior ${dateRangeLabel.toLowerCase()}`,
                  direction: inventoryDelta.direction,
                }
          }
        />
        <StatCard
          icon={<BuildingIcon />}
          tone="slate"
          label="Warehouses"
          value={metrics.warehouses.toString()}
          delta={{ text: "No change", direction: "flat" }}
        />
        <StatCard
          icon={<AlertIcon />}
          tone="amber"
          label="Low stock"
          value={lowStockTotal.toString()}
          delta={{
            text: `${metrics.criticalCount} critical · needs restocking`,
            direction: metrics.criticalCount > 0 ? "down" : "flat",
          }}
        />
        <StatCard
          icon={<ActivityIcon />}
          tone="green"
          label="Movements today"
          value={movementsToday.today.toString()}
          delta={{
            text:
              movementsToday.delta === 0
                ? "Same as yesterday"
                : `${movementsToday.delta > 0 ? "+" : ""}${movementsToday.delta} vs yesterday`,
            direction:
              movementsToday.delta === 0 ? "flat" : movementsToday.delta > 0 ? "up" : "down",
          }}
        />
      </section>

      <div className="overview-grid">
        <section className="content-card overview-card">
          <div className="section-header compact">
            <div>
              <h2>Inventory by warehouse</h2>
              <p>
                {metrics.totalUnits.toLocaleString()} units across {warehouseBars.bars.length} warehouses
              </p>
            </div>
          </div>
          <div className="warehouse-bar-list">
            {warehouseBars.bars.map((bar) => (
              <div className="warehouse-bar-row" key={bar.id}>
                <div className="warehouse-bar-label">
                  <span className="warehouse-bar-dot" style={{ background: bar.color }} />
                  <span>{bar.name}</span>
                </div>
                <div className="warehouse-bar-track">
                  <div
                    className="warehouse-bar-fill"
                    style={{
                      width: `${(bar.value / warehouseBars.scaleMax) * 100}%`,
                      background: bar.color,
                    }}
                  />
                </div>
                <strong className="warehouse-bar-value">{bar.value}</strong>
              </div>
            ))}
          </div>
          <div className="warehouse-bar-axis">
            {warehouseBars.ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
        </section>

        <section className="content-card overview-card">
          <div className="section-header compact">
            <div>
              <h2>Stock flow</h2>
              <p>{dateRangeLabel}</p>
            </div>
          </div>
          <div className="stock-flow">
            <div className="stock-flow-row">
              <div className="stock-flow-label">
                <span className="flow-dot in" />
                <span>Stock in</span>
              </div>
              <div className="stock-flow-track">
                <div
                  className="stock-flow-fill in"
                  style={{
                    width: `${(stockFlow.stockIn / Math.max(stockFlow.stockIn, stockFlow.stockOut, 1)) * 100}%`,
                  }}
                />
              </div>
              <strong>{stockFlow.stockIn} units</strong>
            </div>
            <div className="stock-flow-row">
              <div className="stock-flow-label">
                <span className="flow-dot out" />
                <span>Stock out</span>
              </div>
              <div className="stock-flow-track">
                <div
                  className="stock-flow-fill out"
                  style={{
                    width: `${(stockFlow.stockOut / Math.max(stockFlow.stockIn, stockFlow.stockOut, 1)) * 100}%`,
                  }}
                />
              </div>
              <strong>{stockFlow.stockOut} units</strong>
            </div>
          </div>
          <div className="stock-flow-net">
            <span>Net movement</span>
            <strong className={stockFlow.net >= 0 ? "positive" : "negative"}>
              {stockFlow.net > 0 ? "+" : ""}
              {stockFlow.net} units
            </strong>
          </div>
          <div className={`stock-flow-banner ${stockFlow.net >= 0 ? "ok" : "warn"}`}>
            <WarningIcon />
            <span>
              {stockFlow.net >= 0
                ? `Stock in exceeds stock out by ${stockFlow.net} units.`
                : `Stock out exceeds stock in by ${Math.abs(stockFlow.net)} units.`}
            </span>
          </div>
        </section>
      </div>

      <div className="overview-grid">
        <section className="content-card overview-card">
          <div className="section-header">
            <div>
              <h2>Recent NFC movements</h2>
              <p>Latest scans across all warehouses</p>
            </div>
            <button className="btn ghost small" type="button" onClick={onViewMovements}>
              View all
            </button>
          </div>
          <div className="overview-table">
            <div className="overview-table-head">
              <span>Product</span>
              <span>Warehouse</span>
              <span>Location</span>
              <span>Movement</span>
              <span className="align-right">Qty</span>
              <span className="align-right">Date</span>
            </div>
            {recentMovements.slice(0, 5).map((movement) => {
              const record = records.find((candidate) => candidate.tag.id === movement.tagId);
              if (!record) return null;
              return (
                <div className="overview-table-row" key={movement.id}>
                  <span className="cell-product">
                    <span className="cell-swatch" style={{ background: record.product.color }} />
                    {record.product.name}
                  </span>
                  <span>{record.warehouse.shortName}</span>
                  <span className="cell-muted">
                    {record.rackLabel} / {record.containerLabel}
                  </span>
                  <span>
                    <span className={`flow-badge ${movement.type}`}>
                      {getMovementTypeLabel(movement.type)}
                    </span>
                  </span>
                  <strong className="align-right">{movement.quantity}</strong>
                  <span className="align-right cell-muted">
                    {formatDate(movement.occurredAt.slice(0, 10))}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="content-card overview-card">
          <div className="section-header">
            <div>
              <h2>Restock watch</h2>
              <p>Products below minimum stock</p>
            </div>
            <button className="btn ghost small" type="button" onClick={onViewRestock}>
              View all
            </button>
          </div>
          <div className="restock-watch-list">
            {restockWatch.map((record) => (
              <div className="restock-watch-row" key={record.id}>
                <span className="restock-watch-swatch" style={{ background: record.product.color }} />
                <div className="restock-watch-main">
                  <strong>{record.product.name}</strong>
                  <span>{getLocationSummary(record)}</span>
                </div>
                <div className="restock-watch-side">
                  <strong>{record.tag.quantity} units</strong>
                  <span className={`stock-pill ${record.status}`}>
                    {record.status === "critical" ? "Critical" : "Low"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="overview-grid">
        <section className="content-card overview-card">
          <div className="section-header compact">
            <div>
              <h2>Top movers</h2>
              <p>By movement volume · {dateRangeLabel.toLowerCase()}</p>
            </div>
          </div>
          <div className="top-mover-list">
            {topMovers.map((mover, index) => (
              <div className="top-mover-row" key={mover.productId}>
                <span
                  className="top-mover-rank"
                  style={{ background: RANK_COLORS[index] ?? "#6b7280" }}
                >
                  {index + 1}
                </span>
                <div className="top-mover-main">
                  <span className="cell-swatch" style={{ background: mover.color }} />
                  <strong>{mover.name}</strong>
                </div>
                <strong className="top-mover-value" style={{ color: RANK_COLORS[index] ?? "#17191d" }}>
                  {mover.value}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className="content-card overview-card">
          <div className="section-header compact">
            <div>
              <h2>Category mix</h2>
              <p>By inventory share</p>
            </div>
          </div>
          <div className="category-mix">
            <div className="category-donut" style={{ background: categoryMix.gradient }}>
              <div className="category-donut-hole">
                <strong>{categoryMix.total.toLocaleString()}</strong>
                <span>units</span>
              </div>
            </div>
            <ul className="category-legend">
              {categoryMix.segments.map((segment) => (
                <li key={segment.category}>
                  <span className="legend-dot" style={{ background: segment.color }} />
                  <span className="legend-label">{segment.category}</span>
                  <strong>{segment.value}</strong>
                  <span className="legend-pct">{segment.pct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  unit,
  delta,
}: {
  icon: React.ReactNode;
  tone: "blue" | "slate" | "amber" | "green";
  label: string;
  value: string;
  unit?: string;
  delta: { text: string; direction: "up" | "down" | "flat" };
}) {
  return (
    <article className="overview-stat">
      <span className={`overview-stat-icon ${tone}`}>{icon}</span>
      <div className="overview-stat-body">
        <span className="overview-stat-label">{label}</span>
        <div className="overview-stat-value">
          <strong>{value}</strong>
          {unit ? <span>{unit}</span> : null}
        </div>
        <span className={`overview-stat-delta ${delta.direction}`}>
          {delta.direction === "up" ? <TrendUpIcon /> : null}
          {delta.direction === "down" ? <TrendDownIcon /> : null}
          {delta.text}
        </span>
      </div>
    </article>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3l9 16H3l9-16z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2" />
      <path d="M4 12h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3l9 16H3l9-16z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 17l6-6 4 4 6-6M20 9v4M20 9h-4" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7l6 6 4-4 6 6M20 15v-4M20 15h-4" />
    </svg>
  );
}
