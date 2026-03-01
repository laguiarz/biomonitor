import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  getOrder,
  getRecordsByOrderId,
  getAnalysisTypes,
  deleteOrder,
  updateOrder,
  updateRecord,
  type Order,
  type MedicalRecord,
  type AnalysisType,
} from "../../core/database";
import { writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { tempDir, join } from "@tauri-apps/api/path";
import { theme } from "../../core/theme/theme";

export default function OrderDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [records, setRecords] = useState<(MedicalRecord & { typeName: string; typeColor: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editLab, setEditLab] = useState("");
  const [editDoctor, setEditDoctor] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const lang = i18n.language.startsWith("es") ? "es" : "en";

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [ord, recs, types] = await Promise.all([
          getOrder(Number(id)),
          getRecordsByOrderId(Number(id)),
          getAnalysisTypes(),
        ]);
        setOrder(ord);
        const typesMap = new Map<number, AnalysisType>(types.map((t) => [t.id, t]));
        setRecords(
          recs.map((r) => {
            const at = typesMap.get(r.analysis_type_id);
            return {
              ...r,
              typeName: at ? (lang === "es" ? at.name_es : at.name_en) : "",
              typeColor: at?.color_hex ?? theme.colors.primary,
            };
          })
        );
      } catch (e) {
        console.error("Failed to load order:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, lang]);

  const handleDelete = async () => {
    if (!order || !confirm(t("orders.deleteConfirm"))) return;
    await deleteOrder(order.id);
    navigate("/orders");
  };

  const startEditing = () => {
    if (!order) return;
    setEditDate(order.order_date);
    setEditLab(order.lab_name);
    setEditDoctor(order.doctor_name);
    setEditNotes(order.notes);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!order) return;
    await updateOrder(order.id, {
      order_date: editDate,
      lab_name: editLab,
      doctor_name: editDoctor,
      notes: editNotes,
    });
    // Update associated records to keep consistency
    for (const rec of records) {
      await updateRecord(rec.id, {
        record_date: editDate,
        lab_name: editLab,
        doctor_name: editDoctor,
      });
    }
    setOrder({ ...order, order_date: editDate, lab_name: editLab, doctor_name: editDoctor, notes: editNotes });
    setRecords(records.map((r) => ({ ...r, record_date: editDate, lab_name: editLab, doctor_name: editDoctor })));
    setEditing(false);
  };

  const handleOpenPdf = async () => {
    if (!order?.pdf_data || !order?.pdf_filename) return;
    try {
      const binary = atob(order.pdf_data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      await writeFile(order.pdf_filename, bytes, { baseDir: BaseDirectory.Temp });
      const tmp = await tempDir();
      const filePath = await join(tmp, order.pdf_filename);
      await openPath(filePath);
    } catch (err) {
      console.error("Failed to open PDF:", err);
    }
  };

  if (loading) {
    return <div style={styles.center}>{t("common.loading")}</div>;
  }

  if (!order) {
    return <div style={styles.center}>{t("common.error")}</div>;
  }

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate("/orders")}>
        &larr; {t("common.back")}
      </button>

      <div style={styles.headerCard}>
        {editing ? (
          <div style={styles.editForm}>
            <label style={styles.label}>{t("orders.date")}</label>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={styles.input} />
            <label style={styles.label}>{t("orders.lab")}</label>
            <input type="text" value={editLab} onChange={(e) => setEditLab(e.target.value)} style={styles.input} />
            <label style={styles.label}>{t("orders.doctor")}</label>
            <input type="text" value={editDoctor} onChange={(e) => setEditDoctor(e.target.value)} style={styles.input} />
            <label style={styles.label}>{t("orders.notes")}</label>
            <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={styles.input} />
          </div>
        ) : (
          <div>
            <h1 style={styles.title}>{order.order_date}</h1>
            {order.lab_name && <p style={styles.sub}>{t("orders.lab")}: {order.lab_name}</p>}
            {order.doctor_name && <p style={styles.sub}>{t("orders.doctor")}: {order.doctor_name}</p>}
            {order.notes && <p style={styles.sub}>{t("orders.notes")}: {order.notes}</p>}
          </div>
        )}
      </div>

      <div style={styles.actions}>
        {editing ? (
          <>
            <button style={styles.saveButton} onClick={handleSave}>{t("common.save")}</button>
            <button style={styles.cancelButton} onClick={cancelEditing}>{t("common.cancel")}</button>
          </>
        ) : (
          <>
            <button style={styles.editButton} onClick={startEditing}>{t("common.edit")}</button>
            {order.pdf_data && (
              <button style={styles.pdfButton} onClick={handleOpenPdf}>PDF</button>
            )}
            <button style={styles.deleteButton} onClick={handleDelete}>{t("common.delete")}</button>
          </>
        )}
      </div>

      <h2 style={styles.sectionTitle}>{t("orders.associatedRecords")}</h2>
      {records.length === 0 ? (
        <p style={styles.emptyText}>{t("records.noRecords")}</p>
      ) : (
        <div style={styles.recordList}>
          {records.map((rec) => (
            <div
              key={rec.id}
              style={styles.recordCard}
              onClick={() => navigate(`/records/${rec.id}`)}
            >
              <div style={{ ...styles.colorBar, backgroundColor: rec.typeColor }} />
              <div style={styles.recordContent}>
                <span style={styles.recordName}>{rec.typeName}</span>
                <span style={styles.recordDate}>{rec.record_date}</span>
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
  headerCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    marginBottom: theme.spacing.lg,
  },
  title: { fontSize: 24, fontWeight: 700, color: theme.colors.textPrimary, margin: 0 },
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
  saveButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
  },
  cancelButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
  },
  pdfButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: "#E53935",
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
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
  editForm: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  label: { fontSize: 13, fontWeight: 600, color: theme.colors.textSecondary },
  input: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.colors.border}`,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
  },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: theme.spacing.md },
  emptyText: { color: theme.colors.textSecondary, fontStyle: "italic" },
  recordList: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  recordCard: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    cursor: "pointer",
  },
  colorBar: { width: 6, height: 36, borderRadius: 3 },
  recordContent: { display: "flex", flexDirection: "column", gap: 2 },
  recordName: { fontWeight: 600, fontSize: 14, color: theme.colors.textPrimary },
  recordDate: { fontSize: 12, color: theme.colors.textSecondary },
};
