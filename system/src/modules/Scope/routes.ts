import { createBrowserRouter } from "react-router";
import { Root } from "./pages/Root";
import { ProjectSetup } from "./pages/ProjectSetup";
import { ProtocolAuthoring } from "./pages/ProtocolAuthoring";
import { ProtocolReview } from "./pages/ProtocolReview";
import { ProtocolApproval } from "./pages/ProtocolApproval";
import { ReportAuthoring } from "./pages/ReportAuthoring";
import { ReportReview } from "./pages/ReportReview";
import { ReportApproval } from "./pages/ReportApproval";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        index: true,
        Component: ProjectSetup,
      },
      {
        path: "protocol-authoring",
        Component: ProtocolAuthoring,
      },
      {
        path: "protocol-review",
        Component: ProtocolReview,
      },
      {
        path: "protocol-approval",
        Component: ProtocolApproval,
      },
      {
        path: "report-authoring",
        Component: ReportAuthoring,
      },
      {
        path: "report-review",
        Component: ReportReview,
      },
      {
        path: "report-approval",
        Component: ReportApproval,
      },
    ],
  },
]);
