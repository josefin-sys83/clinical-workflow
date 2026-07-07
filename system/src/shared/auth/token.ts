const TOKEN_KEY = 'clinical_system_token';

export function getToken(): string | null {
  const envToken = (import.meta as any)?.env?.VITE_API_TOKEN as string | undefined;
  if (envToken && envToken.trim()) return envToken.trim();
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// Revokes the current token server-side (so it can't still be used if it was ever leaked)
// before clearing it locally. Best-effort: if the request fails (offline, server down), the
// local token is still cleared so the user is signed out of this browser either way.
export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore — still clear the local token below
    }
  }
  clearToken();
}

export function getTokenRoles(): string[] {
  const token = getToken();
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Array.isArray(payload?.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

export function isAdmin(): boolean {
  return getTokenRoles().includes('admin');
}

export function isSuperadmin(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.is_superadmin === true;
  } catch {
    return false;
  }
}
