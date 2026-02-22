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
      { path: "/settings", element: <SettingsScreen /> },
    ],
  },
]);
