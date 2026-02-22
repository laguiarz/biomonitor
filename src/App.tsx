import { RouterProvider } from "react-router-dom";
import { router } from "./core/router/router";
import "./core/i18n/i18n";

export default function App() {
  return <RouterProvider router={router} />;
}
