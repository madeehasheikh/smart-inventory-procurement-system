import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, Boxes, FileText, ShoppingCart, 
  AlertCircle, BarChart3, Sparkles, History, 
  Settings, LogOut, Sun, Moon, GraduationCap 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const role = user.role;

  // Navigation config based on RBAC roles
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Administrator', 'Staff', 'HOD', 'Principal', 'Management'] },
    { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['Administrator', 'Staff', 'HOD', 'Principal', 'Management'] },
    { to: '/requests', label: 'Requests', icon: FileText, roles: ['Administrator', 'Staff', 'HOD', 'Principal', 'Management'] },
    { to: '/purchases', label: 'Purchases', icon: ShoppingCart, roles: ['Administrator', 'HOD', 'Principal', 'Management'] },
    { to: '/complaints', label: 'Complaints', icon: AlertCircle, roles: ['Administrator', 'Staff', 'HOD'] },
    { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['Administrator', 'HOD', 'Principal', 'Management'] },
    { to: '/ai-insights', label: 'AI Insights', icon: Sparkles, roles: ['Administrator', 'HOD', 'Principal', 'Management'] },
    { to: '/audit-logs', label: 'Audit Logs', icon: History, roles: ['Administrator'] },
    { to: '/settings', label: 'Settings', icon: Settings, roles: ['Administrator', 'Staff', 'HOD', 'Principal', 'Management'] },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex flex-col w-64 h-screen transition-transform -translate-x-full border-r md:translate-x-0 glass-panel border-slate-200/50 dark:border-slate-800/50 bg-slate-900 dark:bg-slate-950 text-slate-300">
      {/* Brand logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
        <GraduationCap className="w-8 h-8 text-emerald-500" />
        <div>
          <h1 className="font-bold text-white tracking-wide text-md">SIPMS</h1>
          <span className="text-xs text-slate-500">Edu Inventory SaaS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm ${
                  isActive 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer controls & user */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-500">Theme</span>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/40">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-sm">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-4">{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mt-0.5">{user.role}</p>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
