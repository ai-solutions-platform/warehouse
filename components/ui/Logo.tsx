import { appConfig } from "@/config/warehouse-config";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="brand-logo-img"
        src="/images/chocolates/icon-demo.png"
        alt=""
        aria-hidden="true"
      />
      {!compact ? (
        <div className="logo-text">
          <span>{appConfig.tagline}</span>
        </div>
      ) : null}
    </div>
  );
}
