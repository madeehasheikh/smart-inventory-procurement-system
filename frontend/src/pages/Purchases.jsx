import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Star, ShoppingCart, Truck, Check, 
  User, Mail, Phone, RefreshCw, AlertCircle, Award 
} from 'lucide-react';

const Purchases = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'vendors'
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddPO, setShowAddPO] = useState(false);
  
  // Vendor Form state
  const [vendorForm, setVendorForm] = useState({
    name: '', contact_person: '', email: '', phone: '', categories: []
  });
  const [vendorCatInput, setVendorCatInput] = useState('');
  
  // PO Form state
  const [poForm, setPoForm] = useState({
    request_id: '', vendor_id: '', item_name: '', quantity: 1, price: 0.0, expected_delivery: ''
  });

  const [formError, setFormError] = useState('');

  // Fetch Vendors
  const { data: vendors, isLoading: loadingVendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await axios.get('/api/purchases/vendors');
      return res.data;
    }
  });

  // Fetch Purchase Orders
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const res = await axios.get('/api/purchases/orders');
      return res.data;
    }
  });

  // Fetch requests to bind POs (only show requests with status "Purchase Required")
  const { data: openRequests } = useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const res = await axios.get('/api/requests');
      return res.data.filter(r => r.status === 'Purchase Required' || r.status === 'Approved Admin');
    }
  });

  // Add Vendor Mutation
  const addVendorMutation = useMutation({
    mutationFn: async (vendor) => {
      const res = await axios.post('/api/purchases/vendors', vendor);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendors']);
      setShowAddVendor(false);
      setVendorForm({ name: '', contact_person: '', email: '', phone: '', categories: [] });
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to create vendor');
    }
  });

  // Create PO Mutation
  const createPOMutation = useMutation({
    mutationFn: async (po) => {
      const payload = {
        request_id: po.request_id,
        vendor_id: po.vendor_id,
        items: [{ item_name: po.item_name, quantity: po.quantity, price: po.price }],
        total_cost: po.quantity * po.price,
        expected_delivery: po.expected_delivery
      };
      const res = await axios.post('/api/purchases/orders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase_orders', 'requests']);
      setShowAddPO(false);
      setPoForm({ request_id: '', vendor_id: '', item_name: '', quantity: 1, price: 0.0, expected_delivery: '' });
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to generate PO');
    }
  });

  // Update PO Status Mutation
  const updatePOStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await axios.put(`/api/purchases/orders/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase_orders', 'inventory', 'requests']);
    }
  });

  // Rate Vendor Mutation
  const rateVendorMutation = useMutation({
    mutationFn: async ({ id, rating }) => {
      await axios.post(`/api/purchases/vendors/${id}/rate`, { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendors']);
    }
  });

  const handleVendorSubmit = (e) => {
    e.preventDefault();
    addVendorMutation.mutate(vendorForm);
  };

  const handlePOSubmit = (e) => {
    e.preventDefault();
    createPOMutation.mutate(poForm);
  };

  const handlePOStatusUpdate = (id, status) => {
    updatePOStatusMutation.mutate({ id, status });
  };

  const handleRateVendor = (id, rating) => {
    rateVendorMutation.mutate({ id, rating });
  };

  const handleAddCategory = () => {
    if (vendorCatInput && !vendorForm.categories.includes(vendorCatInput)) {
      setVendorForm({
        ...vendorForm,
        categories: [...vendorForm.categories, vendorCatInput]
      });
      setVendorCatInput('');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Tab toggle & action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                : 'border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'vendors'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                : 'border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            Vendor Database
          </button>
        </div>

        {user.role === 'Administrator' && (
          <div className="flex gap-2">
            {activeTab === 'orders' ? (
              <button
                onClick={() => { setFormError(''); setShowAddPO(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md hover:brightness-110 transition-all"
              >
                <Plus className="w-4.5 h-4.5" /> Generate PO
              </button>
            ) : (
              <button
                onClick={() => { setFormError(''); setShowAddVendor(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md hover:brightness-110 transition-all"
              >
                <Plus className="w-4.5 h-4.5" /> Add Vendor
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Tab Panel Rendering */}
      {activeTab === 'orders' ? (
        /* PURCHASE ORDERS GRID */
        <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40">
          {loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <span className="text-[11px] text-slate-400">Loading purchase orders...</span>
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No purchase orders created yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">PO ID</th>
                    <th className="pb-3">Vendor</th>
                    <th className="pb-3">PO Item</th>
                    <th className="pb-3">Total Cost</th>
                    <th className="pb-3">Est. Delivery</th>
                    <th className="pb-3">Status</th>
                    {user.role === 'Administrator' && <th className="pb-3 text-right pr-2">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {orders.map((po) => {
                    const vendorObj = vendors?.find(v => v._id === po.vendor_id);
                    return (
                      <tr key={po._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5 pl-2 font-bold uppercase">{po._id.slice(0, 8)}...</td>
                        <td className="py-3.5 font-medium text-slate-950 dark:text-white">{vendorObj ? vendorObj.name : 'Unknown Vendor'}</td>
                        <td className="py-3.5 text-slate-400">
                          {po.items.map((it, idx) => (
                            <span key={idx} className="block text-slate-800 dark:text-slate-200">
                              {it.item_name} <b className="text-emerald-500">x{it.quantity}</b>
                            </span>
                          ))}
                        </td>
                        <td className="py-3.5 font-bold">${po.total_cost.toFixed(2)}</td>
                        <td className="py-3.5 font-medium text-slate-400">{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : 'N/A'}</td>
                        
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            po.status === 'Received' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : po.status === 'Sent to Vendor'
                              ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                          }`}>
                            {po.status}
                          </span>
                        </td>

                        {/* Status updating actions */}
                        {user.role === 'Administrator' && (
                          <td className="py-3.5 text-right pr-2">
                            {po.status === 'Draft' && (
                              <button
                                onClick={() => handlePOStatusUpdate(po._id, 'Sent to Vendor')}
                                className="px-2.5 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors"
                              >
                                Send to Vendor
                              </button>
                            )}
                            {po.status === 'Sent to Vendor' && (
                              <button
                                onClick={() => handlePOStatusUpdate(po._id, 'Received')}
                                className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-sm"
                              >
                                Mark Received (Adds Stock)
                              </button>
                            )}
                            {po.status === 'Received' && (
                              <span className="text-[10px] text-slate-500 font-semibold italic flex items-center gap-1 justify-end">
                                <Check className="w-3.5 h-3.5 text-emerald-500" /> Stock Synced
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* VENDORS DATABASE CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingVendors ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : !vendors || vendors.length === 0 ? (
            <div className="col-span-full p-12 text-center text-xs text-slate-400">No vendors stored in system.</div>
          ) : (
            vendors.map((vendor) => (
              <div key={vendor._id} className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 flex flex-col justify-between space-y-4">
                
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{vendor.name}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">Rep: {vendor.contact_person}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Categories tags */}
                <div className="flex flex-wrap gap-1.5">
                  {vendor.categories.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 text-[9px] rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">{c}</span>
                  ))}
                </div>

                {/* Contact numbers */}
                <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-850 pt-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{vendor.phone}</span>
                  </div>
                </div>

                {/* Rating controls */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Rate Supplier</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRateVendor(vendor._id, star)}
                        className="text-slate-500 hover:text-amber-400 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 hover:fill-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl glass-card border border-slate-200/50 dark:border-slate-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Vendor to System</h3>
              <button onClick={() => setShowAddVendor(false)} className="text-slate-400 hover:text-white">Cancel</button>
            </div>

            {formError && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl">{formError}</div>}

            <form onSubmit={handleVendorSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Vendor Name</label>
                <input 
                  type="text" required value={vendorForm.name} onChange={(e) => setVendorForm({...vendorForm, name: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Contact Person</label>
                <input 
                  type="text" required value={vendorForm.contact_person} onChange={(e) => setVendorForm({...vendorForm, contact_person: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Email</label>
                  <input 
                    type="email" required value={vendorForm.email} onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Phone</label>
                  <input 
                    type="text" required value={vendorForm.phone} onChange={(e) => setVendorForm({...vendorForm, phone: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Categories (Press Add)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" value={vendorCatInput} onChange={(e) => setVendorCatInput(e.target.value)}
                    placeholder="e.g. Lab Chemicals"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                  />
                  <button 
                    type="button" onClick={handleAddCategory}
                    className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {vendorForm.categories.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-emerald-400">{c}</span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" onClick={() => setShowAddVendor(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add PO Modal */}
      {showAddPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl glass-card border border-slate-200/50 dark:border-slate-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Generate Purchase Order</h3>
              <button onClick={() => setShowAddPO(false)} className="text-slate-400 hover:text-white">Cancel</button>
            </div>

            {formError && <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl">{formError}</div>}

            <form onSubmit={handlePOSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bind to Open Request</label>
                <select
                  required value={poForm.request_id}
                  onChange={(e) => {
                    const reqObj = openRequests?.find(r => r._id === e.target.value);
                    setPoForm({
                      ...poForm,
                      request_id: e.target.value,
                      item_name: reqObj ? reqObj.item_name : '',
                      quantity: reqObj ? reqObj.quantity : 1,
                      price: reqObj ? (reqObj.estimated_cost / reqObj.quantity) : 0.0
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                >
                  <option value="">Select open request...</option>
                  {openRequests?.map(r => (
                    <option key={r._id} value={r._id}>[{r.department_id}] {r.item_name} - Qty {r.quantity}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Assigned Vendor</label>
                <select
                  required value={poForm.vendor_id}
                  onChange={(e) => setPoForm({ ...poForm, vendor_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                >
                  <option value="">Select vendor supplier...</option>
                  {vendors?.map(v => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Quantity</label>
                  <input 
                    type="number" required value={poForm.quantity}
                    onChange={(e) => setPoForm({...poForm, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Price per unit ($)</label>
                  <input 
                    type="number" step="0.01" required value={poForm.price}
                    onChange={(e) => setPoForm({...poForm, price: parseFloat(e.target.value) || 0.0})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Expected Delivery Date</label>
                <input 
                  type="date" required value={poForm.expected_delivery}
                  onChange={(e) => setPoForm({...poForm, expected_delivery: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700/60 bg-slate-950/40 text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" onClick={() => setShowAddPO(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white"
                >
                  Generate PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Purchases;
