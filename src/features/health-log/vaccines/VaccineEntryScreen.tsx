import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getVaccine, createVaccine, updateVaccine } from "../../../core/database";
import { theme } from "../../../core/theme/theme";

export default function VaccineEntryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [vaccineDate, setVaccineDate] = useState(new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    getVaccine(Number(id)).then((v) => {
      if (v) {
        setVaccineDate(v.vaccine_date);
        setName(v.name);
        setDose(v.dose);
        setLotNumber(v.lot_number);
        setProvider(v.provider);
        setNotes(v.notes);
      }
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    if (!name.trim()) return;
    const data = { vaccine_date: vaccineDate, name: name.trim(), dose, lot_number: lotNumber, provider, notes };
    if (isEdit) {
      await updateVaccine(Number(id), data);
    } else {
      await createVaccine(data);
    }
    navigate("/health-log/vaccines");
  }

  if (loading) return <div style={styles.center}>{t("common.loading")}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{isEdit ? t("vaccines.editTitle") : t("vaccines.addNew")}</h1>

      <div style={styles.form}>
        <label htmlFor="vaccine-date" style={styles.label}>{t("vaccines.date")}</label>
        <input id="vaccine-date" type="date" style={styles.input} value={vaccineDate} onChange={(e) => setVaccineDate(e.target.value)} />

        <label htmlFor="vaccine-name" style={styles.label}>{t("vaccines.name")}</label>
        <input id="vaccine-name" style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />

        <label htmlFor="vaccine-dose" style={styles.label}>{t("vaccines.dose")}</label>
        <input id="vaccine-dose" style={styles.input} value={dose} onChange={(e) => setDose(e.target.value)} />

        <label htmlFor="vaccine-lot" style={styles.label}>{t("vaccines.lotNumber")}</label>
        <input id="vaccine-lot" style={styles.input} value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />

        <label htmlFor="vaccine-provider" style={styles.label}>{t("vaccines.provider")}</label>
        <input id="vaccine-provider" style={styles.input} value={provider} onChange={(e) => setProvider(e.target.value)} />

        <label htmlFor="vaccine-notes" style={styles.label}>{t("vaccines.notes")}</label>
        <textarea id="vaccine-notes" style={{ ...styles.input, minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={() => navigate("/health-log/vaccines")}>
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
