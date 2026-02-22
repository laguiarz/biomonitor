import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { theme } from "../../core/theme/theme";
import { getSetting, setSetting } from "../../core/database";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();

  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    getSetting("gemini_api_key").then((key) => {
      if (key) setApiKey(key);
    });
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleSaveApiKey = async () => {
    await setSetting("gemini_api_key", apiKey);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 3000);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t("settings.title")}</h1>

      {/* Language */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("settings.language")}</h2>
        <div style={styles.langButtons}>
          <button
            style={{
              ...styles.langButton,
              ...(i18n.language.startsWith("en") ? styles.langButtonActive : {}),
            }}
            onClick={() => changeLanguage("en")}
          >
            {t("settings.english")}
          </button>
          <button
            style={{
              ...styles.langButton,
              ...(i18n.language.startsWith("es") ? styles.langButtonActive : {}),
            }}
            onClick={() => changeLanguage("es")}
          >
            {t("settings.spanish")}
          </button>
        </div>
      </section>

      {/* API Key */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("settings.apiKey")}</h2>
        <p style={styles.apiKeyDescription}>{t("settings.apiKeyDescription")}</p>
        <div style={styles.apiKeyRow}>
          <input
            type="password"
            style={styles.apiKeyInput}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setApiKeySaved(false);
            }}
            placeholder="AIza..."
          />
          <button style={styles.saveKeyButton} onClick={handleSaveApiKey}>
            {t("common.save")}
          </button>
        </div>
        {apiKeySaved && <p style={styles.savedMessage}>{t("settings.apiKeySaved")}</p>}
      </section>

      {/* Export */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("settings.exportData")}</h2>
        <div style={styles.exportButtons}>
          <button style={styles.exportButton}>
            {t("settings.exportCsv")}
          </button>
          <button style={styles.exportButton}>
            {t("settings.exportJson")}
          </button>
        </div>
      </section>

      {/* About */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t("settings.about")}</h2>
        <p style={styles.aboutText}>
          BioMonitor — {t("settings.version")} 0.1.0
        </p>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: theme.spacing.lg, maxWidth: 600, margin: "0 auto" },
  title: { fontSize: 28, fontWeight: 700, color: theme.colors.textPrimary, marginBottom: theme.spacing.xl },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  langButtons: { display: "flex", gap: theme.spacing.md },
  langButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `2px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  langButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: "#E3F2FD",
    color: theme.colors.primary,
    fontWeight: 700,
  },
  apiKeyDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: theme.spacing.md,
    lineHeight: 1.4,
  },
  apiKeyRow: { display: "flex", gap: theme.spacing.md, alignItems: "center" },
  apiKeyInput: {
    flex: 1,
    padding: theme.spacing.sm,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    fontSize: 14,
    fontFamily: "monospace",
  },
  saveKeyButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.primary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  savedMessage: {
    color: theme.colors.success,
    fontSize: 13,
    marginTop: theme.spacing.sm,
    fontWeight: 600,
  },
  exportButtons: { display: "flex", gap: theme.spacing.md, flexWrap: "wrap" },
  exportButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.secondary,
    color: "#fff",
    border: "none",
    borderRadius: theme.borderRadius,
    cursor: "pointer",
    fontSize: 14,
  },
  aboutText: { color: theme.colors.textSecondary },
};
