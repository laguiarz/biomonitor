import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { theme } from "../core/theme/theme";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { path: "/", labelKey: "nav.home", icon: "\u{1F3E0}" },
  { path: "/records", labelKey: "nav.records", icon: "\u{1F4CB}" },
  { path: "/orders", labelKey: "nav.orders", icon: "\u{1F9FE}" },
  { path: "/analysis-types", labelKey: "nav.analysisTypes", icon: "\u{1F52C}" },
  { path: "/trends", labelKey: "nav.trends", icon: "\u{1F4C8}" },
] as const;

const HEALTH_LOG_CHILDREN = [
  { path: "/health-log/vaccines", labelKey: "nav.vaccines", icon: "\u{1F489}" },
  { path: "/health-log/medications", labelKey: "nav.medications", icon: "\u{1F48A}" },
  { path: "/health-log/milestones", labelKey: "nav.milestones", icon: "\u{1F3C1}" },
  { path: "/health-log/symptoms", labelKey: "nav.symptoms", icon: "\u{1FA7A}" },
] as const;

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

export default function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const width = useWindowWidth();
  const isDesktop = width >= theme.breakpoints.tablet;

  const isHealthLogRoute = location.pathname.startsWith("/health-log");
  const [healthLogExpanded, setHealthLogExpanded] = useState(isHealthLogRoute);

  useEffect(() => {
    if (isHealthLogRoute) setHealthLogExpanded(true);
  }, [isHealthLogRoute]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  if (isDesktop) {
    return (
      <div style={styles.desktopLayout}>
        {/* Side Rail */}
        <nav style={styles.sideRail}>
          <div style={styles.logo}>BioMonitor</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              style={{
                ...styles.sideNavItem,
                ...(isActive(item.path) ? styles.sideNavItemActive : {}),
              }}
              onClick={() => navigate(item.path)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{t(item.labelKey)}</span>
            </button>
          ))}

          {/* Health Log expandable group */}
          <button
            style={{
              ...styles.sideNavItem,
              ...(isHealthLogRoute ? styles.sideNavItemActive : {}),
            }}
            onClick={() => setHealthLogExpanded((prev) => !prev)}
          >
            <span style={styles.navIcon}>{"\u{1F4DD}"}</span>
            <span style={styles.navLabel}>{t("nav.healthLog")}</span>
            <span style={styles.expandArrow}>{healthLogExpanded ? "\u25B4" : "\u25BE"}</span>
          </button>
          {healthLogExpanded &&
            HEALTH_LOG_CHILDREN.map((child) => (
              <button
                key={child.path}
                style={{
                  ...styles.sideNavItem,
                  ...styles.sideNavChild,
                  ...(isActive(child.path) ? styles.sideNavItemActive : {}),
                }}
                onClick={() => navigate(child.path)}
              >
                <span style={styles.navIcon}>{child.icon}</span>
                <span style={styles.navLabel}>{t(child.labelKey)}</span>
              </button>
            ))}

          <div style={{ flex: 1 }} />
          <button
            style={{
              ...styles.sideNavItem,
              ...(isActive("/settings") ? styles.sideNavItemActive : {}),
            }}
            onClick={() => navigate("/settings")}
          >
            <span style={styles.navIcon}>{"\u2699"}</span>
            <span style={styles.navLabel}>{t("nav.settings")}</span>
          </button>
        </nav>

        {/* Content */}
        <main style={styles.desktopContent}>
          <Outlet />
        </main>
      </div>
    );
  }

  // Mobile layout
  return (
    <div style={styles.mobileLayout}>
      <main style={styles.mobileContent}>
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            style={{
              ...styles.bottomNavItem,
              ...(isActive(item.path) ? styles.bottomNavItemActive : {}),
            }}
            onClick={() => navigate(item.path)}
          >
            <span style={styles.bottomNavIcon}>{item.icon}</span>
            <span style={styles.bottomNavLabel}>{t(item.labelKey)}</span>
          </button>
        ))}
        <button
          style={{
            ...styles.bottomNavItem,
            ...(isHealthLogRoute ? styles.bottomNavItemActive : {}),
          }}
          onClick={() => navigate("/health-log")}
        >
          <span style={styles.bottomNavIcon}>{"\u{1F4DD}"}</span>
          <span style={styles.bottomNavLabel}>{t("nav.healthLog")}</span>
        </button>
        <button
          style={{
            ...styles.bottomNavItem,
            ...(isActive("/settings") ? styles.bottomNavItemActive : {}),
          }}
          onClick={() => navigate("/settings")}
        >
          <span style={styles.bottomNavIcon}>{"\u2699"}</span>
          <span style={styles.bottomNavLabel}>{t("nav.settings")}</span>
        </button>
      </nav>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Desktop
  desktopLayout: { display: "flex", height: "100vh", overflow: "hidden" },
  sideRail: {
    width: 200,
    backgroundColor: theme.colors.surface,
    borderRight: `1px solid ${theme.colors.border}`,
    display: "flex",
    flexDirection: "column",
    padding: `${theme.spacing.md} 0`,
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    color: theme.colors.primary,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    marginBottom: theme.spacing.md,
  },
  sideNavItem: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "left",
    width: "100%",
    borderLeft: "3px solid transparent",
  },
  sideNavItemActive: {
    color: theme.colors.primary,
    backgroundColor: "#E3F2FD",
    fontWeight: 700,
    borderLeftColor: theme.colors.primary,
  },
  sideNavChild: {
    paddingLeft: 44,
    fontSize: 13,
  },
  expandArrow: {
    marginLeft: "auto",
    fontSize: 10,
  },
  navIcon: { fontSize: 18 },
  navLabel: {},
  desktopContent: {
    flex: 1,
    overflow: "auto",
    backgroundColor: theme.colors.background,
  },

  // Mobile
  mobileLayout: { display: "flex", flexDirection: "column", height: "100vh" },
  mobileContent: {
    flex: 1,
    overflow: "auto",
    backgroundColor: theme.colors.background,
  },
  bottomNav: {
    display: "flex",
    borderTop: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.surface,
  },
  bottomNavItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: `${theme.spacing.sm} 0`,
    border: "none",
    background: "none",
    cursor: "pointer",
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  bottomNavItemActive: {
    color: theme.colors.primary,
    fontWeight: 700,
  },
  bottomNavIcon: { fontSize: 20 },
  bottomNavLabel: {},
};
