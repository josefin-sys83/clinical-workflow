import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2, Loader2, ChevronRight, AlertTriangle } from 'lucide-react';
import { apiErrorMessage, apiFetch } from '@/shared/api/http';
import { theme } from '@/app/theme';

interface Company {
  id: string;
  name: string;
  domain: string | null;
  status: 'active' | 'suspended';
  subscription_plan: 'starter' | 'professional' | 'enterprise';
  last_active_at: string | null;
  created_at: string;
  user_count: number;
  project_count: number;
}

const PLAN_LIMITS: Record<string, number | null> = {
  starter: 2,
  professional: 6,
  enterprise: null,
};

function fmtRelative(d: string | null) {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    apiFetch<Company[]>('/api/admin/companies')
      .then(setCompanies)
      .catch((err) => {
        console.error('[AdminCompanies] load error', err);
        setError(`Failed to load companies: ${err?.message ?? err}`);
      })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // No DB-level uniqueness on company name (two "CardioHRT" entries already exist in
  // production with different domains), so this is a non-blocking heads-up only — it
  // catches accidental double-creation without risking a hard failure on legitimate
  // same-named-but-different-entity companies (subsidiaries, rebrands, etc).
  const duplicateNameWarning = (() => {
    const trimmed = formName.trim().toLowerCase();
    if (!trimmed) return null;
    const match = companies.find(c => c.name.trim().toLowerCase() === trimmed);
    return match ? `A company named "${match.name}" already exists.` : null;
  })();

  async function handleCreate(e: React.FormEvent) {
    console.log('[AdminCompanies] handleCreate fired', { formName, formDomain });
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({ name: formName.trim(), domain: formDomain.trim() || undefined }),
      });
      setFormName('');
      setFormDomain('');
      setShowForm(false);
      load();
    } catch (err) {
      console.error('[AdminCompanies] handleCreate error', err);
      setError(apiErrorMessage(err, 'Failed to create company'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500 mt-1">All tenant organisations on the platform</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className={`flex items-center gap-2 ${theme.button.primary} text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
          >
            <Plus className="w-4 h-4" /> New Company
          </button>
        )}
      </div>

      {error && (
        <p className={`text-sm ${theme.status.error} border ${theme.border.error} rounded-lg px-4 py-3 mb-6`}>{error}</p>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">New Company</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company name *</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Acme Clinical"
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {duplicateNameWarning && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700 mt-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {duplicateNameWarning}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Domain (optional)</label>
              <input
                value={formDomain}
                onChange={e => setFormDomain(e.target.value)}
                placeholder="acme.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 ${theme.button.primary} disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create company
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {companies.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Building2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No companies yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left font-medium text-slate-500 px-5 py-3">Company</th>
                  <th className="text-left font-medium text-slate-500 px-5 py-3">Status</th>
                  <th className="text-left font-medium text-slate-500 px-5 py-3">Plan</th>
                  <th className="text-left font-medium text-slate-500 px-5 py-3">Projects</th>
                  <th className="text-left font-medium text-slate-500 px-5 py-3">Users</th>
                  <th className="text-left font-medium text-slate-500 px-5 py-3">Last active</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {companies.map(c => {
                  const limit = PLAN_LIMITS[c.subscription_plan];
                  const atLimit = limit !== null && c.project_count >= limit;
                  return (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{c.name}</div>
                        {c.domain && <div className="text-xs text-slate-400">{c.domain}</div>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? theme.status.active : theme.status.error}`}>
                          {c.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 capitalize">{c.subscription_plan}</td>
                      <td className="px-5 py-3">
                        <span className={atLimit ? `${theme.text.warning} font-medium` : 'text-slate-600'}>
                          {c.project_count}{limit !== null ? ` / ${limit}` : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{c.user_count}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{fmtRelative(c.last_active_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/admin/companies/${c.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          Manage <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
