import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../../components/AppLayout";
import HomeScreen from "../../features/home/HomeScreen";
import RecordsListScreen from "../../features/records/RecordsListScreen";
import RecordDetailScreen from "../../features/records/RecordDetailScreen";
import RecordEntryScreen from "../../features/records/RecordEntryScreen";
import TrendsScreen from "../../features/trends/TrendsScreen";
import AnalysisTypesScreen from "../../features/analysis-types/AnalysisTypesScreen";
import AnalysisTypeDetailScreen from "../../features/analysis-types/AnalysisTypeDetailScreen";
import OrdersListScreen from "../../features/orders/OrdersListScreen";
import OrderDetailScreen from "../../features/orders/OrderDetailScreen";
import ImportScreen from "../../features/import/ImportScreen";
import OcrReviewScreen from "../../features/import/OcrReviewScreen";
import SettingsScreen from "../../features/settings/SettingsScreen";
import HealthLogHubScreen from "../../features/health-log/HealthLogHubScreen";
import VaccinesListScreen from "../../features/health-log/vaccines/VaccinesListScreen";
import VaccineEntryScreen from "../../features/health-log/vaccines/VaccineEntryScreen";
import MedicationsListScreen from "../../features/health-log/medications/MedicationsListScreen";
import MedicationEntryScreen from "../../features/health-log/medications/MedicationEntryScreen";
import MilestonesListScreen from "../../features/health-log/milestones/MilestonesListScreen";
import MilestoneEntryScreen from "../../features/health-log/milestones/MilestoneEntryScreen";
import SymptomsListScreen from "../../features/health-log/symptoms/SymptomsListScreen";
import SymptomEntryScreen from "../../features/health-log/symptoms/SymptomEntryScreen";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomeScreen /> },
      { path: "/records", element: <RecordsListScreen /> },
      { path: "/records/new", element: <RecordEntryScreen /> },
      { path: "/records/:id", element: <RecordDetailScreen /> },
      { path: "/records/:id/edit", element: <RecordEntryScreen /> },
      { path: "/orders", element: <OrdersListScreen /> },
      { path: "/orders/:id", element: <OrderDetailScreen /> },
      { path: "/analysis-types", element: <AnalysisTypesScreen /> },
      { path: "/analysis-types/:id", element: <AnalysisTypeDetailScreen /> },
      { path: "/trends", element: <TrendsScreen /> },
      { path: "/import", element: <ImportScreen /> },
      { path: "/import/review", element: <OcrReviewScreen /> },
      { path: "/health-log", element: <HealthLogHubScreen /> },
      { path: "/health-log/vaccines", element: <VaccinesListScreen /> },
      { path: "/health-log/vaccines/new", element: <VaccineEntryScreen /> },
      { path: "/health-log/vaccines/:id/edit", element: <VaccineEntryScreen /> },
      { path: "/health-log/medications", element: <MedicationsListScreen /> },
      { path: "/health-log/medications/new", element: <MedicationEntryScreen /> },
      { path: "/health-log/medications/:id/edit", element: <MedicationEntryScreen /> },
      { path: "/health-log/milestones", element: <MilestonesListScreen /> },
      { path: "/health-log/milestones/new", element: <MilestoneEntryScreen /> },
      { path: "/health-log/milestones/:id/edit", element: <MilestoneEntryScreen /> },
      { path: "/health-log/symptoms", element: <SymptomsListScreen /> },
      { path: "/health-log/symptoms/new", element: <SymptomEntryScreen /> },
      { path: "/health-log/symptoms/:id/edit", element: <SymptomEntryScreen /> },
      { path: "/settings", element: <SettingsScreen /> },
    ],
  },
]);
