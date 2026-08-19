import { activeInventoryDataset } from "@/config/dataset-config";

export type ViewId =
  | "dashboard"
  | "inventory"
  | "movements"
  | "warehouses"
  | "map"
  | "action";

interface SidebarProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
  open: boolean;
  onClose: () => void;
}

const navLabels = activeInventoryDataset.ui.nav;

const navItems: Array<{ id: ViewId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "inventory", label: navLabels.inventory },
  { id: "movements", label: navLabels.movements },
  { id: "warehouses", label: navLabels.warehouses },
  { id: "map", label: navLabels.map },
  { id: "action", label: navLabels.action },
];

export function Sidebar({ currentView, onViewChange, open, onClose }: SidebarProps) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <nav className="nav-stack" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-button ${currentView === item.id ? "active" : ""}`}
            type="button"
            onClick={() => {
              onViewChange(item.id);
              onClose();
            }}
            title={item.label}
          >
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>
    </aside>
  );
}
