import type { ViewId } from "@/components/layout/Sidebar";
import { activeInventoryDataset } from "@/config/dataset-config";

interface MobileNavProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
  onAdd: () => void;
}

const navLabels = activeInventoryDataset.ui.nav;

const items: Array<{ id: ViewId; label: string }> = [
  { id: "dashboard", label: "Home" },
  { id: "inventory", label: navLabels.inventory },
  { id: "map", label: "Map" },
  { id: "warehouses", label: "Sites" },
  { id: "action", label: navLabels.action },
];

export function MobileNav({ currentView, onViewChange, onAdd }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {items.map((item) => (
        <button
          key={item.id}
          className={currentView === item.id ? "active" : ""}
          type="button"
          onClick={() => onViewChange(item.id)}
        >
          <span>{item.label}</span>
        </button>
      ))}
      <button className="add-mobile" type="button" onClick={onAdd}>
        <strong>+</strong>
        <span>Scan</span>
      </button>
    </nav>
  );
}
