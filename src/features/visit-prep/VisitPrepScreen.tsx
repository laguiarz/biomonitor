import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAnalysisTypes,
  getIndicators,
  getResultsByAnalysisType,
  getMedications,
  getSymptoms,
  getMilestones,
  type AnalysisType,
  type Indicator,
  type AnalysisTypeResult,
  type Medication,
  type Symptom,
  type Milestone,
} from "../../core/database";
import { theme } from "../../core/theme/theme";
import { SPECIALTIES, matchTypesForSpecialty } from "./specialtyMapping";
import { generateVisitPrepPdf } from "./pdfGenerator";

export default function VisitPrepScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(SPECIALTIES[0].key);
  const [selectedTypeIds, setSelectedTypeIds] = useState<Set<number>>(new Set());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [generating, setGenerating] = useState(false);

  // Load analysis types + health log data
  useEffect(() => {
    getAnalysisTypes().then(setAnalysisTypes);
    getMedications(true).then(setMedications);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.toISOString().slice(0, 10);

    getSymptoms().then((all) =>
      setSymptoms(all.filter((s) => s.symptom_date >= cutoff)),
    );
    getMilestones().then((all) =>
      setMilestones(all.filter((m) => m.milestone_date >= cutoff)),
    );
  }, []);

  // Auto-select types when specialty or types list changes
  useEffect(() => {
    const specialty = SPECIALTIES.find((s) => s.key === selectedSpecialty);
    if (!specialty) return;
    const matched = matchTypesForSpecialty(specialty, analysisTypes);
    setSelectedTypeIds(matched);
  }, [selectedSpecialty, analysisTypes]);

  const toggleType = (id: number) => {
    setSelectedTypeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selectedTypeIds.size === 0) return;
    setGenerating(true);
    try {
      // Fetch data for all selected types
      const typeDataPromises = [...selectedTypeIds].map(async (typeId) => {
        const type = analysisTypes.find((at) => at.id === typeId)!;
        const [indicators, results] = await Promise.all([
          getIndicators(typeId),
          getResultsByAnalysisType(typeId),
        ]);
        return { type, indicators, results } as {
          type: AnalysisType;
          indicators: Indicator[];
          results: AnalysisTypeResult[];
        };
      });

      const types = await Promise.all(typeDataPromises);

      generateVisitPrepPdf(
        { types, medications, symptoms, milestones },
        t,
        lang,
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t("visitPrep.title")}</h1>
      <p style={styles.subtitle}>{t("visitPrep.subtitle")}</p>

      {/* Specialty selector */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("visitPrep.specialty")}</h2>
        <div style={styles.chips}>
          {SPECIALTIES.map((s) => (
            <button
              key={s.key}
              style={{
                ...styles.chip,
                ...(selectedSpecialty === s.key ? styles.chipActive : {}),
              }}
              onClick={() => setSelectedSpecialty(s.key)}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis type toggles */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("visitPrep.analysisTypes")}</h2>
        <div style={styles.chips}>
          {analysisTypes.map((at) => {
            const isSelected = selectedTypeIds.has(at.id);
            return (
              <button
                key={at.id}
                style={{
                  ...styles.typeChip,
                  ...(isSelected ? styles.typeChipActive : {}),
                }}
                onClick={() => toggleType(at.id)}
              >
                <span
                  style={{
                    ...styles.colorDot,
                    backgroundColor: at.color_hex,
                  }}
                />
                {lang === "es" ? at.name_es : at.name_en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("visitPrep.summary")}</h2>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            {t("visitPrep.typesSelected", { count: selectedTypeIds.size })}
          </div>
          <div style={styles.summaryItem}>
            {t("visitPrep.activeMeds", { count: medications.length })}
          </div>
          <div style={styles.summaryItem}>
            {t("visitPrep.recentSymptoms", { count: symptoms.length })}
          </div>
          <div style={styles.summaryItem}>
            {t("visitPrep.recentMilestones", { count: milestones.length })}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        style={{
          ...styles.generateBtn,
          ...(selectedTypeIds.size === 0 || generating
            ? styles.generateBtnDisabled
            : {}),
        }}
        disabled={selectedTypeIds.size === 0 || generating}
        onClick={handleGenerate}
      >
        {generating ? t("visitPrep.generating") : t("visitPrep.generate")}
      </button>

      {selectedTypeIds.size === 0 && (
        <p style={styles.hint}>{t("visitPrep.noTypesSelected")}</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: theme.spacing.lg,
    maxWidth: 800,
    margin: "0 auto",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 1.5,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  chip: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: 20,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surface,
    cursor: "pointer",
    fontSize: 13,
    color: theme.colors.textSecondary,
    transition: "all 0.15s",
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    color: "#fff",
    borderColor: theme.colors.primary,
    fontWeight: 600,
  },
  typeChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: `6px 14px`,
    borderRadius: 20,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surface,
    cursor: "pointer",
    fontSize: 13,
    color: theme.colors.textSecondary,
    transition: "all 0.15s",
  },
  typeChipActive: {
    backgroundColor: "#E3F2FD",
    borderColor: theme.colors.primary,
    color: theme.colors.primary,
    fontWeight: 600,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: theme.spacing.sm,
  },
  summaryItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  generateBtn: {
    width: "100%",
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: theme.spacing.sm,
  },
  generateBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.sm,
    fontStyle: "italic",
  },
};
