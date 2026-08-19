import { activeInventoryDataset } from "@/config/dataset-config";

interface HeroProps {
  totalUnits: number;
  lowStockCount: number;
  movementsToday: number;
  onScan: () => void;
}

export function Hero({ totalUnits, lowStockCount, movementsToday, onScan }: HeroProps) {
  const hero = activeInventoryDataset.ui.hero;

  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <span className="eyebrow">{hero.eyebrow}</span>
        <h1>{hero.title}</h1>
        <p className="hero-text">{hero.body}</p>
        <div className="hero-actions">
          <button className="btn primary" type="button" onClick={onScan}>
            Scan NFC
          </button>
        </div>
      </div>
      <div className="hero-summary">
        <div className="hero-kpi">
          <span>Total units</span>
          <strong>{totalUnits.toLocaleString("en-US")}</strong>
        </div>
        <div className="hero-kpi">
          <span>Low stock</span>
          <strong>{lowStockCount}</strong>
        </div>
        <div className="hero-kpi">
          <span>Movements today</span>
          <strong>{movementsToday}</strong>
        </div>
      </div>
    </section>
  );
}
