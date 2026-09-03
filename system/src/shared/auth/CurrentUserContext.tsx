import { createContext, useContext, type ReactNode } from 'react';
import type { CurrentUser } from '@/shared/api/me';

export type CurrentUserStatus = 'loading' | 'ready' | 'error';

type CurrentUserContextValue = {
  user: CurrentUser | null;
  status: CurrentUserStatus;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({
  user,
  status,
  children,
}: CurrentUserContextValue & { children: ReactNode }) {
  return (
    <CurrentUserContext.Provider value={{ user, status }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const value = useContext(CurrentUserContext);
  if (!value) {
    throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  }
  return value;
}
