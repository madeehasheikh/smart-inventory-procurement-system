import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Filter, Plus, Edit2, Trash2, Download, 
  FileSpreadsheet, FileText, Check, AlertCircle, RefreshCw 
} from 'lucide-react';

const Inventory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form States
  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', qr_code: '', category: 'Computer Accessories',
    department_id: 'DEP-CS', vendor_id: 'ven-tech-01', purchase_date: '',
    warranty: '1 Year', quantity: 0, min_stock: 5, max_stock: 100, price: 0.0,
    location: '', expiry_date: '', image_url: ''
  });

  const [formError, setFormError] = useState('');

  // Fetch departments for select boxes
  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await axios.get('/api/auth/departments');
      return res.data;
    }
  });

  // Fetch Inventory items
  const { data: invData, isLoading, error } = useQuery({
    queryKey: ['inventory', searchTerm, categoryFilter, deptFilter, statusFilter, sortBy, sortOrder, page],
    queryFn: async () => {
      const res = await axios.get('/api/inventory', {
        params: {
          q: searchTerm,
          category: categoryFilter,
          department_id: deptFilter,
          status: statusFilter,
          sort_by: sortBy,
          order: sortOrder,
          page,
          limit: 8
        }
      });
      return res.data;
    }
  });

  // Add Item Mutation
  const addMutation = useMutation({
    mutationFn: async (newItem) => {
      const res = await axios.post('/api/inventory', newItem);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      setShowAddModal(false);
      resetForm();
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to save item');
    }
  });

  // Edit Item Mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, updatedFields }) => {
      const res = await axios.put(`/api/inventory/${id}`, updatedFields);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
      setShowEditModal(false);
      setSelectedItem(null);
      resetForm();
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to update item');
    }
  });

  // Delete Item Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory']);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '', sku: '', barcode: '', qr_code: '', category: 'Computer Accessories',
      department_id: 'DEP-CS', vendor_id: 'ven-tech-01', purchase_date: '',
      warranty: '1 Year', quantity: 0, min_stock: 5, max_stock: 100, price: 0.0,
      location: '', expiry_date: '', image_url: ''
    });
    setFormError('');
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name, sku: item.sku, barcode: item.barcode, qr_code: item.qr_code,
      category: item.category, department_id: item.department_id, vendor_id: item.vendor_id || '',
      purchase_date: item.purchase_date || '', warranty: item.warranty || '1 Year',
      quantity: item.quantity, min_stock: item.min_stock, max_stock: item.max_stock,
      price: item.price, location: item.location || '', expiry_date: item.expiry_date || '',
      image_url: item.image_url || ''
    });
    setShowEditModal(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (showAddModal) {
      addMutation.mutate(formData);
    } else if (showEditModal && selectedItem) {
      editMutation.mutate({ id: selectedItem._id, updatedFields: formData });
    }
  };

  const handleDeleteClick = (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and filter controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40">
        
        {/* Left: Search input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, SKU, barcode, QR..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 focus:outline-none focus:border-emerald-500 text-slate-800 dark:text-white"
          />
        </div>

        {/* Right: Advanced Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={categoryFilter} 
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="Computer Accessories">Computer Accessories</option>
            <option value="Lab Chemicals">Lab Chemicals</option>
            <option value="Office Stationery">Office Stationery</option>
            <option value="Electrical Assets">Electrical Assets</option>
          </select>

          <select 
            value={deptFilter} 
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
          >
            <option value="">All Departments</option>
            {deptsData?.map(d => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
          >
            <option value="">All Stock Levels</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>

          {/* Report Downloads */}
          <div className="flex items-center gap-1.5 border-l border-slate-250 dark:border-slate-800 pl-3">
            <a 
              href="http://localhost:8000/api/reports/export/csv/inventory"
              download
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </a>
            <a 
              href="http://localhost:8000/api/reports/export/excel/inventory"
              download
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              title="Export Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </a>
            <a 
              href="http://localhost:8000/api/reports/export/pdf/inventory"
              download
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              title="Export PDF"
            >
              <FileText className="w-4 h-4" />
            </a>
          </div>

          {user.role === 'Administrator' && (
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-lg hover:shadow-emerald-500/10 hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          )}
        </div>

      </div>

      {/* Inventory table */}
      <div className="p-5 rounded-2xl glass-card border border-slate-200/40 dark:border-slate-800/40 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Fetching inventory list...</span>
          </div>
        ) : error || !invData ? (
          <div className="p-6 text-center text-rose-500">Failed to load inventory assets.</div>
        ) : invData.items.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No assets found matching filters.</div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Item Info</th>
                    <th className="pb-3 cursor-pointer" onClick={() => handleSort('sku')}>SKU</th>
                    <th className="pb-3 cursor-pointer" onClick={() => handleSort('category')}>Category</th>
                    <th className="pb-3 cursor-pointer" onClick={() => handleSort('quantity')}>Qty</th>
                    <th className="pb-3 cursor-pointer" onClick={() => handleSort('price')}>Price</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Status</th>
                    {user.role === 'Administrator' && <th className="pb-3 text-right pr-2">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {invData.items.map((item) => (
                    <tr key={item._id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                      {/* Item details */}
                      <td className="py-3.5 pl-2 flex items-center gap-3">
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                        />
                        <div>
                          <span className="block font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{item.location}</span>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 font-medium">{item.sku}</td>
                      
                      {/* Category */}
                      <td className="py-3.5 text-slate-500">{item.category}</td>

                      {/* Quantity */}
                      <td className="py-3.5 font-bold">
                        {item.quantity}
                        <span className="text-[10px] text-slate-400 font-medium ml-1">/ {item.min_stock} min</span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 font-semibold text-slate-700 dark:text-slate-350">${item.price.toFixed(2)}</td>

                      {/* Department */}
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">{item.department_id}</span>
                      </td>

                      {/* Stock Level status */}
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.status === 'In Stock' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                            : item.status === 'Low Stock'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      {user.role === 'Administrator' && (
                        <td className="py-3.5 text-right pr-2 space-x-1">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-850">
              <span className="text-[10px] text-slate-400 font-medium">Page {page} of {invData.pages} ({invData.total} total items)</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page === invData.pages}
                  onClick={() => setPage(prev => Math.min(prev + 1, invData.pages))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal Overlay */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl p-6 rounded-3xl glass-card border border-slate-200/50 dark:border-slate-800/50 space-y-6">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">{showAddModal ? 'Add New Asset' : 'Edit Asset details'}</h3>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-3 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={formFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Item Name</label>
                <input 
                  type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">SKU code</label>
                <input 
                  type="text" required value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Barcode</label>
                <input 
                  type="text" required value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">QR Code</label>
                <input 
                  type="text" required value={formData.qr_code} onChange={(e) => setFormData({...formData, qr_code: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Category</label>
                <select 
                  value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="Computer Accessories">Computer Accessories</option>
                  <option value="Lab Chemicals">Lab Chemicals</option>
                  <option value="Office Stationery">Office Stationery</option>
                  <option value="Electrical Assets">Electrical Assets</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Department</label>
                <select 
                  value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                >
                  {deptsData?.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Quantity</label>
                <input 
                  type="number" required value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Price per unit ($)</label>
                <input 
                  type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0.0})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Min Stock warning</label>
                <input 
                  type="number" required value={formData.min_stock} onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Max Stock capacity</label>
                <input 
                  type="number" required value={formData.max_stock} onChange={(e) => setFormData({...formData, max_stock: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Storage Location</label>
                <input 
                  type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Warranty Term</label>
                <input 
                  type="text" required value={formData.warranty} onChange={(e) => setFormData({...formData, warranty: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-3">
                <button
                  type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending || editMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 font-bold text-xs text-white transition-all shadow-md"
                >
                  {addMutation.isPending || editMutation.isPending ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
