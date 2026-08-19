"use client";

import { useMemo, useState } from "react";
import { VoiceAssistant } from "@/components/assistant/VoiceAssistant";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { Hero } from "@/components/dashboard/Hero";
import { Stats } from "@/components/dashboard/Stats";
import { InventorySection } from "@/components/inventory/InventorySection";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar, type ViewId } from "@/components/layout/Sidebar";
import { WarehouseMap } from "@/components/map/WarehouseMap";
import { NfcScanner } from "@/components/nfc/NfcScanner";
import { NfcWizard } from "@/components/nfc/NfcWizard";
import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { activeInventoryDataset } from "@/config/dataset-config";
import { getWarehouseLayout } from "@/config/warehouse-config";
import { useInventory } from "@/hooks/use-inventory";
import { formatDate } from "@/lib/date";
import {
  filterInventoryRecords,
  getMovementTypeLabel,
  getStatusLabel,
  getLocationSummary,
} from "@/lib/inventory-utils";
import type { InventoryRecord, NfcSimulationDraft } from "@/types/inventory";

export function WarehouseApp() {
  const ui = activeInventoryDataset.ui;
  const {
    warehouses,
    tags,
    categories,
    records,
    allMovements,
    filteredRecords,
    movements,
    recentMovements,
    metrics,
    actionRequired,
    filters,
    selectedWarehouseId,
    highlightedWarehouseIds,
    highlightedTagIds,
    setFilter,
    setSelectedWarehouseId,
    resetFilters,
    updateProduct,
    deleteTag,
    adjustTagQuantity,
    registerUnknownTag,
    resetDemo,
    highlightSelection,
  } = useInventory();

  const [currentView, setCurrentView] = useState<ViewId>("dashboard");
  const [editingRecord, setEditingRecord] = useState<InventoryRecord | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const warehouseSummaries = useMemo(
    () =>
      warehouses.map((warehouse) => {
        const warehouseRecords = records.filter((record) => record.warehouse.id === warehouse.id);
        return {
          warehouse,
          totalUnits: warehouseRecords.reduce((sum, record) => sum + record.tag.quantity, 0),
          products: new Set(warehouseRecords.map((record) => record.product.id)).size,
          needsAttention: warehouseRecords.filter((record) => record.status !== "healthy").length,
          records: warehouseRecords,
        };
      }),
    [records, warehouses]
  );

  const selectedWarehouseRecords = useMemo(
    () =>
      selectedWarehouseId === "all"
        ? []
        : records.filter((record) => record.warehouse.id === selectedWarehouseId),
    [records, selectedWarehouseId]
  );
  const filteredActionRequired = useMemo(
    () => filterInventoryRecords(actionRequired, filters),
    [actionRequired, filters]
  );

  function openScanner() {
    setScannerOpen(true);
  }

  function handleOpenMap(warehouseId?: string) {
    if (warehouseId) setSelectedWarehouseId(warehouseId);
    setCurrentView("map");
  }

  function handleFilterWarehouse(warehouseId: string) {
    setSelectedWarehouseId(warehouseId);
    setFilter("warehouseId", warehouseId);
    setCurrentView("inventory");
  }

  function handleRegisterUnknownTag(draft: NfcSimulationDraft) {
    registerUnknownTag(draft);
    setCurrentView("inventory");
  }

  function renderRecentMovementsCard() {
    return (
      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>{ui.sections.movementsTitle}</h2>
            <p>{ui.sections.movementsSubtitle}</p>
          </div>
          <button className="btn ghost small" type="button" onClick={() => setCurrentView("movements")}>
            View all
          </button>
        </div>
        <div className="list-stack">
          {recentMovements.map((movement) => {
            const record = records.find((candidate) => candidate.tag.id === movement.tagId);
            if (!record) return null;
            return (
              <article className="list-row movement-row" key={movement.id}>
                <div className="movement-main">
                  <strong>{record.product.name}</strong>
                  <div className="movement-meta">
                    <div className="detail-pair compact">
                      <span className="detail-label">Warehouse</span>
                      <strong>{record.warehouse.shortName}</strong>
                    </div>
                    <div className="detail-pair compact">
                      <span className="detail-label">Location</span>
                      <strong>{record.zoneName} / {record.rackLabel} / {record.containerLabel}</strong>
                    </div>
                  </div>
                </div>
                <div className="movement-side">
                  <div className="detail-pair compact">
                    <span className="detail-label">Movement</span>
                    <strong>{getMovementTypeLabel(movement.type)}</strong>
                  </div>
                  <div className="detail-pair compact">
                    <span className="detail-label">Quantity</span>
                    <strong>{movement.quantity}</strong>
                  </div>
                  <div className="detail-pair compact">
                    <span className="detail-label">Date</span>
                    <strong>{formatDate(movement.occurredAt.slice(0, 10))}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderActionCard() {
    return (
      <section className="content-card action-card">
        <div className="section-header">
          <div>
            <h2>{ui.sections.actionTitle}</h2>
            <p>{ui.sections.actionCardSubtitle}</p>
          </div>
        </div>
        <div className="list-stack">
          {actionRequired.slice(0, 5).map((record) => (
            <button
              className="list-row button-row"
              key={record.id}
              type="button"
              onClick={() => {
                highlightSelection({
                  productIds: [record.product.id],
                  warehouseIds: [record.warehouse.id],
                  tagIds: [record.tag.id],
                });
                setSelectedWarehouseId(record.warehouse.id);
                setCurrentView("warehouses");
              }}
            >
              <div>
                <strong>{record.product.name}</strong>
                <span>{getLocationSummary(record)}</span>
              </div>
              <div className="list-value">
                <strong>{getStatusLabel(record.status)}</strong>
                <span>{record.tag.quantity} units</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  function renderDashboard() {
    return (
      <div className="page-stack">
        <Hero
          totalUnits={metrics.totalUnits}
          lowStockCount={metrics.lowStockCount + metrics.criticalCount}
          movementsToday={metrics.movementsToday}
          onScan={openScanner}
        />
        <Stats metrics={metrics} />
        <DashboardCharts records={filteredRecords} movements={movements} warehouses={warehouses} />
        <div className="split-grid">
          {renderRecentMovementsCard()}
          {renderActionCard()}
        </div>
      </div>
    );
  }

  function renderMovements() {
    return (
      <section className="content-section">
        <div className="section-header">
          <div>
            <h2>{ui.sections.movementsTitle}</h2>
            <p>{ui.sections.movementsSubtitle}</p>
          </div>
        </div>
        <div className="list-stack large">
          {movements.map((movement) => {
            const record = records.find((candidate) => candidate.tag.id === movement.tagId);
            if (!record) return null;
            return (
              <article className="list-row movement-row" key={movement.id}>
                <div className="movement-main">
                  <strong>{record.product.name}</strong>
                  <div className="movement-meta">
                    <div className="detail-pair compact">
                      <span className="detail-label">Tag</span>
                      <strong>{movement.tagId}</strong>
                    </div>
                    <div className="detail-pair compact">
                      <span className="detail-label">Location</span>
                      <strong>{record.zoneName} / {record.rackLabel} / {record.containerLabel}</strong>
                    </div>
                  </div>
                </div>
                <div className="movement-side">
                  <div className="detail-pair compact">
                    <span className="detail-label">Movement</span>
                    <strong>{getMovementTypeLabel(movement.type)}</strong>
                  </div>
                  <div className="detail-pair compact">
                    <span className="detail-label">Quantity</span>
                    <strong>{movement.quantity}</strong>
                  </div>
                  <div className="detail-pair compact">
                    <span className="detail-label">Timestamp</span>
                    <strong>{new Date(movement.occurredAt).toLocaleString("en-US")}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderWarehouses() {
    const layoutAvailable = getWarehouseLayout(selectedWarehouseId);

    return (
      <div className="page-stack">
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2>{ui.sections.warehousesTitle}</h2>
              <p>{ui.sections.warehousesSubtitle}</p>
            </div>
          </div>
          <div className="warehouse-grid">
            {warehouseSummaries.map((summary) => (
              <article className="warehouse-card" key={summary.warehouse.id}>
                <div className="warehouse-card-top">
                  <strong>{summary.warehouse.name}</strong>
                  <span>{summary.totalUnits} units</span>
                </div>
                <div className="detail-pair compact">
                  <span className="detail-label">Products</span>
                  <strong>{summary.products}</strong>
                </div>
                <div className="detail-pair compact">
                  <span className="detail-label">Needs attention</span>
                  <strong>{summary.needsAttention}</strong>
                </div>
                <div className="hero-actions">
                  <button
                    className="btn primary small"
                    type="button"
                    onClick={() => setSelectedWarehouseId(summary.warehouse.id)}
                  >
                    Open layout
                  </button>
                  <button
                    className="btn ghost small"
                    type="button"
                    onClick={() => handleOpenMap(summary.warehouse.id)}
                  >
                    Open map
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        {selectedWarehouseId !== "all" && layoutAvailable ? (
          <WarehouseLayout
            warehouseId={selectedWarehouseId}
            records={selectedWarehouseRecords}
            highlightedTagIds={highlightedTagIds}
          />
        ) : null}
      </div>
    );
  }

  function renderCurrentView() {
    if (currentView === "dashboard") return renderDashboard();
    if (currentView === "inventory") {
      return (
        <InventorySection
          title={ui.sections.inventoryTitle}
          subtitle={ui.sections.inventorySubtitle}
          records={filteredRecords}
          warehouses={warehouses}
          categories={categories}
          filters={filters}
          highlightedTagIds={highlightedTagIds}
          onFilterChange={setFilter}
          onEdit={setEditingRecord}
          onDelete={deleteTag}
        />
      );
    }
    if (currentView === "movements") return renderMovements();
    if (currentView === "warehouses") return renderWarehouses();
    if (currentView === "map") {
      return (
        <WarehouseMap
          records={records}
          movements={allMovements}
          highlightedWarehouseIds={highlightedWarehouseIds}
          highlightedTagIds={highlightedTagIds}
          selectedWarehouseId={selectedWarehouseId}
          onSelectWarehouse={setSelectedWarehouseId}
          onFilterWarehouse={handleFilterWarehouse}
        />
      );
    }
    return (
      <InventorySection
        title={ui.sections.actionTitle}
        subtitle={ui.sections.actionSubtitle}
        records={filteredActionRequired}
        warehouses={warehouses}
        categories={categories}
        filters={filters}
        highlightedTagIds={highlightedTagIds}
        onFilterChange={setFilter}
        onEdit={setEditingRecord}
        onDelete={deleteTag}
      />
    );
  }

  return (
    <>
      <AppHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
      />
      <div className="app-shell">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {sidebarOpen ? (
          <button
            className="sidebar-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <main className="main-content">
          <div className="top-bar">
            <label className="search-box">
              <span>{ui.search.label}</span>
              <input
                value={filters.query}
                onChange={(event) => setFilter("query", event.target.value)}
                placeholder={ui.search.placeholder}
              />
            </label>
            <div className="top-bar-actions">
              <button className="btn ghost" type="button" onClick={resetFilters}>
                Clear filters
              </button>
              <button className="btn ghost" type="button" onClick={resetDemo}>
                Reset demo
              </button>
              <button className="btn primary" type="button" onClick={openScanner}>
                Scan NFC
              </button>
            </div>
          </div>
          {renderCurrentView()}
        </main>
        <MobileNav currentView={currentView} onViewChange={setCurrentView} onAdd={openScanner} />
      </div>
      <VoiceAssistant
        records={records}
        movements={movements}
        onHighlight={highlightSelection}
        onOpenMap={handleOpenMap}
        onOpenInventory={() => setCurrentView("inventory")}
      />
      {scannerOpen ? (
        <NfcScanner
          tags={tags}
          onClose={() => setScannerOpen(false)}
          onConfirmMovement={(tagId, type, quantity) => {
            adjustTagQuantity(tagId, type, quantity);
            const record = records.find((candidate) => candidate.tag.id === tagId);
            if (record) {
              highlightSelection({
                productIds: [record.product.id],
                warehouseIds: [record.warehouse.id],
                tagIds: [record.tag.id],
              });
              setSelectedWarehouseId(record.warehouse.id);
            }
          }}
          onRegisterUnknownTag={handleRegisterUnknownTag}
        />
      ) : null}
      {editingRecord ? (
        <NfcWizard
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={updateProduct}
        />
      ) : null}
    </>
  );
}
