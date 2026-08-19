"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { productCatalog, productFieldConfig, warehouseConfig, warehouseLayoutConfig } from "@/config/warehouse-config";
import type { NfcSimulationDraft, NFCTag, Product, ProductField } from "@/types/inventory";

interface NfcScannerProps {
  tags: NFCTag[];
  onClose: () => void;
  onConfirmMovement: (tagId: string, type: "stock-in" | "stock-out", quantity: number) => void;
  onRegisterUnknownTag: (draft: NfcSimulationDraft) => void;
}

type ScanStep =
  | "waiting"
  | "detected"
  | "identified"
  | "movement"
  | "confirm"
  | "success"
  | "unknown"
  | "error";

function createDraft(tagId: string, warehouseId: string): NfcSimulationDraft {
  const layout = warehouseLayoutConfig.find((candidate) => candidate.warehouseId === warehouseId);
  const zone = warehouseConfig.find((warehouse) => warehouse.id === warehouseId)?.zones[0];
  const rack = layout?.zones[0]?.racks[0];
  const container = rack?.containers[0];
  return {
    tagId,
    productId: "",
    quantity: 0,
    warehouseId,
    zoneId: zone?.id ?? "",
    rackId: rack?.id ?? "",
    containerId: container?.id ?? "",
    color: "#0F62A7",
    name: "",
    category: "",
    minimumStock: 10,
  };
}

