import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getToken } from './token';
import { getMe } from '@/shared/api/me';
import { ForcedPasswordReset } from './ForcedPasswordReset';

// A valid token isn't enough on its own — an account with must_reset_password still set
// (temp password never changed) must be forced into the reset screen no matter which URL
// it navigates to directly. The backend enforces the same rule independently on every API
// call (see jwt-auth.guard.ts); this is the frontend half so the user actually sees the
// reset form instead of a wall of failed requests.
export function AuthGuard() {
  const location = useLocation();
  const token = getToken();
  const [mustReset, setMustReset] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getMe()
      .then((u) => { if (!cancelled) setMustReset(u.must_reset_password); })
      .catch(() => { if (!cancelled) setMustReset(false); });
    return () => { cancelled = true; };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (mustReset === null) {
    return null;
  }
  if (mustReset) {
    return <ForcedPasswordReset onDone={() => setMustReset(false)} />;
  }
  return <Outlet />;
}
