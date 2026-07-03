import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Boxes, FileText, ShoppingCart, AlertCircle, 
  TrendingUp, Calendar, AlertTriangle, ArrowUpRight, Plus, Eye, CheckCircle2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const res = await axios.get('/api/analytics/dashboard');
      return res.data;
    },
    refetchInterval: 30000 // refetch every 30s
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 animate-pulse" />
          <div className="h-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
        <h3 className="text-lg font-bold">Failed to load analytics</h3>
        <p className="text-sm mt-1">Please ensure the backend API server is active.</p>
      </div>
    );
  }

  const { summary, charts } = data;

  // Custom styling elements
  const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#EC4899'];

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Render role-specific card configurations
  const getCards = () => {
    const list = [
      { label: 'Total Inventory Items', value: summary.total_inventory, icon: Boxes, color: 'text-emerald-500 bg-emerald-500/10' },
      { label: 'Low/Out of Stock Alerts', value: summary.low_stock + summary.out_of_stock, icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10', critical: summary.low_stock > 0 },
      { label: 'Pending Approvals', value: summary.pending_requests, icon: FileText, color: 'text-indigo-500 bg-indigo-500/10' },
      { label: 'Purchase Orders', value: summary.total_purchase_orders, icon: ShoppingCart, color: 'text-teal-500 bg-teal-500/10' }
    ];

    if (user.role === 'Administrator') {
      list.push(
        { label: 'System Complaints', value: summary.total_complaints, icon: AlertCircle, color: 'text-rose-500 bg-rose-500/10' },
        { label: 'Today\'s Activity requests', value: summary.today_requests, icon: Calendar, color: 'text-pink-500 bg-pink-500/10' }
      );
    }

    return list;
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl glass-card border border-slate-200/50 dark:border-slate-800/50">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Welcome back, {user.name}</h2>
          <p className="text-xs text-slate-500 mt-1">Institutional role: <span className="font-semibold text-emerald-500">{user.role}</span>. Here is the operational summary for today.</p>
        </div>
        
        {/* Budget Utilization Panel */}
        <div className="mt-4 md:mt-0 flex gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Spent</span>
            <span className="text-lg font-bold text-rose-500">{formatCurrency(summary.budget_spent)}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Allocated Budget</span>
            <span className="text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(summary.budget_allocated)}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {getCards().slice(0, 4).map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="relative overflow-hidden p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 hover:scale-[1.01] transition-transform">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {card.critical && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</span>
                <p className="text-xs text-slate-400 font-medium">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Expenses Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Monthly Expenditure Trends</h3>
              <p className="text-[11px] text-slate-400">Aggregated spending across all departments</p>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthly_usage}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={10} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} 
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="spend" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Allocation */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">Category Valuation</h3>
            <p className="text-[11px] text-slate-400">Asset distribution by aggregate price value</p>
          </div>
          <div className="h-60 flex items-center justify-center">
            {charts.category_usage.length === 0 ? (
              <div className="text-xs text-slate-400">No category statistics available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.category_usage}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.category_usage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => formatCurrency(val)}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '10px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-[10px] font-semibold text-slate-500">
            {charts.category_usage.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="truncate max-w-[90px]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Department comparisons & quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Usage Comparison */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">Department Budgets</h3>
            <p className="text-[11px] text-slate-400">Comparison of allocated budget vs actual spent</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.department_usage}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis stroke="#94A3B8" fontSize={10} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="allocated" name="Budget Allocated" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Actual Spent" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">Quick Tasks</h3>
            <p className="text-[11px] text-slate-400 font-medium text-emerald-500">Accelerated institution shortcuts</p>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {user.role === 'Administrator' && (
              <>
                <button 
                  onClick={() => navigate('/inventory')} 
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-xs font-semibold transition-all group"
                >
                  <span className="group-hover:text-emerald-500">Add Inventory Asset</span>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                </button>
                <button 
                  onClick={() => navigate('/requests')} 
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-xs font-semibold transition-all group"
                >
                  <span className="group-hover:text-indigo-500">Review Open Approvals</span>
                  <CheckCircle2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </button>
              </>
            )}

            {user.role === 'Staff' && (
              <>
                <button 
                  onClick={() => navigate('/requests')} 
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-xs font-semibold transition-all group"
                >
                  <span className="group-hover:text-emerald-500">Raise Procurement Request</span>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                </button>
                <button 
                  onClick={() => navigate('/complaints')} 
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-rose-500/10 hover:border-rose-500/30 text-xs font-semibold transition-all group"
                >
                  <span className="group-hover:text-rose-500">File Damaged/Late Complaint</span>
                  <AlertCircle className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
                </button>
              </>
            )}

            {user.role === 'HOD' && (
              <>
                <button 
                  onClick={() => navigate('/requests')} 
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-xs font-semibold transition-all group"
                >
                  <span className="group-hover:text-indigo-500">Verify Department Requests</span>
                  <CheckCircle2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </button>
              </>
            )}

            {user.role === 'Principal' && (
              <>
                <button 
                  onClick={() => navigate('/purchases')} 
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-xs font-semibold transition-all group"
                >
                  <span className="group-hover:text-indigo-500">Authorize Purchase Orders</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </button>
              </>
            )}

            <button 
              onClick={() => navigate('/ai-insights')} 
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-600/15 to-teal-500/15 border border-emerald-500/20 hover:from-emerald-600/20 hover:to-teal-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all group"
            >
              <span>View AI Demand Forecasts</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
