import { useEffect, useState } from 'react';
import { getToken } from '@/shared/auth/token';
import { MessageCircleQuestion, X, Check, ChevronDown } from 'lucide-react';
import { theme } from '@/app/theme';

// ── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  name: string;
  email: string;
  system_role: string;
  timezone: string;
  company_name: string | null;
  company_id: string | null;
};

type CompanyUser = {
  id: string;
  name: string;
  email: string;
  system_role: string;
  is_active: boolean;
  created_at: string;
};

type CompanyProject = {
  id: string;
  name: string;
  status: string;
  current_step: string;
  roles: string[];
  created_at: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'Europe/Stockholm',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'UTC',
] as const;

const SUPPORT_CATEGORIES = ['Subscription', 'Technical issue', 'General question'] as const;

const STEP_LABELS: Record<string, string> = {
  'project-setup':   'Project Setup',
  synopsis:          'Synopsis',
  scope:             'Scope',
  'protocol-make':   'Make Protocol',
  'protocol-review': 'Protocol Review',
  'protocol-pdf':    'Protocol PDF',
  'report-make':     'Make Report',
  'report-review':   'Report Review',
  'report-pdf':      'Report PDF',
};

const ROLE_LABELS: Record<string, string> = {
  admin:    'Admin',
  author:   'Author',
  reviewer: 'Reviewer',
  approver: 'Approver',
};

