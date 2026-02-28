import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getMilestones, deleteMilestone, type Milestone, type MilestoneCategory } from "../../../core/database";
import { theme } from "../../../core/theme/theme";

const CATEGORIES: MilestoneCategory[] = ["diet", "exercise", "lifestyle", "other"];

export default function MilestonesListScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [filter, setFilter] = useState<MilestoneCategory | "">("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setMilestones(await getMilestones());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm(t("milestones.deleteConfirm"))) return;
    await deleteMilestone(id);
    load();
  }

  const filtered = filter ? milestones.filter((m) => m.category === filter) : milestones;

  if (loading) return <div style={styles.center}>{t("common.loading")}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t("milestones.title")}</h1>
        <button style={styles.addBtn} onClick={() => navigate("/health-log/milestones/new")}>
          + {t("milestones.addNew")}
        </button>
      </div>

      <div style={styles.filterRow}>
        <button
          style={{ ...styles.filterBtn, ...(!filter ? styles.filterActive : {}) }}
          onClick={() => setFilter("")}
        >
          {t("milestones.allCategories")}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            style={{ ...styles.filterBtn, ...(filter === c ? styles.filterActive : {}) }}
            onClick={() => setFilter(c)}
          >
            {t(`milestones.cat_${c}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p style={styles.empty}>{t("milestones.noMilestones")}</p>
      ) : (
        <div style={styles.list}>
          {filtered.map((m) => (
            <div key={m.id} style={styles.card}>
              <div style={styles.cardMain}>
                <div style={styles.cardNameRow}>
                  <span style={styles.cardName}>{m.title}</span>
                  <span style={styles.badge}>{t(`milestones.cat_${m.category}`)}</span>
                </div>
                <div style={styles.cardMeta}>{m.milestone_date}</div>
                {m.notes && <div style={styles.cardNotes}>{m.notes}</div>}
              </div>
              <div style={styles.cardActions}>
                <button style={styles.editBtn} onClick={() => navigate(`/health-log/milestones/${m.id}/edit`)}>
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
  filterRow: { display: "flex", gap: theme.spacing.sm, marginBottom: theme.spacing.lg, flexWrap: "wrap" },
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
    backgroundColor: theme.colors.secondary,
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
