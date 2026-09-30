import { clearToken, getToken } from './token';

// Backend endpoints under /api/ now require authentication. Rather than touch
// every one of the many raw fetch(...) call sites across the app, patch the
// global fetch once so any same-origin /api/ request automatically carries
// the bearer token — callers that already set their own Authorization header
// (e.g. Shell.tsx) are left untouched.
// A 401 on a request that carried a token means the session expired or was
// revoked. Every further action would fail, so send the user to sign in rather
// than leave a page that looks usable.
function redirectIfSessionExpired(res: Response): Response {
  if (res.status === 401 && window.location.pathname !== '/login') {
    clearToken();
    window.location.assign('/login?expired=1');
  }
  return res;
}

export function installAuthFetch() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    const isApiCall = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
    if (!isApiCall) return originalFetch(input, init);

    const token = getToken();
    if (!token) return originalFetch(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return originalFetch(input, { ...init, headers }).then(redirectIfSessionExpired);
  };
}