const STATUS_COLOURS: Record<string, string> = {
  active:    theme.status.active,
  completed: theme.status.active,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-96 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg pointer-events-none">
      <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
      {message}
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({ profile, onToast }: { profile: Profile; onToast: (msg: string) => void }) {
  const [name, setName]           = useState(profile.name);
  const [timezone, setTimezone]   = useState(profile.timezone ?? 'Europe/Stockholm');
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [pw, setPw]         = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr]   = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    setProfileSaving(true);
    try {
      const res = await fetch('/api/settings/me', {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ name, timezone }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.message ?? 'Failed to save');
      }
      onToast('Profile saved');
    } catch (e: any) {
      setProfileErr(e.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErr(null);
    if (pw.next !== pw.confirm) { setPwErr('Passwords do not match'); return; }
    if (pw.next.length < 6)    { setPwErr('New password must be at least 6 characters'); return; }
    setPwSaving(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ current_password: pw.current, new_password: pw.next }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.message ?? 'Failed to change password');
      }
      setPw({ current: '', next: '', confirm: '' });
      onToast('Password changed');
    } catch (e: any) {
      setPwErr(e.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile info */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Profile information</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input
                value={profile.email}
                readOnly
                className="w-full text-sm border border-slate-100 rounded-md px-3 py-1.5 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Company</label>
              <input
                value={profile.company_name ?? '—'}
                readOnly
                className="w-full text-sm border border-slate-100 rounded-md px-3 py-1.5 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Role</label>
              <input
                value={ROLE_LABELS[profile.system_role] ?? profile.system_role}
                readOnly
                className="w-full text-sm border border-slate-100 rounded-md px-3 py-1.5 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Timezone</label>
              <div className="relative">
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>
          </div>
          {profileErr && <p className={`text-xs ${theme.text.error}`}>{profileErr}</p>}
          <button
            type="submit"
            disabled={profileSaving || !name.trim()}
            className={`px-4 py-1.5 ${theme.button.primary} text-sm rounded-md disabled:opacity-50 transition-colors`}
          >
            {profileSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Change password</h2>
        <form onSubmit={savePassword} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Current password</label>
            <input
              type="password"
              value={pw.current}
              onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">New password</label>
              <input
                type="password"
                value={pw.next}
                onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Confirm new password</label>
              <input
                type="password"
                value={pw.confirm}
                onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          {pwErr && <p className={`text-xs ${theme.text.error}`}>{pwErr}</p>}
          <button
            type="submit"
            disabled={pwSaving || !pw.current || !pw.next || !pw.confirm}
            className={`px-4 py-1.5 ${theme.button.primary} text-sm rounded-md disabled:opacity-50 transition-colors`}
          >
            {pwSaving ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab({ companyId, onToast }: { companyId: string; onToast: (msg: string) => void }) {
  const [users, setUsers]       = useState<CompanyUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', system_role: 'member' });
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/settings/company', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => setUsers(d.users))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [companyId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    if (!form.name.trim() || !form.email.trim()) {
      setFormErr('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/company/users', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.message ?? `HTTP ${res.status}`);
      }
      const created = await res.json();
      setUsers(us => [...us, created]);
      setShowForm(false);
      setForm({ name: '', email: '', system_role: 'author' });
      onToast(created.emailSent
        ? 'User invited — temporary password emailed.'
        : 'User invited — email delivery unavailable; check server logs for the temporary password.');
    } catch (e: any) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function patchRole(userId: string, system_role: string) {
    const res = await fetch(`/api/settings/company/users/${userId}/role`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ system_role }),
    });
    if (res.ok) {
      const u = await res.json();
      setUsers(us => us.map(x => x.id === u.id ? { ...x, system_role: u.system_role } : x));
    }
  }

  async function toggleActive(user: CompanyUser) {
    const res = await fetch(`/api/settings/company/users/${user.id}/active`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (res.ok) {
      const u = await res.json();
      setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: u.is_active } : x));
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (error)   return <p className={`text-sm ${theme.text.error}`}>{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''} in your organisation</p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className={`px-3 py-1.5 ${theme.button.primary} text-sm rounded-md transition-colors`}
          >
            + Invite user
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={invite} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-800">New user</p>
            <button type="button" onClick={() => { setShowForm(false); setFormErr(null); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="jane@company.com" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Role</label>
            <select value={form.system_role} onChange={e => setForm(f => ({ ...f, system_role: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <p className="text-xs text-slate-500">A temporary password will be generated and emailed to this user.</p>
          {formErr && <p className={`text-xs ${theme.text.error}`}>{formErr}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className={`px-4 py-1.5 ${theme.button.primary} text-sm rounded-md disabled:opacity-50 transition-colors`}>
              {saving ? 'Adding…' : 'Add user'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormErr(null); }}
              className="px-4 py-1.5 text-slate-600 text-sm rounded-md hover:bg-slate-100 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {users.length === 0 && (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No users yet.</p>
        )}
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-4 px-5 py-3">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
            </div>
            <select
              value={u.system_role === 'admin' ? 'admin' : 'member'}
              onChange={e => patchRole(u.id, e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() => toggleActive(u)}
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                u.is_active
                  ? `${theme.status.active} hover:bg-rose-50 hover:text-rose-700`
                  : `${theme.status.neutral} hover:bg-blue-50 hover:text-blue-700`
              }`}
              title={u.is_active ? 'Deactivate' : 'Activate'}
            >
              {u.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────────────────

function ProjectsTab({ companyId }: { companyId: string }) {
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/settings/company', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => setProjects(d.projects))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (error)   return <p className={`text-sm ${theme.text.error}`}>{error}</p>;
  if (!projects.length) return (
    <div className="bg-white border border-slate-200 rounded-lg px-5 py-10 text-center">
      <p className="text-sm text-slate-400">No projects yet.</p>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
      {projects.map(p => (
        <div key={p.id} className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                <span className="text-xs text-slate-400 font-mono">{p.id}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {p.status === 'active' ? 'Active' : 'Completed'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Step: <span className="text-slate-700">{STEP_LABELS[p.current_step] ?? p.current_step}</span>
              </p>
            </div>
            <div className="text-xs text-slate-400 flex-shrink-0">
              {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          {p.roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {p.roles.map((r, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-600">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Support Slide-in Panel ────────────────────────────────────────────────────

function SupportPanel({ onClose, onToast }: { onClose: () => void; onToast: (msg: string) => void }) {
  const [form, setForm]     = useState({ category: SUPPORT_CATEGORIES[0] as string, subject: '', message: '' });
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Subject and message are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/support', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.message ?? `HTTP ${res.status}`);
      }
      onToast('Support request sent');
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 h-full w-96 z-50 bg-white border-l border-slate-200 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-900">Contact support</p>
            <p className="text-xs text-slate-500 mt-0.5">We'll get back to you as soon as possible.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {SUPPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Subject</label>
            <input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of your issue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Message</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={6}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe your issue in detail…"
            />
          </div>
          {error && <p className={`text-xs ${theme.text.error}`}>{error}</p>}
        </form>

        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={submit}
            disabled={saving}
            className={`w-full py-2 ${theme.button.primary} text-sm font-medium rounded-md disabled:opacity-50 transition-colors`}
          >
            {saving ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────

type Tab = 'profile' | 'users' | 'projects';

export default function Settings() {
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<Tab>('profile');
  const [supportOpen, setSupportOpen] = useState(false);
  const [toast, setToast]             = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/me', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d); })
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = profile?.system_role === 'admin';

  const TABS: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: 'profile',  label: 'My profile' },
    { id: 'users',    label: 'Users',    adminOnly: true },
    { id: 'projects', label: 'Projects', adminOnly: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className={`text-sm ${theme.text.error}`}>Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="max-w-3xl mx-auto py-10 px-4 pb-20">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Settings</h1>
        <p className="text-sm text-slate-500 mb-6">Manage your profile and organisation.</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {TABS.filter(t => !t.adminOnly || isAdmin).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'profile' && (
          <ProfileTab profile={profile} onToast={setToast} />
        )}
        {tab === 'users' && isAdmin && profile.company_id && (
          <UsersTab companyId={profile.company_id} onToast={setToast} />
        )}
        {tab === 'projects' && isAdmin && profile.company_id && (
          <ProjectsTab companyId={profile.company_id} />
        )}
      </div>

      {/* Support button */}
      <button
        onClick={() => setSupportOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm rounded-full shadow-lg hover:bg-slate-800 transition-colors"
      >
        <MessageCircleQuestion className="w-4 h-4" />
        Support
      </button>

      {/* Support slide-in */}
      {supportOpen && (
        <SupportPanel onClose={() => setSupportOpen(false)} onToast={setToast} />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
