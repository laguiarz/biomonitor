import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { theme } from "../core/theme/theme";
import { useEffect, useState } from "react";

const LABS_PATHS = ["/orders", "/analysis-types", "/import"];

const LABS_CHILDREN = [
  { path: "/orders", labelKey: "nav.orders", icon: "\u{1F9FE}" },
  { path: "/analysis-types", labelKey: "nav.analysisTypes", icon: "\u{1F52C}" },
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

  const isLabsRoute = LABS_PATHS.some((p) => location.pathname.startsWith(p));
  const isHealthLogRoute = location.pathname.startsWith("/health-log");

  const [labsExpanded, setLabsExpanded] = useState(isLabsRoute);
  const [healthLogExpanded, setHealthLogExpanded] = useState(isHealthLogRoute);

  useEffect(() => {
    if (isLabsRoute) setLabsExpanded(true);
  }, [isLabsRoute]);

  useEffect(() => {
    if (isHealthLogRoute) setHealthLogExpanded(true);
  }, [isHealthLogRoute]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  function renderExpandableGroup(
    labelKey: string,
    icon: string,
    isGroupActive: boolean,
    expanded: boolean,
    toggle: () => void,
    children: ReadonlyArray<{ path: string; labelKey: string; icon: string }>,
  ) {
    return (
      <>
        <button
          style={{
            ...styles.sideNavItem,
            ...(isGroupActive ? styles.sideNavItemActive : {}),
          }}
          onClick={toggle}
        >
          <span style={styles.navIcon}>{icon}</span>
          <span style={styles.navLabel}>{t(labelKey)}</span>
          <span style={styles.expandArrow}>{expanded ? "\u25B4" : "\u25BE"}</span>
        </button>
        {expanded &&
          children.map((child) => (
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
      </>
    );
  }

  if (isDesktop) {
    return (
      <div style={styles.desktopLayout}>
        <nav style={styles.sideRail}>
          <div style={styles.logo}>BioMonitor</div>

          {/* Home */}
          <button
            style={{ ...styles.sideNavItem, ...(isActive("/") ? styles.sideNavItemActive : {}) }}
            onClick={() => navigate("/")}
          >
            <span style={styles.navIcon}>{"\u{1F3E0}"}</span>
            <span style={styles.navLabel}>{t("nav.home")}</span>
          </button>

          {/* Labs */}
          {renderExpandableGroup(
            "nav.labs", "\u{1F9EA}", isLabsRoute,
            labsExpanded, () => setLabsExpanded((p) => !p),
            LABS_CHILDREN,
          )}

          {/* Health Log */}
          {renderExpandableGroup(
            "nav.healthLog", "\u{1F4DD}", isHealthLogRoute,
            healthLogExpanded, () => setHealthLogExpanded((p) => !p),
            HEALTH_LOG_CHILDREN,
          )}

          {/* Trends */}
          <button
            style={{ ...styles.sideNavItem, ...(isActive("/trends") ? styles.sideNavItemActive : {}) }}
            onClick={() => navigate("/trends")}
          >
            <span style={styles.navIcon}>{"\u{1F4C8}"}</span>
            <span style={styles.navLabel}>{t("nav.trends")}</span>
          </button>

          {/* Visit Prep */}
          <button
            style={{ ...styles.sideNavItem, ...(isActive("/visit-prep") ? styles.sideNavItemActive : {}) }}
            onClick={() => navigate("/visit-prep")}
          >
            <span style={styles.navIcon}>{"\u{1F4C4}"}</span>
            <span style={styles.navLabel}>{t("nav.visitPrep")}</span>
          </button>

          <div style={{ flex: 1 }} />

          {/* Settings */}
          <button
            style={{ ...styles.sideNavItem, ...(isActive("/settings") ? styles.sideNavItemActive : {}) }}
            onClick={() => navigate("/settings")}
          >
            <span style={styles.navIcon}>{"\u2699"}</span>
            <span style={styles.navLabel}>{t("nav.settings")}</span>
          </button>
        </nav>

        <main style={styles.desktopContent}>
          <Outlet />
        </main>
      </div>
    );
  }

  // Mobile layout
  const mobileItems = [
    { path: "/", labelKey: "nav.home", icon: "\u{1F3E0}", onClick: () => navigate("/") },
    { path: "/labs", labelKey: "nav.labs", icon: "\u{1F9EA}", onClick: () => navigate("/labs"), active: isLabsRoute },
    { path: "/health-log", labelKey: "nav.healthLog", icon: "\u{1F4DD}", onClick: () => navigate("/health-log"), active: isHealthLogRoute },
    { path: "/trends", labelKey: "nav.trends", icon: "\u{1F4C8}", onClick: () => navigate("/trends") },
    { path: "/visit-prep", labelKey: "nav.visitPrep", icon: "\u{1F4C4}", onClick: () => navigate("/visit-prep") },
    { path: "/settings", labelKey: "nav.settings", icon: "\u2699", onClick: () => navigate("/settings") },
  ];

  return (
    <div style={styles.mobileLayout}>
      <main style={styles.mobileContent}>
        <Outlet />
      </main>
      <nav style={styles.bottomNav}>
        {mobileItems.map((item) => (
          <button
            key={item.path}
            style={{
              ...styles.bottomNavItem,
              ...((item.active ?? isActive(item.path)) ? styles.bottomNavItemActive : {}),
            }}
            onClick={item.onClick}
          >
            <span style={styles.bottomNavIcon}>{item.icon}</span>
            <span style={styles.bottomNavLabel}>{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  desktopLayout: { display: "flex", height: "100vh", overflow: "hidden" },
  sideRail: {
    width: 200,
    backgroundColor: theme.colors.surface,
    borderRight: `1px solid ${theme.colors.border}`,
    display: "flex",
    flexDirection: "column",
    padding: `${theme.spacing.md} 0`,
    overflowY: "auto",
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
