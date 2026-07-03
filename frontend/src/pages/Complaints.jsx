import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  AlertCircle, ShieldAlert, Check, User, Calendar, 
  MessageSquare, RefreshCw, Plus, Send 
} from 'lucide-react';

const Complaints = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTicket, setActiveTicket] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ type: 'Damaged item', description: '' });
  const [formError, setFormError] = useState('');
  
  // Resolution inputs
  const [notes, setNotes] = useState('');

  // Fetch Complaints
  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const res = await axios.get('/api/complaints');
      return res.data;
    },
    refetchInterval: 15000
  });

  // Submit Complaint Mutation
  const addMutation = useMutation({
    mutationFn: async (ticket) => {
      const res = await axios.post('/api/complaints', ticket);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['complaints']);
      setShowAddModal(false);
      setFormData({ type: 'Damaged item', description: '' });
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to submit complaint');
    }
  });

  // Update Ticket status Mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, resolution_notes }) => {
      const res = await axios.put(`/api/complaints/${id}`, {
        status,
        resolution_notes,
        assigned_to: user.id || user._id
      });
      return res.data;
    },
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries(['complaints']);
      setActiveTicket(updatedTicket);
      setNotes('');
    },
    onError: (err) => {
      alert('Failed to resolve complaint ticket');
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  const handleResolveAction = (status) => {
    if (!activeTicket) return;
    resolveMutation.mutate({
      id: activeTicket.id || activeTicket._id,
      status,
      resolution_notes: notes || 'Ticket updated'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Description Panel */}
      <div className="flex items-center justify-between p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Issues & Complaints Ticketing</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Report delivery errors, damage, or order lag to the administration</p>
        </div>

        {user.role === 'Staff' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-lg hover:brightness-110 transition-all animate-pulse"
          >
            File Ticket
          </button>
        )}
      </div>

      {/* Main layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left pane: Tickets index (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 min-h-[450px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Complaint Inbox</h3>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-[11px] text-slate-400">Loading complaints...</span>
              </div>
            ) : error || !tickets ? (
              <div className="p-6 text-center text-rose-500">Failed to load complaints.</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No issues reported yet.</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {tickets.map(ticket => {
                  const tId = ticket.id || ticket._id;
                  const activeId = activeTicket?.id || activeTicket?._id;
                  return (
                    <div
                      key={tId}
                      onClick={() => { setActiveTicket(ticket); setNotes(''); }}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                        activeId === tId
                          ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                      }`}
                    >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{ticket.type}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                        ticket.status === 'Closed' || ticket.status === 'Resolved'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 text-[10px] truncate mt-1.5 leading-4">{ticket.description}</p>
                    
                    <div className="text-[9px] text-slate-450 mt-3 text-right">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Ticket detail view (7 cols) */}
        <div className="lg:col-span-7">
          {activeTicket ? (
            <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-6">
              
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ticket details</h3>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Ticket ID: {(activeTicket.id || activeTicket._id || '').slice(0, 8)}...</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
                  activeTicket.status === 'Closed' || activeTicket.status === 'Resolved'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}>
                  {activeTicket.status}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Issue Type: {activeTicket.type}</span>
                <p className="text-xs text-slate-800 dark:text-slate-200 bg-slate-950/20 p-4 rounded-2xl border border-slate-200/10 leading-5">
                  "{activeTicket.description}"
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reported on: {new Date(activeTicket.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Resolution Notes display */}
              {activeTicket.resolution_notes && (
                <div className="space-y-2 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-xs">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-500">Official Resolution Details</span>
                  <p className="text-slate-800 dark:text-slate-300 italic">"{activeTicket.resolution_notes}"</p>
                  <p className="text-[9px] text-slate-400 mt-2">Updated on: {new Date(activeTicket.updated_at).toLocaleString()}</p>
                </div>
              )}

              {/* Action resolution block (Admin only) */}
              {user.role === 'Administrator' && activeTicket.status !== 'Closed' && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolve complaint ticket</span>
                  <textarea
                    placeholder="Enter resolution notes or actions taken..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                  
                  <div className="flex gap-2">
                    {activeTicket.status === 'Submitted' && (
                      <button
                        onClick={() => handleResolveAction('Investigation')}
                        className="flex-1 py-2.5 rounded-xl border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold text-xs"
                      >
                        Start Investigation
                      </button>
                    )}
                    {(activeTicket.status === 'Submitted' || activeTicket.status === 'Investigation') && (
                      <button
                        onClick={() => handleResolveAction('Resolved')}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {activeTicket.status === 'Resolved' && (
                      <button
                        onClick={() => handleResolveAction('Closed')}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                      >
                        Archive & Close Ticket
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl min-h-[450px]">
              <div className="text-center space-y-2">
                <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto" />
                <span className="block text-xs text-slate-400 font-medium">Select a ticket from inbox to view resolution panel</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl glass-card border border-slate-200/50 dark:border-slate-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Log Issue ticket</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">Cancel</button>
            </div>

            {formError && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl">{formError}</div>}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Issue Category</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                >
                  <option value="Late delivery">Late delivery</option>
                  <option value="Wrong item">Wrong item</option>
                  <option value="Damaged item">Damaged item</option>
                  <option value="Pending request">Pending request</option>
                  <option value="Poor quality">Poor quality</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Detailed Description</label>
                <textarea
                  required rows="4" value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Explain what was incorrect, damaged, or delayed, including item name..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Complaints;
