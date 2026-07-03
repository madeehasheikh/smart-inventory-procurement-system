import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Sparkles, AlertTriangle, AlertCircle, TrendingUp, TrendingDown,
  RefreshCw, CheckCircle, HelpCircle, ArrowUpRight 
} from 'lucide-react';

const AIInsights = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['aiInsights'],
    queryFn: async () => {
      const res = await axios.get('/api/ai/insights');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Running AI forecasting algorithms...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
        <AlertCircle className="w-10 h-10 mx-auto mb-3" />
        <h3 className="text-sm font-bold">Failed to load AI Insights</h3>
        <p className="text-xs mt-1">Please ensure the FastAPI backend is running.</p>
      </div>
    );
  }

  const { 
    shortages, reorder_suggestions, demand_forecasts, 
    fast_moving, slow_moving, budget_recommendations, vendor_recommendations 
  } = data;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex items-center gap-3 p-5 rounded-2xl bg-gradient-to-r from-emerald-600/15 to-teal-500/15 border border-emerald-500/20">
        <Sparkles className="w-7 h-7 text-emerald-500 animate-pulse shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Demand Forecasting & Optimization</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Machine learning metrics based on historical consumption, budget limits, and supplier speeds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Shortages & Recommendations (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Critical Shortages Warnings */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Stock Shortage Predictions
            </h4>
            
            {shortages.length === 0 ? (
              <div className="p-4 flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 rounded-xl">
                <CheckCircle className="w-4.5 h-4.5" />
                <span>All assets are currently above their minimum safety stock levels!</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {shortages.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200/20 bg-slate-900/15 text-xs">
                    <div>
                      <span className="block font-bold text-slate-900 dark:text-white">{item.item_name}</span>
                      <span className="text-[10px] text-slate-450">Category: {item.category} | SKU: {item.sku}</span>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.risk_level === 'Critical' 
                          ? 'bg-rose-500/10 text-rose-500' 
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>{item.risk_level} Risk</span>
                      <span className="block text-[10px] text-slate-400 mt-1 font-semibold">Stock: {item.current_stock} / {item.min_stock} min</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Suggested Reorders */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested Reorder Volumes</h4>
            {reorder_suggestions.length === 0 ? (
              <p className="text-xs text-slate-400">No reorder suggestions available. Inventory capacity is stable.</p>
            ) : (
              <div className="space-y-3">
                {reorder_suggestions.map((sug, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200/25 bg-slate-900/20 text-xs flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{sug.item_name}</span>
                        <span className="px-2 py-0.2 rounded text-[8px] font-bold bg-slate-800 text-slate-400 uppercase">{sug.priority}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-4">{sug.reason}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-emerald-500 font-bold">Reorder Qty: {sug.suggested_quantity}</span>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-1">Est. cost: ${sug.estimated_cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right: Forecasting & Turnover Lists (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Demand Forecasts */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demand Forecasting (Next Month)</h4>
            <div className="space-y-3">
              {demand_forecasts.map((f, idx) => {
                const isUp = f.trend_direction === 'Upward';
                const isDown = f.trend_direction === 'Downward';
                return (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200/10 bg-slate-900/10 dark:bg-slate-900/20 text-xs flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-slate-900 dark:text-white">{f.category}</span>
                      <span className="text-[10px] text-slate-450">Monthly Avg: {f.historical_average} units</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="block font-bold text-emerald-500">{f.forecasted_next_month} units</span>
                        <span className="text-[9px] text-slate-400">Predicted demand</span>
                      </div>
                      <div className={`p-1.5 rounded-lg ${isUp ? 'bg-rose-500/10 text-rose-500' : isDown ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                        {isUp ? <TrendingUp className="w-4.5 h-4.5" /> : isDown ? <TrendingDown className="w-4.5 h-4.5" /> : <ArrowUpRight className="w-4.5 h-4.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Fast vs Slow Moving Assets */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory Velocity (Turnover)</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Fast Moving */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Fast Moving (High)</span>
                <div className="space-y-1.5">
                  {fast_moving.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-200/10 bg-slate-900/15 text-[10px] font-semibold text-slate-900 dark:text-slate-200">
                      {item.item_name}
                      <span className="block text-[9px] text-slate-400 font-medium mt-0.5">Requests: {item.total_requested} units</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slow Moving */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Slow Moving (Low)</span>
                <div className="space-y-1.5">
                  {slow_moving.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-200/10 bg-slate-900/15 text-[10px] font-semibold text-slate-900 dark:text-slate-200">
                      {item.item_name}
                      <span className="block text-[9px] text-slate-400 font-medium mt-0.5">Requests: {item.total_requested} units</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom row: Budget & Vendor recommendations */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Budget optimizations */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget Optimization Advisories</h4>
            <div className="space-y-3">
              {budget_recommendations.map((rec, idx) => (
                <div key={idx} className={`p-4 rounded-xl border text-xs leading-5 ${
                  rec.severity === 'Critical'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>{rec.department}</span>
                    <span>{rec.utilization_rate}% Spent</span>
                  </div>
                  <p className="mt-1 font-medium italic">"{rec.recommendation}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier advice */}
          <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier Procurement Recommendations</h4>
            <div className="space-y-3">
              {vendor_recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200/10 bg-slate-900/15 text-xs flex justify-between items-start gap-4">
                  <div>
                    <span className="block font-bold text-slate-900 dark:text-white">{rec.vendor_name}</span>
                    <p className="text-[11px] text-slate-400 leading-4 mt-0.5">"{rec.recommendation}"</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    rec.action === 'Prioritize' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-550'
                  }`}>{rec.action}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AIInsights;
