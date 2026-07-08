import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Coins,
  MapPin,
  XCircle,
  Tag,
  CreditCard,
  Notebook
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  branchId: number;
  category: string;
  date: string;
  collectedById: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  branchName: string;
  collectedByName: string;
}

interface FinanceViewProps {
  finance: any;
  branches: any[];
  onRefresh: () => void;
  isOpenCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  finance,
  branches,
  onRefresh,
  isOpenCreateModal = false,
  onCloseCreateModal
}) => {
  const { token, dbUser } = useAuth();
  const [showAddForm, setShowAddForm] = useState(isOpenCreateModal);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchVal, setSearchVal] = useState('');

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Passenger Tickets');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [branchId, setBranchId] = useState(dbUser?.branchId?.toString() || '');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = dbUser?.role === 'Super Admin' || dbUser?.role === 'Admin';
  const isSuperAdmin = dbUser?.role === 'Super Admin';

  const txs: Transaction[] = finance?.transactions || [];
  const summary = finance?.summary || {
    totalRevenue: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    branchBreakdown: {},
    categoryBreakdown: {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!amount || !description || !category || !paymentMethod) {
      setFormError('Amount, Description, Category and Payment Method are required.');
      return;
    }

    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount) * 100, // store as cents
          description,
          category,
          paymentMethod,
          referenceNumber,
          branchId: isSuperAdmin ? branchId : undefined, // Super admin can choose branch
          notes,
        }),
      });

      if (res.ok) {
        setAmount('');
        setDescription('');
        setCategory('Passenger Tickets');
        setPaymentMethod('Cash');
        setReferenceNumber('');
        setNotes('');
        setFormError(null);
        setShowAddForm(false);
        if (onCloseCreateModal) onCloseCreateModal();
        onRefresh();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to record transaction.');
      }
    } catch (err) {
      console.error(err);
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleExportCSV = () => {
    if (txs.length === 0) return;

    const headers = ['Amount (USD)', 'Description', 'Branch', 'Category', 'Date', 'Collected By', 'Payment Method', 'Reference Number', 'Notes'];
    const rows = txs.map(tx => [
      `"${(tx.amount / 100).toFixed(2)}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.branchName}"`,
      `"${tx.category}"`,
      `"${new Date(tx.date).toLocaleDateString()}"`,
      `"${tx.collectedByName}"`,
      `"${tx.paymentMethod}"`,
      `"${tx.referenceNumber || ''}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SafarLink_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter transactions
  const filteredTxs = txs.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchVal.toLowerCase()) || 
      (tx.referenceNumber && tx.referenceNumber.toLowerCase().includes(searchVal.toLowerCase()));
    
    const matchesBranch = !filterBranch || tx.branchId === parseInt(filterBranch);
    const matchesCategory = !filterCategory || tx.category === filterCategory;

    return matchesSearch && matchesBranch && matchesCategory;
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] font-sans min-h-[calc(screen-76px)] select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight">Finance Management</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">Review and record revenue streams across all transportation activities</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportCSV}
            disabled={filteredTxs.length === 0}
            className="flex items-center space-x-2 text-xs font-bold px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 text-xs font-bold px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record Income</span>
          </button>
        </div>
      </div>

      {/* Analytics Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card shadow-sm rounded-2xl p-5 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Today's Collections</span>
          <h3 className="font-display font-bold text-xl text-slate-800 tracking-tight mt-1.5">{formatCurrency(summary.todayRevenue)}</h3>
        </div>
        <div className="glass-card shadow-sm rounded-2xl p-5 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Weekly Receipts</span>
          <h3 className="font-display font-bold text-xl text-slate-800 tracking-tight mt-1.5">{formatCurrency(summary.weeklyRevenue)}</h3>
        </div>
        <div className="glass-card shadow-sm rounded-2xl p-5 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Monthly Gross</span>
          <h3 className="font-display font-bold text-xl text-slate-800 tracking-tight mt-1.5">{formatCurrency(summary.monthlyRevenue)}</h3>
        </div>
        <div className="glass-card shadow-sm rounded-2xl p-5 border border-slate-200/80 bg-blue-50/20 border-blue-100">
          <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block">Total Accumulated</span>
          <h3 className="font-display font-bold text-xl text-blue-700 tracking-tight mt-1.5">{formatCurrency(summary.totalRevenue)}</h3>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search transactions by receipt description or reference code..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-400 transition-all placeholder-slate-400 font-medium shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-400 transition-all font-semibold text-slate-600 shadow-sm appearance-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-400 transition-all font-semibold text-slate-600 shadow-sm appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="Passenger Tickets">Passenger Tickets</option>
              <option value="Parcel Delivery">Parcel Delivery</option>
              <option value="Cargo">Cargo</option>
              <option value="Other">Other</option>
            </select>
            <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-lg text-slate-800">Record Manual Income</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <XCircle className="w-5.5 h-5.5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-xs font-semibold text-red-600 rounded-lg">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1.5">
                  <label>Amount (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 45.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label>Description *</label>
                  <input
                    type="text"
                    placeholder="e.g. Passenger ticket collection, bulky parcel shipment charge"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                    >
                      <option value="Passenger Tickets">Passenger Tickets</option>
                      <option value="Parcel Delivery">Parcel Delivery</option>
                      <option value="Cargo">Cargo</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label>Payment Method *</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Zaad">Zaad (Mobile)</option>
                      <option value="e-Dahab">e-Dahab (Mobile)</option>
                      <option value="Card">Card Payment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>Reference Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Z-81723A"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  {isSuperAdmin && (
                    <div className="space-y-1.5">
                      <label>Target Branch *</label>
                      <select
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                      >
                        <option value="">Select Branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label>Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Collected from route 04 departure check"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      if (onCloseCreateModal) onCloseCreateModal();
                    }}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer shadow-md shadow-blue-500/10"
                  >
                    Log Income
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transactions list */}
      {filteredTxs.length === 0 ? (
        <div className="glass-card shadow-sm rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <DollarSign className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
          <h3 className="font-display font-bold text-lg text-slate-800">No transactions recorded</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            There are no recorded collections matching your current filter choices. Record manual branch revenues or book parcel shipments.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Record First Income
          </button>
        </div>
      ) : (
        <div className="glass-card shadow-sm rounded-2xl overflow-hidden border border-slate-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-500">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Branch</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Collected By</th>
                  <th className="py-4 px-6">Payment Info</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 block">{tx.description}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(tx.date).toLocaleDateString()}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>{tx.branchName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-[10px] font-semibold text-slate-600">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{tx.category}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span>{tx.collectedByName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tx.paymentMethod}</span>
                        {tx.referenceNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">({tx.referenceNumber})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-display font-bold text-slate-800">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
