import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getRecentRecords, getFlaggedResults, type MedicalRecord, type Result } from "../../core/database";
import { theme } from "../../core/theme/theme";

type RecentRecord = MedicalRecord & { type_name_en: string; type_name_es: string; type_color: string };
type FlaggedResult = Result & { indicator_name_en: string; indicator_name_es: string; indicator_unit: string; record_date: string };

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [flaggedResults, setFlaggedResults] = useState<FlaggedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  useEffect(() => {
    async function load() {
      try {
        const [records, flagged] = await Promise.all([
          getRecentRecords(5),
          getFlaggedResults(),
        ]);
        setRecentRecords(records);
        setFlaggedResults(flagged);
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div style={styles.center}>{t("common.loading")}</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t("home.title")}</h1>

      {/* Quick Actions */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("home.quickActions")}</h2>
        <div style={styles.actions}>
          <button style={styles.actionButton} onClick={() => navigate("/records/new")}>
            + {t("home.addRecord")}
          </button>
          <button style={{ ...styles.actionButton, backgroundColor: theme.colors.secondary }} onClick={() => navigate("/import")}>
            {t("home.importResults")}
          </button>
        </div>
      </section>

      {/* Alerts */}
      {flaggedResults.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t("home.alerts")}</h2>
          <div style={styles.alertList}>
            {flaggedResults.map((r) => (
              <div key={r.id} style={styles.alertCard}>
                <span style={styles.alertName}>
                  {lang === "es" ? r.indicator_name_es : r.indicator_name_en}
                </span>
                <span style={styles.alertValue}>
                  {r.value} {r.indicator_unit}
                </span>
                <span style={styles.alertDate}>{r.record_date}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {flaggedResults.length === 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>{t("home.alerts")}</h2>
          <p style={styles.emptyText}>{t("home.noAlerts")}</p>
        </section>
      )}

      {/* Recent Records */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("home.recentRecords")}</h2>
        {recentRecords.length === 0 ? (
          <p style={styles.emptyText}>{t("home.noRecords")}</p>
        ) : (
          <div style={styles.recordList}>
            {recentRecords.map((rec) => (
              <div
                key={rec.id}
                style={styles.recordCard}
                onClick={() => navigate(`/records/${rec.id}`)}
              >
                <div style={{ ...styles.recordColor, backgroundColor: rec.type_color }} />
                <div style={styles.recordInfo}>
                  <span style={styles.recordType}>
                    {lang === "es" ? rec.type_name_es : rec.type_name_en}
                  </span>
                  <span style={styles.recordDate}>{rec.record_date}</span>
                  {rec.lab_name && <span style={styles.recordLab}>{rec.lab_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 800, margin: "0 auto" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: theme.colors.textSecondary },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  actions: { display: "flex", gap: theme.spacing.md, flexWrap: "wrap" },
  actionButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  alertList: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  alertCard: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.flagged,
    borderRadius: theme.borderRadius,
    borderLeft: `4px solid ${theme.colors.error}`,
  },
  alertName: { fontWeight: 600, flex: 1 },
  alertValue: { fontWeight: 700, color: theme.colors.error },
  alertDate: { color: theme.colors.textSecondary, fontSize: 13 },
  emptyText: { color: theme.colors.textSecondary, fontStyle: "italic" },
  recordList: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  recordCard: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    cursor: "pointer",
  },
  recordColor: { width: 8, height: 40, borderRadius: 4 },
  recordInfo: { display: "flex", flexDirection: "column", gap: 2 },
  recordType: { fontWeight: 600, fontSize: 15 },
  recordDate: { color: theme.colors.textSecondary, fontSize: 13 },
  recordLab: { color: theme.colors.textSecondary, fontSize: 12 },
};
