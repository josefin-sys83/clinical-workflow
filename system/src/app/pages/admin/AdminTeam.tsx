import { useEffect, useState } from 'react';
import { getToken } from '@/shared/auth/token';
import { Trash2, Plus, X } from 'lucide-react';

type Superadmin = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

export function AdminTeam() {
  const [members, setMembers] = useState<Superadmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/team', { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMembers(await res.json());
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/team/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      setMembers(ms => ms.filter(m => m.id !== id));
    }
    setConfirmDeleteId(null);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const created = await res.json();
      setMembers(ms => [...ms, created]);
      setShowForm(false);
      setForm({ name: '', email: '' });
      setInviteNotice(created.emailSent
        ? 'Superadmin added — temporary password emailed.'
        : 'Superadmin added — email delivery unavailable; check server logs for the temporary password.');
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to invite');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Platform Team</h1>
          <p className="text-sm text-slate-500 mt-0.5">Superadmin users with full platform access.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setInviteNotice(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add superadmin
          </button>
        )}
      </div>

      {inviteNotice && (
        <p className="mb-4 text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-3 py-2">
          {inviteNotice}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleInvite}
          className="mb-6 bg-white border border-slate-200 rounded-lg p-5 space-y-3"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-800">New superadmin</p>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input
                type="email"
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">A temporary password will be generated and emailed to this user.</p>
          {formError && <p className="text-xs text-rose-700">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Adding…' : 'Add superadmin'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); }}
              className="px-4 py-1.5 text-slate-600 text-sm rounded-md hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {members.length === 0 && (
            <p className="px-5 py-6 text-sm text-slate-400 text-center">No superadmins yet.</p>
          )}
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs text-slate-400">
                  Joined {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {confirmDeleteId === m.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Delete permanently?</span>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-2 py-0.5 text-slate-600 rounded hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(m.id)}
                    title="Delete superadmin"
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
