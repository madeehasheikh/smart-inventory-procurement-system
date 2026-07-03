import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password flow
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetFinished, setResetFinished] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotMsg('');
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotMsg(res.data.message);
      if (res.data.debug_reset_token) {
        setResetToken(res.data.debug_reset_token);
      }
    } catch (err) {
      setForgotMsg('Error requesting password reset.');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/reset-password', { token: resetToken, password: newPassword });
      setResetFinished(true);
      setTimeout(() => {
        setShowForgot(false);
        setResetFinished(false);
        setResetToken('');
        setForgotEmail('');
        setForgotMsg('');
        setPassword('');
      }, 3000);
    } catch (err) {
      setForgotMsg('Failed to reset password. Token may be invalid.');
    }
  };

  // Demo user quick logins
  const demoUsers = [
    { label: 'Admin', email: 'admin@sipms.edu', pass: 'admin123' },
    { label: 'Staff (CS)', email: 'staff.cs@sipms.edu', pass: 'staff123' },
    { label: 'HOD (CS)', email: 'hod.cs@sipms.edu', pass: 'hod123' },
    { label: 'Principal', email: 'principal@sipms.edu', pass: 'principal123' },
    { label: 'Management', email: 'management@sipms.edu', pass: 'management123' }
  ];

  const autofillDemo = (demo) => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setError('');
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-slate-900 text-slate-100">
      {/* Background drifting glow circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute top-1/2 left-2/3 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl animate-blob animation-delay-4000" />

      {/* Main Glassmorphic Container Card */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4 rounded-3xl glass-card border border-slate-700/40">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-900 shadow-xl shadow-emerald-500/10">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Smart Inventory & Procurement</h2>
          <p className="text-sm text-slate-400 mt-1">Educational Institution ERP</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-3.5 mb-5 text-xs rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!showForgot ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-950/40 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/60 bg-slate-950/40 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950/40 text-emerald-500 focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <button 
                type="button" 
                onClick={() => setShowForgot(true)}
                className="text-emerald-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 font-semibold text-sm text-white shadow-lg hover:shadow-emerald-500/10 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* FORGOT / RESET FLOW */
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-white">Reset Account Password</h3>
            {!resetToken ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-400 leading-4">Enter your registered institutional email to request a reset link.</p>
                <div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@school.edu"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-950/40 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                {forgotMsg && <p className="text-xs text-emerald-400 font-medium">{forgotMsg}</p>}
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setForgotMsg(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-sm text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-semibold transition-colors"
                  >
                    Send Reset
                  </button>
                </div>
              </form>
            ) : (
              /* Reset Password with active debug token */
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {resetFinished ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 animate-bounce" />
                    <p className="text-xs text-emerald-400 font-semibold">Password Reset Successful!</p>
                    <p className="text-[10px] text-slate-400">Returning to login panel...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      <b>Debug Token Captured:</b> <code className="text-emerald-300">{resetToken.slice(0, 8)}...</code>
                    </p>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-950/40 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    {forgotMsg && <p className="text-xs text-rose-400">{forgotMsg}</p>}
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-semibold transition-colors"
                    >
                      Update Password
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        )}

        {/* Quick Demo Autofillers */}
        {!showForgot && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center mb-3">Quick Demo Role Login</span>
            <div className="flex flex-wrap justify-center gap-2">
              {demoUsers.map(user => (
                <button
                  key={user.label}
                  onClick={() => autofillDemo(user)}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white transition-all hover:scale-105 active:scale-95"
                >
                  {user.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
