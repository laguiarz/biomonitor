import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAnalysisType, getIndicators, createAnalysisType, updateAnalysisType, deleteAnalysisType,
  createIndicator, updateIndicator, deleteIndicator, backfillComputedIndicator, deleteResultsForIndicator,
  findMergeCandidates, dissolveAnalysisType,
  type Indicator, type MergeCandidateRow, type DissolveMapping
} from "../../core/database";
import { theme } from "../../core/theme/theme";

interface FormulaState {
  leftId: number | null;
  operator: string;
  rightId: number | null;
}

function parseFormula(formula: string | null): FormulaState | null {
  if (!formula) return null;
  const match = formula.match(/^\{(\d+)\}\s*([+\-*/])\s*\{(\d+)\}$/);
  if (!match) return null;
  return { leftId: parseInt(match[1]), operator: match[2], rightId: parseInt(match[3]) };
}

function buildFormula(state: FormulaState): string | null {
  if (state.leftId == null || state.rightId == null || !state.operator) return null;
  return `{${state.leftId}}${state.operator}{${state.rightId}}`;
}

export default function AnalysisTypeDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  const [nameEn, setNameEn] = useState("");
  const [nameEs, setNameEs] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descEs, setDescEs] = useState("");
  const [colorHex, setColorHex] = useState("#2196F3");
  const [isBuiltin, setIsBuiltin] = useState(false);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formulaStates, setFormulaStates] = useState<Record<number, FormulaState>>({});
  const [distributing, setDistributing] = useState(false);
  const [candidates, setCandidates] = useState<MergeCandidateRow[]>([]);
  const [selections, setSelections] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isNew) return;
    async function load() {
      const type = await getAnalysisType(Number(id));
      if (!type) { navigate("/analysis-types"); return; }
      setNameEn(type.name_en);
      setNameEs(type.name_es);
      setDescEn(type.description_en);
      setDescEs(type.description_es);
      setColorHex(type.color_hex);
      setIsBuiltin(type.is_builtin === 1);
      const inds = await getIndicators(type.id);
      setIndicators(inds);

      // Initialize formula states for computed indicators
      const fStates: Record<number, FormulaState> = {};
      for (const ind of inds) {
        const parsed = parseFormula(ind.formula);
        if (parsed) fStates[ind.id] = parsed;
      }
      setFormulaStates(fStates);

      setLoading(false);
    }
    load();
  }, [id, isNew, navigate]);

  const handleSave = async () => {
    if (!nameEn || !nameEs) return;
    setSaving(true);
    try {
      if (isNew) {
        const newId = await createAnalysisType({
          name_en: nameEn, name_es: nameEs,
          description_en: descEn, description_es: descEs,
          icon_name: "science", color_hex: colorHex,
          is_builtin: 0, is_active: 1,
        });
        navigate(`/analysis-types/${newId}`);
      } else {
        await updateAnalysisType(Number(id), {
          name_en: nameEn, name_es: nameEs,
          description_en: descEn, description_es: descEs,
          color_hex: colorHex,
        });
        navigate("/analysis-types");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("analysisTypes.deleteConfirm"))) return;
    await deleteAnalysisType(Number(id));
    navigate("/analysis-types");
  };

  const handleStartDistribute = async () => {
    const rows = await findMergeCandidates(Number(id));
    setCandidates(rows);
    // Pre-select first match for each indicator
    const initial: Record<number, string> = {};
    for (const row of rows) {
      if (row.matches.length > 0) {
        const m = row.matches[0];
        initial[row.sourceIndicator.id] = `${m.targetTypeId}:${m.targetIndicatorId}`;
      } else {
        initial[row.sourceIndicator.id] = "";
      }
    }
    setSelections(initial);
    setDistributing(true);
  };

  const handleDissolve = async () => {
    if (!confirm(t("analysisTypes.distributeConfirm"))) return;
    const mappings: DissolveMapping[] = [];
    for (const [srcIdStr, val] of Object.entries(selections)) {
      if (!val) continue; // skipped
      const [typeId, indId] = val.split(":").map(Number);
      mappings.push({ sourceIndicatorId: Number(srcIdStr), targetIndicatorId: indId, targetTypeId: typeId });
    }
    await dissolveAnalysisType(Number(id), mappings);
    navigate("/analysis-types");
  };

  const hasUnmapped = Object.values(selections).some((v) => !v);

  const handleAddIndicator = async () => {
    if (isNew) return;
    await createIndicator({
      analysis_type_id: Number(id),
      name_en: "New Indicator",
      name_es: "Nuevo Indicador",
      unit: "",
      reference_min: null,
      reference_max: null,
      decimal_places: 2,
      formula: null,
    });
    const inds = await getIndicators(Number(id));
    setIndicators(inds);
  };

  const handleUpdateIndicator = async (ind: Indicator, field: string, value: string) => {
    const updates: Partial<Indicator> = {};
    if (field === "name_en" || field === "name_es" || field === "unit") {
      (updates as Record<string, string>)[field] = value;
    } else if (field === "reference_min" || field === "reference_max") {
      (updates as Record<string, number | null>)[field] = value ? parseFloat(value) : null;
    } else if (field === "decimal_places") {
      (updates as Record<string, number>)[field] = parseInt(value) || 0;
    }
    await updateIndicator(ind.id, updates);
    setIndicators((prev) => prev.map((i) => (i.id === ind.id ? { ...i, ...updates } : i)));
  };

  const handleDeleteIndicator = async (indId: number) => {
    await deleteIndicator(indId);
    setIndicators((prev) => prev.filter((i) => i.id !== indId));
    setFormulaStates((prev) => {
      const next = { ...prev };
      delete next[indId];
      return next;
    });
  };

  const handleToggleComputed = async (ind: Indicator) => {
    const isCurrentlyComputed = ind.formula !== null;
    if (isCurrentlyComputed) {
      // Switch to manual — remove formula and clean up stored computed results
      await updateIndicator(ind.id, { formula: null });
      await deleteResultsForIndicator(ind.id);
      setIndicators((prev) => prev.map((i) => (i.id === ind.id ? { ...i, formula: null } : i)));
      setFormulaStates((prev) => {
        const next = { ...prev };
        delete next[ind.id];
        return next;
      });
    } else {
      // Switch to computed — initialize formula builder state
      const defaultState: FormulaState = { leftId: null, operator: "/", rightId: null };
      setFormulaStates((prev) => ({ ...prev, [ind.id]: defaultState }));
      // Set a placeholder formula until user configures
      await updateIndicator(ind.id, { formula: "" });
      setIndicators((prev) => prev.map((i) => (i.id === ind.id ? { ...i, formula: "" } : i)));
    }
  };

  const handleFormulaChange = async (ind: Indicator, partial: Partial<FormulaState>) => {
    const current = formulaStates[ind.id] ?? { leftId: null, operator: "/", rightId: null };
    const updated = { ...current, ...partial };
    setFormulaStates((prev) => ({ ...prev, [ind.id]: updated }));

    const formulaStr = buildFormula(updated);
    if (formulaStr) {
      await updateIndicator(ind.id, { formula: formulaStr });
      const updatedInd = { ...ind, formula: formulaStr };
      setIndicators((prev) => prev.map((i) => (i.id === ind.id ? updatedInd : i)));
      await backfillComputedIndicator(updatedInd);
    }
  };

  // Get sibling indicators for formula dropdowns (exclude self and other computed)
  const getManualSiblings = (excludeId: number) =>
    indicators.filter((i) => i.id !== excludeId && !i.formula);

  if (loading) {
    return <div style={styles.center}>{t("common.loading")}</div>;
  }

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate("/analysis-types")}>
        &larr; {t("common.back")}
      </button>

      <h1 style={styles.title}>
        {isNew ? t("analysisTypes.addNew") : t("analysisTypes.editTitle")}
      </h1>

      <div style={styles.form}>
        <label style={styles.label}>{t("analysisTypes.nameEn")}</label>
        <input style={styles.input} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />

        <label style={styles.label}>{t("analysisTypes.nameEs")}</label>
        <input style={styles.input} value={nameEs} onChange={(e) => setNameEs(e.target.value)} />

        <label style={styles.label}>{t("analysisTypes.descriptionEn")}</label>
        <input style={styles.input} value={descEn} onChange={(e) => setDescEn(e.target.value)} />

        <label style={styles.label}>{t("analysisTypes.descriptionEs")}</label>
        <input style={styles.input} value={descEs} onChange={(e) => setDescEs(e.target.value)} />

        <label style={styles.label}>{t("analysisTypes.color")}</label>
        <input type="color" style={styles.colorInput} value={colorHex} onChange={(e) => setColorHex(e.target.value)} />

        <div style={styles.buttonRow}>
          <button style={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </button>
          {!isNew && !isBuiltin && (
            <button style={styles.deleteButton} onClick={handleDelete}>
              {t("common.delete")}
            </button>
          )}
          {!isNew && (
            <button style={styles.mergeButton} onClick={handleStartDistribute}>
              {t("analysisTypes.distribute")}
            </button>
          )}
        </div>

        {distributing && (
          <div style={styles.distributePanel}>
            <h3 style={styles.distributePanelTitle}>{t("analysisTypes.distributeTitle")}</h3>
            <table style={styles.distributeTable}>
              <thead>
                <tr>
                  <th style={styles.distribTh}>{t("analysisTypes.indicators")}</th>
                  <th style={styles.distribTh}>{t("analysisTypes.targetType")}</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((row) => {
                  const indName = lang === "es" ? row.sourceIndicator.name_es : row.sourceIndicator.name_en;
                  return (
                    <tr key={row.sourceIndicator.id}>
                      <td style={styles.distribTd}>{indName}</td>
                      <td style={styles.distribTd}>
                        {row.matches.length > 0 ? (
                          <select
                            style={styles.mergeSelect}
                            value={selections[row.sourceIndicator.id] ?? ""}
                            onChange={(e) => setSelections((prev) => ({ ...prev, [row.sourceIndicator.id]: e.target.value }))}
                          >
                            <option value="">{t("analysisTypes.noMatch")}</option>
                            {row.matches.map((m) => (
                              <option key={`${m.targetTypeId}:${m.targetIndicatorId}`} value={`${m.targetTypeId}:${m.targetIndicatorId}`}>
                                {lang === "es" ? m.targetTypeName_es : m.targetTypeName_en}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={styles.noMatchText}>{t("analysisTypes.noMatch")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hasUnmapped && (
              <p style={styles.warningText}>{t("analysisTypes.unmatchedWarning")}</p>
            )}
            <div style={styles.mergeRow}>
              <button style={styles.saveButton} onClick={handleDissolve}>
                {t("common.confirm")}
              </button>
              <button style={styles.cancelMergeButton} onClick={() => setDistributing(false)}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Indicators */}
      {!isNew && (
        <section style={styles.indicatorSection}>
          <div style={styles.indicatorHeader}>
            <h2 style={styles.sectionTitle}>{t("analysisTypes.indicators")}</h2>
            <button style={styles.addIndButton} onClick={handleAddIndicator}>
              + {t("analysisTypes.addIndicator")}
            </button>
          </div>

          {indicators.map((ind) => {
            const isComputed = ind.formula !== null;
            const siblings = getManualSiblings(ind.id);
            const fState = formulaStates[ind.id];

            return (
              <div key={ind.id} style={styles.indicatorCard}>
                <div style={styles.indRow}>
                  <input
                    style={styles.indInput}
                    value={ind.name_en}
                    onChange={(e) => handleUpdateIndicator(ind, "name_en", e.target.value)}
                    placeholder={t("analysisTypes.indicatorNameEn")}
                  />
                  <input
                    style={styles.indInput}
                    value={ind.name_es}
                    onChange={(e) => handleUpdateIndicator(ind, "name_es", e.target.value)}
                    placeholder={t("analysisTypes.indicatorNameEs")}
                  />
                </div>
                <div style={styles.indRow}>
                  <input
                    style={styles.indSmallInput}
                    value={ind.unit}
                    onChange={(e) => handleUpdateIndicator(ind, "unit", e.target.value)}
                    placeholder={t("analysisTypes.unit")}
                  />
                  <input
                    style={styles.indSmallInput}
                    type="number"
                    value={ind.reference_min ?? ""}
                    onChange={(e) => handleUpdateIndicator(ind, "reference_min", e.target.value)}
                    placeholder={t("analysisTypes.refMin")}
                  />
                  <input
                    style={styles.indSmallInput}
                    type="number"
                    value={ind.reference_max ?? ""}
                    onChange={(e) => handleUpdateIndicator(ind, "reference_max", e.target.value)}
                    placeholder={t("analysisTypes.refMax")}
                  />
                  <button style={styles.indDeleteButton} onClick={() => handleDeleteIndicator(ind.id)}>
                    &times;
                  </button>
                </div>

                {/* Computed toggle */}
                <div style={styles.computedRow}>
                  <label style={styles.computedLabel}>
                    <input
                      type="checkbox"
                      checked={isComputed}
                      onChange={() => handleToggleComputed(ind)}
                    />
                    {" "}{t("analysisTypes.computed")}
                  </label>
                </div>

                {/* Formula builder */}
                {isComputed && fState && (
                  <div style={styles.formulaRow}>
                    <select
                      style={styles.formulaSelect}
                      value={fState.leftId ?? ""}
                      onChange={(e) => handleFormulaChange(ind, { leftId: Number(e.target.value) || null })}
                    >
                      <option value="">-- {t("analysisTypes.selectIndicator")} --</option>
                      {siblings.map((s) => (
                        <option key={s.id} value={s.id}>
                          {lang === "es" ? s.name_es : s.name_en}
                        </option>
                      ))}
                    </select>

                    <select
                      style={styles.operatorSelect}
                      value={fState.operator}
                      onChange={(e) => handleFormulaChange(ind, { operator: e.target.value })}
                    >
                      <option value="/">&#247;</option>
                      <option value="*">&times;</option>
                      <option value="+">+</option>
                      <option value="-">&minus;</option>
                    </select>

                    <select
                      style={styles.formulaSelect}
                      value={fState.rightId ?? ""}
                      onChange={(e) => handleFormulaChange(ind, { rightId: Number(e.target.value) || null })}
                    >
                      <option value="">-- {t("analysisTypes.selectIndicator")} --</option>
                      {siblings.map((s) => (
                        <option key={s.id} value={s.id}>
                          {lang === "es" ? s.name_es : s.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 700, margin: "0 auto" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: theme.colors.textSecondary },
  backButton: { background: "none", border: "none", color: theme.colors.primary, cursor: "pointer", fontSize: 14, marginBottom: theme.spacing.md, padding: 0 },
  title: { fontSize: 24, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  form: { display: "flex", flexDirection: "column", gap: theme.spacing.md },
  label: { fontSize: 14, fontWeight: 600, color: theme.colors.textPrimary },
  input: { padding: theme.spacing.sm, borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.border}`, fontSize: 14 },
  colorInput: { width: 60, height: 36, border: "none", cursor: "pointer" },
  buttonRow: { display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.md },
  saveButton: { padding: `${theme.spacing.sm} ${theme.spacing.xl}`, backgroundColor: theme.colors.primary, color: "#fff", border: "none", borderRadius: theme.borderRadius, cursor: "pointer", fontSize: 14, fontWeight: 600 },
  deleteButton: { padding: `${theme.spacing.sm} ${theme.spacing.xl}`, backgroundColor: theme.colors.error, color: "#fff", border: "none", borderRadius: theme.borderRadius, cursor: "pointer", fontSize: 14 },
  mergeButton: { padding: `${theme.spacing.sm} ${theme.spacing.xl}`, backgroundColor: theme.colors.secondary, color: "#fff", border: "none", borderRadius: theme.borderRadius, cursor: "pointer", fontSize: 14 },
  mergeRow: { display: "flex", gap: theme.spacing.sm, marginTop: theme.spacing.md, alignItems: "center", flexWrap: "wrap" as const },
  mergeSelect: { flex: 1, minWidth: 180, padding: theme.spacing.sm, borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.border}`, fontSize: 14 },
  cancelMergeButton: { padding: `${theme.spacing.sm} ${theme.spacing.xl}`, backgroundColor: theme.colors.border, color: theme.colors.textPrimary, border: "none", borderRadius: theme.borderRadius, cursor: "pointer", fontSize: 14 },
  distributePanel: { marginTop: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius, boxShadow: theme.shadow },
  distributePanelTitle: { fontSize: 16, fontWeight: 600, marginBottom: theme.spacing.md, color: theme.colors.textPrimary },
  distributeTable: { width: "100%", borderCollapse: "collapse" as const, marginBottom: theme.spacing.md },
  distribTh: { textAlign: "left" as const, padding: theme.spacing.sm, borderBottom: `2px solid ${theme.colors.border}`, fontSize: 13, fontWeight: 600, color: theme.colors.textSecondary },
  distribTd: { padding: theme.spacing.sm, borderBottom: `1px solid ${theme.colors.border}`, fontSize: 14 },
  noMatchText: { color: theme.colors.textSecondary, fontStyle: "italic" as const, fontSize: 13 },
  warningText: { color: theme.colors.error, fontSize: 13, marginBottom: theme.spacing.sm },
  indicatorSection: { marginTop: theme.spacing.xl },
  indicatorHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: 600 },
  addIndButton: { padding: `${theme.spacing.xs} ${theme.spacing.md}`, backgroundColor: theme.colors.secondary, color: "#fff", border: "none", borderRadius: theme.borderRadius, cursor: "pointer", fontSize: 13 },
  indicatorCard: { padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius, boxShadow: theme.shadow, marginBottom: theme.spacing.sm },
  indRow: { display: "flex", gap: theme.spacing.sm, marginBottom: theme.spacing.xs, flexWrap: "wrap" },
  indInput: { flex: 1, minWidth: 150, padding: theme.spacing.xs, borderRadius: 4, border: `1px solid ${theme.colors.border}`, fontSize: 13 },
  indSmallInput: { width: 100, padding: theme.spacing.xs, borderRadius: 4, border: `1px solid ${theme.colors.border}`, fontSize: 13 },
  indDeleteButton: { background: "none", border: "none", color: theme.colors.error, cursor: "pointer", fontSize: 20, fontWeight: 700 },
  computedRow: { marginTop: theme.spacing.xs, display: "flex", alignItems: "center" },
  computedLabel: { fontSize: 13, color: theme.colors.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 },
  formulaRow: { display: "flex", gap: theme.spacing.sm, marginTop: theme.spacing.xs, alignItems: "center", flexWrap: "wrap" },
  formulaSelect: { flex: 1, minWidth: 120, padding: theme.spacing.xs, borderRadius: 4, border: `1px solid ${theme.colors.border}`, fontSize: 13 },
  operatorSelect: { width: 50, padding: theme.spacing.xs, borderRadius: 4, border: `1px solid ${theme.colors.border}`, fontSize: 14, textAlign: "center" },
};
