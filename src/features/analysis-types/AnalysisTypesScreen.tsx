import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getAnalysisTypesWithOrderCounts, type AnalysisTypeWithOrderCount } from "../../core/database";
import { theme } from "../../core/theme/theme";

export default function AnalysisTypesScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [types, setTypes] = useState<AnalysisTypeWithOrderCount[]>([]);
  const [loading, setLoading] = useState(true);
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  useEffect(() => {
    async function load() {
      try {
        const data = await getAnalysisTypesWithOrderCounts();
        setTypes(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div style={styles.center}>{t("common.loading")}</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t("analysisTypes.title")}</h1>
        <button style={styles.addButton} onClick={() => navigate("/analysis-types/new")}>
          + {t("analysisTypes.addNew")}
        </button>
      </div>

      <div style={styles.grid}>
        {types.map((type) => (
          <div key={type.id} style={styles.card}>
            <div style={{ ...styles.colorDot, backgroundColor: type.color_hex }} />
            <div style={styles.cardContent}>
              <span style={styles.typeName}>
                {lang === "es" ? type.name_es : type.name_en}
              </span>
              <span style={styles.typeDesc}>
                {lang === "es" ? type.description_es : type.description_en}
              </span>
            </div>
            <div style={styles.cardActions}>
              <button
                style={{
                  ...styles.orderBadge,
                  color: type.order_count === 0 ? theme.colors.textSecondary : theme.colors.primary,
                  backgroundColor: type.order_count === 0 ? theme.colors.background : "#E3F2FD",
                  cursor: type.order_count === 0 ? "default" : "pointer",
                }}
                onClick={() => { if (type.order_count > 0) navigate(`/orders?typeId=${type.id}`); }}
                title={type.order_count > 0 ? t("orders.title") : t("analysisTypes.noOrders")}
              >
                {type.order_count === 0
                  ? t("analysisTypes.noOrders")
                  : `${type.order_count} ${type.order_count === 1 ? t("analysisTypes.order") : t("analysisTypes.ordersCount")}`}
              </button>
              <button
                style={styles.editButton}
                onClick={() => navigate(`/analysis-types/${type.id}`)}
                title={t("common.edit")}
              >
                &#9998;
              </button>
            </div>
          </div>
        ))}
      </div>
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
  grid: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  card: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
  },
  colorDot: { width: 16, height: 16, borderRadius: "50%", flexShrink: 0 },
  cardContent: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 },
  typeName: { fontWeight: 600, fontSize: 16 },
  typeDesc: { color: theme.colors.textSecondary, fontSize: 13 },
  cardActions: { display: "flex", alignItems: "center", gap: theme.spacing.sm, flexShrink: 0 },
  orderBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: 12,
    border: "none",
    whiteSpace: "nowrap",
  },
  editButton: {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.surface,
    cursor: "pointer",
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
};
