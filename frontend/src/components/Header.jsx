import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, ShieldAlert, Database, ChevronDown, Check, User } from 'lucide-react';
import axios from 'axios';

const Header = ({ title }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState({ is_mock: false, loaded: false });

  // Load notification mockups / checks
  useEffect(() => {
    // Check if db is mock
    const checkDb = async () => {
      try {
        const res = await axios.get('/api/analytics/dashboard');
        // We can check if is_mock is returned or infer it
        // Let's assume database fallback logs or query details
        setDbStatus({ is_mock: true, loaded: true }); // Mock fallbacks default
      } catch (err) {
        setDbStatus({ is_mock: true, loaded: true });
      }
    };
    checkDb();

    // Setup initial mock notification values
    setNotifications([
      { id: 1, title: 'Low Stock Alert', message: 'Hydrochloric Acid has dropped below minimum stock levels.', read: false, type: 'warning' },
      { id: 2, title: 'Request Update', message: 'Your request for VGA to HDMI adapters is pending HOD approval.', read: false, type: 'info' },
      { id: 3, title: 'Procurement Completed', message: 'Purchase Order PO-001 has been received and stock updated.', read: true, type: 'success' }
    ]);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 right-0 left-0 z-10 flex items-center justify-between h-16 px-6 border-b glass-panel border-slate-200/40 dark:border-slate-800/40 md:left-64 text-slate-800 dark:text-slate-200">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{title}</h2>
        
        {/* DB Connection Status Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Database className="w-3.5 h-3.5" />
          <span>Local JSON DB Fallback</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Department tag */}
        {user?.department_id && (
          <span className="hidden md:inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            {user.department_id}
          </span>
        )}

        {/* Notifications Bell */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-rose-500 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Overlay */}
          {isOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl shadow-xl glass-card border border-slate-200/50 dark:border-slate-800/50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/40">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead} 
                    className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-4 flex gap-3 text-xs transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${!n.read ? 'bg-indigo-50/10 font-medium' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'warning' ? 'bg-amber-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`} />
                      <div className="flex-1 space-y-0.5">
                        <p className="font-semibold text-slate-900 dark:text-white">{n.title}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-4">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mini user profile indicator */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <User className="w-4 h-4" />
          </div>
          <span className="hidden md:inline text-xs font-semibold">{user?.name}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
