import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAnalysisTypes, getIndicators, getRecord, getResults, createRecord, updateRecord, saveResults,
  evaluateFormula,
  type AnalysisType, type Indicator, type MedicalRecord
} from "../../core/database";
import { theme } from "../../core/theme/theme";

interface ResultEntry {
  indicator_id: number;
  value: string;
}

export default function RecordEntryScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [resultEntries, setResultEntries] = useState<ResultEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [labName, setLabName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const manualIndicators = indicators.filter((i) => !i.formula);
  const computedIndicators = indicators.filter((i) => i.formula);

  // Recalculate computed indicators from current manual values
  const recalculate = useCallback(
    (entries: ResultEntry[]) => {
      if (computedIndicators.length === 0) return entries;

      // Build a map of indicator_id -> numeric value from manual entries
      const valuesMap = new Map<number, number>();
      for (const e of entries) {
        const v = parseFloat(e.value);
        if (!isNaN(v)) valuesMap.set(e.indicator_id, v);
      }

      // Evaluate each computed indicator
      return entries.map((entry) => {
        const ind = computedIndicators.find((c) => c.id === entry.indicator_id);
        if (!ind || !ind.formula) return entry;
        const result = evaluateFormula(ind.formula, valuesMap);
        return { ...entry, value: result !== null ? result.toFixed(ind.decimal_places) : "" };
      });
    },
    [computedIndicators]
  );

  // Load analysis types
  useEffect(() => {
    async function load() {
      const types = await getAnalysisTypes();
      setAnalysisTypes(types);

      if (isEdit && id) {
        const rec = await getRecord(Number(id));
        if (rec) {
          setSelectedTypeId(rec.analysis_type_id);
          setDate(rec.record_date);
          setLabName(rec.lab_name);
          setDoctorName(rec.doctor_name);
          setNotes(rec.notes);
        }
      }
      setLoading(false);
    }
    load();
  }, [id, isEdit]);

  // Load indicators when type changes
  useEffect(() => {
    async function loadIndicators() {
      if (!selectedTypeId) {
        setIndicators([]);
        setResultEntries([]);
        return;
      }
      const inds = await getIndicators(selectedTypeId);
      setIndicators(inds);

      if (isEdit && id) {
        const existingResults = await getResults(Number(id));
        const resultsMap = new Map(existingResults.map((r) => [r.indicator_id, r]));
        setResultEntries(inds.map((ind) => ({
          indicator_id: ind.id,
          value: resultsMap.get(ind.id)?.value?.toString() ?? "",
        })));
      } else {
        setResultEntries(inds.map((ind) => ({ indicator_id: ind.id, value: "" })));
      }
    }
    loadIndicators();
  }, [selectedTypeId, id, isEdit]);

  const handleSave = async () => {
    if (!selectedTypeId || !date) return;
    setSaving(true);

    try {
      const filledResults = resultEntries.filter((r) => r.value.trim() !== "");
      if (filledResults.length === 0) return;

      const recordData: Omit<MedicalRecord, "id" | "created_at"> = {
        analysis_type_id: selectedTypeId,
        record_date: date,
        lab_name: labName,
        doctor_name: doctorName,
        notes,
        source: "manual",
        order_id: null,
      };

      let recordId: number;
      if (isEdit && id) {
        recordId = Number(id);
        await updateRecord(recordId, recordData);
      } else {
        recordId = await createRecord(recordData);
      }

      const indicatorsMap = new Map(indicators.map((i) => [i.id, i]));
      const resultsToSave = filledResults.map((r) => {
        const ind = indicatorsMap.get(r.indicator_id);
        const value = parseFloat(r.value);
        const refMin = ind?.reference_min ?? null;
        const refMax = ind?.reference_max ?? null;
        let isFlagged = 0;
        if (refMin != null && value < refMin) isFlagged = 1;
        if (refMax != null && value > refMax) isFlagged = 1;
        return {
          record_id: recordId,
          indicator_id: r.indicator_id,
          value,
          ref_min_snapshot: refMin,
          ref_max_snapshot: refMax,
          is_flagged: isFlagged,
        };
      });

      await saveResults(recordId, resultsToSave);
      navigate(`/records/${recordId}`);
    } catch (e) {
      console.error("Failed to save record:", e);
    } finally {
      setSaving(false);
    }
  };

  const updateResultValue = (indicatorId: number, value: string) => {
    setResultEntries((prev) => {
      const updated = prev.map((r) => (r.indicator_id === indicatorId ? { ...r, value } : r));
      return recalculate(updated);
    });
  };

  if (loading) {
    return <div style={styles.center}>{t("common.loading")}</div>;
  }

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate(-1)}>
        &larr; {t("common.back")}
      </button>

      <h1 style={styles.title}>{isEdit ? t("recordEntry.editTitle") : t("recordEntry.title")}</h1>

      <div style={styles.form}>
        {/* Analysis Type */}
        <label style={styles.label}>{t("recordEntry.selectType")}</label>
        <select
          style={styles.select}
          value={selectedTypeId ?? ""}
          onChange={(e) => setSelectedTypeId(Number(e.target.value) || null)}
          disabled={isEdit}
        >
          <option value="">-- {t("recordEntry.selectType")} --</option>
          {analysisTypes.map((at) => (
            <option key={at.id} value={at.id}>
              {lang === "es" ? at.name_es : at.name_en}
            </option>
          ))}
        </select>

        {/* Date */}
        <label style={styles.label}>{t("recordEntry.date")}</label>
        <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />

        {/* Lab */}
        <label style={styles.label}>{t("recordEntry.labName")}</label>
        <input type="text" style={styles.input} value={labName} onChange={(e) => setLabName(e.target.value)} />

        {/* Doctor */}
        <label style={styles.label}>{t("recordEntry.doctorName")}</label>
        <input type="text" style={styles.input} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />

        {/* Notes */}
        <label style={styles.label}>{t("recordEntry.notes")}</label>
        <textarea style={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />

        {/* Manual Results */}
        {manualIndicators.length > 0 && (
          <>
            <h2 style={styles.sectionTitle}>{t("recordEntry.results")}</h2>
            <div style={styles.resultsGrid}>
              {manualIndicators.map((ind) => {
                const entry = resultEntries.find((r) => r.indicator_id === ind.id);
                const refText = ind.reference_min != null && ind.reference_max != null
                  ? `(${ind.reference_min} - ${ind.reference_max} ${ind.unit})`
                  : ind.unit ? `(${ind.unit})` : "";
                return (
                  <div key={ind.id} style={styles.resultRow}>
                    <label style={styles.resultLabel}>
                      {lang === "es" ? ind.name_es : ind.name_en}
                      <span style={styles.refRange}> {refText}</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      style={styles.resultInput}
                      value={entry?.value ?? ""}
                      onChange={(e) => updateResultValue(ind.id, e.target.value)}
                      placeholder={t("recordEntry.value")}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Computed Results */}
        {computedIndicators.length > 0 && (
          <>
            <h2 style={styles.sectionTitle}>{t("records.computed")}</h2>
            <div style={styles.resultsGrid}>
              {computedIndicators.map((ind) => {
                const entry = resultEntries.find((r) => r.indicator_id === ind.id);
                const refText = ind.reference_min != null && ind.reference_max != null
                  ? `(${ind.reference_min} - ${ind.reference_max} ${ind.unit})`
                  : ind.unit ? `(${ind.unit})` : "";
                const val = entry?.value ?? "";
                const numVal = parseFloat(val);
                const isFlagged = !isNaN(numVal) && (
                  (ind.reference_min != null && numVal < ind.reference_min) ||
                  (ind.reference_max != null && numVal > ind.reference_max)
                );
                return (
                  <div key={ind.id} style={styles.resultRow}>
                    <label style={styles.resultLabel}>
                      {lang === "es" ? ind.name_es : ind.name_en}
                      <span style={styles.refRange}> {refText}</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      style={{
                        ...styles.computedInput,
                        ...(isFlagged ? styles.flaggedInput : {}),
                      }}
                      value={val}
                      placeholder="--"
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        <button style={styles.saveButton} onClick={handleSave} disabled={saving || !selectedTypeId}>
          {saving ? t("common.loading") : t("recordEntry.save")}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 600, margin: "0 auto" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: theme.colors.textSecondary },
  backButton: { background: "none", border: "none", color: theme.colors.primary, cursor: "pointer", fontSize: 14, marginBottom: theme.spacing.md, padding: 0 },
  title: { fontSize: 24, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  form: { display: "flex", flexDirection: "column", gap: theme.spacing.md },
  label: { fontSize: 14, fontWeight: 600, color: theme.colors.textPrimary },
  select: { padding: theme.spacing.sm, borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.border}`, fontSize: 14 },
  input: { padding: theme.spacing.sm, borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.border}`, fontSize: 14 },
  textarea: { padding: theme.spacing.sm, borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.border}`, fontSize: 14, resize: "vertical" },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginTop: theme.spacing.md },
  resultsGrid: { display: "flex", flexDirection: "column", gap: theme.spacing.md },
  resultRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.md },
  resultLabel: { fontSize: 14, flex: 1 },
  refRange: { color: theme.colors.textSecondary, fontSize: 12 },
  resultInput: { width: 120, padding: theme.spacing.sm, borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.border}`, fontSize: 14, textAlign: "right" },
  computedInput: {
    width: 120, padding: theme.spacing.sm, borderRadius: theme.borderRadius,
    border: `1px solid ${theme.colors.border}`, fontSize: 14, textAlign: "right",
    backgroundColor: "#f5f5f5", color: theme.colors.textPrimary, cursor: "default",
  },
  flaggedInput: {
    backgroundColor: "#fff3e0", borderColor: theme.colors.error, color: theme.colors.error,
  },
  saveButton: {
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    marginTop: theme.spacing.lg,
  },
};
