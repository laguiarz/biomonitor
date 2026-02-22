import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { theme } from "../../core/theme/theme";
import type { ParsedReport, ParsedResult, ParsedGroup } from "../../core/services/llmParser";
import {
  getAnalysisTypes,
  getIndicators,
  createRecord,
  saveResults,
  createImportHistory,
  createOrder,
  createAnalysisType,
  createIndicator,
  type AnalysisType,
  type Indicator,
} from "../../core/database";

interface MatchedRow {
  parsed: ParsedResult;
  indicatorId: number | null;
  value: string;
}

interface GroupSection {
  group: ParsedGroup;
  matchedTypeId: number | null;
  isNewType: boolean;
  creatingType: boolean;
  typeCreated: boolean;
  indicators: Indicator[];
  rows: MatchedRow[];
}

export default function OcrReviewScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    parsed: ParsedReport;
    rawText: string;
    fileName: string;
  } | null;

  const [allTypes, setAllTypes] = useState<AnalysisType[]>([]);
  const [sections, setSections] = useState<GroupSection[]>([]);
  const [date, setDate] = useState("");
  const [labName, setLabName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isEs = i18n.language.startsWith("es");

  // Redirect if no parsed data
  useEffect(() => {
    if (!state) {
      navigate("/import", { replace: true });
    }
  }, [state, navigate]);

  // Initialize form metadata from parsed data
  useEffect(() => {
    if (!state) return;
    const { parsed } = state;
    setDate(parsed.date ?? new Date().toISOString().slice(0, 10));
    setLabName(parsed.lab_name);
    setDoctorName(parsed.doctor_name);
  }, [state]);

  // Load all types and build initial sections
  useEffect(() => {
    if (!state) return;
    getAnalysisTypes().then((types) => {
      setAllTypes(types);
      buildSections(state.parsed.groups, types);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const buildSections = useCallback(
    async (groups: ParsedGroup[], types: AnalysisType[]) => {
      const newSections: GroupSection[] = [];

      for (const group of groups) {
        const matchedType = findMatchingType(group, types);
        let indicators: Indicator[] = [];
        let rows: MatchedRow[] = [];

        if (matchedType) {
          indicators = await getIndicators(matchedType.id);
          rows = group.results.map((pr) => ({
            parsed: pr,
            indicatorId: findBestMatch(pr, indicators)?.id ?? null,
            value: String(pr.value),
          }));
        } else {
          rows = group.results.map((pr) => ({
            parsed: pr,
            indicatorId: null,
            value: String(pr.value),
          }));
        }

        newSections.push({
          group,
          matchedTypeId: matchedType?.id ?? null,
          isNewType: !matchedType,
          creatingType: false,
          typeCreated: false,
          indicators,
          rows,
        });
      }

      setSections(newSections);
    },
    []
  );

  if (!state) return null;

  const typeName = (at: AnalysisType) => (isEs ? at.name_es : at.name_en);
  const indName = (ind: Indicator) => (isEs ? ind.name_es : ind.name_en);

  const handleTypeChange = async (sectionIdx: number, typeId: number | null) => {
    setSections((prev) => {
      const next = [...prev];
      const section = { ...next[sectionIdx] };
      section.matchedTypeId = typeId;
      section.isNewType = typeId === null;
      next[sectionIdx] = section;
      return next;
    });

    if (typeId) {
      const indicators = await getIndicators(typeId);
      setSections((prev) => {
        const next = [...prev];
        const section = { ...next[sectionIdx] };
        section.indicators = indicators;
        section.rows = section.group.results.map((pr) => ({
          parsed: pr,
          indicatorId: findBestMatch(pr, indicators)?.id ?? null,
          value: String(pr.value),
        }));
        next[sectionIdx] = section;
        return next;
      });
    }
  };

  const handleCreateType = async (sectionIdx: number) => {
    // Capture group data BEFORE any state updates to avoid stale closure
    const group = sections[sectionIdx]?.group;
    if (!group) {
      console.error("No group data found for section", sectionIdx);
      return;
    }

    setSections((prev) => {
      const next = [...prev];
      next[sectionIdx] = { ...next[sectionIdx], creatingType: true };
      return next;
    });

    try {
      // Create the analysis type
      const typeId = await createAnalysisType({
        name_en: group.analysis_type,
        name_es: group.analysis_type_es,
        description_en: "",
        description_es: "",
        icon_name: "clipboard",
        color_hex: generateColor(sectionIdx),
        is_builtin: 0,
        is_active: 1,
      });

      if (!typeId || typeId === 0) {
        throw new Error("Failed to create analysis type: no valid ID returned");
      }

      // Create indicators from parsed results
      for (const result of group.results) {
        await createIndicator({
          analysis_type_id: typeId,
          name_en: result.name,
          name_es: result.name_es,
          unit: result.unit,
          reference_min: result.reference_min,
          reference_max: result.reference_max,
          decimal_places: 2,
          formula: null,
        });
      }

      // Load the newly created indicators
      const indicators = await getIndicators(typeId);

      // Refresh allTypes
      const updatedTypes = await getAnalysisTypes();
      setAllTypes(updatedTypes);

      // Update section with matched indicators
      setSections((prev) => {
        const next = [...prev];
        const s = { ...next[sectionIdx] };
        s.matchedTypeId = typeId;
        s.isNewType = false;
        s.creatingType = false;
        s.typeCreated = true;
        s.indicators = indicators;
        s.rows = group.results.map((pr) => ({
          parsed: pr,
          indicatorId: findBestMatch(pr, indicators)?.id ?? null,
          value: String(pr.value),
        }));
        next[sectionIdx] = s;
        return next;
      });
    } catch (err) {
      console.error("Failed to create analysis type:", err);
      alert(
        `Error creating analysis type "${group.analysis_type_es || group.analysis_type}": ${err instanceof Error ? err.message : String(err)}`
      );
      setSections((prev) => {
        const next = [...prev];
        next[sectionIdx] = { ...next[sectionIdx], creatingType: false };
        return next;
      });
    }
  };

  const handleIndicatorChange = (sectionIdx: number, rowIdx: number, indicatorId: number | null) => {
    setSections((prev) => {
      const next = [...prev];
      const section = { ...next[sectionIdx] };
      const rows = [...section.rows];
      rows[rowIdx] = { ...rows[rowIdx], indicatorId };
      section.rows = rows;
      next[sectionIdx] = section;
      return next;
    });
  };

  const handleValueChange = (sectionIdx: number, rowIdx: number, value: string) => {
    setSections((prev) => {
      const next = [...prev];
      const section = { ...next[sectionIdx] };
      const rows = [...section.rows];
      rows[rowIdx] = { ...rows[rowIdx], value };
      section.rows = rows;
      next[sectionIdx] = section;
      return next;
    });
  };

  const getSectionValidCount = (section: GroupSection): number =>
    section.rows.filter(
      (r) => r.indicatorId !== null && r.value.trim() !== "" && !isNaN(Number(r.value))
    ).length;

  const totalValidCount = sections.reduce((sum, s) => sum + (s.matchedTypeId ? getSectionValidCount(s) : 0), 0);

  const savableSections = sections.filter((s) => s.matchedTypeId && getSectionValidCount(s) > 0);

  const handleSave = async () => {
    if (savableSections.length === 0 || saving) return;

    setSaving(true);
    setSaveError("");
    try {
      const orderId = await createOrder({
        order_date: date,
        lab_name: labName,
        doctor_name: doctorName,
        notes: "",
        source: "pdf-import",
      });

      for (const section of savableSections) {
        const validRows = section.rows.filter(
          (r) => r.indicatorId !== null && r.value.trim() !== "" && !isNaN(Number(r.value))
        );

        // Deduplicate by indicator_id — keep last occurrence (user's final pick)
        const deduped = new Map<number, (typeof validRows)[number]>();
        for (const row of validRows) {
          deduped.set(row.indicatorId!, row);
        }

        const recordId = await createRecord({
          analysis_type_id: section.matchedTypeId!,
          record_date: date,
          lab_name: labName,
          doctor_name: doctorName,
          notes: "",
          source: "pdf-import",
          order_id: orderId,
        });

        const resultData = [...deduped.values()].map((row) => {
          const ind = section.indicators.find((i) => i.id === row.indicatorId);
          const numVal = Number(row.value);
          const refMin = row.parsed.reference_min ?? ind?.reference_min ?? null;
          const refMax = row.parsed.reference_max ?? ind?.reference_max ?? null;
          const isFlagged =
            (refMin !== null && numVal < refMin) || (refMax !== null && numVal > refMax) ? 1 : 0;

          return {
            record_id: recordId,
            indicator_id: row.indicatorId!,
            value: numVal,
            ref_min_snapshot: refMin,
            ref_max_snapshot: refMax,
            is_flagged: isFlagged,
          };
        });

        await saveResults(recordId, resultData);

        await createImportHistory({
          record_id: recordId,
          source_type: "pdf",
          file_path: state.fileName,
          raw_text: state.rawText,
          status: "completed",
        });
      }

      navigate(`/orders/${orderId}`, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to save import:", message);
      setSaveError(message);
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate("/import")}>
        &larr; {t("common.back")}
      </button>

      <h1 style={styles.title}>{t("import.reviewTitle")}</h1>
      <p style={styles.instructions}>{t("import.reviewInstructions")}</p>

      {/* Metadata fields */}
      <div style={styles.metaSection}>
        <div style={styles.field}>
          <label style={styles.label}>{t("records.date")}</label>
          <input
            type="date"
            style={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>{t("records.lab")}</label>
          <input
            type="text"
            style={styles.input}
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>{t("records.doctor")}</label>
          <input
            type="text"
            style={styles.input}
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />
        </div>
      </div>

      {/* Sections — one per group */}
      {sections.map((section, sIdx) => (
        <div key={sIdx} style={styles.sectionCard}>
          {/* Section header */}
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {isEs ? section.group.analysis_type_es : section.group.analysis_type}
              </h2>
              <span style={styles.sectionCount}>
                {section.group.results.length} {t("import.resultsGroup")}
              </span>
            </div>
            <span
              style={{
                ...styles.badge,
                backgroundColor: section.isNewType ? "#FFF3E0" : "#E8F5E9",
                color: section.isNewType ? "#E65100" : "#2E7D32",
              }}
            >
              {section.isNewType ? t("import.newType") : t("import.existingType")}
            </span>
          </div>

          {/* Type selector */}
          <div style={styles.field}>
            <label style={styles.label}>{t("import.selectType")}</label>
            <select
              style={styles.select}
              value={section.matchedTypeId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "new") {
                  handleTypeChange(sIdx, null);
                } else {
                  handleTypeChange(sIdx, Number(val) || null);
                }
              }}
            >
              <option value="">{t("import.selectType")}...</option>
              {allTypes.map((at) => (
                <option key={at.id} value={at.id}>
                  {typeName(at)}
                </option>
              ))}
              <option value="new">+ {t("import.createNewType")}</option>
            </select>
          </div>

          {/* New type card */}
          {section.isNewType && !section.typeCreated && (
            <div style={styles.newTypeCard}>
              <p style={styles.newTypeText}>
                {t("import.newTypeDetected")}:{" "}
                <strong>{isEs ? section.group.analysis_type_es : section.group.analysis_type}</strong>
              </p>
              <p style={styles.newTypeSubtext}>
                {section.group.results.length} {t("import.resultsGroup")}:{" "}
                {section.group.results.map((r) => (isEs ? r.name_es : r.name)).join(", ")}
              </p>
              <button
                style={styles.createTypeButton}
                onClick={() => handleCreateType(sIdx)}
                disabled={section.creatingType}
              >
                {section.creatingType ? t("common.loading") : t("import.createAndMatch")}
              </button>
            </div>
          )}

          {/* Results matching table (only when type is matched) */}
          {section.matchedTypeId && section.rows.length > 0 && (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>PDF Result</th>
                    <th style={styles.th}>{t("import.matchedIndicator")}</th>
                    <th style={styles.th}>{t("recordEntry.value")}</th>
                    <th style={styles.th}>{t("analysisTypes.unit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, rIdx) => (
                    <tr key={rIdx} style={rIdx % 2 === 0 ? styles.trEven : undefined}>
                      <td style={styles.td}>
                        <span style={styles.parsedName}>{row.parsed.name}</span>
                        {row.parsed.name_es && row.parsed.name_es !== row.parsed.name && (
                          <span style={styles.parsedNameEs}> ({row.parsed.name_es})</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <select
                          style={{
                            ...styles.matchSelect,
                            ...(row.indicatorId === null ? { color: theme.colors.textSecondary } : {}),
                          }}
                          value={row.indicatorId ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleIndicatorChange(sIdx, rIdx, val ? Number(val) : null);
                          }}
                        >
                          <option value="">{t("import.skipIndicator")}</option>
                          {section.indicators.map((ind) => (
                            <option key={ind.id} value={ind.id}>
                              {indName(ind)} ({ind.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={styles.td}>
                        <input
                          type="number"
                          step="any"
                          style={styles.valueInput}
                          value={row.value}
                          onChange={(e) => handleValueChange(sIdx, rIdx, e.target.value)}
                        />
                      </td>
                      <td style={styles.td}>
                        <span style={styles.unitText}>{row.parsed.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Error display */}
      {saveError && (
        <div style={styles.errorCard}>
          <p style={styles.errorText}>{t("common.error")}: {saveError}</p>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.discardButton} onClick={() => navigate("/import")}>
          {t("import.discard")}
        </button>
        <button
          style={{
            ...styles.saveButton,
            ...(totalValidCount === 0 || savableSections.length === 0 || saving
              ? styles.saveButtonDisabled
              : {}),
          }}
          disabled={totalValidCount === 0 || savableSections.length === 0 || saving}
          onClick={handleSave}
        >
          {saving
            ? t("common.loading")
            : `${t("import.save")} (${totalValidCount})`}
        </button>
      </div>
    </div>
  );
}

// --- Helpers ---

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const wordsB = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let matches = 0;
  for (const w of wordsA) if (wordsB.has(w)) matches++;
  return matches / Math.min(wordsA.size, wordsB.size);
}

function findMatchingType(group: ParsedGroup, types: AnalysisType[]): AnalysisType | null {
  const gEn = normalize(group.analysis_type);
  const gEs = normalize(group.analysis_type_es);

  // Pass 1: exact normalized match
  for (const type of types) {
    const tEn = normalize(type.name_en);
    const tEs = normalize(type.name_es);
    if (tEn === gEn || tEs === gEs) return type;
  }

  // Pass 2: substring match
  for (const type of types) {
    const tEn = normalize(type.name_en);
    const tEs = normalize(type.name_es);
    if (
      (gEn && tEn && (tEn.includes(gEn) || gEn.includes(tEn))) ||
      (gEs && tEs && (tEs.includes(gEs) || gEs.includes(tEs)))
    ) {
      return type;
    }
  }

  // Pass 3: word overlap >= 50%
  let bestMatch: AnalysisType | null = null;
  let bestScore = 0;
  for (const type of types) {
    const scoreEn = gEn ? wordOverlap(gEn, type.name_en) : 0;
    const scoreEs = gEs ? wordOverlap(gEs, type.name_es) : 0;
    const score = Math.max(scoreEn, scoreEs);
    if (score > bestScore) { bestScore = score; bestMatch = type; }
  }
  if (bestScore >= 0.5) return bestMatch;

  return null;
}

function findBestMatch(parsed: ParsedResult, indicators: Indicator[]): Indicator | null {
  const pName = parsed.name.toLowerCase().trim();
  const pNameEs = parsed.name_es.toLowerCase().trim();

  for (const ind of indicators) {
    const iEn = ind.name_en.toLowerCase();
    const iEs = ind.name_es.toLowerCase();

    if (iEn.includes(pName) || pName.includes(iEn) || iEs.includes(pNameEs) || pNameEs.includes(iEs)) {
      return ind;
    }
  }
  return null;
}

const PALETTE = ["#5C6BC0", "#26A69A", "#EF5350", "#AB47BC", "#FF7043", "#66BB6A", "#42A5F5"];

function generateColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 900, margin: "0 auto" },
  backButton: {
    background: "none",
    border: "none",
    color: theme.colors.primary,
    cursor: "pointer",
    fontSize: 14,
    marginBottom: theme.spacing.md,
    padding: 0,
  },
  title: { fontSize: 24, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  instructions: { color: theme.colors.textSecondary, marginBottom: theme.spacing.xl },
  metaSection: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  field: { marginBottom: theme.spacing.md },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    fontSize: 14,
    boxSizing: "border-box" as const,
  },
  select: {
    width: "100%",
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  sectionCard: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.colors.textPrimary,
    margin: 0,
  },
  sectionCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  badge: {
    display: "inline-block",
    padding: `2px ${theme.spacing.sm}`,
    borderRadius: "12px",
    fontSize: 12,
    fontWeight: 600,
  },
  newTypeCard: {
    padding: theme.spacing.lg,
    backgroundColor: "#FFF8E1",
    borderRadius: theme.borderRadius,
    border: "1px solid #FFE082",
    marginBottom: theme.spacing.md,
  },
  newTypeText: {
    margin: 0,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  newTypeSubtext: {
    margin: 0,
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  createTypeButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: "#F57F17",
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  tableContainer: {
    overflowX: "auto" as const,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.colors.border}`,
  },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: {
    textAlign: "left" as const,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: 12,
    fontWeight: 700,
    color: theme.colors.textSecondary,
    textTransform: "uppercase" as const,
    borderBottom: `2px solid ${theme.colors.border}`,
    letterSpacing: "0.5px",
  },
  td: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    verticalAlign: "middle" as const,
  },
  trEven: { backgroundColor: "#FAFAFA" },
  parsedName: { fontWeight: 600, color: theme.colors.textPrimary },
  parsedNameEs: { fontSize: 12, color: theme.colors.textSecondary },
  matchSelect: {
    width: "100%",
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "4px",
    fontSize: 13,
    backgroundColor: "#fff",
  },
  valueInput: {
    width: 90,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "4px",
    fontSize: 14,
    textAlign: "right" as const,
  },
  unitText: { fontSize: 13, color: theme.colors.textSecondary },
  actions: {
    display: "flex",
    gap: theme.spacing.md,
    justifyContent: "flex-end",
    marginTop: theme.spacing.lg,
  },
  discardButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.textSecondary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
  },
  saveButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  saveButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  errorCard: {
    padding: theme.spacing.lg,
    backgroundColor: "#FFEBEE",
    borderRadius: theme.borderRadius,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    margin: 0,
    color: "#C62828",
    fontSize: 14,
    lineHeight: 1.5,
    wordBreak: "break-word" as const,
  },
};
