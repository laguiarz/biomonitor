import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getVaccines, deleteVaccine, type Vaccine } from "../../../core/database";
import { theme } from "../../../core/theme/theme";

export default function VaccinesListScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setVaccines(await getVaccines());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm(t("vaccines.deleteConfirm"))) return;
    await deleteVaccine(id);
    load();
  }

  if (loading) return <div style={styles.center}>{t("common.loading")}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t("vaccines.title")}</h1>
        <button style={styles.addBtn} onClick={() => navigate("/health-log/vaccines/new")}>
          + {t("vaccines.addNew")}
        </button>
      </div>

      {vaccines.length === 0 ? (
        <p style={styles.empty}>{t("vaccines.noVaccines")}</p>
      ) : (
        <div style={styles.list}>
          {vaccines.map((v) => (
            <div key={v.id} style={styles.card}>
              <div style={styles.cardMain}>
                <div style={styles.cardName}>{v.name}</div>
                <div style={styles.cardMeta}>
                  {v.vaccine_date}{v.dose ? ` \u2022 ${v.dose}` : ""}{v.provider ? ` \u2022 ${v.provider}` : ""}
                </div>
                {v.notes && <div style={styles.cardNotes}>{v.notes}</div>}
              </div>
              <div style={styles.cardActions}>
                <button style={styles.editBtn} onClick={() => navigate(`/health-log/vaccines/${v.id}/edit`)}>
                  {t("common.edit")}
                </button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(v.id)}>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.lg },
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
  cardName: { fontWeight: 600, fontSize: 15 },
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
