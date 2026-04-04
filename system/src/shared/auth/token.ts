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
