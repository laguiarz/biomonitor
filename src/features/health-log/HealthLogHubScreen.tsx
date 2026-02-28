import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getVaccines, getMedications, getMilestones, getSymptoms } from "../../core/database";
import { theme } from "../../core/theme/theme";

export default function HealthLogHubScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ vaccines: 0, medications: 0, milestones: 0, symptoms: 0 });

  useEffect(() => {
    async function load() {
      const [v, m, ms, s] = await Promise.all([
        getVaccines(),
        getMedications(),
        getMilestones(),
        getSymptoms(),
      ]);
      setCounts({ vaccines: v.length, medications: m.length, milestones: ms.length, symptoms: s.length });
    }
    load();
  }, []);

  const cards = [
    { icon: "\u{1F489}", label: t("healthLog.vaccinesCard"), desc: t("healthLog.vaccinesDesc"), count: counts.vaccines, path: "/health-log/vaccines" },
    { icon: "\u{1F48A}", label: t("healthLog.medicationsCard"), desc: t("healthLog.medicationsDesc"), count: counts.medications, path: "/health-log/medications" },
    { icon: "\u{1F3C1}", label: t("healthLog.milestonesCard"), desc: t("healthLog.milestonesDesc"), count: counts.milestones, path: "/health-log/milestones" },
    { icon: "\u{1FA7A}", label: t("healthLog.symptomsCard"), desc: t("healthLog.symptomsDesc"), count: counts.symptoms, path: "/health-log/symptoms" },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t("healthLog.title")}</h1>
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
