import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAnalysisTypes,
  getIndicators,
  getIndicatorTrend,
  getResultsByAnalysisType,
  type AnalysisType,
  type Indicator,
  type TrendPoint,
  type AnalysisTypeResult,
} from "../../core/database";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { theme } from "../../core/theme/theme";

/** Format "YYYY-MM-DD" → "MM-YY" */
function formatDateCol(date: string): string {
  const parts = date.split("-");
  if (parts.length >= 3) return `${parts[1]}-${parts[0].slice(2)}`;
  return date;
}

export default function TrendsScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [allResults, setAllResults] = useState<AnalysisTypeResult[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);

  useEffect(() => {
    getAnalysisTypes().then(setAnalysisTypes);
  }, []);

  useEffect(() => {
    if (!selectedTypeId) {
      setIndicators([]);
      setAllResults([]);
      setSelectedIndicatorId(null);
      return;
    }
    Promise.all([
      getIndicators(selectedTypeId),
      getResultsByAnalysisType(selectedTypeId),
    ]).then(([inds, results]) => {
      setIndicators(inds);
      setAllResults(results);
      setSelectedIndicatorId(null);
    });
  }, [selectedTypeId]);

  useEffect(() => {
    if (!selectedIndicatorId) {
      setTrendData([]);
      setSelectedIndicator(null);
      return;
    }
    const ind = indicators.find((i) => i.id === selectedIndicatorId) ?? null;
    setSelectedIndicator(ind);
    getIndicatorTrend(selectedIndicatorId).then(setTrendData);
  }, [selectedIndicatorId, indicators]);

  // Build table data: unique records as columns, keyed by record_id
  // Each column = one record (avoids collapsing same-date records)
  interface ColInfo { recordId: number; date: string; label: string }
  const colMap = new Map<number, { recordId: number; date: string }>();
  for (const r of allResults) {
    if (!colMap.has(r.record_id)) colMap.set(r.record_id, { recordId: r.record_id, date: r.record_date });
  }
  const sortedCols: ColInfo[] = [...colMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.recordId - b.recordId)
    .map((c) => ({ ...c, label: formatDateCol(c.date) }));
  // Disambiguate columns that share the same label
  for (let i = 0; i < sortedCols.length; i++) {
    const dupes = sortedCols.filter((c) => c.label === sortedCols[i].label);
    if (dupes.length > 1) {
      dupes.forEach((d, idx) => { d.label = `${d.label} (${idx + 1})`; });
    }
  }
  const dataMap = new Map<number, Map<number, { value: number; flagged: boolean }>>();
  for (const r of allResults) {
    if (!dataMap.has(r.indicator_id)) dataMap.set(r.indicator_id, new Map());
    dataMap.get(r.indicator_id)!.set(r.record_id, { value: r.value, flagged: r.is_flagged === 1 });
  }

  const refMin = selectedIndicator?.reference_min ?? null;
  const refMax = selectedIndicator?.reference_max ?? null;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t("trends.title")}</h1>

      <div style={styles.selectors}>
        <div style={styles.selectorGroup}>
          <label style={styles.label}>{t("trends.selectType")}</label>
          <select
            style={styles.select}
            value={selectedTypeId ?? ""}
            onChange={(e) => setSelectedTypeId(Number(e.target.value) || null)}
          >
            <option value="">-- {t("trends.selectType")} --</option>
            {analysisTypes.map((at) => (
              <option key={at.id} value={at.id}>
                {lang === "es" ? at.name_es : at.name_en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary table */}
      {selectedTypeId && indicators.length > 0 && sortedCols.length > 0 && (
        <div style={styles.tableWrapper}>
          <p style={styles.hint}>{t("trends.clickRowToChart")}</p>
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, ...styles.stickyCol, zIndex: 3 }}>{t("trends.selectIndicator")}</th>
                  {sortedCols.map((col) => (
                    <th key={col.recordId} style={styles.th}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {indicators.map((ind) => {
                  const row = dataMap.get(ind.id);
                  const isSelected = ind.id === selectedIndicatorId;
                  return (
                    <tr
                      key={ind.id}
                      style={{
                        ...styles.tr,
                        backgroundColor: isSelected ? theme.colors.primaryLight + "22" : undefined,
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedIndicatorId(ind.id)}
                    >
                      <td style={{ ...styles.td, ...styles.stickyCol, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {lang === "es" ? ind.name_es : ind.name_en}
                        {ind.unit ? ` (${ind.unit})` : ""}
                      </td>
                      {sortedCols.map((col) => {
                        const cell = row?.get(col.recordId);
                        if (!cell) return <td key={col.recordId} style={styles.td}>—</td>;
                        return (
                          <td
                            key={col.recordId}
                            style={{
                              ...styles.td,
                              color: cell.flagged ? theme.colors.error : theme.colors.textPrimary,
                              fontWeight: cell.flagged ? 700 : 400,
                            }}
                          >
                            {cell.value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTypeId && indicators.length > 0 && sortedCols.length === 0 && (
        <p style={styles.emptyText}>{t("trends.noData")}</p>
      )}

      {/* Chart */}
      {trendData.length > 0 && selectedIndicator && (
        <div style={styles.chartContainer}>
          <h2 style={styles.chartTitle}>
            {lang === "es" ? selectedIndicator.name_es : selectedIndicator.name_en}
            {selectedIndicator.unit ? ` (${selectedIndicator.unit})` : ""}
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
              <XAxis dataKey="record_date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: theme.borderRadius, boxShadow: theme.shadow }}
                formatter={(value: number) => [`${value} ${selectedIndicator.unit ?? ""}`, t("trends.value")]}
              />
              {refMin != null && refMax != null && (
                <ReferenceArea y1={refMin} y2={refMax} fill={theme.colors.success} fillOpacity={0.15} label={{
                  value: t("trends.referenceRange"),
                  position: "insideTopRight",
                  style: { fontSize: 11, fill: theme.colors.success },
                }} />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={theme.colors.primary}
                strokeWidth={2}
                dot={{ r: 5, fill: theme.colors.primary }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 1100, margin: "0 auto" },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  selectors: { display: "flex", gap: theme.spacing.lg, marginBottom: theme.spacing.lg, flexWrap: "wrap" },
  selectorGroup: { display: "flex", flexDirection: "column", gap: theme.spacing.xs },
  label: { fontSize: 14, fontWeight: 600, color: theme.colors.textPrimary },
  select: { padding: theme.spacing.sm, borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.border}`, fontSize: 14, minWidth: 220 },
  hint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontStyle: "italic" },
  tableWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "8px 12px",
    textAlign: "right",
    borderBottom: `2px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    fontWeight: 600,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  tr: { transition: "background-color 0.15s" },
  td: {
    padding: "6px 12px",
    borderBottom: `1px solid ${theme.colors.border}`,
    textAlign: "right",
  },
  stickyCol: {
    position: "sticky",
    left: 0,
    backgroundColor: theme.colors.surface,
    textAlign: "left",
    zIndex: 2,
  },
  emptyText: { color: theme.colors.textSecondary, fontStyle: "italic", textAlign: "center", marginTop: theme.spacing.xl },
  chartContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    padding: theme.spacing.md,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.md,
  },
};
