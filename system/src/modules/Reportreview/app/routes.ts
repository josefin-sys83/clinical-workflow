import { createBrowserRouter } from "react-router";
import ReviewPage from "./pages/ReviewPage";
import ReviewPageCopy from "./pages/ReviewPageCopy";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: ReviewPage,
  },
  {
    path: "/copy",
    Component: ReviewPageCopy,
  },
]);
