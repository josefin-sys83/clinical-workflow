import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getToken, isSuperadmin } from './token';

// Rendered in place (not a redirect) so a stale bookmark or shared link to /admin/... for
// a non-superadmin account explains itself instead of silently bouncing to the dashboard
// with zero feedback, which just looks like the click didn't do anything.
function AdminAccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">You don't have access to this page</h1>
        <p className="text-sm text-gray-600 mb-4">
          The admin panel is only available to platform superadmins. If you believe you should
          have access, contact your administrator.
        </p>
        <a href="/dashboard" className="text-blue-600 hover:underline text-sm">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}

export function AdminGuard() {
  const location = useLocation();
  if (!getToken()) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isSuperadmin()) return <AdminAccessDenied />;
  return <Outlet />;
}
