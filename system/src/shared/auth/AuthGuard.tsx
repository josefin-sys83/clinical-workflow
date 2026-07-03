import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getToken } from './token';

export function AuthGuard() {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
