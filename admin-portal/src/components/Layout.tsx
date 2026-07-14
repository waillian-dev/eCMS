import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Ticket, Home, LogOut, FileCode } from 'lucide-react';

export const Layout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Ticket Queue', path: '/complaints', icon: Ticket },
  ];

  // Only expose Audit Logs to super admins or department managers
  if (user && ['SUPER_ADMIN', 'DEPT_MANAGER'].includes(user.role)) {
    navItems.push({ name: 'Audit Logs', path: '/audit-logs', icon: FileCode });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 block">eCMS Portal</span>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Government Operations</span>
          </div>
        </div>

        {/* User profile status snippet */}
        <div className="p-4 mx-4 my-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-xs font-semibold text-slate-900 truncate">{user?.name}</div>
          <div className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">{user?.role}</div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50/50 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main body viewport */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Operational Service Management
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider">
            System Live
          </span>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
