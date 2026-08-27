import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Building2, ShieldCheck, Users, LayoutDashboard } from 'lucide-react';
import{useLogout} from '@/shared/hooks/LogOut'
import { LogoutButton } from '@/app/components/LogoutButton';

const NAV = [
  { label: 'Overview',  href: '/admin/overview',  icon: LayoutDashboard },
  { label: 'Companies', href: '/admin/companies', icon: Building2 },
  { label: 'Team',      href: '/admin/team',      icon: Users },
  { label: 'Audit trail', href: '/admin/audit',   icon: Activity },
];

export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
const handleLogout = useLogout();


  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">Admin Panel</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Platform management</p>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                to={href}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-slate-200 space-y-2">
          <Link to="/dashboard" className="text-xs text-slate-500 hover:text-slate-700 ">
            ← Back to app
          </Link>
     <LogoutButton
  onLogout={handleLogout}
  className="flex items-center gap-2 px-0 py-1 text-xs text-slate-500 hover:text-rose-700 transition-colors"
/>
        </div>
        
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
