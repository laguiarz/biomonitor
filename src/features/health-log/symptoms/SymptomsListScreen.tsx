import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getSymptoms, deleteSymptom, getSymptomPhotos, type Symptom, type SymptomPhoto } from "../../../core/database";
import { theme } from "../../../core/theme/theme";

const SEVERITY_COLORS: Record<string, string> = {
  mild: theme.colors.success,
  moderate: theme.colors.warning,
  severe: theme.colors.error,
};

export default function SymptomsListScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<number, SymptomPhoto[]>>({});
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function load() {
    try {
      const list = await getSymptoms();
      setSymptoms(list);
      const map: Record<number, SymptomPhoto[]> = {};
      for (const s of list) {
        const photos = await getSymptomPhotos(s.id);
        if (photos.length > 0) map[s.id] = photos;
      }
      setPhotoMap(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm(t("symptoms.deleteConfirm"))) return;
    await deleteSymptom(id);
    load();
  }

  if (loading) return <div style={styles.center}>{t("common.loading")}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{t("symptoms.title")}</h1>
        <button style={styles.addBtn} onClick={() => navigate("/health-log/symptoms/new")}>
          + {t("symptoms.addNew")}
        </button>
      </div>

      {symptoms.length === 0 ? (
        <p style={styles.empty}>{t("symptoms.noSymptoms")}</p>
      ) : (
        <div style={styles.list}>
          {symptoms.map((s) => {
            const photos = photoMap[s.id] ?? [];
            return (
              <div key={s.id} style={styles.card}>
                <div style={styles.cardMain}>
                  <div style={styles.cardNameRow}>
                    <span style={styles.cardName}>{s.name}</span>
                    <span style={{ ...styles.badge, backgroundColor: SEVERITY_COLORS[s.severity] || theme.colors.warning }}>
                      {t(`symptoms.sev_${s.severity}`)}
                    </span>
                  </div>
                  <div style={styles.cardMeta}>
                    {s.symptom_date}{s.duration ? ` \u2022 ${s.duration}` : ""}
                  </div>
                  {s.notes && <div style={styles.cardNotes}>{s.notes}</div>}
                  {photos.length > 0 && (
                    <div style={styles.thumbRow}>
                      {photos.slice(0, 4).map((p) => (
                        <img
                          key={p.id}
                          src={p.data}
                          alt={p.filename}
                          style={styles.thumbSmall}
                          onClick={(e) => { e.stopPropagation(); setLightbox(p.data); }}
                        />
                      ))}
                      {photos.length > 4 && (
                        <span style={styles.morePhotos}>+{photos.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.editBtn} onClick={() => navigate(`/health-log/symptoms/${s.id}/edit`)}>
                    {t("common.edit")}
                  </button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(s.id)}>
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" style={styles.lightboxImg} />
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
  addBtn: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  empty: { color: theme.colors.textSecondary, fontStyle: "italic" },
  list: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
  },
  cardMain: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  cardNameRow: { display: "flex", alignItems: "center", gap: theme.spacing.sm },
  cardName: { fontWeight: 600, fontSize: 15 },
  badge: {
    fontSize: 11,
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 12,
    fontWeight: 600,
  },
  cardMeta: { color: theme.colors.textSecondary, fontSize: 13 },
  cardNotes: { color: theme.colors.textSecondary, fontSize: 12, fontStyle: "italic", marginTop: 2 },
  thumbRow: { display: "flex", gap: 4, marginTop: 6, alignItems: "center" },
  thumbSmall: {
    width: 40,
    height: 40,
    objectFit: "cover",
    borderRadius: 4,
    border: `1px solid ${theme.colors.border}`,
    cursor: "pointer",
  },
  morePhotos: { fontSize: 12, color: theme.colors.textSecondary, marginLeft: 2 },
  cardActions: { display: "flex", gap: theme.spacing.sm, marginTop: 2 },
  editBtn: {
    padding: `4px ${theme.spacing.sm}`,
    backgroundColor: theme.colors.primaryLight,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 12,
  },
  deleteBtn: {
    padding: `4px ${theme.spacing.sm}`,
    backgroundColor: theme.colors.error,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 12,
  },
  lightbox: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    cursor: "pointer",
  },
  lightboxImg: {
    maxWidth: "90vw",
    maxHeight: "90vh",
    borderRadius: "8px",
  },
};
