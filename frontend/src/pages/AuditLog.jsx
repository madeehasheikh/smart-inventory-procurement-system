import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { RefreshCw, History, User, ChevronDown, ChevronUp } from 'lucide-react';

const AuditLog = () => {
  const [expandedLog, setExpandedLog] = useState(null);

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await axios.get('/api/audit/logs', { params: { limit: 100 } });
      return res.data;
    },
    refetchInterval: 15000 // refresh every 15s
  });

  const toggleExpand = (id) => {
    setExpandedLog(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="flex items-center gap-3 p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40">
        <History className="w-7 h-7 text-emerald-500 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security & Audit logs</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Admin-only real-time tracking of database actions, user logins, and profile adjustments.</p>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 min-h-[450px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Fetching security logs...</span>
          </div>
        ) : error || !logs ? (
          <div className="p-6 text-center text-rose-500">Failed to load system audit logs.</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Audit trail is currently empty.</div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">User / Role</th>
                    <th className="pb-3">Action</th>
                    <th className="pb-3">Date & Time</th>
                    <th className="pb-3 text-right pr-2">Inspect Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {logs.map((log) => {
                    const isExpanded = expandedLog === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                          {/* User Email & Role */}
                          <td className="py-3.5 pl-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-850 text-[10px] text-emerald-400 font-bold">
                                {log.user_email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="block font-bold text-slate-900 dark:text-white">{log.user_email}</span>
                                <span className="text-[9px] text-slate-500 font-semibold uppercase">{log.role}</span>
                              </div>
                            </div>
                          </td>

                          {/* Action Name */}
                          <td className="py-3.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 uppercase tracking-wide border border-indigo-500/20">
                              {log.action}
                            </span>
                          </td>

                          {/* Timestamp */}
                          <td className="py-3.5 font-medium text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>

                          {/* Inspect action Button */}
                          <td className="py-3.5 text-right pr-2">
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors font-semibold"
                            >
                              {isExpanded ? (
                                <>
                                  Collapse <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  Expand <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Details Panel */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} className="p-4 bg-slate-950/40 rounded-xl">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] leading-5 font-mono">
                                
                                {/* Old Values */}
                                <div className="space-y-1">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-500 font-sans">Previous Value</span>
                                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-900 overflow-x-auto max-h-40 text-slate-400">
                                    {log.old_value ? JSON.stringify(log.old_value, null, 2) : 'Null (No previous value)'}
                                  </pre>
                                </div>

                                {/* New Values */}
                                <div className="space-y-1">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-500 font-sans">New Value</span>
                                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-900 overflow-x-auto max-h-40 text-slate-400">
                                    {log.new_value ? JSON.stringify(log.new_value, null, 2) : 'Null (No adjustment)'}
                                  </pre>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default AuditLog;
