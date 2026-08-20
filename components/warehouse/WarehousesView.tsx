"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getWarehouseLayout } from "@/config/warehouse-config";
import type { InventoryRecord, ItemStatus, Warehouse } from "@/types/inventory";

interface WarehouseSummary {
  warehouse: Warehouse;
  totalUnits: number;
  products: number;
  needsAttention: number;
  records: InventoryRecord[];
}

interface WarehousesViewProps {
  title: string;
  subtitle: string;
  summaries: WarehouseSummary[];
  selectedWarehouseId: string;
  highlightedTagIds: string[];
  onSelectWarehouse: (warehouseId: string) => void;
  onLocateProduct: () => void;
  onViewInventory: (warehouseId: string) => void;
}

function cellTone(status: ItemStatus | null): "healthy" | "low" | "empty" {
  if (status === null) return "empty";
  return status === "healthy" ? "healthy" : "low";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "just now";
  const seconds = Math.max(1, Math.round(diff / 1000));
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function WarehousesView({
  title,
  subtitle,
  summaries,
  selectedWarehouseId,
  highlightedTagIds,
  onSelectWarehouse,
  onLocateProduct,
  onViewInventory,
}: WarehousesViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const activeWarehouseId =
    selectedWarehouseId !== "all" && summaries.some((s) => s.warehouse.id === selectedWarehouseId)
      ? selectedWarehouseId
      : summaries[0]?.warehouse.id ?? "all";

  const activeSummary = summaries.find((s) => s.warehouse.id === activeWarehouseId) ?? null;
  const layout = getWarehouseLayout(activeWarehouseId);

  const recordByCell = useMemo(() => {
    const map = new Map<string, InventoryRecord>();
    activeSummary?.records.forEach((record) => {
      map.set(`${record.tag.rackId}:${record.tag.containerId}`, record);
    });
    return map;
  }, [activeSummary]);

  useEffect(() => {
    const highlighted = activeSummary?.records.find((record) =>
      highlightedTagIds.includes(record.tag.id)
    );
    const fallback = activeSummary?.records[0];
    const target = highlighted ?? fallback;
    setSelectedCell(target ? `${target.tag.rackId}:${target.tag.containerId}` : null);
  }, [activeWarehouseId, activeSummary, highlightedTagIds]);

  const selectedRecord = selectedCell ? recordByCell.get(selectedCell) ?? null : null;

  const lastScan = useMemo(() => {
    const latest = activeSummary?.records
      .map((record) => record.tag.lastUpdated)
      .sort()
      .at(-1);
    return latest ? relativeTime(latest) : "just now";
  }, [activeSummary]);

  const filteredSummaries = summaries.filter((summary) => {
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return (
      summary.warehouse.name.toLowerCase().includes(needle) ||
      summary.warehouse.city.toLowerCase().includes(needle) ||
      summary.warehouse.zones.some((zone) => zone.name.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="warehouses-view">
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
              value={search}
              placeholder="Search warehouse or zone"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button className="btn primary" type="button" onClick={onLocateProduct}>
            <LocateIcon />
            Locate product
          </button>
        </div>
      </div>

      <div className="warehouse-card-grid">
        {filteredSummaries.map((summary) => {
          const capacity = summary.warehouse.capacity ?? 600;
          const capacityPct = Math.min(100, Math.round((summary.totalUnits / capacity) * 100));
          const isActive = summary.warehouse.id === activeWarehouseId;
          const initials = summary.warehouse.shortName.slice(0, 3).toUpperCase();
          return (
            <article
              className={`wh-card ${isActive ? "selected" : ""}`}
              key={summary.warehouse.id}
              onClick={() => onSelectWarehouse(summary.warehouse.id)}
            >
              <div
                className="wh-photo"
                style={{ "--wh-color": summary.warehouse.color } as CSSProperties}
              >
                {summary.warehouse.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={summary.warehouse.image} alt={summary.warehouse.name} loading="lazy" />
                ) : (
                  <span className="wh-photo-fallback">{initials}</span>
                )}
                {isActive ? (
                  <span className="wh-check" aria-label="Selected">
                    <CheckIcon />
                  </span>
                ) : null}
              </div>

              <div className="wh-card-body">
                <div className="wh-card-head">
                  <div>
                    <div className="wh-title-row">
                      <span className="status-dot online" />
                      <strong>{summary.warehouse.name}</strong>
                    </div>
                    <span className="wh-location">
                      <PinIcon />
                      {summary.warehouse.city}
                    </span>
                  </div>
                  <div className="wh-units">
                    <strong>{summary.totalUnits}</strong>
                    <span>units</span>
                  </div>
                </div>

                <div className="wh-stats">
                  <div className="wh-stat">
                    <span className="wh-stat-icon">
                      <TagIcon />
                    </span>
                    <div>
                      <strong>{summary.products}</strong>
                      <span>Products</span>
                    </div>
                  </div>
                  <div className="wh-stat wh-stat-capacity">
                    <strong>{capacityPct}%</strong>
                    <span>Capacity</span>
                    <div className="wh-capacity-track">
                      <div className="wh-capacity-fill" style={{ width: `${capacityPct}%` }} />
                    </div>
                  </div>
                  <div className="wh-stat">
                    <span className={`wh-stat-icon ${summary.needsAttention > 0 ? "alert" : ""}`}>
                      <BellIcon />
                    </span>
                    <div>
                      <strong>{summary.needsAttention}</strong>
                      <span>{summary.needsAttention === 1 ? "Alert" : "Alerts"}</span>
                    </div>
                  </div>
                </div>

                <button
                  className="wh-view-link"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectWarehouse(summary.warehouse.id);
                  }}
                >
                  View warehouse
                  <ChevronIcon />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {activeSummary && layout ? (
        <div className="warehouse-detail-grid">
          <section className="content-card layout-panel">
            <div className="layout-panel-head">
              <h3>{activeSummary.warehouse.shortName} warehouse layout</h3>
              <span className="live-badge">
                <span className="status-dot online" />
                Live inventory
              </span>
              <span className="last-scan">Last scan {lastScan}</span>
            </div>

            <div className="layout-flow">
              <div className="layout-entry">
                <span>Receiving</span>
              </div>
              {layout.zones.map((zone) =>
                zone.racks.map((rack) => (
                  <div className="layout-column" key={rack.id}>
                    <div className="layout-column-head">
                      <strong>{zone.label}</strong>
                      <span>{rack.label}</span>
                    </div>
                    <div className="layout-cells">
                      {rack.containers.map((container) => {
                        const key = `${rack.id}:${container.id}`;
                        const record = recordByCell.get(key) ?? null;
                        const tone = cellTone(record ? record.status : null);
                        const isSelected = key === selectedCell;
                        return (
                          <button
                            key={container.id}
                            type="button"
                            className={`layout-cell ${tone} ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedCell(key)}
                          >
                            {isSelected && record ? (
                              <span className="cell-nfc">
                                <NfcIcon />
                              </span>
                            ) : null}
                            <span className="cell-label">{container.label}</span>
                            <strong className="cell-qty">{record?.tag.quantity ?? 0}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="layout-legend">
              <span><i className="legend-dot healthy" />Healthy</span>
              <span><i className="legend-dot low" />Low stock</span>
              <span><i className="legend-dot empty" />Empty</span>
              <span><i className="legend-dot selected" />Selected</span>
            </div>
          </section>

          <aside className="content-card selected-location">
            <span className="detail-label">Selected location</span>
            {selectedRecord ? (
              <>
                <div className="sel-head">
                  <div>
                    <span className="sel-category">{selectedRecord.product.category}</span>
                    <strong className="sel-loc">
                      {selectedRecord.rackLabel} &middot; Container {selectedRecord.containerLabel}
                    </strong>
                  </div>
                  <div
                    className="sel-thumb"
                    style={{ "--product-color": selectedRecord.product.color } as CSSProperties}
                  >
                    {selectedRecord.product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedRecord.product.image} alt={selectedRecord.product.name} />
                    ) : (
                      <span>{selectedRecord.product.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <dl className="sel-facts">
                  <div>
                    <dt>NFC tag</dt>
                    <dd>{selectedRecord.tag.id}</dd>
                  </div>
                  <div>
                    <dt>On hand</dt>
                    <dd>{selectedRecord.tag.quantity} units</dd>
                  </div>
                  <div>
                    <dt>Minimum</dt>
                    <dd>{selectedRecord.product.minimumStock} units</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{relativeTime(selectedRecord.tag.lastUpdated)}</dd>
                  </div>
                </dl>

                <div className="sel-actions">
                  <button className="btn primary" type="button">
                    <GuideIcon />
                    Guide me
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => onViewInventory(activeWarehouseId)}
                  >
                    View inventory
                  </button>
                </div>

                {selectedRecord.status === "healthy" ? (
                  <div className="sel-status ok">
                    <CheckCircleIcon />
                    <div>
                      <strong>Stock is healthy</strong>
                      <span>
                        {selectedRecord.tag.quantity - selectedRecord.product.minimumStock} units above
                        minimum.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="sel-status warn">
                    <AlertCircleIcon />
                    <div>
                      <strong>Low stock</strong>
                      <span>
                        {selectedRecord.product.minimumStock - selectedRecord.tag.quantity} units below
                        minimum.
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="sel-empty">
                <strong>Empty slot</strong>
                <p>Select a tagged container to inspect its NFC details and stock health.</p>
              </div>
            )}
          </aside>
        </div>
      ) : null}
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

function LocateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v3m0 14v3m10-10h-3M5 12H2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        d="m5 12 4.5 4.5L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" fill="currentColor" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"
      />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"
      />
      <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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

function NfcIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M5 8a10 10 0 0 1 0 8M9 6.5a15 15 0 0 1 0 11M13 5.5a19 19 0 0 1 0 13"
      />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m8 12 2.8 2.8L16 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}
