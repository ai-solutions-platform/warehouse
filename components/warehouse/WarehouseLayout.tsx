import type { CSSProperties } from "react";
import { getWarehouseLayout } from "@/config/warehouse-config";
import type { InventoryRecord } from "@/types/inventory";

interface WarehouseLayoutProps {
  warehouseId: string;
  records: InventoryRecord[];
  highlightedTagIds: string[];
}

export function WarehouseLayout({
  warehouseId,
  records,
  highlightedTagIds,
}: WarehouseLayoutProps) {
  const layout = getWarehouseLayout(warehouseId);

  if (!layout) {
    return (
      <section className="content-card">
        <div className="section-header">
          <div>
            <h2>Warehouse layout</h2>
            <p>No layout data available for this warehouse.</p>
          </div>
        </div>
      </section>
    );
  }

  const emphasized = highlightedTagIds.length > 0;

  return (
    <section className="content-card warehouse-layout-card">
      <div className="section-header">
        <div>
          <h2>Warehouse layout</h2>
          <p>Zones, racks, and containers with location highlighting.</p>
        </div>
      </div>
      <div className="layout-zone-grid">
        {layout.zones.map((zone) => (
          <article className="layout-zone-card" key={zone.id}>
            <div className="layout-zone-header">
              <strong>{zone.label}</strong>
              <span>{zone.racks.length} racks</span>
            </div>
            <div className="layout-rack-grid">
              {zone.racks.map((rack) => {
                const rackRecords = records.filter((record) => record.tag.rackId === rack.id);
                const rackHighlighted = rackRecords.some((record) =>
                  highlightedTagIds.includes(record.tag.id)
                );

                return (
                  <div
                    key={rack.id}
                    className={`layout-rack-card ${
                      rackHighlighted ? "highlighted" : emphasized ? "muted" : ""
                    }`}
                  >
                    <div className="layout-rack-header">
                      <strong>{rack.label}</strong>
                      <span>{rackRecords.reduce((sum, record) => sum + record.tag.quantity, 0)} units</span>
                    </div>
                    <div className="layout-container-grid">
                      {rack.containers.map((container) => {
                        const containerRecord = rackRecords.find(
                          (record) => record.tag.containerId === container.id
                        );
                        const isHighlighted =
                          containerRecord &&
                          highlightedTagIds.includes(containerRecord.tag.id);
                        return (
                          <div
                            key={container.id}
                            className={`layout-container ${
                              isHighlighted ? "highlighted" : emphasized ? "muted" : ""
                            }`}
                            style={
                              {
                                "--container-color": containerRecord?.product.color ?? "#D3D9DF",
                              } as CSSProperties
                            }
                          >
                            <span>{container.label}</span>
                            <strong>{containerRecord?.tag.quantity ?? 0}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
