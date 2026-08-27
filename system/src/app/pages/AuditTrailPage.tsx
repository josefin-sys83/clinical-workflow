import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Building2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import { apiErrorMessage } from '@/shared/api/http';
import {
  listVisibleAuditEntityTypes,
  listVisibleAuditEvents,
  type GlobalAuditEvent,
} from '@/shared/api/globalAudit';
import { isSuperadmin } from '@/shared/auth/token';

const SCOPE_STYLE = {
  system: 'bg-violet-50 text-violet-700 border-violet-200',
  company: 'bg-blue-50 text-blue-700 border-blue-200',
  project: 'bg-emerald-50 text-emerald-700 border-emerald-200',
} as const;

const SCOPE_ICON = {
  system: ShieldCheck,
  company: Building2,
  project: FolderOpen,
} as const;

function formatDateTime(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function labelFromType(type: string) {
  return type
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replaceAll('_', ' '))
    .join(' · ');
}

function readableMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  return Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null);
}

function MetadataValue({ value }: { value: unknown }) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <>{String(value)}</>;
  }
  return <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(value, null, 2)}</pre>;
}

function AuditEventRow({ event }: { event: GlobalAuditEvent }) {
  const [expanded, setExpanded] = useState(false);
  const ScopeIcon = SCOPE_ICON[event.scope];
  const when = formatDateTime(event.createdAt);
  const metadata = readableMetadata(event.metadata);
  const actor = event.actorName ?? (event.actorUserId === 'system' ? 'System' : 'Unknown actor');

  return (
    <article className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full px-4 py-4 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${SCOPE_STYLE[event.scope]}`}>
          <ScopeIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-900">{event.message}</span>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${SCOPE_STYLE[event.scope]}`}>
              {event.scope}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <User className="w-3 h-3" />
              {actor}{event.actorRole ? ` · ${event.actorRole}` : ''}
            </span>
            {event.companyName && <span>Company: {event.companyName}</span>}
            {(event.projectNumber || event.projectName) && (
              <span>Project: {[event.projectNumber, event.projectName].filter(Boolean).join(' · ')}</span>
            )}
            {event.entityLabel && event.entityType !== 'project' && event.entityType !== 'company' && (
              <span>{event.entityType.replaceAll('_', ' ')}: {event.entityLabel}</span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-xs font-medium text-slate-700">{when.date}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{when.time}</div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 mt-1" /> : <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Action</div>
            <div className="text-xs font-medium text-slate-700">{labelFromType(event.type)}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">{event.type}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Actor</div>
            <div className="text-xs font-medium text-slate-700">{actor}</div>
            {event.actorEmail && <div className="text-[11px] text-slate-500 mt-1">{event.actorEmail}</div>}
          </div>
          {event.stepId && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Workflow step</div>
              <div className="text-xs text-slate-700">{event.stepId}</div>
            </div>
          )}
          {metadata && (
            <div className="sm:col-span-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Recorded details</div>
              <dl className="grid sm:grid-cols-2 gap-2">
                {metadata.map(([key, value]) => (
                  <div key={key} className="rounded border border-slate-200 bg-white px-3 py-2">
                    <dt className="text-[10px] font-semibold text-slate-400">{key.replaceAll('_', ' ')}</dt>
                    <dd className="text-xs text-slate-700 break-words mt-0.5"><MetadataValue value={value} /></dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="sm:col-span-2 text-[10px] font-mono text-slate-400">Event ID: {event.id}</div>
        </div>
      )}
    </article>
  );
}

export function AuditTrailPage() {
  const superadmin = isSuperadmin();
  const [events, setEvents] = useState<GlobalAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'system' | 'company' | 'project'>('all');
  const [entityType, setEntityType] = useState('all');
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const eventRequestId = useRef(0);
  const entityTypeRequestId = useRef(0);

  async function load() {
    const requestId = ++eventRequestId.current;
    setLoading(true);
    setError('');
    try {
      const result = await listVisibleAuditEvents({
        scope,
        entityType: entityType === 'all' ? undefined : entityType,
        search,
        limit: 300,
      });
      if (requestId !== eventRequestId.current) return;
      setEvents(result);
    } catch (err) {
      if (requestId !== eventRequestId.current) return;
      setError(apiErrorMessage(err, 'Failed to load the audit trail.'));
    } finally {
      if (requestId === eventRequestId.current) setLoading(false);
    }
  }

  async function loadEntityTypes() {
    const requestId = ++entityTypeRequestId.current;
    try {
      const result = await listVisibleAuditEntityTypes({ scope });
      if (requestId !== entityTypeRequestId.current) return;
      setEntityTypes(result);
    } catch (err) {
      if (requestId !== entityTypeRequestId.current) return;
      setError(apiErrorMessage(err, 'Failed to load the audit record types.'));
    }
  }

  useEffect(() => {
    // Invalidate a request that may still be returning data for the previous filters.
    eventRequestId.current += 1;
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [search, scope, entityType]);

  useEffect(() => {
    void loadEntityTypes();
  }, [scope]);

  function handleScopeChange(nextScope: typeof scope) {
    entityTypeRequestId.current += 1;
    setScope(nextScope);
    setEntityType('all');
    setEntityTypes([]);
  }

  function refresh() {
    void Promise.all([load(), loadEntityTypes()]);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-semibold text-slate-900">
              {superadmin ? 'Platform audit trail' : 'Company audit trail'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {superadmin
              ? 'System, company, and project activity across the platform.'
              : 'Company and project activity visible to members of your organisation.'}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-5 grid gap-3 md:grid-cols-[1fr_160px_190px]">
        <label className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search actions, people, projects, or companies"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <select
          value={scope}
          onChange={(event) => handleScopeChange(event.target.value as typeof scope)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700"
        >
          <option value="all">All scopes</option>
          {superadmin && <option value="system">System</option>}
          <option value="company">Company</option>
          <option value="project">Project</option>
        </select>
        <select
          value={entityType}
          onChange={(event) => setEntityType(event.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700"
        >
          <option value="all">All record types</option>
          {entityTypes.map((value) => (
            <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {loading && events.length === 0 ? (
        <div className="py-20 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading audit events…</span>
        </div>
      ) : events.length === 0 ? (
        <div className="py-20 rounded-lg border border-dashed border-slate-300 text-center text-sm text-slate-500">
          No audit events match these filters.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 mb-3">Showing {events.length} most recent events</div>
          {events.map((event) => <AuditEventRow key={event.id} event={event} />)}
        </div>
      )}
    </div>
  );
}
