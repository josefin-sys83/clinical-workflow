import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Plus, Loader2, UserCheck, UserX,
  Pencil, Check, X, FolderOpen, ShieldAlert,
} from 'lucide-react';
import { apiErrorMessage, apiFetch } from '@/shared/api/http';
import { theme } from '@/app/theme';

interface User {
  id: string;
  name: string;
  email: string;
  system_role: string;
  is_active: boolean;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  domain: string | null;
  status: 'active' | 'suspended';
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
  subscription_plan: 'starter' | 'professional' | 'enterprise';
  subscription_start: string | null;
  subscription_renewal: string | null;
  last_active_at: string | null;
  created_at: string;
  users: User[];
  projects: Project[];
}

const ROLES = ['admin'] as const;
const SYSTEM_ROLES = ['admin', 'author', 'reviewer', 'approver'] as const;
const PLANS = ['starter', 'professional', 'enterprise'] as const;

const PLAN_LIMITS: Record<string, number | null> = {
  starter: 2,
  professional: 6,
  enterprise: null,
};

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter (up to 2 projects)',
  professional: 'Professional (up to 6 projects)',
  enterprise: 'Enterprise (unlimited)',
};

const ROLE_BADGE: Record<string, string> = {
  admin:    theme.status.ai,
  author:   theme.status.active,
  reviewer: theme.status.warning,
  approver: 'bg-emerald-100 text-emerald-700',
};

