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

function getToken(): string | null {
  return localStorage.getItem('clinical_system_token');
}

const API_BASE = window.location.origin.replace('-5173.', '-3001.');

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const token = getToken();
  const url = `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
  const res = await fetch(url, {
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const payload = await parseJsonSafe(res);
    throw new ApiError(`API request failed: ${res.status} ${res.statusText}`, res.status, payload);
  }

  return (await parseJsonSafe(res)) as T;
}