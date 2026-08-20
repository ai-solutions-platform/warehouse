"use client";

import { useMemo, useState } from "react";
import { getMovementTypeLabel } from "@/lib/inventory-utils";
import type {
  InventoryMovement,
  InventoryRecord,
  Warehouse,
} from "@/types/inventory";

interface MovementsViewProps {
  title: string;
  subtitle: string;
  movements: InventoryMovement[];
  records: InventoryRecord[];
  warehouses: Warehouse[];
  searchQuery: string;
  onSearch: (value: string) => void;
  onScan: () => void;
  onViewRestock: () => void;
}

type DirectionTab = "all" | "stock-in" | "stock-out";

const PAGE_SIZE = 6;

export function MovementsView({
  title,
  subtitle,
  movements,
  records,
  warehouses,
  searchQuery,
  onSearch,
  onScan,
  onViewRestock,
}: MovementsViewProps) {
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [tab, setTab] = useState<DirectionTab>("all");
  const [page, setPage] = useState(1);

  const recordByTag = useMemo(() => {
    const map = new Map<string, InventoryRecord>();
    records.forEach((record) => map.set(record.tag.id, record));
    return map;
  }, [records]);

  const scopedMovements = useMemo(
    () =>
      warehouseFilter === "all"
        ? movements
        : movements.filter((movement) => movement.warehouseId === warehouseFilter),
    [movements, warehouseFilter]
  );

  const totals = useMemo(() => {
    let stockIn = 0;
    let stockOut = 0;
    scopedMovements.forEach((movement) => {
      if (movement.type === "stock-in") stockIn += movement.quantity;
      else stockOut += movement.quantity;
    });
    const warehouseCount =
      warehouseFilter === "all"
        ? new Set(movements.map((movement) => movement.warehouseId)).size
        : 1;
    return {
      stockIn,
      stockOut,
      net: stockIn - stockOut,
      transactions: scopedMovements.length,
      warehouseCount,
    };
  }, [scopedMovements, movements, warehouseFilter]);

  const chart = useMemo(() => {
    const days = new Map<string, { in: number; out: number }>();
    scopedMovements.forEach((movement) => {
      const key = movement.occurredAt.slice(0, 10);
      const entry = days.get(key) ?? { in: 0, out: 0 };
      if (movement.type === "stock-in") entry.in += movement.quantity;
      else entry.out += movement.quantity;
      days.set(key, entry);
    });
    const ordered = Array.from(days.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([key, value]) => ({
        key,
        label: new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        in: value.in,
        out: value.out,
      }));
    const maxValue = Math.max(...ordered.map((day) => Math.max(day.in, day.out)), 1);
    const scaleMax = Math.max(20, Math.ceil(maxValue / 20) * 20);
    const ticks = Array.from({ length: scaleMax / 20 + 1 }, (_, index) => index * 20);
    const outboundDays = ordered.filter((day) => day.out > day.in).length;
    return { days: ordered, scaleMax, ticks, outboundDays };
  }, [scopedMovements]);

  const recommendations = useMemo(
    () => buildRecommendations(records, scopedMovements),
    [records, scopedMovements]
  );

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scopedMovements
      .filter((movement) => (tab === "all" ? true : movement.type === tab))
      .filter((movement) => {
        if (!query) return true;
        const record = recordByTag.get(movement.tagId);
        const haystack = [
          record?.product.name ?? "",
          movement.tagId,
          record?.warehouse.shortName ?? "",
          record?.zoneName ?? "",
          record?.rackLabel ?? "",
          record?.containerLabel ?? "",
          movement.operator ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [scopedMovements, tab, searchQuery, recordByTag]);

  const counts = useMemo(
    () => ({
      all: scopedMovements.length,
      "stock-in": scopedMovements.filter((movement) => movement.type === "stock-in").length,
      "stock-out": scopedMovements.filter((movement) => movement.type === "stock-out").length,
    }),
    [scopedMovements]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstRow = filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  function changeTab(next: DirectionTab) {
    setTab(next);
    setPage(1);
  }

  function changeWarehouse(next: string) {
    setWarehouseFilter(next);
    setPage(1);
  }

  return (
    <div className="mv-view">
      <header className="overview-topbar">
        <div className="overview-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="overview-controls">
          <label className="overview-select">
            <CalendarIcon />
            <select defaultValue="7d" aria-label="Date range">
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <ChevronIcon />
          </label>
          <div className="overview-search">
            <SearchIcon />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                onSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search product, location or NFC tag"
            />
          </div>
          <button className="btn ghost" type="button">
            <ExportIcon />
            Export
          </button>
          <button className="btn primary" type="button" onClick={onScan}>
            <ScanIcon />
            Scan NFC
          </button>
        </div>
      </header>

      <section className="overview-stats">
        <FlowStat
          tone="green"
          icon={<DownloadIcon />}
          label="Stock in"
          value={totals.stockIn}
          unit="units"
          caption="inbound this period"
        />
        <FlowStat
          tone="blue"
          icon={<UploadIcon />}
          label="Stock out"
          value={totals.stockOut}
          unit="units"
          caption="outbound this period"
        />
        <FlowStat
          tone="orange"
          icon={<SwapIcon />}
          label="Net movement"
          value={totals.net}
          unit="units"
          caption={totals.net < 0 ? "Outbound exceeds inbound" : "Inbound exceeds outbound"}
          captionTone={totals.net < 0 ? "warn" : "ok"}
          signed
        />
        <FlowStat
          tone="slate"
          icon={<ClipboardIcon />}
          label="Transactions"
          value={totals.transactions}
          caption={`${totals.warehouseCount} warehouse${totals.warehouseCount === 1 ? "" : "s"}`}
        />
      </section>

      <div className="mv-grid">
        <section className="content-card overview-card">
          <div className="section-header">
            <div>
              <h2>Inbound vs outbound</h2>
            </div>
            <div className="mv-legend">
              <span>
                <i className="legend-dot" style={{ background: "#1f9d55" }} /> Stock in
              </span>
              <span>
                <i className="legend-dot" style={{ background: "#0f62a7" }} /> Stock out
              </span>
            </div>
          </div>

          <label className="mv-wh-filter">
            <span>Warehouse filter</span>
            <select value={warehouseFilter} onChange={(event) => changeWarehouse(event.target.value)}>
              <option value="all">All warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.shortName}
                </option>
              ))}
            </select>
          </label>

          <div className="mv-chart">
            <div className="mv-chart-plot">
              <span className="mv-chart-unit">Units</span>
              <div className="mv-chart-body">
                <div className="mv-chart-yaxis">
                  {[...chart.ticks].reverse().map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className="mv-chart-cols">
                  {chart.days.map((day) => (
                    <div className="mv-day-col" key={day.key}>
                      <div className="mv-bar-pair">
                        <div
                          className="mv-bar in"
                          style={{ height: `${(day.in / chart.scaleMax) * 100}%` }}
                        >
                          <span className="mv-bar-val">{day.in}</span>
                        </div>
                        <div
                          className="mv-bar out"
                          style={{ height: `${(day.out / chart.scaleMax) * 100}%` }}
                        >
                          <span className="mv-bar-val">{day.out}</span>
                        </div>
                      </div>
                      <span className="mv-day-label">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mv-chart-totals">
              <div>
                <span>Stock in</span>
                <strong className="in">{totals.stockIn}</strong>
              </div>
              <div>
                <span>Stock out</span>
                <strong className="out">{totals.stockOut}</strong>
              </div>
              <div>
                <span>Net movement</span>
                <strong className={totals.net < 0 ? "net-down" : "net-up"}>
                  {totals.net > 0 ? "+" : ""}
                  {totals.net}
                </strong>
              </div>
            </div>
          </div>

          <div className="mv-chart-note">
            <InfoIcon />
            <span>
              Outbound exceeded inbound on {chart.outboundDays} of {chart.days.length} days.
            </span>
          </div>
        </section>

        <section className="content-card overview-card">
          <div className="section-header compact">
            <div className="mv-reco-title">
              <SparkIcon />
              <h2>Smart recommendations</h2>
            </div>
            <span className="mv-reco-tag">AI-generated · Review before applying</span>
          </div>
          <div className="mv-reco-list">
            {recommendations.map((reco) => (
              <article className={`mv-reco-row ${reco.tone}`} key={reco.id}>
                <span className="mv-reco-icon">
                  {reco.tone === "critical" ? <AlertIcon /> : null}
                  {reco.tone === "warning" ? <WarningIcon /> : null}
                  {reco.tone === "info" ? <InfoIcon /> : null}
                </span>
                <div className="mv-reco-body">
                  <strong>{reco.title}</strong>
                  <p>{reco.description}</p>
                </div>
                <button
                  className="btn ghost small"
                  type="button"
                  onClick={reco.action === "restock" ? onViewRestock : undefined}
                >
                  {reco.actionLabel}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="content-card overview-card">
        <div className="section-header">
          <div className="mv-history-head">
            <h2>Movement history</h2>
            <div className="mv-tabs">
              {(["all", "stock-in", "stock-out"] as DirectionTab[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`mv-tab ${tab === key ? "active" : ""}`}
                  onClick={() => changeTab(key)}
                >
                  {key === "all" ? "All" : getMovementTypeLabel(key)}
                  <span className="mv-tab-count">{counts[key]}</span>
                </button>
              ))}
            </div>
          </div>
          <span className="mv-history-total">{filteredRows.length} movements</span>
        </div>

        <div className="mv-table">
          <div className="mv-table-head">
            <span>Time</span>
            <span>Product</span>
            <span>NFC tag</span>
            <span>Warehouse</span>
            <span>Location</span>
            <span>Direction</span>
            <span className="align-right">Qty</span>
            <span>Operator</span>
            <span>Status</span>
          </div>
          {pageRows.map((movement) => {
            const record = recordByTag.get(movement.tagId);
            const status = movement.status ?? "verified";
            return (
              <div className="mv-table-row" key={movement.id}>
                <span className="cell-muted">{formatTimestamp(movement.occurredAt)}</span>
                <span className="mv-cell-product">
                  <MovementThumb
                    name={record?.product.name ?? movement.productId}
                    image={record?.product.image}
                    color={record?.product.color ?? "#6b7280"}
                  />
                  <span>{record?.product.name ?? movement.productId}</span>
                </span>
                <span className="cell-muted mono">{movement.tagId}</span>
                <span>{record?.warehouse.shortName ?? "—"}</span>
                <span className="cell-muted">
                  {record ? `${record.zoneName} · ${record.rackLabel} · ${record.containerLabel}` : "—"}
                </span>
                <span>
                  <span className={`flow-badge ${movement.type}`}>
                    {getMovementTypeLabel(movement.type)}
                  </span>
                </span>
                <strong className="align-right">{movement.quantity}</strong>
                <span className="cell-muted">{movement.operator ?? "—"}</span>
                <span>
                  <span className={`mv-status ${status}`}>
                    {status === "verified" ? "Verified" : "Review"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="mv-pagination">
          <span>
            Showing {firstRow} to {lastRow} of {filteredRows.length} movements
          </span>
          <div className="mv-pager">
            <button
              type="button"
              className="mv-page-btn"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`mv-page-btn ${pageNumber === currentPage ? "active" : ""}`}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="mv-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

interface Recommendation {
  id: string;
  tone: "critical" | "warning" | "info";
  title: string;
  description: string;
  actionLabel: string;
  action: "restock" | "none";
}

function buildRecommendations(
  records: InventoryRecord[],
  movements: InventoryMovement[]
): Recommendation[] {
  const list: Recommendation[] = [];

  const atRisk = [...records]
    .filter((record) => record.status !== "healthy")
    .sort(
      (a, b) =>
        a.tag.quantity / a.product.minimumStock - b.tag.quantity / b.product.minimumStock
    );
  if (atRisk[0]) {
    const record = atRisk[0];
    const dailyBurn = Math.max(1, Math.round(record.product.minimumStock / 7));
    const daysLeft = Math.max(1, Math.round(record.tag.quantity / dailyBurn));
    list.push({
      id: "reco-restock",
      tone: "critical",
      title: `Replenish ${record.product.name}`,
      description: `Projected to fall below safety stock in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
      actionLabel: "Create restock",
      action: "restock",
    });
  }

  const surplus = [...records]
    .filter((record) => record.status === "healthy")
    .sort(
      (a, b) =>
        b.tag.quantity - b.product.minimumStock - (a.tag.quantity - a.product.minimumStock)
    );
  if (surplus[0]) {
    const source = surplus[0];
    const target = atRisk[0] && atRisk[0].warehouse.id !== source.warehouse.id
      ? atRisk[0].warehouse
      : records.find((record) => record.warehouse.id !== source.warehouse.id)?.warehouse;
    const amount = Math.max(10, Math.round((source.tag.quantity - source.product.minimumStock) / 2 / 10) * 10);
    list.push({
      id: "reco-transfer",
      tone: "warning",
      title: `Transfer ${amount} units to ${target?.shortName ?? "another hub"}`,
      description: `${source.warehouse.shortName} has surplus ${source.product.name} stock.`,
      actionLabel: "Plan transfer",
      action: "none",
    });
  }

  const biggestOut = [...movements]
    .filter((movement) => movement.type === "stock-out")
    .sort((a, b) => b.quantity - a.quantity)[0];
  if (biggestOut) {
    const record = records.find((candidate) => candidate.tag.id === biggestOut.tagId);
    const sameProductOut = movements.filter(
      (movement) => movement.type === "stock-out" && movement.productId === biggestOut.productId
    );
    const average =
      sameProductOut.reduce((sum, movement) => sum + movement.quantity, 0) /
      Math.max(1, sameProductOut.length);
    const pct = Math.max(5, Math.round((biggestOut.quantity / Math.max(1, average) - 1) * 100));
    const time = new Date(biggestOut.occurredAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    list.push({
      id: "reco-review",
      tone: "info",
      title: `Review unusual ${record?.product.name ?? "product"} movement`,
      description: `${biggestOut.quantity} units left ${record?.warehouse.shortName ?? "a warehouse"} at ${time}, ${pct}% above its daily average.`,
      actionLabel: "Review event",
      action: "none",
    });
  }

  return list;
}

function MovementThumb({
  name,
  image,
  color,
}: {
  name: string;
  image?: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
  if (image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="mv-thumb"
        src={image}
        alt={name}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="mv-thumb fallback" style={{ background: color }}>
      {initials}
    </span>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  const datePart = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timePart = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

function FlowStat({
  tone,
  icon,
  label,
  value,
  unit,
  caption,
  captionTone,
  signed,
}: {
  tone: "green" | "blue" | "orange" | "slate";
  icon: React.ReactNode;
  label: string;
  value: number;
  unit?: string;
  caption: string;
  captionTone?: "warn" | "ok";
  signed?: boolean;
}) {
  const display = signed && value > 0 ? `+${value}` : value.toString();
  return (
    <article className="overview-stat">
      <span className={`overview-stat-icon ${tone}`}>{icon}</span>
      <div className="overview-stat-body">
        <span className="overview-stat-label">{label}</span>
        <div className="overview-stat-value">
          <strong>{display}</strong>
          {unit ? <span>{unit}</span> : null}
        </div>
        <span className={`mv-stat-caption ${captionTone ?? ""}`}>{caption}</span>
      </div>
    </article>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6M9 14h6" />
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

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 15V3M8 7l4-4 4 4M5 21h14" />
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

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16h.01" />
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

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3l1.8 4.9L18.7 9l-4.9 1.8L12 15.7 10.2 10.8 5.3 9l4.9-1.1L12 3zM18 15l.9 2.4L21 18l-2.1.6L18 21l-.9-2.4L15 18l2.1-.6L18 15z" />
    </svg>
  );
}
