export const theme = {
  colors: {
    primary: "#1976D2",
    primaryLight: "#42A5F5",
    primaryDark: "#1565C0",
    secondary: "#26A69A",
    error: "#E53935",
    warning: "#E65100",
    success: "#2E7D32",
    background: "#F5F5F5",
    surface: "#FFFFFF",
    textPrimary: "#212121",
    textSecondary: "#757575",
    border: "#E0E0E0",
    flagged: "#FFEBEE",
    normal: "#E8F5E9",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  borderRadius: "8px",
  shadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  breakpoints: {
    mobile: 600,
    tablet: 900,
    desktop: 1200,
  },
} as const;

export type Theme = typeof theme;
