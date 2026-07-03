import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts';
import { BarChart3, Clock, AlertTriangle, RefreshCw, Star } from 'lucide-react';

const Analytics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analyticsMetrics'],
    queryFn: async () => {
      const res = await axios.get('/api/analytics/metrics');
      return res.data;
    }
  });

  const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#EC4899', '#3B82F6'];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Computing metric charts...</span>
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-6 text-center text-rose-500">Failed to calculate analytical metrics. Ensure FastAPI backend is running.</div>;
  }

  const { 
    vendor_performance, complaint_statistics, top_requested_items, 
    po_expenditure_trends, approval_times 
  } = data;

  return (
    <div className="space-y-6">
      
      {/* Overview charts split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Top Requested Items */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Requested Items</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Frequently requested materials by aggregate volume count</p>
          </div>
          <div className="h-64">
            {top_requested_items.length === 0 ? (
              <div className="text-center py-16 text-slate-400">No requests raised yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top_requested_items} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={9} />
                  <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={9} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" name="Total Units" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Complaint stats */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complaint Classification</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Operational tickets categorized by issue type</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            {complaint_statistics.length === 0 ? (
              <div className="text-center py-16 text-slate-400">No complaints reported</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complaint_statistics}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="type"
                  >
                    {complaint_statistics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-[9px] font-semibold text-slate-500">
            {complaint_statistics.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span>{item.type} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Vendor Performance metrics */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor Performance Rankings</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Average customer feedback ratings (1.0 to 5.0)</p>
            </div>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendor_performance}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                <YAxis stroke="#94A3B8" fontSize={9} domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="rating" name="Rating" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. PO Expenditure Trends */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase Order Growth</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Chronological cost of purchase orders generated</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={po_expenditure_trends}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} />
                <YAxis stroke="#94A3B8" fontSize={9} tickFormatter={(v) => `$${v}`} />
                <Tooltip />
                <Area type="monotone" dataKey="cost" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Approval & Delivery Times */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Process Bottleneck Analysis</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Average duration length to complete workflow steps</p>
            </div>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {approval_times.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200/20 bg-slate-900/10 dark:bg-slate-900/30 text-center space-y-1">
                <span className="block text-[10px] font-semibold text-slate-400">{item.step}</span>
                <span className="block text-lg font-bold text-white">{item.hours} hrs</span>
                <span className="block text-[9px] text-emerald-500 font-medium">within KPI range</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
