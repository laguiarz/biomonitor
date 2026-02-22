import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { getRecord, getResults, getIndicators, getAnalysisType, getOrder, getRecordsByOrderId, getAnalysisTypes, deleteRecord, type MedicalRecord, type Result, type Indicator, type AnalysisType, type Order } from "../../core/database";
import { theme } from "../../core/theme/theme";

export default function RecordDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [indicators, setIndicators] = useState<Map<number, Indicator>>(new Map());
  const [order, setOrder] = useState<Order | null>(null);
  const [siblingRecords, setSiblingRecords] = useState<(MedicalRecord & { typeName: string; typeColor: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const rec = await getRecord(Number(id));
        if (!rec) return;
        setRecord(rec);

        const [type, res] = await Promise.all([
          getAnalysisType(rec.analysis_type_id),
          getResults(rec.id),
        ]);
        setAnalysisType(type);
        setResults(res);

        if (type) {
          const inds = await getIndicators(type.id);
          setIndicators(new Map(inds.map((i) => [i.id, i])));
        }

        if (rec.order_id) {
          const [ord, orderRecords, allTypes] = await Promise.all([
            getOrder(rec.order_id),
            getRecordsByOrderId(rec.order_id),
            getAnalysisTypes(),
          ]);
          setOrder(ord);
          const typesMap = new Map(allTypes.map((t) => [t.id, t]));
          setSiblingRecords(
            orderRecords
              .filter((r) => r.id !== rec.id)
              .map((r) => {
                const at = typesMap.get(r.analysis_type_id);
                return {
                  ...r,
                  typeName: at ? (lang === "es" ? at.name_es : at.name_en) : "",
                  typeColor: at?.color_hex ?? theme.colors.primary,
                };
              })
          );
        }
      } catch (e) {
        console.error("Failed to load record:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!record || !confirm(t("records.deleteConfirm"))) return;
    await deleteRecord(record.id);
    navigate("/records");
  };

  if (loading) {
    return <div style={styles.center}>{t("common.loading")}</div>;
  }

  if (!record) {
    return <div style={styles.center}>{t("common.error")}</div>;
  }

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate("/records")}>
        &larr; {t("common.back")}
      </button>

      <div style={styles.headerCard}>
        <div style={{ ...styles.typeColor, backgroundColor: analysisType?.color_hex ?? theme.colors.primary }} />
        <div>
          <h1 style={styles.title}>
            {analysisType ? (lang === "es" ? analysisType.name_es : analysisType.name_en) : ""}
          </h1>
          <p style={styles.date}>{record.record_date}</p>
          {record.lab_name && <p style={styles.sub}>{t("records.lab")}: {record.lab_name}</p>}
          {record.doctor_name && <p style={styles.sub}>{t("records.doctor")}: {record.doctor_name}</p>}
          {record.notes && <p style={styles.sub}>{t("records.notes")}: {record.notes}</p>}
        </div>
      </div>

      <div style={styles.actions}>
        <button style={styles.editButton} onClick={() => navigate(`/records/${record.id}/edit`)}>
          {t("recordDetail.edit")}
        </button>
        <button style={styles.deleteButton} onClick={handleDelete}>
          {t("recordDetail.delete")}
        </button>
      </div>

      <h2 style={styles.sectionTitle}>{t("recordDetail.results")}</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{t("recordDetail.indicator")}</th>
            <th style={styles.th}>{t("recordDetail.value")}</th>
            <th style={styles.th}>{t("recordDetail.reference")}</th>
            <th style={styles.th}>{t("recordDetail.status")}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((res) => {
            const ind = indicators.get(res.indicator_id);
            const isOutOfRange = res.is_flagged === 1;
            return (
              <tr key={res.id} style={{ backgroundColor: isOutOfRange ? theme.colors.flagged : "transparent" }}>
                <td style={styles.td}>
                  {ind ? (lang === "es" ? ind.name_es : ind.name_en) : `#${res.indicator_id}`}
                </td>
                <td style={{ ...styles.td, fontWeight: 600 }}>
                  {res.value} {ind?.unit ?? ""}
                </td>
                <td style={styles.td}>
                  {res.ref_min_snapshot != null && res.ref_max_snapshot != null
                    ? `${res.ref_min_snapshot} - ${res.ref_max_snapshot}`
                    : "-"}
                </td>
                <td style={styles.td}>
                  <span style={{
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: isOutOfRange ? theme.colors.error : theme.colors.success,
                    color: "#fff",
                  }}>
                    {isOutOfRange ? t("recordDetail.outOfRange") : t("recordDetail.normal")}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {record.order_id && order && (
        <>
          <h2 style={styles.sectionTitle}>{t("records.relatedRecords")}</h2>
          <p style={styles.relatedSubtext}>
            <span
              style={styles.orderLink}
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              {t("records.fromOrder")} — {order.order_date}
            </span>
          </p>
          <div style={styles.relatedGrid}>
            {siblingRecords.map((sib) => (
              <button
                key={sib.id}
                style={styles.relatedCard}
                onClick={() => navigate(`/records/${sib.id}`)}
              >
                <div style={{ ...styles.relatedColor, backgroundColor: sib.typeColor }} />
                <div>
                  <div style={styles.relatedName}>{sib.typeName}</div>
                  <div style={styles.relatedDate}>{sib.record_date}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 800, margin: "0 auto" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: theme.colors.textSecondary },
  backButton: { background: "none", border: "none", color: theme.colors.primary, cursor: "pointer", fontSize: 14, marginBottom: theme.spacing.md, padding: 0 },
  headerCard: {
    display: "flex",
    gap: theme.spacing.lg,
    alignItems: "flex-start",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    marginBottom: theme.spacing.lg,
  },
  typeColor: { width: 8, minHeight: 60, borderRadius: 4 },
  title: { fontSize: 24, fontWeight: 700, color: theme.colors.textPrimary, margin: 0 },
  date: { color: theme.colors.textSecondary, margin: "4px 0" },
  sub: { color: theme.colors.textSecondary, fontSize: 13, margin: "2px 0" },
  actions: { display: "flex", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  editButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
  },
  deleteButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.error,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: theme.spacing.md },
  table: { width: "100%", borderCollapse: "collapse", backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius, overflow: "hidden", boxShadow: theme.shadow },
  th: { textAlign: "left", padding: theme.spacing.md, borderBottom: `2px solid ${theme.colors.border}`, fontSize: 13, color: theme.colors.textSecondary, fontWeight: 600 },
  td: { padding: theme.spacing.md, borderBottom: `1px solid ${theme.colors.border}`, fontSize: 14 },
  relatedSubtext: { color: theme.colors.textSecondary, fontSize: 13, marginTop: -8, marginBottom: theme.spacing.md },
  orderLink: { color: theme.colors.primary, cursor: "pointer", textDecoration: "underline" },
  relatedGrid: { display: "flex", flexWrap: "wrap" as const, gap: theme.spacing.md },
  relatedCard: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    border: "none",
    cursor: "pointer",
    textAlign: "left" as const,
    minWidth: 180,
  },
  relatedColor: { width: 6, height: 36, borderRadius: 3 },
  relatedName: { fontWeight: 600, fontSize: 14, color: theme.colors.textPrimary },
  relatedDate: { fontSize: 12, color: theme.colors.textSecondary },
};
