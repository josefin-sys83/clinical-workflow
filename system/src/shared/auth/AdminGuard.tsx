import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getToken, isAdmin } from './token';

export function AdminGuard() {
  const location = useLocation();
  if (!getToken()) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
