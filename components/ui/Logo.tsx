import { appConfig } from "@/config/warehouse-config";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo-row">
      <div className="logo-mark" aria-hidden="true">
        <span className="chocolate-icon" />
      </div>
      {!compact ? (
        <div className="logo-text">
          <span>{appConfig.tagline}</span>
        </div>
      ) : null}
    </div>
  );
}
