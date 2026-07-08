import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { Shell } from './components/Shell';
import { AuthGuard } from '@/shared/auth/AuthGuard';
import { AdminGuard } from '@/shared/auth/AdminGuard';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminCompanies } from './pages/admin/AdminCompanies';
import { AdminCompanyDetail } from './pages/admin/AdminCompanyDetail';
import { AdminTeam } from './pages/admin/AdminTeam';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import Login from './pages/Login';
import Settings from './pages/Settings';
import ProjectSetup from './pages/ProjectSetup';
import Synopsis from './pages/Synopsis';
import Scope from './pages/Scope';
import MakeProtocol from './pages/MakeProtocol';
import ProtocolReview from './pages/ProtocolReview';
import PdfProtocol from './pages/PdfProtocol';
import MakeReport from './pages/MakeReport';
import ReportReview from './pages/ReportReview';
import PdfReport from './pages/PdfReport';
import AddendumPage from './pages/Addendum';
import { AmendmentFormPage } from '@/modules/Amendmentform/pages/AmendmentFormPage';

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-gray-900 mb-2">404</h1>
        <p className="text-gray-600 mb-4">Page not found</p>
        <a href="/dashboard" className="text-blue-600 hover:underline">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}

function MakeProtocolKeyed() {
  const { projectId } = useParams();
  return <MakeProtocol key={projectId} />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/admin',
    element: <AdminGuard />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/companies" replace /> },
          { path: 'overview', element: <AdminOverview /> },
          { path: 'companies', element: <AdminCompanies /> },
          { path: 'companies/:id', element: <AdminCompanyDetail /> },
          { path: 'team', element: <AdminTeam /> },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <AuthGuard />,
    children: [
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', Component: Dashboard },
      { path: 'settings', element: <Settings /> },
      { path: 'projects/:projectId', Component: ProjectView },
      { path: 'projects/:projectId/workflow/project-setup', element: <ProjectSetup /> },
      { path: 'projects/:projectId/workflow/synopsis', element: <Synopsis /> },
      { path: 'projects/:projectId/workflow/scope', element: <Scope /> },
      { path: 'projects/:projectId/workflow/protocol/make', element: <MakeProtocolKeyed /> },
      { path: 'projects/:projectId/workflow/protocol/review', element: <ProtocolReview /> },
      { path: 'projects/:projectId/workflow/protocol/pdf', element: <PdfProtocol /> },
      { path: 'projects/:projectId/workflow/protocol/amendment', element: <AmendmentFormPage /> },
      { path: 'projects/:projectId/workflow/report/make', element: <MakeReport /> },
      { path: 'projects/:projectId/workflow/report/review', element: <ReportReview /> },
      { path: 'projects/:projectId/workflow/report/pdf', element: <PdfReport /> },
      { path: 'projects/:projectId/workflow/:docType/addendums/:addendumId', element: <AddendumPage /> },
      { path: '*', Component: NotFound },
    ],
  },
  ],
  },
]);