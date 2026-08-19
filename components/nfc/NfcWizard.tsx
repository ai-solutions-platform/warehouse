"use client";

import { useMemo, useState } from "react";
import { productFieldConfig, warehouseConfig, warehouseLayoutConfig } from "@/config/warehouse-config";
import type { InventoryRecord, Product, ProductField } from "@/types/inventory";

interface NfcWizardProps {
  record: InventoryRecord;
  onClose: () => void;
  onSave: (product: Product) => void;
}

export function NfcWizard({ record, onClose, onSave }: NfcWizardProps) {
  const [draft, setDraft] = useState<Product>({ ...record.product });
  const layout = useMemo(
    () =>
      warehouseLayoutConfig.find(
        (candidate) => candidate.warehouseId === record.warehouse.id
      ),
    [record.warehouse.id]
  );

  const fields = productFieldConfig.filter((field) =>
    ["name", "category", "color", "minimumStock"].includes(field.key)
  ) as Array<ProductField & { key: "name" | "category" | "color" | "minimumStock" }>;

  function updateField(
    field: ProductField & { key: "name" | "category" | "color" | "minimumStock" },
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      [field.key]: field.type === "number" ? Number(value) : value,
    }));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Edit tagged product</span>
            <h2>{record.product.name}</h2>
          </div>
          <button className="btn ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            {fields.map((field) => (
              <label className="field" key={field.key}>
                <span>{field.label}</span>
                {field.type === "color" ? (
                  <input
                    className="input color-input"
                    type="color"
                    value={String(draft[field.key] ?? "#0F62A7")}
                    onChange={(event) => updateField(field, event.target.value)}
                  />
                ) : (
                  <input
                    className="input"
                    type={field.type === "number" ? "number" : "text"}
                    value={String(draft[field.key] ?? "")}
                    onChange={(event) => updateField(field, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>

          <div className="editor-static-grid">
            <div className="detail-pair">
              <span className="detail-label">Warehouse</span>
              <strong>{warehouseConfig.find((warehouse) => warehouse.id === record.tag.warehouseId)?.name}</strong>
            </div>
            <div className="detail-pair">
              <span className="detail-label">Zone</span>
              <strong>{record.zoneName}</strong>
            </div>
            <div className="detail-pair">
              <span className="detail-label">Rack</span>
              <strong>{record.rackLabel}</strong>
            </div>
            <div className="detail-pair">
              <span className="detail-label">Container</span>
              <strong>{record.containerLabel}</strong>
            </div>
            <div className="detail-pair">
              <span className="detail-label">NFC Tag</span>
              <strong>{record.tag.id}</strong>
            </div>
            <div className="detail-pair">
              <span className="detail-label">Layout source</span>
              <strong>{layout ? "JSON layout active" : "No layout loaded"}</strong>
            </div>
          </div>

          <div className="hero-actions between">
            <button className="btn ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                onSave(draft);
                onClose();
              }}
            >
              Save product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
