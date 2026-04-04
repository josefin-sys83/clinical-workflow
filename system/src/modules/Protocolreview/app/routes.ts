import { createBrowserRouter } from "react-router";
import ReviewPage from "./pages/ReviewPage";
import ReviewPageCopy from "./pages/ReviewPageCopy";
import ApprovedProtocolPage from "./pages/ApprovedProtocolPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: ReviewPageCopy,
  },
  {
    path: "/report",
    Component: ReviewPage,
  },
  {
    path: "/approved",
    Component: ApprovedProtocolPage,
  },
]);