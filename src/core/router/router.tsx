import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "../../components/AppLayout";

// Eagerly loaded: home (landing page) and layout
import HomeScreen from "../../features/home/HomeScreen";

// Lazy loaded: all other routes
const RecordDetailScreen = lazy(() => import("../../features/records/RecordDetailScreen"));
const TrendsScreen = lazy(() => import("../../features/trends/TrendsScreen"));
const AnalysisTypesScreen = lazy(() => import("../../features/analysis-types/AnalysisTypesScreen"));
const AnalysisTypeDetailScreen = lazy(() => import("../../features/analysis-types/AnalysisTypeDetailScreen"));
const OrdersListScreen = lazy(() => import("../../features/orders/OrdersListScreen"));
const OrderDetailScreen = lazy(() => import("../../features/orders/OrderDetailScreen"));
const ImportScreen = lazy(() => import("../../features/import/ImportScreen"));
const OcrReviewScreen = lazy(() => import("../../features/import/OcrReviewScreen"));
const SettingsScreen = lazy(() => import("../../features/settings/SettingsScreen"));
const VisitPrepScreen = lazy(() => import("../../features/visit-prep/VisitPrepScreen"));
const LabsHubScreen = lazy(() => import("../../features/labs/LabsHubScreen"));
const HealthLogHubScreen = lazy(() => import("../../features/health-log/HealthLogHubScreen"));
const VaccinesListScreen = lazy(() => import("../../features/health-log/vaccines/VaccinesListScreen"));
const VaccineEntryScreen = lazy(() => import("../../features/health-log/vaccines/VaccineEntryScreen"));
const MedicationsListScreen = lazy(() => import("../../features/health-log/medications/MedicationsListScreen"));
const MedicationEntryScreen = lazy(() => import("../../features/health-log/medications/MedicationEntryScreen"));
const MilestonesListScreen = lazy(() => import("../../features/health-log/milestones/MilestonesListScreen"));
const MilestoneEntryScreen = lazy(() => import("../../features/health-log/milestones/MilestoneEntryScreen"));
const SymptomsListScreen = lazy(() => import("../../features/health-log/symptoms/SymptomsListScreen"));
const SymptomEntryScreen = lazy(() => import("../../features/health-log/symptoms/SymptomEntryScreen"));

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomeScreen /> },
      { path: "/labs", element: <L><LabsHubScreen /></L> },
      { path: "/records/:id", element: <L><RecordDetailScreen /></L> },
      { path: "/orders", element: <L><OrdersListScreen /></L> },
      { path: "/orders/:id", element: <L><OrderDetailScreen /></L> },
      { path: "/analysis-types", element: <L><AnalysisTypesScreen /></L> },
      { path: "/analysis-types/:id", element: <L><AnalysisTypeDetailScreen /></L> },
      { path: "/trends", element: <L><TrendsScreen /></L> },
      { path: "/import", element: <L><ImportScreen /></L> },
      { path: "/import/review", element: <L><OcrReviewScreen /></L> },
      { path: "/health-log", element: <L><HealthLogHubScreen /></L> },
      { path: "/health-log/vaccines", element: <L><VaccinesListScreen /></L> },
      { path: "/health-log/vaccines/new", element: <L><VaccineEntryScreen /></L> },
      { path: "/health-log/vaccines/:id/edit", element: <L><VaccineEntryScreen /></L> },
      { path: "/health-log/medications", element: <L><MedicationsListScreen /></L> },
      { path: "/health-log/medications/new", element: <L><MedicationEntryScreen /></L> },
      { path: "/health-log/medications/:id/edit", element: <L><MedicationEntryScreen /></L> },
      { path: "/health-log/milestones", element: <L><MilestonesListScreen /></L> },
      { path: "/health-log/milestones/new", element: <L><MilestoneEntryScreen /></L> },
      { path: "/health-log/milestones/:id/edit", element: <L><MilestoneEntryScreen /></L> },
      { path: "/health-log/symptoms", element: <L><SymptomsListScreen /></L> },
      { path: "/health-log/symptoms/new", element: <L><SymptomEntryScreen /></L> },
      { path: "/health-log/symptoms/:id/edit", element: <L><SymptomEntryScreen /></L> },
      { path: "/visit-prep", element: <L><VisitPrepScreen /></L> },
      { path: "/settings", element: <L><SettingsScreen /></L> },
    ],
  },
]);
