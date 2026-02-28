import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getRecords, getOrders, getAnalysisTypes } from "../../core/database";
import { theme } from "../../core/theme/theme";

export default function LabsHubScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ records: 0, orders: 0, types: 0 });

  useEffect(() => {
    async function load() {
      const [r, o, at] = await Promise.all([
        getRecords(),
        getOrders(),
        getAnalysisTypes(),
      ]);
      setCounts({ records: r.length, orders: o.length, types: at.length });
    }
    load();
  }, []);

  const cards = [
    { icon: "\u{1F4CB}", label: t("labs.recordsCard"), desc: t("labs.recordsDesc"), count: counts.records, path: "/records" },
    { icon: "\u{1F9FE}", label: t("labs.ordersCard"), desc: t("labs.ordersDesc"), count: counts.orders, path: "/orders" },
    { icon: "\u{1F52C}", label: t("labs.typesCard"), desc: t("labs.typesDesc"), count: counts.types, path: "/analysis-types" },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t("labs.title")}</h1>
      <div style={styles.grid}>
        {cards.map((card) => (
          <div key={card.path} style={styles.card} onClick={() => navigate(card.path)}>
            <div style={styles.cardIcon}>{card.icon}</div>
            <div style={styles.cardLabel}>{card.label}</div>
            <div style={styles.cardDesc}>{card.desc}</div>
            <div style={styles.cardCount}>{card.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 800, margin: "0 auto" },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  grid: { display: "flex", flexDirection: "column", gap: theme.spacing.md },
  card: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  cardIcon: { fontSize: 32 },
  cardLabel: { fontSize: 18, fontWeight: 600, color: theme.colors.textPrimary },
  cardDesc: { flex: 1, fontSize: 13, color: theme.colors.textSecondary },
  cardCount: { fontSize: 20, fontWeight: 700, color: theme.colors.primary },
};
