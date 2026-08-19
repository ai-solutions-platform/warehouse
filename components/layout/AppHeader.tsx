import { appConfig } from "@/config/warehouse-config";

interface AppHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function AppHeader({ sidebarOpen, onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-strip" aria-hidden="true" />
      <div className="app-header-inner">
        <button
          className={`menu-toggle ${sidebarOpen ? "open" : ""}`}
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="app-header-title">
          <span className="bosch-mark" aria-hidden="true">
            <span className="chocolate-icon" />
          </span>
          <div>
            <strong>{appConfig.name}</strong>
            <span>{appConfig.tagline}</span>
          </div>
        </div>
        <div className="bosch-wordmark">BOSCH</div>
      </div>
    </header>
  );
}
