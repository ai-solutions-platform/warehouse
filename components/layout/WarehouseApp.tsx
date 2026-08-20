"use client";

import { useMemo, useState } from "react";
import { VoiceAssistant } from "@/components/assistant/VoiceAssistant";
import { Overview } from "@/components/dashboard/Overview";
import { InventorySection } from "@/components/inventory/InventorySection";
import { RestockView } from "@/components/inventory/RestockView";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar, type ViewId } from "@/components/layout/Sidebar";
import { WarehouseMap } from "@/components/map/WarehouseMap";
import { MovementsView } from "@/components/movements/MovementsView";
import { NfcScanner } from "@/components/nfc/NfcScanner";
import { NfcWizard } from "@/components/nfc/NfcWizard";
import { WarehousesView } from "@/components/warehouse/WarehousesView";
import { activeInventoryDataset } from "@/config/dataset-config";
import { useInventory } from "@/hooks/use-inventory";
import {
  filterInventoryRecords,
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

  function renderDashboard() {
    return (
      <Overview
        records={filteredRecords}
        warehouses={warehouses}
        movements={movements}
        allMovements={allMovements}
        recentMovements={recentMovements}
        metrics={metrics}
        actionRequired={actionRequired}
        dateRange={filters.dateRange}
        searchQuery={filters.query}
        onDateRangeChange={(value) => setFilter("dateRange", value)}
        onSearch={(value) => setFilter("query", value)}
        onScan={openScanner}
        onViewMovements={() => setCurrentView("movements")}
        onViewRestock={() => setCurrentView("action")}
      />
    );
  }

  function renderMovements() {
    return (
      <MovementsView
        title={ui.sections.movementsTitle}
        subtitle="Monitor stock entering and leaving each warehouse."
        movements={allMovements}
        records={records}
        warehouses={warehouses}
        searchQuery={filters.query}
        onSearch={(value) => setFilter("query", value)}
        onScan={openScanner}
        onViewRestock={() => setCurrentView("action")}
      />
    );
  }

  function renderWarehouses() {
    return (
      <WarehousesView
        title={ui.sections.warehousesTitle}
        subtitle={ui.sections.warehousesSubtitle}
        summaries={warehouseSummaries}
        selectedWarehouseId={selectedWarehouseId}
        highlightedTagIds={highlightedTagIds}
        onSelectWarehouse={setSelectedWarehouseId}
        onLocateProduct={() => handleOpenMap()}
        onViewInventory={handleFilterWarehouse}
      />
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
      <RestockView
        title="Restock center"
        subtitle="Prioritize low-stock products and take action before inventory runs out."
        records={filteredActionRequired}
        allRecords={records}
        warehouses={warehouses}
        categories={categories}
        filters={filters}
        onFilterChange={setFilter}
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
