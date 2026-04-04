import { createBrowserRouter } from "react-router";
import { ReportWorkspace } from "./pages/ReportWorkspace";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: ReportWorkspace,
  },
]);
