import { getToken } from './token';

// Backend endpoints under /api/ now require authentication. Rather than touch
// every one of the many raw fetch(...) call sites across the app, patch the
// global fetch once so any same-origin /api/ request automatically carries
// the bearer token — callers that already set their own Authorization header
// (e.g. Shell.tsx) are left untouched.
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

    return originalFetch(input, { ...init, headers });
  };
}
