import { useEffect, useState } from 'react';
import { Building2, Users, FolderOpen, Loader2 } from 'lucide-react';
import { apiFetch } from '@/shared/api/http';
import { theme } from '@/app/theme';

interface Stats {
  companies: number;
  users: number;
  projects: number;
}

/* eslint-disable theme-colors/no-raw-colors -- categorical icon colours per stat card, intentionally distinct from status badges */
const CARDS = [
  { key: 'companies' as const, label: 'Companies', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'users' as const,     label: 'Users',      icon: Users,     color: 'text-violet-600', bg: 'bg-violet-50' },
  { key: 'projects' as const,  label: 'Projects',   icon: FolderOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];
/* eslint-enable theme-colors/no-raw-colors */

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Stats>('/api/admin/stats')
      .then(setStats)
      .catch(() => setError('Failed to load stats'));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-1">System-wide statistics</p>
      </div>

      {error && (
        <p className={`text-sm ${theme.status.error} border ${theme.border.error} rounded-lg px-4 py-3 mb-6`}>{error}</p>
      )}

      {!stats && !error && (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-6">
          {CARDS.map(({ key, label, icon: Icon, color, bg }) => (
            <div key={key} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${bg} mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="text-3xl font-bold text-slate-900">{stats[key]}</div>
              <div className="text-sm text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
