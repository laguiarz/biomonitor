import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getMilestone, createMilestone, updateMilestone, type MilestoneCategory } from "../../../core/database";
import { theme } from "../../../core/theme/theme";

const CATEGORIES: MilestoneCategory[] = ["diet", "exercise", "lifestyle", "other"];

export default function MilestoneEntryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [milestoneDate, setMilestoneDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MilestoneCategory>("other");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    getMilestone(Number(id)).then((m) => {
      if (m) {
        setMilestoneDate(m.milestone_date);
        setTitle(m.title);
        setCategory(m.category);
        setNotes(m.notes);
      }
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    if (!title.trim()) return;
    const data = { milestone_date: milestoneDate, title: title.trim(), category, notes };
    if (isEdit) {
      await updateMilestone(Number(id), data);
    } else {
      await createMilestone(data);
    }
    navigate("/health-log/milestones");
  }

  if (loading) return <div style={styles.center}>{t("common.loading")}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{isEdit ? t("milestones.editTitle") : t("milestones.addNew")}</h1>

      <div style={styles.form}>
        <label htmlFor="ms-date" style={styles.label}>{t("milestones.date")}</label>
        <input id="ms-date" type="date" style={styles.input} value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)} />

        <label htmlFor="ms-title" style={styles.label}>{t("milestones.titleField")}</label>
        <input id="ms-title" style={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />

        <label htmlFor="ms-category" style={styles.label}>{t("milestones.category")}</label>
        <select id="ms-category" style={styles.input} value={category} onChange={(e) => setCategory(e.target.value as MilestoneCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`milestones.cat_${c}`)}</option>
          ))}
        </select>

        <label htmlFor="ms-notes" style={styles.label}>{t("milestones.notes")}</label>
        <textarea id="ms-notes" style={{ ...styles.input, minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={() => navigate("/health-log/milestones")}>
            {t("common.cancel")}
          </button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={!title.trim()}>
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 600, margin: "0 auto" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: theme.colors.textSecondary },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  form: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  label: { fontSize: 14, fontWeight: 600, color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  input: {
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    fontSize: 14,
    fontFamily: "inherit",
  },
  actions: { display: "flex", justifyContent: "flex-end", gap: theme.spacing.md, marginTop: theme.spacing.lg },
  cancelBtn: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    background: "none",
    cursor: "pointer",
    fontSize: 14,
  },
  saveBtn: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
};
