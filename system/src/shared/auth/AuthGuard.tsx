import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getToken } from './token';
import { getMe } from '@/shared/api/me';
import { ForcedPasswordReset } from './ForcedPasswordReset';
import { CurrentUserProvider, type CurrentUserStatus } from './CurrentUserContext';
import type { CurrentUser } from '@/shared/api/me';

// A valid token isn't enough on its own — an account with must_reset_password still set
// (temp password never changed) must be forced into the reset screen no matter which URL
// it navigates to directly. The backend enforces the same rule independently on every API
// call (see jwt-auth.guard.ts); this is the frontend half so the user actually sees the
// reset form instead of a wall of failed requests.
export function AuthGuard() {
  const location = useLocation();
  const token = getToken();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userStatus, setUserStatus] = useState<CurrentUserStatus>('loading');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setUserStatus('loading');
    getMe()
      .then((u) => {
        if (cancelled) return;
        setCurrentUser(u);
        setUserStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setCurrentUser(null);
        setUserStatus('error');
      });
    return () => { cancelled = true; };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (currentUser?.must_reset_password) {
    return <ForcedPasswordReset onDone={() => setCurrentUser(user => user ? { ...user, must_reset_password: false } : user)} />;
  }
  return (
    <CurrentUserProvider user={currentUser} status={userStatus}>
      <Outlet />
    </CurrentUserProvider>
  );
}
