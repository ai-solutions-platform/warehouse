import type { InventoryMetrics } from "@/types/inventory";

export function Stats({ metrics }: { metrics: InventoryMetrics }) {
  const cards = [
    { label: "Critical", value: metrics.criticalCount },
    { label: "Warehouses", value: metrics.warehouses },
    { label: "Low stock", value: metrics.lowStockCount },
    { label: "Today", value: metrics.movementsToday },
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => (
        <article className="stat-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
