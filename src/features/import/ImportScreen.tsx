import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { theme } from "../../core/theme/theme";
import { getSetting, getAnalysisTypes } from "../../core/database";
import { extractTextFromPdf } from "../../core/services/pdfExtract";
import { parseMedicalResults, type ExistingTypeInfo } from "../../core/services/llmParser";

export interface ImportedFile {
  parsed: { date: string | null; lab_name: string; doctor_name: string; groups: import("../../core/services/llmParser").ParsedGroup[] };
  rawText: string;
  fileName: string;
  pdfBase64: string;
}

type Status = "idle" | "extracting" | "parsing" | "error";

export default function ImportScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyChecked, setApiKeyChecked] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    getSetting("gemini_api_key").then((key) => {
      setApiKey(key);
      setApiKeyChecked(true);
    });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !apiKey) return;

    const fileList = Array.from(files);
    e.target.value = "";
    setError("");

    const fileResults: ImportedFile[] = [];

    try {
      const types = await getAnalysisTypes();
      const existingTypes: ExistingTypeInfo[] = types.map((t) => ({
        name_en: t.name_en,
        name_es: t.name_es,
      }));

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (fileList.length > 1) setProgress({ current: i + 1, total: fileList.length });

        setStatus("extracting");
        const text = await extractTextFromPdf(file);
        if (!text.trim()) continue;

        setStatus("parsing");
        const parsed = await parseMedicalResults(text, apiKey, existingTypes);
        if (!parsed.groups || parsed.groups.length === 0) continue;

        // Read PDF as base64
        const pdfBuffer = await file.arrayBuffer();
        const pdfBytes = new Uint8Array(pdfBuffer);
        let b64 = "";
        const CHUNK = 8192;
        for (let j = 0; j < pdfBytes.length; j += CHUNK) {
          b64 += String.fromCharCode(...pdfBytes.subarray(j, j + CHUNK));
        }

        fileResults.push({
          parsed,
          rawText: text,
          fileName: file.name,
          pdfBase64: btoa(b64),
        });
      }

      setProgress(null);

      if (fileResults.length === 0) {
        setError(t("import.noResults"));
        setStatus("error");
        return;
      }

      navigate("/import/review", { state: { files: fileResults } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (status === "extracting") {
        setError(`${t("import.errorExtract")} ${message}`);
      } else {
        setError(`${t("import.errorParse")} ${message}`);
      }
      setProgress(null);
      setStatus("error");
    }
  };

  if (!apiKeyChecked) {
    return (
      <div style={styles.container}>
        <p style={styles.loadingText}>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t("import.title")}</h1>
      <p style={styles.subtitle}>{t("import.importDescription")}</p>

      {!apiKey ? (
        <div style={styles.noKeyCard}>
          <p style={styles.noKeyText}>{t("import.noApiKey")}</p>
          <button style={styles.settingsButton} onClick={() => navigate("/settings")}>
            {t("import.goToSettings")}
          </button>
        </div>
      ) : status === "extracting" || status === "parsing" ? (
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <p style={styles.loadingLabel}>
            {status === "extracting" ? t("import.extracting") : t("import.parsing")}
          </p>
          {progress && (
            <p style={styles.progressLabel}>
              {t("import.fileProgress", { current: progress.current, total: progress.total })}
            </p>
          )}
        </div>
      ) : (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            multiple
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          <button style={styles.selectButton} onClick={() => fileRef.current?.click()}>
            <span style={styles.pdfIcon}>PDF</span>
            <span>{t("import.selectPdf")}</span>
          </button>

          {error && (
            <div style={styles.errorCard}>
              <p style={styles.errorText}>{error}</p>
              <button
                style={styles.retryButton}
                onClick={() => {
                  setStatus("idle");
                  setError("");
                }}
              >
                {t("common.retry")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 600, margin: "0 auto" },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.sm },
  subtitle: { color: theme.colors.textSecondary, marginBottom: theme.spacing.xl, lineHeight: 1.5 },
  loadingText: { color: theme.colors.textSecondary, textAlign: "center", marginTop: theme.spacing.xl },
  noKeyCard: {
    padding: theme.spacing.xl,
    backgroundColor: "#FFF3E0",
    borderRadius: theme.borderRadius,
    textAlign: "center",
  },
  noKeyText: { color: theme.colors.textPrimary, marginBottom: theme.spacing.md, lineHeight: 1.5 },
  settingsButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  selectButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    width: "100%",
    height: 180,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    border: `2px dashed ${theme.colors.border}`,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    color: theme.colors.textPrimary,
    transition: "border-color 0.2s",
  },
  pdfIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    borderRadius: "50%",
    backgroundColor: "#FFEBEE",
    color: theme.colors.error,
    fontWeight: 800,
    fontSize: 18,
  },
  loadingCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius,
    boxShadow: theme.shadow,
    minHeight: 180,
  },
  spinner: {
    width: 40,
    height: 40,
    border: `4px solid ${theme.colors.border}`,
    borderTop: `4px solid ${theme.colors.primary}`,
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingLabel: { color: theme.colors.textSecondary, fontSize: 14 },
  progressLabel: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 0 },
  errorCard: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.flagged,
    borderRadius: theme.borderRadius,
    textAlign: "center",
  },
  errorText: { color: theme.colors.error, marginBottom: theme.spacing.md, lineHeight: 1.5 },
  retryButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.error,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
  },
};
