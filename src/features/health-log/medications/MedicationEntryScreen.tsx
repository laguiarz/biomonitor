import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getMedication, createMedication, updateMedication, type MedicationFrequency } from "../../../core/database";
import { theme } from "../../../core/theme/theme";

const FREQUENCIES: MedicationFrequency[] = ["daily", "weekly", "monthly", "as-needed"];

export default function MedicationEntryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState<MedicationFrequency>("daily");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    getMedication(Number(id)).then((m) => {
      if (m) {
        setName(m.name);
        setDose(m.dose);
        setFrequency(m.frequency);
        setStartDate(m.start_date);
        setEndDate(m.end_date ?? "");
        setIsActive(m.is_active === 1);
        setNotes(m.notes);
      }
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      dose,
      frequency,
      start_date: startDate,
      end_date: endDate || null,
      is_active: isActive ? 1 : 0,
      notes,
    };
    if (isEdit) {
      await updateMedication(Number(id), data);
    } else {
      await createMedication(data);
    }
    navigate("/health-log/medications");
  }

  if (loading) return <div style={styles.center}>{t("common.loading")}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{isEdit ? t("medications.editTitle") : t("medications.addNew")}</h1>

      <div style={styles.form}>
        <label htmlFor="med-name" style={styles.label}>{t("medications.name")}</label>
        <input id="med-name" style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />

        <label htmlFor="med-dose" style={styles.label}>{t("medications.dose")}</label>
        <input id="med-dose" style={styles.input} value={dose} onChange={(e) => setDose(e.target.value)} />

        <label htmlFor="med-frequency" style={styles.label}>{t("medications.frequency")}</label>
        <select id="med-frequency" style={styles.input} value={frequency} onChange={(e) => setFrequency(e.target.value as MedicationFrequency)}>
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>{t(`medications.freq_${f}`)}</option>
          ))}
        </select>

        <label htmlFor="med-start" style={styles.label}>{t("medications.startDate")}</label>
        <input id="med-start" type="date" style={styles.input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />

        <label htmlFor="med-end" style={styles.label}>{t("medications.endDate")}</label>
        <input id="med-end" type="date" style={styles.input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />

        <label style={styles.checkboxRow}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span style={{ marginLeft: 8 }}>{t("medications.active")}</span>
        </label>

        <label htmlFor="med-notes" style={styles.label}>{t("medications.notes")}</label>
        <textarea id="med-notes" style={{ ...styles.input, minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={() => navigate("/health-log/medications")}>
            {t("common.cancel")}
          </button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={!name.trim()}>
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
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    fontSize: 14,
    fontWeight: 600,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    cursor: "pointer",
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
