// class-validator's ValidationPipe returns `message` as string[] when multiple rules fail
// on one field (or across fields) — join it so the UI shows one readable line instead of
// concatenating the array or rendering "[object Object]".
export function apiErrorMessage(err: unknown, fallback: string): string {
  const payload = (err as { payload?: { message?: string | string[] } })?.payload;
  const message = payload?.message;
  if (Array.isArray(message)) return message.join(' ');
  return message ?? fallback;
}

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  // Lazy import avoids circular deps; token module has no React imports
  const { getToken } = await import('../auth/token');
  const token = getToken();
  const { headers: callerHeaders, ...restInit } = init ?? {};
  const res = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...restInit,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(callerHeaders ?? {}),
    },
  });

  if (!res.ok) {
    const payload = await parseJsonSafe(res);
    throw new ApiError(`API request failed: ${res.status} ${res.statusText}`, res.status, payload);
  }

  return (await parseJsonSafe(res)) as T;
}