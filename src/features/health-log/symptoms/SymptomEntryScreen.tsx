import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  getSymptom, createSymptom, updateSymptom,
  getSymptomPhotos, addSymptomPhoto, deleteSymptomPhoto,
  type SymptomSeverity, type SymptomPhoto,
} from "../../../core/database";
import { resizeImageToBase64 } from "../../../core/services/imageResize";
import { theme } from "../../../core/theme/theme";

const SEVERITIES: SymptomSeverity[] = ["mild", "moderate", "severe"];

interface PendingPhoto {
  id?: number;         // set if already saved in DB
  data: string;        // base64 data-url
  filename: string;
}

export default function SymptomEntryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const fileRef = useRef<HTMLInputElement>(null);

  const [symptomDate, setSymptomDate] = useState(new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState<SymptomSeverity>("moderate");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    Promise.all([getSymptom(numId), getSymptomPhotos(numId)]).then(([s, p]) => {
      if (s) {
        setSymptomDate(s.symptom_date);
        setName(s.name);
        setSeverity(s.severity);
        setDuration(s.duration);
        setNotes(s.notes);
      }
      setPhotos(p.map((ph: SymptomPhoto) => ({ id: ph.id, data: ph.data, filename: ph.filename })));
      setLoading(false);
    });
  }, [id]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: PendingPhoto[] = [];
    for (const file of Array.from(files)) {
      const data = await resizeImageToBase64(file);
      newPhotos.push({ data, filename: file.name });
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
    // Reset input so same file can be selected again
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleRemovePhoto(index: number) {
    const photo = photos[index];
    if (photo.id) setRemovedPhotoIds((prev) => [...prev, photo.id!]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) return;
    const data = { symptom_date: symptomDate, name: name.trim(), severity, duration, notes };

    let symptomId: number;
    if (isEdit) {
      symptomId = Number(id);
      await updateSymptom(symptomId, data);
    } else {
      symptomId = await createSymptom(data);
    }

    // Delete removed photos
    for (const photoId of removedPhotoIds) {
      await deleteSymptomPhoto(photoId);
    }

    // Save new photos (those without id)
    for (const photo of photos) {
      if (!photo.id) {
        await addSymptomPhoto(symptomId, photo.data, photo.filename);
      }
    }

    navigate("/health-log/symptoms");
  }

  if (loading) return <div style={styles.center}>{t("common.loading")}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{isEdit ? t("symptoms.editTitle") : t("symptoms.addNew")}</h1>

      <div style={styles.form}>
        <label htmlFor="sym-date" style={styles.label}>{t("symptoms.date")}</label>
        <input id="sym-date" type="date" style={styles.input} value={symptomDate} onChange={(e) => setSymptomDate(e.target.value)} />

        <label htmlFor="sym-name" style={styles.label}>{t("symptoms.name")}</label>
        <input id="sym-name" style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />

        <label htmlFor="sym-severity" style={styles.label}>{t("symptoms.severity")}</label>
        <select id="sym-severity" style={styles.input} value={severity} onChange={(e) => setSeverity(e.target.value as SymptomSeverity)}>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{t(`symptoms.sev_${s}`)}</option>
          ))}
        </select>

        <label htmlFor="sym-duration" style={styles.label}>{t("symptoms.duration")}</label>
        <input id="sym-duration" style={styles.input} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t("symptoms.durationPlaceholder")} />

        <label htmlFor="sym-notes" style={styles.label}>{t("symptoms.notes")}</label>
        <textarea id="sym-notes" style={{ ...styles.input, minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {/* Photos */}
        <label style={styles.label}>{t("symptoms.photos")}</label>
        <div style={styles.photosArea}>
          {photos.map((photo, i) => (
            <div key={photo.id ?? `new-${i}`} style={styles.thumbWrap}>
              <img
                src={photo.data}
                alt={photo.filename}
                style={styles.thumb}
                onClick={() => setLightbox(photo.data)}
              />
              <button style={styles.thumbRemove} onClick={() => handleRemovePhoto(i)} aria-label={`Remove ${photo.filename}`}>
                &times;
              </button>
            </div>
          ))}
          <button style={styles.addPhotoBtn} onClick={() => fileRef.current?.click()}>
            + {t("symptoms.addPhoto")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        </div>

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={() => navigate("/health-log/symptoms")}>
            {t("common.cancel")}
          </button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={!name.trim()}>
            {t("common.save")}
          </button>
        </div>
      </div>

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
  container: { padding: theme.spacing.lg, maxWidth: 600, margin: "0 auto" },
  center: { display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: theme.colors.textSecondary },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.lg },
  form: { display: "flex", flexDirection: "column", gap: theme.spacing.sm },
  label: { fontSize: 14, fontWeight: 600, color: theme.colors.textPrimary, marginTop: theme.spacing.sm },
  input: {
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    fontSize: 14,
    fontFamily: "inherit",
  },
  photosArea: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  thumbWrap: { position: "relative", display: "inline-block" },
  thumb: {
    width: 80,
    height: 80,
    objectFit: "cover",
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.colors.border}`,
    cursor: "pointer",
  },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: "50%",
    backgroundColor: theme.colors.error,
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: "20px",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius,
    border: `2px dashed ${theme.colors.border}`,
    background: "none",
    cursor: "pointer",
    fontSize: 13,
    color: theme.colors.textSecondary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  actions: { display: "flex", justifyContent: "flex-end", gap: theme.spacing.md, marginTop: theme.spacing.lg },
  cancelBtn: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    background: "none",
    cursor: "pointer",
    fontSize: 14,
  },
  saveBtn: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
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
    borderRadius: theme.borderRadius,
  },
};
