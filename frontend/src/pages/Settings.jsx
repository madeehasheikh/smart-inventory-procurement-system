import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, Lock, Bell, Moon, Sun, 
  CheckCircle, AlertCircle, Save 
} from 'lucide-react';

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Profile Form state
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Notification preference mockup states
  const [notifPreferences, setNotifPreferences] = useState({
    stockAlerts: true,
    requestUpdates: true,
    complaintResolutions: false
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const updateData = { name, email };
      if (password) updateData.password = password;
      await updateProfile(updateData);
      setMessage('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotif = (key) => {
    setNotifPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Messages */}
      {message && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile and Password Settings (Col Span 2) */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4.5 h-4.5 text-emerald-500" />
            Profile & Security Configuration
          </h3>
          
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Change Password (Optional)</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty to keep current"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">Confirm New Password</label>
                <input
                  type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Leave empty to keep current"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-98 transition-all"
              >
                <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Preferences and theme setting (Col Span 1) */}
        <div className="space-y-6">
          
          {/* 1. Theme Card */}
          <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Moon className="w-4.5 h-4.5 text-indigo-500" />
              Theme Preferences
            </h3>
            <div className="flex items-center justify-between text-xs font-medium">
              <span>Dark / Light Mode Toggle</span>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/10 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-250 dark:border-slate-800 transition-colors"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" /> Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-emerald-400" /> Dark Mode
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Notifications switches */}
          <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4.5 h-4.5 text-indigo-500" />
              Notification Settings
            </h3>
            
            <div className="space-y-4 text-xs font-medium">
              <label className="flex items-center justify-between cursor-pointer">
                <span>Low stock alerts warning</span>
                <input
                  type="checkbox" checked={notifPreferences.stockAlerts}
                  onChange={() => toggleNotif('stockAlerts')}
                  className="rounded border-slate-200 dark:border-slate-800 bg-transparent text-emerald-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Request status changes</span>
                <input
                  type="checkbox" checked={notifPreferences.requestUpdates}
                  onChange={() => toggleNotif('requestUpdates')}
                  className="rounded border-slate-200 dark:border-slate-800 bg-transparent text-emerald-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Complaint resolving actions</span>
                <input
                  type="checkbox" checked={notifPreferences.complaintResolutions}
                  onChange={() => toggleNotif('complaintResolutions')}
                  className="rounded border-slate-200 dark:border-slate-800 bg-transparent text-emerald-500 focus:ring-0"
                />
              </label>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Settings;