const STATUS_BADGE: Record<string, string> = {
  active:    theme.status.active,
  completed: 'bg-slate-100 text-slate-600',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function fmtRelative(d: string | null) {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return fmtDate(d);
}

/** Input for date fields — converts ISO timestamp to YYYY-MM-DD for <input type=date> */
function toDateValue(s: string | null) {
  if (!s) return '';
  return s.slice(0, 10);
}

export function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit company state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', domain: '',
    contact_name: '', contact_email: '', contact_phone: '',
    billing_address_line1: '', billing_address_line2: '',
    billing_city: '', billing_postal_code: '', billing_country: '',
    subscription_plan: 'starter', subscription_start: '', subscription_renewal: '',
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Add user form
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', system_role: 'admin' });
  const [savingUser, setSavingUser] = useState(false);

  // Per-user actions
  const [toggling, setToggling] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const load = () =>
    apiFetch<Company>(`/api/admin/companies/${id}`)
      .then(c => { setCompany(c); setError(''); })
      .catch(() => setError('Failed to load company'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  function startEdit() {
    if (!company) return;
    setEditForm({
      name: company.name,
      domain: company.domain ?? '',
      contact_name: company.contact_name ?? '',
      contact_email: company.contact_email ?? '',
      contact_phone: company.contact_phone ?? '',
      billing_address_line1: company.billing_address_line1 ?? '',
      billing_address_line2: company.billing_address_line2 ?? '',
      billing_city: company.billing_city ?? '',
      billing_postal_code: company.billing_postal_code ?? '',
      billing_country: company.billing_country ?? '',
      subscription_plan: company.subscription_plan,
      subscription_start: toDateValue(company.subscription_start),
      subscription_renewal: toDateValue(company.subscription_renewal),
    });
    setEditing(true);
  }

  async function saveCompany() {
    if (!editForm.name.trim()) return;
    setSavingCompany(true);
    try {
      await apiFetch(`/api/admin/companies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setEditing(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update company'));
    } finally {
      setSavingCompany(false);
    }
  }

  async function toggleStatus() {
    if (!company) return;
    const next = company.status === 'active' ? 'suspended' : 'active';
    setTogglingStatus(true);
    try {
      await apiFetch(`/api/admin/companies/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      load();
    } catch {
      setError('Failed to update company status');
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password) return;
    setSavingUser(true);
    try {
      await apiFetch(`/api/admin/companies/${id}/users`, {
        method: 'POST',
        body: JSON.stringify(userForm),
      });
      setUserForm({ name: '', email: '', password: '', system_role: 'author' });
      setShowUserForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to create user'));
    } finally {
      setSavingUser(false);
    }
  }

  async function toggleActive(user: User) {
    setToggling(user.id);
    try {
      await apiFetch(`/api/admin/users/${user.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      load();
    } catch {
      setError('Failed to update user');
    } finally {
      setToggling(null);
    }
  }

  async function changeRole(user: User, role: string) {
    setChangingRole(user.id);
    try {
      await apiFetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ system_role: role }),
      });
      load();
    } catch {
      setError('Failed to change role');
    } finally {
      setChangingRole(null);
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
    </div>
  );

  if (!company) return (
    <div className="p-8"><p className={`text-sm ${theme.text.error}`}>{error || 'Company not found'}</p></div>
  );

  const planLimit = PLAN_LIMITS[company.subscription_plan];
  const atLimit = planLimit !== null && company.projects.length >= planLimit;

  return (
    <div className="p-8 space-y-6">
      <Link to="/admin/companies" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4" /> All companies
      </Link>

      {error && (
        <p className={`text-sm ${theme.status.error} border ${theme.border.error} rounded-lg px-4 py-3`}>{error}</p>
      )}

      {/* ── Company info card ── */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">

        {/* Header row */}
        <div className="px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Company name *</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      autoFocus
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Domain</label>
                    <input
                      value={editForm.domain}
                      onChange={e => setEditForm(f => ({ ...f, domain: e.target.value }))}
                      placeholder="acme.com"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
                  <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${company.status === 'active' ? theme.status.active : theme.status.error}`}>
                    {company.status === 'active' ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {company.domain ?? <span className="italic">No domain</span>}
                  {' · '}Created {fmtDate(company.created_at)}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editing && (
              <>
                <button
                  onClick={toggleStatus}
                  disabled={togglingStatus}
                  title={company.status === 'active' ? 'Suspend company' : 'Reactivate company'}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                    company.status === 'active'
                      ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                      : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {togglingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                  {company.status === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
                <button
                  onClick={startEdit}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Edit company"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="px-6 py-4 grid grid-cols-[140px_1fr] items-start gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-0.5">Contact</span>
          {editing ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input
                  value={editForm.contact_name}
                  onChange={e => setEditForm(f => ({ ...f, contact_name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.contact_email}
                  onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))}
                  placeholder="jane@company.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.contact_phone}
                  onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))}
                  placeholder="+1 555 000 0000"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
              {company.contact_name ? (
                <>
                  <span className="font-medium">{company.contact_name}</span>
                  {company.contact_email && (
                    <><span className="text-slate-300">·</span><a href={`mailto:${company.contact_email}`} className="text-blue-600 hover:underline">{company.contact_email}</a></>
                  )}
                  {company.contact_phone && (
                    <><span className="text-slate-300">·</span><a href={`tel:${company.contact_phone}`} className="text-slate-600 hover:underline">{company.contact_phone}</a></>
                  )}
                </>
              ) : (
                <span className="text-slate-400 italic">No contact set</span>
              )}
            </div>
          )}
        </div>

        {/* Billing */}
        <div className="px-6 py-4 grid grid-cols-[140px_1fr] items-start gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-0.5">Billing</span>
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Address line 1</label>
                  <input
                    value={editForm.billing_address_line1}
                    onChange={e => setEditForm(f => ({ ...f, billing_address_line1: e.target.value }))}
                    placeholder="123 Main Street"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Address line 2</label>
                  <input
                    value={editForm.billing_address_line2}
                    onChange={e => setEditForm(f => ({ ...f, billing_address_line2: e.target.value }))}
                    placeholder="Suite 400"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">City</label>
                  <input
                    value={editForm.billing_city}
                    onChange={e => setEditForm(f => ({ ...f, billing_city: e.target.value }))}
                    placeholder="San Francisco"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Postal code</label>
                  <input
                    value={editForm.billing_postal_code}
                    onChange={e => setEditForm(f => ({ ...f, billing_postal_code: e.target.value }))}
                    placeholder="94105"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Country</label>
                  <input
                    value={editForm.billing_country}
                    onChange={e => setEditForm(f => ({ ...f, billing_country: e.target.value }))}
                    placeholder="United States"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-700">
              {company.billing_address_line1 ? (
                <address className="not-italic space-y-0.5">
                  <div>{company.billing_address_line1}</div>
                  {company.billing_address_line2 && <div>{company.billing_address_line2}</div>}
                  <div>
                    {[company.billing_city, company.billing_postal_code].filter(Boolean).join(', ')}
                    {company.billing_country && <>, {company.billing_country}</>}
                  </div>
                </address>
              ) : (
                <span className="text-slate-400 italic">No billing address set</span>
              )}
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="px-6 py-4 grid grid-cols-[140px_1fr] items-start gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-0.5">Subscription</span>
          {editing ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Plan</label>
                <select
                  value={editForm.subscription_plan}
                  onChange={e => setEditForm(f => ({ ...f, subscription_plan: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PLANS.map(p => (
                    <option key={p} value={p}>{PLAN_LABEL[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Start date</label>
                <input
                  type="date"
                  value={editForm.subscription_start}
                  onChange={e => setEditForm(f => ({ ...f, subscription_start: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Renewal date</label>
                <input
                  type="date"
                  value={editForm.subscription_renewal}
                  onChange={e => setEditForm(f => ({ ...f, subscription_renewal: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-slate-900 capitalize">{company.subscription_plan}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">
                {company.projects.length} / {planLimit ?? '∞'} projects used
                {atLimit && <span className={`ml-2 ${theme.text.warning} font-medium`}>· Limit reached</span>}
              </span>
              {company.subscription_renewal && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">Renews {fmtDate(company.subscription_renewal)}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="px-6 py-4 grid grid-cols-[140px_1fr] items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Activity</span>
          <div className="flex items-center gap-5 text-sm text-slate-600">
            <span><strong className="text-slate-900">{company.users.length}</strong> user{company.users.length !== 1 ? 's' : ''}</span>
            <span><strong className="text-slate-900">{company.projects.length}</strong> project{company.projects.length !== 1 ? 's' : ''}</span>
            <span>Last active: <strong className="text-slate-900">{fmtRelative(company.last_active_at)}</strong></span>
          </div>
        </div>

        {/* Save / cancel row (only in edit mode) */}
        {editing && (
          <div className="px-6 py-4 flex items-center gap-3 bg-slate-50">
            <button
              onClick={saveCompany}
              disabled={savingCompany || !editForm.name.trim()}
              className={`inline-flex items-center gap-1.5 ${theme.button.primary} disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
            >
              {savingCompany ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save changes
            </button>
            <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-2 py-2">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* ── Users ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Users <span className="text-slate-400 font-normal ml-1">{company.users.length}</span>
          </h2>
          {!showUserForm && (
            <button
              onClick={() => setShowUserForm(true)}
              className={`inline-flex items-center gap-1.5 ${theme.button.primary} text-xs font-medium px-3 py-1.5 rounded-lg transition-colors`}
            >
              <Plus className="w-3.5 h-3.5" /> Add user
            </button>
          )}
        </div>

        {showUserForm && (
          <form onSubmit={handleCreateUser} className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-700 mb-3">New user</p>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {[
                { label: 'Full name *', field: 'name', type: 'text', placeholder: 'Jane Smith' },
                { label: 'Email *', field: 'email', type: 'email', placeholder: 'jane@company.com' },
                { label: 'Password *', field: 'password', type: 'password', placeholder: 'Temporary password' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(userForm as any)[field]}
                    onChange={e => setUserForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    required
                    minLength={field === 'password' ? 6 : undefined}
                    className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Role</label>
                <span className="block text-xs text-slate-700 px-2.5 py-1.5">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingUser}
                className={`inline-flex items-center gap-1.5 ${theme.button.primary} disabled:opacity-50 text-xs font-medium px-3 py-1.5 rounded-md transition-colors`}
              >
                {savingUser && <Loader2 className="w-3 h-3 animate-spin" />}
                Add user
              </button>
              <button type="button" onClick={() => setShowUserForm(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5">Cancel</button>
            </div>
          </form>
        )}

        {company.users.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><p className="text-sm">No users yet</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Name', 'Email', 'Role', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="text-left font-medium text-slate-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {company.users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={u.system_role}
                        onChange={e => changeRole(u, e.target.value)}
                        disabled={changingRole === u.id}
                        className="border border-slate-200 rounded-md px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {SYSTEM_ROLES.map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                      {changingRole === u.id && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? theme.status.active : theme.status.neutral}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{fmtDate(u.created_at)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={toggling === u.id}
                      title={u.is_active ? 'Deactivate' : 'Activate'}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 disabled:opacity-40 transition-colors"
                    >
                      {toggling === u.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Projects ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Projects
            <span className="text-slate-400 font-normal ml-1">{company.projects.length}</span>
            {planLimit !== null && (
              <span className="text-slate-400 font-normal"> / {planLimit}</span>
            )}
          </h2>
          {atLimit && (
            <span className={`text-xs font-medium ${theme.status.warning} border ${theme.border.warning} px-2.5 py-1 rounded-lg`}>
              Plan limit reached — upgrade to create more
            </span>
          )}
        </div>
        {company.projects.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FolderOpen className="w-7 h-7 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No projects yet for this company</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Project', 'Status', 'Created'].map(h => (
                  <th key={h} className="text-left font-medium text-slate-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {company.projects.map(p => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
