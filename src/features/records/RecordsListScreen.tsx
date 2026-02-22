import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getRecords, getAnalysisTypes, type MedicalRecord, type AnalysisType } from "../../core/database";
import { theme } from "../../core/theme/theme";

export default function RecordsListScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([]);
  const [filterType, setFilterType] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  useEffect(() => {
    async function load() {
      try {
        const [recs, types] = await Promise.all([
          getRecords(filterType ?? undefined),
          getAnalysisTypes(),
        ]);
        setRecords(recs);
        setAnalysisTypes(types);
      } catch (e) {
        console.error("Failed to load records:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterType]);

  const typesMap = new Map(analysisTypes.map((t) => [t.id, t]));

  const renderRecordCard = (rec: MedicalRecord) => {
    const type = typesMap.get(rec.analysis_type_id);
    return (
      <div
        key={rec.id}
        style={styles.card}
        onClick={() => navigate(`/records/${rec.id}`)}
      >
        <div style={{ ...styles.colorBar, backgroundColor: type?.color_hex ?? theme.colors.primary }} />
        <div style={styles.cardContent}>
          <div style={styles.cardTop}>
            <span style={styles.typeName}>
              {type ? (lang === "es" ? type.name_es : type.name_en) : "Unknown"}
            </span>
            <span style={styles.date}>{rec.record_date}</span>
          </div>
          {rec.lab_name && <span style={styles.sub}>{rec.lab_name}</span>}
          {rec.doctor_name && <span style={styles.sub}>{rec.doctor_name}</span>}
        </div>
        <span style={styles.sourceTag}>
          {rec.source === "ocr" ? t("records.ocr") : t("records.manual")}
        </span>
      </div>
    );
  };

  if (loading) {
    return <div style={styles.center}>{t("common.loading")}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t("records.title")}</h1>
        <button style={styles.addButton} onClick={() => navigate("/records/new")}>
          + {t("records.addNew")}
        </button>
      </div>

      <div style={styles.filters}>
        <select
          style={styles.select}
          value={filterType ?? ""}
          onChange={(e) => setFilterType(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{t("records.allTypes")}</option>
          {analysisTypes.map((at) => (
            <option key={at.id} value={at.id}>
              {lang === "es" ? at.name_es : at.name_en}
            </option>
          ))}
        </select>
      </div>

      {records.length === 0 ? (
        <p style={styles.emptyText}>{t("records.noRecords")}</p>
      ) : (
        <div style={styles.list}>
          {records.map((rec) => renderRecordCard(rec))}
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
  addButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  filters: { marginBottom: theme.spacing.lg },
  select: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.colors.border}`,
    fontSize: 14,
    minWidth: 200,
  },
  emptyText: { color: theme.colors.textSecondary, fontStyle: "italic", textAlign: "center", marginTop: theme.spacing.xl },
  list: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  card: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    cursor: "pointer",
  },
  colorBar: { width: 6, height: 48, borderRadius: 3 },
  cardContent: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  typeName: { fontWeight: 600, fontSize: 15 },
  date: { color: theme.colors.textSecondary, fontSize: 13 },
  sub: { color: theme.colors.textSecondary, fontSize: 13 },
  sourceTag: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    color: theme.colors.textSecondary,
  },
};
