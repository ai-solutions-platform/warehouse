"use client";

import { useEffect, useMemo, useState } from "react";
import { ContainerCard } from "@/components/inventory/ContainerCard";
import type { InventoryFilters, InventoryRecord, Warehouse } from "@/types/inventory";

const PAGE_SIZE = 3;

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const availableZones =
    filters.warehouseId === "all"
      ? warehouses.flatMap((warehouse) => warehouse.zones)
      : warehouses.find((warehouse) => warehouse.id === filters.warehouseId)?.zones ?? [];

  const totalUnits = records.reduce((sum, record) => sum + record.tag.quantity, 0);
  const productCount = new Set(records.map((record) => record.product.id)).size;
  const attentionCount = records.filter((record) => record.status !== "healthy").length;
  const warehouseCount = new Set(records.map((record) => record.warehouse.id)).size;

  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [filters.query, filters.warehouseId, filters.zoneId, filters.category, filters.status]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentPage = Math.min(page, totalPages);
  const pageRecords = useMemo(
    () => records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [records, currentPage]
  );

  const rangeStart = records.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, records.length);

  const hasActiveFilters =
    filters.query !== "" ||
    filters.warehouseId !== "all" ||
    filters.zoneId !== "all" ||
    filters.category !== "all" ||
    filters.status !== "all";

  function clearFilters() {
    onFilterChange("query", "");
    onFilterChange("warehouseId", "all");
    onFilterChange("zoneId", "all");
    onFilterChange("category", "all");
    onFilterChange("status", "all");
  }

  const stats: Array<{
    key: string;
    label: string;
    value: string | number;
    icon: "box" | "tag" | "alert" | "building";
    tone?: "warn";
  }> = [
    { key: "units", label: "Total units", value: totalUnits.toLocaleString("en-US"), icon: "box" },
    { key: "products", label: "Products", value: productCount, icon: "tag" },
    { key: "attention", label: "Needs attention", value: attentionCount, icon: "alert", tone: "warn" },
    { key: "warehouses", label: "Warehouses", value: warehouseCount, icon: "building" },
  ];

  return (
    <section className="content-section inventory-view">
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
              placeholder="Search product, SKU or NFC tag"
              onChange={(event) => onFilterChange("query", event.target.value)}
            />
          </label>
          <button className="btn ghost" type="button">
            <ExportIcon />
            Export
          </button>
          <button className="btn primary" type="button">
            <PlusIcon />
            Add product
          </button>
        </div>
      </div>

      <div className="inventory-stats">
        {stats.map((stat) => (
          <article className={`inv-stat ${stat.tone === "warn" ? "warn" : ""}`} key={stat.key}>
            <span className="inv-stat-icon">
              <StatIcon name={stat.icon} />
            </span>
            <div>
              <span className="inv-stat-label">{stat.label}</span>
              <strong className="inv-stat-value">{stat.value}</strong>
            </div>
          </article>
        ))}
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
        <div className="filter-tools">
          <button
            className="clear-filters"
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear filters
          </button>
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={viewMode === "grid" ? "active" : ""}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
            >
              <GridIcon />
            </button>
            <button
              type="button"
              className={viewMode === "list" ? "active" : ""}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="empty-state">
          <strong>No matching tagged containers</strong>
          <p>Try another product, warehouse, zone, or status filter.</p>
        </div>
      ) : (
        <>
          <div className={`inventory-grid ${viewMode === "list" ? "list-view" : ""}`}>
            {pageRecords.map((record) => (
              <ContainerCard
                key={record.id}
                record={record}
                highlighted={highlightedTagIds.includes(record.tag.id)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>

          <div className="inventory-pagination">
            <span className="pagination-summary">
              Showing {rangeStart}&ndash;{rangeEnd} of {records.length} products
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="page-btn"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                &lsaquo;
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`page-btn ${pageNumber === currentPage ? "active" : ""}`}
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                className="page-btn"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </>
      )}
    </section>
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

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h16v3H4V5Zm0 5.5h16v3H4v-3ZM4 16h16v3H4v-3Z"
      />
    </svg>
  );
}

function StatIcon({ name }: { name: "box" | "tag" | "alert" | "building" }) {
  if (name === "box") {
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
  if (name === "tag") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"
        />
        <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  if (name === "alert") {
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
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M4 21V6l7-3v18M11 21h9V10l-9-4M14.5 10v0M14.5 13.5v0M14.5 17v0"
      />
    </svg>
  );
}
