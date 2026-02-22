import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getOrdersWithCounts, getOrdersWithCountsByAnalysisType, getAnalysisType, type OrderWithCount } from "../../core/database";
import { theme } from "../../core/theme/theme";

export default function OrdersListScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeId = searchParams.get("typeId") ? Number(searchParams.get("typeId")) : null;
  const lang = i18n.language.startsWith("es") ? "es" : "en";
  const [orders, setOrders] = useState<OrderWithCount[]>([]);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (typeId) {
        const [data, type] = await Promise.all([
          getOrdersWithCountsByAnalysisType(typeId),
          getAnalysisType(typeId),
        ]);
        setOrders(data);
        if (type) setFilterLabel(lang === "es" ? type.name_es : type.name_en);
      } else {
        setOrders(await getOrdersWithCounts());
      }
      setLoading(false);
    }
    load().catch((e) => { console.error("Failed to load orders:", e); setLoading(false); });
  }, [typeId, lang]);

  if (loading) {
    return <div style={styles.center}>{t("common.loading")}</div>;
  }

  return (
    <div style={styles.container}>
      {typeId && (
        <button style={styles.backButton} onClick={() => navigate("/analysis-types")}>
          &larr; {t("common.back")}
        </button>
      )}
      <h1 style={styles.title}>
        {t("orders.title")}{filterLabel ? `: ${filterLabel}` : ""}
      </h1>

      {orders.length === 0 ? (
        <p style={styles.emptyText}>{t("orders.noOrders")}</p>
      ) : (
        <div style={styles.list}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={styles.card}
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div style={styles.cardContent}>
                <div style={styles.cardTop}>
                  <span style={styles.date}>{order.order_date}</span>
                  <span style={styles.badge}>
                    {order.record_count} {t("orders.recordCount")}
                  </span>
                </div>
                {order.lab_name && (
                  <span style={styles.sub}>{t("orders.lab")}: {order.lab_name}</span>
                )}
                {order.doctor_name && (
                  <span style={styles.sub}>{t("orders.doctor")}: {order.doctor_name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 800, margin: "0 auto" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: theme.colors.textSecondary },
  backButton: { background: "none", border: "none", color: theme.colors.primary, cursor: "pointer", fontSize: 14, marginBottom: theme.spacing.md, padding: 0 },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  emptyText: { color: theme.colors.textSecondary, fontStyle: "italic", textAlign: "center", marginTop: theme.spacing.xl },
  list: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  card: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    cursor: "pointer",
  },
  cardContent: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  date: { fontWeight: 600, fontSize: 15, color: theme.colors.textPrimary },
  badge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 10px",
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    color: theme.colors.primary,
  },
  sub: { color: theme.colors.textSecondary, fontSize: 13 },
};
