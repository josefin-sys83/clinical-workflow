import { createBrowserRouter } from "react-router";
import { SynopsisPage } from "./components/SynopsisPage";
import { ScopeAndIntendedUsePage } from "./components/ScopeAndIntendedUsePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SynopsisPage,
  },
  {
    path: "/scope",
    Component: ScopeAndIntendedUsePage,
  },
  {
    path: "/scope-and-intended-use",
    Component: ScopeAndIntendedUsePage,
  },
]);