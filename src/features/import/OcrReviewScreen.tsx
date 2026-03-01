import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { theme } from "../../core/theme/theme";
import type { ParsedResult, ParsedGroup } from "../../core/services/llmParser";
import type { ImportedFile } from "./ImportScreen";
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

interface FileBlock {
  fileName: string;
  rawText: string;
  pdfBase64: string;
  date: string;
  labName: string;
  doctorName: string;
  sections: GroupSection[];
}

export default function OcrReviewScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const rawState = location.state as { files?: ImportedFile[] } | null;
  const stateFiles = rawState?.files ?? null;

  const [allTypes, setAllTypes] = useState<AnalysisType[]>([]);
  const [fileBlocks, setFileBlocks] = useState<FileBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isEs = i18n.language.startsWith("es");

  useEffect(() => {
    if (!stateFiles) navigate("/import", { replace: true });
  }, [stateFiles, navigate]);

  useEffect(() => {
    if (!stateFiles) return;
    getAnalysisTypes().then((types) => {
      setAllTypes(types);
      buildFileBlocks(stateFiles, types);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildFileBlocks = useCallback(
    async (files: ImportedFile[], types: AnalysisType[]) => {
      const blocks: FileBlock[] = [];

      for (const file of files) {
        const sections: GroupSection[] = [];

        for (const group of file.parsed.groups) {
          const matchedType = findMatchingType(group, types);
          let indicators: Indicator[] = [];
          let rows: MatchedRow[];

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

          sections.push({
            group,
            matchedTypeId: matchedType?.id ?? null,
            isNewType: !matchedType,
            creatingType: false,
            typeCreated: false,
            indicators,
            rows,
          });
        }

        blocks.push({
          fileName: file.fileName,
          rawText: file.rawText,
          pdfBase64: file.pdfBase64,
          date: file.parsed.date ?? new Date().toISOString().slice(0, 10),
          labName: file.parsed.lab_name,
          doctorName: file.parsed.doctor_name,
          sections,
        });
      }

      setFileBlocks(blocks);
    },
    [],
  );

  if (!stateFiles) return null;

  const multiFile = fileBlocks.length > 1;
  const typeName = (at: AnalysisType) => (isEs ? at.name_es : at.name_en);
  const indName = (ind: Indicator) => (isEs ? ind.name_es : ind.name_en);

  // --- Updaters ---

  const updateBlock = (fIdx: number, patch: Partial<FileBlock>) => {
    setFileBlocks((prev) => {
      const next = [...prev];
      next[fIdx] = { ...next[fIdx], ...patch };
      return next;
    });
  };

  const updateSection = (fIdx: number, sIdx: number, patch: Partial<GroupSection>) => {
    setFileBlocks((prev) => {
      const next = [...prev];
      const fb = { ...next[fIdx] };
      const sections = [...fb.sections];
      sections[sIdx] = { ...sections[sIdx], ...patch };
      fb.sections = sections;
      next[fIdx] = fb;
      return next;
    });
  };

  const updateRow = (fIdx: number, sIdx: number, rIdx: number, patch: Partial<MatchedRow>) => {
    setFileBlocks((prev) => {
      const next = [...prev];
      const fb = { ...next[fIdx] };
      const sections = [...fb.sections];
      const section = { ...sections[sIdx] };
      const rows = [...section.rows];
      rows[rIdx] = { ...rows[rIdx], ...patch };
      section.rows = rows;
      sections[sIdx] = section;
      fb.sections = sections;
      next[fIdx] = fb;
      return next;
    });
  };

  const handleTypeChange = async (fIdx: number, sIdx: number, typeId: number | null) => {
    updateSection(fIdx, sIdx, { matchedTypeId: typeId, isNewType: typeId === null });

    if (typeId) {
      const indicators = await getIndicators(typeId);
      const group = fileBlocks[fIdx].sections[sIdx].group;
      updateSection(fIdx, sIdx, {
        matchedTypeId: typeId,
        isNewType: false,
        indicators,
        rows: group.results.map((pr) => ({
          parsed: pr,
          indicatorId: findBestMatch(pr, indicators)?.id ?? null,
          value: String(pr.value),
        })),
      });
    }
  };

  const handleCreateType = async (fIdx: number, sIdx: number) => {
    const group = fileBlocks[fIdx]?.sections[sIdx]?.group;
    if (!group) return;

    updateSection(fIdx, sIdx, { creatingType: true });

    try {
      const typeId = await createAnalysisType({
        name_en: group.analysis_type,
        name_es: group.analysis_type_es,
        description_en: "",
        description_es: "",
        icon_name: "clipboard",
        color_hex: generateColor(sIdx),
        is_builtin: 0,
        is_active: 1,
      });

      if (!typeId || typeId === 0) throw new Error("Failed to create analysis type");

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

      const indicators = await getIndicators(typeId);
      const updatedTypes = await getAnalysisTypes();
      setAllTypes(updatedTypes);

      updateSection(fIdx, sIdx, {
        matchedTypeId: typeId,
        isNewType: false,
        creatingType: false,
        typeCreated: true,
        indicators,
        rows: group.results.map((pr) => ({
          parsed: pr,
          indicatorId: findBestMatch(pr, indicators)?.id ?? null,
          value: String(pr.value),
        })),
      });
    } catch (err) {
      console.error("Failed to create analysis type:", err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
      updateSection(fIdx, sIdx, { creatingType: false });
    }
  };

  // --- Counts ---

  const getSectionValidCount = (section: GroupSection): number =>
    section.rows.filter(
      (r) => r.indicatorId !== null && r.value.trim() !== "" && !isNaN(Number(r.value)),
    ).length;

  const totalValidCount = fileBlocks.reduce(
    (sum, fb) => sum + fb.sections.reduce((s, sec) => s + (sec.matchedTypeId ? getSectionValidCount(sec) : 0), 0),
    0,
  );

  const hasSavable = fileBlocks.some(
    (fb) => fb.sections.some((s) => s.matchedTypeId && getSectionValidCount(s) > 0),
  );

  // --- Save ---

  const handleSave = async () => {
    if (!hasSavable || saving) return;
    setSaving(true);
    setSaveError("");
    let lastOrderId: number | null = null;

    try {
      for (const fb of fileBlocks) {
        const savable = fb.sections.filter((s) => s.matchedTypeId && getSectionValidCount(s) > 0);
        if (savable.length === 0) continue;

        const orderId = await createOrder({
          order_date: fb.date,
          lab_name: fb.labName,
          doctor_name: fb.doctorName,
          notes: "",
          source: "pdf-import",
          pdf_data: fb.pdfBase64 || null,
          pdf_filename: fb.pdfBase64 ? fb.fileName : null,
        });
        lastOrderId = orderId;

        for (const section of savable) {
          const validRows = section.rows.filter(
            (r) => r.indicatorId !== null && r.value.trim() !== "" && !isNaN(Number(r.value)),
          );

          const deduped = new Map<number, (typeof validRows)[number]>();
          for (const row of validRows) deduped.set(row.indicatorId!, row);

          const recordId = await createRecord({
            analysis_type_id: section.matchedTypeId!,
            record_date: fb.date,
            lab_name: fb.labName,
            doctor_name: fb.doctorName,
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
            file_path: fb.fileName,
            raw_text: fb.rawText,
            status: "completed",
          });
        }
      }

      if (fileBlocks.length === 1 && lastOrderId) {
        navigate(`/orders/${lastOrderId}`, { replace: true });
      } else {
        navigate("/orders", { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to save import:", message);
      setSaveError(message);
      setSaving(false);
    }
  };

  // --- Render ---

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate("/import")}>
        &larr; {t("common.back")}
      </button>

      <h1 style={styles.title}>{t("import.reviewTitle")}</h1>
      <p style={styles.instructions}>{t("import.reviewInstructions")}</p>

      {fileBlocks.map((fb, fIdx) => (
        <div key={fIdx} style={multiFile ? styles.fileBlock : undefined}>
          {multiFile && <h2 style={styles.fileTitle}>{fb.fileName}</h2>}

          {/* Metadata */}
          <div style={styles.metaSection}>
            <div style={styles.field}>
              <label style={styles.label}>{t("records.date")}</label>
              <input type="date" style={styles.input} value={fb.date} onChange={(e) => updateBlock(fIdx, { date: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t("records.lab")}</label>
              <input type="text" style={styles.input} value={fb.labName} onChange={(e) => updateBlock(fIdx, { labName: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{t("records.doctor")}</label>
              <input type="text" style={styles.input} value={fb.doctorName} onChange={(e) => updateBlock(fIdx, { doctorName: e.target.value })} />
            </div>
          </div>

          {/* Sections */}
          {fb.sections.map((section, sIdx) => (
            <div key={sIdx} style={styles.sectionCard}>
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
                    handleTypeChange(fIdx, sIdx, val === "new" ? null : Number(val) || null);
                  }}
                >
                  <option value="">{t("import.selectType")}...</option>
                  {allTypes.map((at) => (
                    <option key={at.id} value={at.id}>{typeName(at)}</option>
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
                    onClick={() => handleCreateType(fIdx, sIdx)}
                    disabled={section.creatingType}
                  >
                    {section.creatingType ? t("common.loading") : t("import.createAndMatch")}
                  </button>
                </div>
              )}

              {/* Results matching table */}
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
                                updateRow(fIdx, sIdx, rIdx, { indicatorId: val ? Number(val) : null });
                              }}
                            >
                              <option value="">{t("import.skipIndicator")}</option>
                              {section.indicators.map((ind) => (
                                <option key={ind.id} value={ind.id}>{indName(ind)} ({ind.unit})</option>
                              ))}
                            </select>
                          </td>
                          <td style={styles.td}>
                            <input
                              type="number"
                              step="any"
                              style={styles.valueInput}
                              value={row.value}
                              onChange={(e) => updateRow(fIdx, sIdx, rIdx, { value: e.target.value })}
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
        </div>
      ))}

      {saveError && (
        <div style={styles.errorCard}>
          <p style={styles.errorText}>{t("common.error")}: {saveError}</p>
        </div>
      )}

      <div style={styles.actions}>
        <button style={styles.discardButton} onClick={() => navigate("/import")}>
          {t("import.discard")}
        </button>
        <button
          style={{
            ...styles.saveButton,
            ...(totalValidCount === 0 || !hasSavable || saving ? styles.saveButtonDisabled : {}),
          }}
          disabled={totalValidCount === 0 || !hasSavable || saving}
          onClick={handleSave}
        >
          {saving ? t("common.loading") : `${t("import.save")} (${totalValidCount})`}
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

  for (const type of types) {
    const tEn = normalize(type.name_en);
    const tEs = normalize(type.name_es);
    if (tEn === gEn || tEs === gEs) return type;
  }

  for (const type of types) {
    const tEn = normalize(type.name_en);
    const tEs = normalize(type.name_es);
    if (
      (gEn && tEn && (tEn.includes(gEn) || gEn.includes(tEn))) ||
      (gEs && tEs && (tEs.includes(gEs) || gEs.includes(tEs)))
    ) return type;
  }

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
    if (iEn.includes(pName) || pName.includes(iEn) || iEs.includes(pNameEs) || pNameEs.includes(iEs)) return ind;
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
  fileBlock: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius,
    border: `2px solid ${theme.colors.border}`,
    backgroundColor: "#FAFAFA",
  },
  fileTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: theme.colors.primary,
    marginTop: 0,
    marginBottom: theme.spacing.md,
  },
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
  sectionTitle: { fontSize: 18, fontWeight: 700, color: theme.colors.textPrimary, margin: 0 },
  sectionCount: { fontSize: 13, color: theme.colors.textSecondary },
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
  newTypeText: { margin: 0, marginBottom: theme.spacing.sm, color: theme.colors.textPrimary, fontSize: 14 },
  newTypeSubtext: { margin: 0, marginBottom: theme.spacing.md, color: theme.colors.textSecondary, fontSize: 13 },
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
  saveButtonDisabled: { opacity: 0.5, cursor: "not-allowed" },
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