export function NfcScanner({
  tags,
  onClose,
  onConfirmMovement,
  onRegisterUnknownTag,
}: NfcScannerProps) {
  const [step, setStep] = useState<ScanStep>("waiting");
  const [selectedTagId, setSelectedTagId] = useState(tags[0]?.id ?? "NFC-DEMO-NEW");
  const [movementType, setMovementType] = useState<"stock-in" | "stock-out">("stock-in");
  const [quantity, setQuantity] = useState(1);
  const [unknownDraft, setUnknownDraft] = useState<NfcSimulationDraft>(() =>
    createDraft("NFC-DEMO-NEW", warehouseConfig[0]?.id ?? "")
  );

  const selectedTag = tags.find((tag) => tag.id === selectedTagId);
  const selectedProduct = productCatalog.find((product) => product.id === selectedTag?.productId);
  const availableProducts = useMemo(() => productCatalog, []);
  const draftLayout = warehouseLayoutConfig.find(
    (candidate) => candidate.warehouseId === unknownDraft.warehouseId
  );

  function simulateScan() {
    setStep("detected");
    window.setTimeout(() => {
      if (selectedTag) {
        setStep("identified");
      } else {
        setStep("unknown");
      }
    }, 900);
  }

  function updateDraft(field: ProductField, value: string) {
    setUnknownDraft((current) => ({
      ...current,
      [field.key]: field.type === "number" ? Number(value) : value,
    }));
  }

  const registrationFields = productFieldConfig.filter((field) =>
    ["name", "category", "color", "minimumStock", "warehouseId", "zoneId", "rackId", "containerId", "quantity"].includes(field.key)
  );

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal nfc-modal">
        <div className="modal-header">
          <div>
            <span className="eyebrow">NFC inventory flow</span>
            <h2>Scan NFC</h2>
          </div>
          <button className="btn ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="nfc-stepper">
            {["Waiting", "Detected", "Movement", "Confirm", "Success"].map((label, index) => (
              <div
                key={label}
                className={`nfc-step ${index <= ["waiting", "detected", "movement", "confirm", "success"].indexOf(step === "identified" ? "movement" : step) ? "active" : ""}`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className={`nfc-stage ${step}`}>
            <div className="nfc-orb">
              <span className="nfc-ring" />
              <span className="nfc-ring second" />
              <span className="nfc-core">NFC</span>
            </div>
            <div className="nfc-copy">
              {step === "waiting" ? <strong>Waiting for NFC tag</strong> : null}
              {step === "detected" ? <strong>NFC tag detected</strong> : null}
              {step === "identified" ? <strong>Product identified</strong> : null}
              {step === "unknown" ? <strong>Unknown NFC tag</strong> : null}
              {step === "confirm" ? <strong>Confirm movement</strong> : null}
              {step === "success" ? <strong>Movement completed</strong> : null}
            </div>
          </div>

          <div className="nfc-demo-picker">
            <label className="field">
              <span>Choose a demo NFC tag</span>
              <select
                className="select"
                value={selectedTagId}
                onChange={(event) => {
                  setSelectedTagId(event.target.value);
                  setUnknownDraft((current) => ({ ...current, tagId: event.target.value }));
                }}
              >
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.id}
                  </option>
                ))}
                <option value="NFC-DEMO-NEW">NFC-DEMO-NEW (unknown tag)</option>
              </select>
            </label>
            <button className="btn primary" type="button" onClick={simulateScan}>
              Simulate scan
            </button>
          </div>

          {selectedTag && step !== "unknown" ? (
            <div className="nfc-detected-card" style={{ "--product-color": selectedProduct?.color ?? "#0F62A7" } as CSSProperties}>
              <div className="detail-pair">
                <span className="detail-label">Detected tag</span>
                <strong>{selectedTag.id}</strong>
              </div>
              <div className="detail-pair">
                <span className="detail-label">Associated product</span>
                <strong>{selectedProduct?.name ?? "Unknown product"}</strong>
              </div>
              <div className="detail-pair">
                <span className="detail-label">Current quantity</span>
                <strong>{selectedTag.quantity}</strong>
              </div>
            </div>
          ) : null}

          {(step === "identified" || step === "movement" || step === "confirm") && selectedTag ? (
            <div className="nfc-movement-panel">
              <div className="toggle-row">
                <button
                  className={`toggle-chip ${movementType === "stock-in" ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setMovementType("stock-in");
                    setStep("movement");
                  }}
                >
                  Stock In
                </button>
                <button
                  className={`toggle-chip ${movementType === "stock-out" ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setMovementType("stock-out");
                    setStep("movement");
                  }}
                >
                  Stock Out
                </button>
              </div>
              <label className="field">
                <span>Quantity</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
                />
              </label>
              <div className="hero-actions between">
                <button className="btn ghost" type="button" onClick={() => setStep("identified")}>
                  Back
                </button>
                <button className="btn primary" type="button" onClick={() => setStep("confirm")}>
                  Confirm movement
                </button>
              </div>
            </div>
          ) : null}

          {step === "confirm" && selectedTag ? (
            <div className="nfc-confirm-card">
              <div className="detail-pair">
                <span className="detail-label">Movement</span>
                <strong>{movementType === "stock-in" ? "Stock In" : "Stock Out"}</strong>
              </div>
              <div className="detail-pair">
                <span className="detail-label">Quantity</span>
                <strong>{quantity}</strong>
              </div>
              <div className="hero-actions between">
                <button className="btn ghost" type="button" onClick={() => setStep("movement")}>
                  Edit
                </button>
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => {
                    onConfirmMovement(selectedTag.id, movementType, quantity);
                    setStep("success");
                  }}
                >
                  Complete movement
                </button>
              </div>
            </div>
          ) : null}

          {step === "unknown" ? (
            <div className="form-grid">
              {registrationFields.map((field) => {
                const zoneOptions =
                  field.key === "zoneId"
                    ? warehouseConfig.find((warehouse) => warehouse.id === unknownDraft.warehouseId)?.zones ?? []
                    : [];
                const rackOptions =
                  field.key === "rackId"
                    ? draftLayout?.zones.find((zone) => zone.id === unknownDraft.zoneId)?.racks ?? []
                    : [];
                const containerOptions =
                  field.key === "containerId"
                    ? rackOptions.find((rack) => rack.id === unknownDraft.rackId)?.containers ?? []
                    : [];

                return (
                  <label className="field" key={field.key}>
                    <span>{field.label}</span>
                    {field.type === "select" ? (
                      <select
                        className="select"
                        value={String(unknownDraft[field.key])}
                        onChange={(event) => updateDraft(field, event.target.value)}
                      >
                        {field.key === "warehouseId"
                          ? warehouseConfig.map((warehouse) => (
                              <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </option>
                            ))
                          : field.key === "zoneId"
                          ? zoneOptions.map((zone) => (
                              <option key={zone.id} value={zone.id}>
                                {zone.name}
                              </option>
                            ))
                          : field.key === "rackId"
                          ? rackOptions.map((rack) => (
                              <option key={rack.id} value={rack.id}>
                                {rack.label}
                              </option>
                            ))
                          : containerOptions.map((container) => (
                              <option key={container.id} value={container.id}>
                                {container.label}
                              </option>
                            ))}
                      </select>
                    ) : field.type === "color" ? (
                      <input
                        className="input color-input"
                        type="color"
                        value={String(unknownDraft[field.key])}
                        onChange={(event) => updateDraft(field, event.target.value)}
                      />
                    ) : (
                      <input
                        className="input"
                        type={field.type === "number" ? "number" : "text"}
                        value={String(unknownDraft[field.key] ?? "")}
                        onChange={(event) => updateDraft(field, event.target.value)}
                      />
                    )}
                  </label>
                );
              })}
              <div className="hero-actions between form-actions-full">
                <button className="btn ghost" type="button" onClick={() => setStep("waiting")}>
                  Cancel
                </button>
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => {
                    onRegisterUnknownTag(unknownDraft);
                    setStep("success");
                  }}
                >
                  Register tag and stock in
                </button>
              </div>
            </div>
          ) : null}

          {step === "success" ? (
            <div className="nfc-success-card">
              <strong>Inventory updated successfully</strong>
              <p>The NFC movement was recorded and the highlighted location has been refreshed.</p>
              <button className="btn primary" type="button" onClick={onClose}>
                Done
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
