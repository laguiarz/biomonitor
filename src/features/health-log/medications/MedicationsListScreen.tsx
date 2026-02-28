import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getMedications, deleteMedication, type Medication } from "../../../core/database";
import { theme } from "../../../core/theme/theme";

export default function MedicationsListScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setMedications(await getMedications(activeOnly));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [activeOnly]);

  async function handleDelete(id: number) {
    if (!confirm(t("medications.deleteConfirm"))) return;
    await deleteMedication(id);
    load();
  }

  if (loading) return <div style={styles.center}>{t("common.loading")}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t("medications.title")}</h1>
        <button style={styles.addBtn} onClick={() => navigate("/health-log/medications/new")}>
          + {t("medications.addNew")}
        </button>
      </div>

      <div style={styles.filterRow}>
        <button
          style={{ ...styles.filterBtn, ...(activeOnly ? styles.filterActive : {}) }}
          onClick={() => setActiveOnly(true)}
        >
          {t("medications.showActive")}
        </button>
        <button
          style={{ ...styles.filterBtn, ...(!activeOnly ? styles.filterActive : {}) }}
          onClick={() => setActiveOnly(false)}
        >
          {t("medications.showAll")}
        </button>
      </div>

      {medications.length === 0 ? (
        <p style={styles.empty}>{t("medications.noMedications")}</p>
      ) : (
        <div style={styles.list}>
          {medications.map((m) => (
            <div key={m.id} style={styles.card}>
              <div style={styles.cardMain}>
                <div style={styles.cardNameRow}>
                  <span style={styles.cardName}>{m.name}</span>
                  <span style={{ ...styles.badge, backgroundColor: m.is_active ? theme.colors.success : theme.colors.textSecondary }}>
                    {m.is_active ? t("medications.active") : t("medications.inactive")}
                  </span>
                </div>
                <div style={styles.cardMeta}>
                  {m.dose ? `${m.dose} \u2022 ` : ""}{t(`medications.freq_${m.frequency}`)}
                  {` \u2022 ${m.start_date}`}{m.end_date ? ` \u2013 ${m.end_date}` : ""}
                </div>
                {m.notes && <div style={styles.cardNotes}>{m.notes}</div>}
              </div>
              <div style={styles.cardActions}>
                <button style={styles.editBtn} onClick={() => navigate(`/health-log/medications/${m.id}/edit`)}>
                  {t("common.edit")}
                </button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(m.id)}>
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 800, margin: "0 auto" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: theme.colors.textSecondary },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.md },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary },
  addBtn: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  filterRow: { display: "flex", gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  filterBtn: {
    padding: `4px ${theme.spacing.md}`,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    background: "none",
    cursor: "pointer",
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  filterActive: {
    backgroundColor: theme.colors.primary,
    color: "#fff",
    borderColor: theme.colors.primary,
  },
  empty: { color: theme.colors.textSecondary, fontStyle: "italic" },
  list: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
  },
  cardMain: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  cardNameRow: { display: "flex", alignItems: "center", gap: theme.spacing.sm },
  cardName: { fontWeight: 600, fontSize: 15 },
  badge: {
    fontSize: 11,
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 12,
    fontWeight: 600,
  },
  cardMeta: { color: theme.colors.textSecondary, fontSize: 13 },
  cardNotes: { color: theme.colors.textSecondary, fontSize: 12, fontStyle: "italic", marginTop: 2 },
  cardActions: { display: "flex", gap: theme.spacing.sm },
  editBtn: {
    padding: `4px ${theme.spacing.sm}`,
    backgroundColor: theme.colors.primaryLight,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 12,
  },
  deleteBtn: {
    padding: `4px ${theme.spacing.sm}`,
    backgroundColor: theme.colors.error,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 12,
  },
};
