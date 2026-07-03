import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, Clock, User, MessageSquare, AlertCircle, 
  Check, X, RefreshCw, Eye, HelpCircle, Truck, Package, Boxes 
} from 'lucide-react';

const Requests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeRequest, setActiveRequest] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '', category: 'Computer Accessories', quantity: 1, estimated_cost: 0.0, purpose: ''
  });
  const [formError, setFormError] = useState('');
  
  // Action state comments
  const [comments, setComments] = useState('');

  // Fetch Requests
  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const res = await axios.get('/api/requests');
      return res.data;
    },
    refetchInterval: 15000 // poll every 15s for updates
  });

  // Create Request Mutation
  const createMutation = useMutation({
    mutationFn: async (req) => {
      const res = await axios.post('/api/requests', req);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      setShowAddModal(false);
      setFormData({ item_name: '', category: 'Computer Accessories', quantity: 1, estimated_cost: 0.0, purpose: '' });
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to submit request');
    }
  });

  // Update Status Mutation (RBAC approvals)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, comments, po_id, vendor_id }) => {
      const res = await axios.put(`/api/requests/${id}/status`, {
        status, comments, po_id, vendor_id
      });
      return res.data;
    },
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries(['requests']);
      // Update active request view
      setActiveRequest(updatedData);
      setComments('');
    },
    onError: (err) => {
      alert(err.response?.data?.detail || 'State update failed');
    }
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleAction = (status, customComments = '') => {
    if (!activeRequest) return;
    statusMutation.mutate({
      id: activeRequest.id || activeRequest._id,
      status,
      comments: customComments || comments
    });
  };

  // Define tracking timeline nodes
  const trackingStages = [
    { label: 'Submitted', key: 'Pending HOD', icon: FileText },
    { label: 'HOD Approved', key: 'Approved HOD', icon: Check },
    { label: 'Admin Approved', key: 'Approved Admin', icon: Check },
    { label: 'Stock Verified', key: 'Stock Checking', icon: Boxes },
    { label: 'Completed', key: 'Completed', icon: Package }
  ];

  const getStageIndex = (currentStatus) => {
    if (currentStatus === 'Pending HOD') return 0;
    if (currentStatus === 'Pending Admin' || currentStatus === 'Approved HOD') return 1;
    if (currentStatus === 'Approved Admin') return 2;
    if (currentStatus === 'Stock Checking') return 3;
    if (currentStatus === 'Completed') return 4;
    if (currentStatus === 'Rejected') return -1;
    // Purchase flows
    if (['Purchase Required', 'Vendor Assigned', 'Ordered', 'Received'].includes(currentStatus)) return 3;
    return 0;
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Panel: Description and CTA */}
      <div className="flex items-center justify-between p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Procurement Requests</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Submit and verify purchase pipelines with audit timestamps</p>
        </div>
        
        {user.role === 'Staff' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-lg hover:shadow-emerald-500/10 hover:brightness-110 transition-all animate-pulse"
          >
            Submit Request
          </button>
        )}
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Requests List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 min-h-[450px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Request Log</h3>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-[11px] text-slate-400">Loading requests...</span>
              </div>
            ) : error || !requests ? (
              <div className="p-6 text-center text-rose-500">Failed to load request log</div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No requests raised yet.</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {requests.map(req => {
                  const reqId = req.id || req._id;
                  const activeId = activeRequest?.id || activeRequest?._id;
                  return (
                    <div
                      key={reqId}
                      onClick={() => { setActiveRequest(req); setComments(''); }}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                        activeId === reqId
                          ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{req.item_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                        req.status === 'Completed'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : req.status === 'Rejected'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-medium">
                      <span>Qty: {req.quantity} | Est: ${req.estimated_cost}</span>
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Stepper Tracker and Actions (7 Cols) */}
        <div className="lg:col-span-7">
          {activeRequest ? (
            <div className="p-6 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 space-y-6">
              
              {/* Request metadata header */}
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{activeRequest.item_name}</h3>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                    REQ-ID: {(activeRequest.id || activeRequest._id || '').slice(0, 8)}...
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-semibold text-slate-500">Estimated cost</span>
                  <span className="text-base font-bold text-emerald-500">${activeRequest.estimated_cost}</span>
                </div>
              </div>

              {/* Courier Stepper Timeline */}
              <div className="space-y-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Tracking</span>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 bg-slate-950/20 p-4 rounded-2xl border border-slate-200/20">
                  {trackingStages.map((stage, idx) => {
                    const currentIdx = getStageIndex(activeRequest.status);
                    const isPassed = currentIdx >= idx && currentIdx !== -1;
                    const isCurrent = currentIdx === idx;
                    const StageIcon = stage.icon;

                    return (
                      <div key={idx} className="flex flex-1 flex-col items-center text-center relative w-full md:w-auto">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                          isPassed 
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        } ${isCurrent ? 'ring-2 ring-emerald-500/50 scale-105' : ''}`}>
                          <StageIcon className="w-4 h-4" />
                        </div>
                        <span className={`text-[9px] mt-1.5 font-semibold ${isPassed ? 'text-emerald-500' : 'text-slate-500'}`}>{stage.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons (Approvals / Decisions) */}
              <div className="space-y-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Workflow comments & Actions</span>
                
                {/* 1. HOD Action Section */}
                {user.role === 'HOD' && activeRequest.status === 'Pending HOD' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <textarea
                      placeholder="Add reviewer comments..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full p-3 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction('Rejected')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md"
                      >
                        <X className="w-4 h-4" /> Reject Request
                      </button>
                      <button
                        onClick={() => handleAction('Approved HOD')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                      >
                        <Check className="w-4 h-4" /> Approve & Forward
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Admin Action Section */}
                {user.role === 'Administrator' && activeRequest.status === 'Pending Admin' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <textarea
                      placeholder="Add admin approval notes..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full p-3 text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction('Rejected')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                      <button
                        onClick={() => handleAction('Stock Checking')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        <Check className="w-4 h-4" /> Approve & Stock-Check
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Admin Stock-check decision */}
                {user.role === 'Administrator' && activeRequest.status === 'Stock Checking' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <p className="text-[11px] text-slate-400">Stock check complete. If stock is available, click "Issue", otherwise mark as "Purchase Required".</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction('Purchase Required', 'Stock verification failed: Insufficient items. Procurement purchase requested.')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs"
                      >
                        Mark Purchase Required
                      </button>
                      <button
                        onClick={() => handleAction('Completed', 'Stock check passed. Material issued successfully.')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        Issue Item (Deduct Stock)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline audits list */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval / Status History</span>
                <div className="space-y-3 overflow-y-auto max-h-[220px] pr-2">
                  {activeRequest.timeline.map((entry, idx) => (
                    <div key={idx} className="flex gap-3 text-xs bg-slate-900/10 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200/20">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-slate-900 dark:text-white">{entry.status}</span>
                          <span className="text-[9px] text-slate-400 font-medium">{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">Updated by: <span className="text-emerald-500 font-medium">{entry.updated_by}</span></p>
                        {entry.comments && (
                          <p className="text-slate-600 dark:text-slate-300 italic mt-1 bg-slate-950/20 p-2 rounded-lg text-[10px]">"{entry.comments}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl min-h-[450px]">
              <div className="text-center space-y-2">
                <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                <span className="block text-xs text-slate-400 font-medium">Select a request from log to view visual progress</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Add Request Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-250">
          <div className="w-full max-w-md p-6 rounded-3xl glass-card border border-slate-200/50 dark:border-slate-800/50 space-y-5">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create Purchase Request</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">Cancel</button>
            </div>

            {formError && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Item Name</label>
                <input
                  type="text" required value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                >
                  <option value="Computer Accessories">Computer Accessories</option>
                  <option value="Lab Chemicals">Lab Chemicals</option>
                  <option value="Office Stationery">Office Stationery</option>
                  <option value="Electrical Assets">Electrical Assets</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number" min="1" required value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Est. Cost ($)</label>
                  <input
                    type="number" step="0.01" required value={formData.estimated_cost}
                    onChange={(e) => setFormData({...formData, estimated_cost: parseFloat(e.target.value) || 0.0})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Purpose / Reason</label>
                <textarea
                  required value={formData.purpose} rows="3"
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  className="w-full p-3 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Requests;
