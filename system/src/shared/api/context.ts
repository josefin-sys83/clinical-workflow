// Small client-side context helpers.
// In Step 5 we keep a notion of the "active project" to wire workflow pages to data,
// without changing your route structure yet.

const KEY = 'clinical.activeProjectId';

export function getActiveProjectId(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveProjectId(projectId: string): void {
  try {
    window.localStorage.setItem(KEY, projectId);
  } catch {
    // ignore
  }
}

export async function setActiveProject(projectId: string): Promise<void> {
  setActiveProjectId(projectId);
  try {
    await fetch('/api/context/active-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
  } catch {
    // ignore
  }
}

export async function ensureActiveProjectId(): Promise<string | null> {
  const local = getActiveProjectId();
  if (local) return local;

  try {
    const res = await fetch('/api/context');
    if (!res.ok) return null;
    const json = (await res.json()) as { activeProjectId?: string | null };
    if (json?.activeProjectId) {
      setActiveProjectId(json.activeProjectId);
      return json.activeProjectId;
    }
  } catch {
    // ignore
  }

  return null;
}

