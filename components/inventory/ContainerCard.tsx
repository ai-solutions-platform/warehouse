"use client";

import { useState, type CSSProperties } from "react";
import type { InventoryRecord } from "@/types/inventory";
import { FreshnessBadge } from "@/components/inventory/FreshnessBadge";

interface ContainerCardProps {
  record: InventoryRecord;
  highlighted: boolean;
  onEdit: (record: InventoryRecord) => void;
  onDelete: (tagId: string) => void;
}

export function ContainerCard({
  record,
  highlighted,
  onEdit,
  onDelete,
}: ContainerCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const fill = Math.min(
    100,
    Math.round((record.tag.quantity / Math.max(record.product.minimumStock * 2, 1)) * 100)
  );
  const initials = record.product.name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <article
      className={`item-card ${highlighted ? "highlighted" : ""}`}
      style={{ "--product-color": record.product.color } as CSSProperties}
    >
      <div className="item-head">
        <div className="item-thumb">
          {record.product.image && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.product.image}
              alt={record.product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="item-thumb-fallback">{initials}</span>
          )}
        </div>

        <div className="item-head-main">
          <div className="item-card-top">
            <FreshnessBadge record={record} />
            <span className="item-category">{record.product.category}</span>
          </div>

          <div className="item-headline">
            <h3 className="item-title">{record.product.name}</h3>
          </div>

          <span className="nfc-chip">
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 3a2 2 0 1 1-2 2 2 2 0 0 1 2-2Zm4.5 11.5A6.9 6.9 0 0 1 12 18a6.9 6.9 0 0 1-4.5-1.5 5 5 0 0 1 9 0Z"
              />
            </svg>
            {record.tag.id}
          </span>
        </div>
      </div>

      <div className="item-details-grid">
        <div className="detail-pair">
          <span className="detail-label">Warehouse</span>
          <strong>{record.warehouse.shortName}</strong>
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
      </div>

      <div className="quantity-row">
        <div className="quantity-value">
          <strong>{record.tag.quantity}</strong>
          <span className="quantity-caption">
            units
            <em>On hand</em>
          </span>
        </div>
        <div className="quantity-value align-end">
          <strong>{record.product.minimumStock}</strong>
          <span className="quantity-caption">Minimum</span>
        </div>
      </div>

      <div className="stock-health">
        <div className="stock-health-head">
          <span className="detail-label">Stock health</span>
          <span className="stock-updated">
            Updated {new Date(record.tag.lastUpdated).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="progress-track">
          <div className={`progress-fill ${record.status}`} style={{ width: `${fill}%` }} />
        </div>
      </div>

      <div className="item-actions">
        <button className="btn ghost small block" type="button" onClick={() => onEdit(record)}>
          View details
        </button>
        <div className="item-menu">
          <button
            className="icon-btn"
            type="button"
            aria-label="More options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="5" r="1.6" fill="currentColor" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              <circle cx="12" cy="19" r="1.6" fill="currentColor" />
            </svg>
          </button>
          {menuOpen ? (
            <div className="item-menu-pop" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(record);
                }}
              >
                Edit product
              </button>
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(record.tag.id);
                }}
              >
                Remove tag
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
