import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import {
  Package,
  Plus,
  Search,
  Filter,
  User,
  Phone,
  ArrowRight,
  Printer,
  Archive,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
  Layers,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Parcel {
  id: number;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  itemDescription: string;
  weight: number;
  price: number;
  sendingBranchId: number;
  destinationBranchId: number;
  busId: number | null;
  status: string;
  createdAt: string;
  departureTime: string | null;
  estimatedArrivalTime: string | null;
  receivedAt: string | null;
  notes: string | null;
  archived: boolean;
  sendingBranchName: string;
  destinationBranchName: string;
  busNumber: string | null;
  createdByName: string;
}

interface ParcelsViewProps {
  parcels: Parcel[];
  branches: any[];
  schedules: any[];
  onRefresh: () => void;
  searchVal: string;
  setSearchVal: (val: string) => void;
  isOpenCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const ParcelsView: React.FC<ParcelsViewProps> = ({
  parcels,
  branches,
  schedules,
  onRefresh,
  searchVal,
  setSearchVal,
  isOpenCreateModal = false,
  onCloseCreateModal
}) => {
  const { token, dbUser } = useAuth();
  const [showAddForm, setShowAddForm] = useState(isOpenCreateModal);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Form states
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [weight, setWeight] = useState('1'); // kg
  const [price, setPrice] = useState('10'); // USD delivery charge
  const [destBranchId, setDestBranchId] = useState('');
  const [busId, setBusId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Receipt printing overlay state
  const [activeReceiptParcel, setActiveReceiptParcel] = useState<Parcel | null>(null);

  // Edit State
  const [editingParcelId, setEditingParcelId] = useState<number | null>(null);

  const handleDeleteParcel = async (id: number) => {
    if (!token || !confirm('Are you sure you want to delete this parcel? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/parcels/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActiveReceiptParcel(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditParcel = (p: Parcel) => {
    setEditingParcelId(p.id);
    setSenderName(p.senderName);
    setSenderPhone(p.senderPhone);
    setReceiverName(p.receiverName);
    setReceiverPhone(p.receiverPhone);
    setItemDescription(p.itemDescription);
    setWeight(p.weight.toString());
    setPrice((p.price / 100).toString());
    setDestBranchId(p.destinationBranchId.toString());
    setBusId(p.busId ? p.busId.toString() : '');
    setNotes(p.notes || '');
    setActiveReceiptParcel(null);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingParcelId(null);
    setSenderName('');
    setSenderPhone('');
    setReceiverName('');
    setReceiverPhone('');
    setItemDescription('');
    setWeight('1');
    setPrice('10');
    setDestBranchId('');
    setBusId('');
    setNotes('');
    setFormError(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!senderName || !senderPhone || !receiverName || !receiverPhone || !itemDescription || !weight || !price || !destBranchId) {
      setFormError('Please complete all required fields.');
      return;
    }

    try {
      const url = editingParcelId ? `/api/parcels/${editingParcelId}` : '/api/parcels';
      const method = editingParcelId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderName,
          senderPhone,
          receiverName,
          receiverPhone,
          itemDescription,
          weight: parseFloat(weight),
          price: parseFloat(price) * 100, // store as cents
          destinationBranchId: parseInt(destBranchId),
          busId: busId ? parseInt(busId) : null,
          notes,
        }),
      });

      if (res.ok) {
        resetForm();
        setShowAddForm(false);
        if (onCloseCreateModal) onCloseCreateModal();
        onRefresh();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to register/update parcel.');
      }
    } catch (err) {
      console.error(err);
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/parcels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArchive = async (id: number, archived: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/parcels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ archived }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Get schedules leaving from current user's branch
  const activeSchedules = schedules.filter(
    (s) => s.departureBranchId === dbUser?.branchId && s.status === 'Scheduled'
  );

  // Filter parcels list
  const filteredParcels = parcels.filter((p) => {
    const matchesSearch =
      p.trackingNumber.toLowerCase().includes(searchVal.toLowerCase()) ||
      p.senderPhone.includes(searchVal) ||
      p.receiverPhone.includes(searchVal) ||
      p.senderName.toLowerCase().includes(searchVal.toLowerCase()) ||
      p.receiverName.toLowerCase().includes(searchVal.toLowerCase());

    const matchesBranch =
      !filterBranch ||
      p.sendingBranchId === parseInt(filterBranch) ||
      p.destinationBranchId === parseInt(filterBranch);

    const matchesStatus = !filterStatus || p.status === filterStatus;
    const matchesArchive = p.archived === showArchived;

    return matchesSearch && matchesBranch && matchesStatus && matchesArchive;
  });

  const handlePrintReceipt = (p: Parcel) => {
    setActiveReceiptParcel(p);
  };

  const executeBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] font-sans min-h-[calc(screen-76px)] select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight">Parcel Ledger</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">Log shipments, route to transits, and track branch clearances</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={!dbUser?.branchId}
          className="flex items-center space-x-2 text-xs font-bold px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Register Shipment</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Instant search by tracking code, customer phone, or name..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-400 transition-all placeholder-slate-400 font-medium shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        </div>

        <div className="flex gap-3 items-center">
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
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-400 transition-all font-semibold text-slate-600 shadow-sm appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Registered">Registered</option>
              <option value="On The Way">On The Way</option>
              <option value="Arrived">Arrived</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>

          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm cursor-pointer ${
              showArchived
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Archived</span>
          </button>
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
              className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-lg text-slate-800">{editingParcelId ? 'Edit Shipment Ticket' : 'Register Shipment Ticket'}</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
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

              <form onSubmit={handleCreateOrUpdate} className="space-y-6 text-xs font-semibold text-slate-600">
                {/* Sender Information */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">Sender Info</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label>Sender Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Abdirahman Omar"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label>Sender Contact Phone *</label>
                      <input
                        type="text"
                        placeholder="e.g. +252 63 XXXXXX"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Receiver Information */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">Receiver Info</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label>Receiver Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Hamda Farah"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label>Receiver Contact Phone *</label>
                      <input
                        type="text"
                        placeholder="e.g. +252 63 YYYYYY"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Cargo Details */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">Cargo Details</h4>
                  
                  <div className="space-y-1.5">
                    <label>Item Description *</label>
                    <input
                      type="text"
                      placeholder="e.g. Box of clothes, electronics, paperwork..."
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label>Weight (kg) *</label>
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label>Destination Branch *</label>
                      <select
                        value={destBranchId}
                        onChange={(e) => setDestBranchId(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                      >
                        <option value="">Select Destination</option>
                        {branches.filter(b => b.id !== dbUser?.branchId).map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label>Logistics Fee (USD) *</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label>Assign Scheduled Coach (Optional)</label>
                      <select
                        value={busId}
                        onChange={(e) => setBusId(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                      >
                        <option value="">Unassigned (Awaiting transit)</option>
                        {activeSchedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.busNumber} to {s.arrivalBranchName} (Dep: {new Date(s.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label>Logistics Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Fragile glass, handle with care"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
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
                    {editingParcelId ? 'Save Changes' : 'Register Parcel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Receipt Overlay for Printing */}
      <AnimatePresence>
        {activeReceiptParcel && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-200 flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:max-w-none"
            >
              {/* Receipt Area to be printed */}
              <div id="printable-receipt" className="space-y-6 font-mono text-xs text-slate-800 leading-relaxed print:text-black">
                {/* Receipt Header */}
                <div className="text-center space-y-1.5 border-b-2 border-dashed border-slate-200 pb-5">
                  <h3 className="font-display font-bold text-xl tracking-tight text-slate-900 print:text-black">SAFARLINK LOGISTICS</h3>
                  <p className="text-[10px] font-semibold text-slate-400">SOMALILAND TRANSIT SOLUTIONS</p>
                  <p className="text-[9px] font-semibold text-slate-400">Branch Dispatch Official Receipt</p>
                </div>

                {/* Barcode Mockup */}
                <div className="text-center space-y-1">
                  <span className="text-[28px] tracking-[6px] font-thin text-slate-800 select-none block leading-none font-sans">
                    ||||| | |||| | ||||| | ||
                  </span>
                  <span className="text-xs font-bold text-slate-700 block tracking-wide">
                    {activeReceiptParcel.trackingNumber}
                  </span>
                </div>

                {/* Details list */}
                <div className="space-y-3.5 border-b border-slate-100 pb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Registered Date:</span>
                    <span className="font-bold">
                      {new Date(activeReceiptParcel.createdAt).toLocaleDateString()} at{' '}
                      {new Date(activeReceiptParcel.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-50">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Sender</span>
                      <span className="font-bold block text-slate-800">{activeReceiptParcel.senderName}</span>
                      <span className="text-slate-500 font-medium block mt-0.5">{activeReceiptParcel.senderPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Receiver</span>
                      <span className="font-bold block text-slate-800">{activeReceiptParcel.receiverName}</span>
                      <span className="text-slate-500 font-medium block mt-0.5">{activeReceiptParcel.receiverPhone}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-50 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Route:</span>
                      <span className="font-bold">
                        {activeReceiptParcel.sendingBranchName} &rarr; {activeReceiptParcel.destinationBranchName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Cargo Item:</span>
                      <span className="font-bold">{activeReceiptParcel.itemDescription}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Weight:</span>
                      <span className="font-bold">{activeReceiptParcel.weight} kg</span>
                    </div>
                    {activeReceiptParcel.busNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Assigned Bus:</span>
                        <span className="font-bold">Coach {activeReceiptParcel.busNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 border border-slate-100 print:bg-white print:border-none print:p-0">
                  <div className="flex justify-between text-sm font-bold text-slate-800 print:text-black">
                    <span>Total Paid Charge:</span>
                    <span>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(activeReceiptParcel.price / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>Status:</span>
                    <span className="uppercase text-emerald-600">{activeReceiptParcel.status}</span>
                  </div>
                  {activeReceiptParcel.notes && (
                    <div className="text-[10px] text-slate-400 font-medium pt-1.5 border-t border-slate-200/50">
                      <span className="font-bold">Notes:</span> {activeReceiptParcel.notes}
                    </div>
                  )}
                </div>

                {/* Footer disclaimer */}
                <div className="text-center text-[9px] text-slate-400 font-semibold space-y-1 pt-4 border-t border-dashed border-slate-200 pb-2">
                  <p>Thank you for choosing SafarLink.</p>
                  <p>Keep this receipt safe to claim your cargo.</p>
                  <p className="font-mono text-[8px] mt-1 text-slate-300">Auth: {activeReceiptParcel.createdByName}</p>
                </div>
              </div>

              {/* Action Buttons (Hidden during printing) */}
              <div className="mt-8 flex justify-end space-x-3 print:hidden">
                <button
                  onClick={() => handleDeleteParcel(activeReceiptParcel.id)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs cursor-pointer mr-auto"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleEditParcel(activeReceiptParcel)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => setActiveReceiptParcel(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={executeBrowserPrint}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md shadow-blue-500/10"
                >
                  <Printer className="w-4 h-4 stroke-[2.5]" />
                  <span>Print Ticket</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Parcels Table / Grid */}
      {filteredParcels.length === 0 ? (
        <div className="glass-card shadow-sm rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <Package className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
          <h3 className="font-display font-bold text-lg text-slate-800">No parcel records found</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            There are no registered shipments under the current branch scope matching your query.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={!dbUser?.branchId}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Register First Parcel
          </button>
        </div>
      ) : (
        <div className="glass-card shadow-sm rounded-2xl overflow-hidden border border-slate-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-500">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Tracking</th>
                  <th className="py-4 px-6">Sender & Phone</th>
                  <th className="py-4 px-6">Receiver & Phone</th>
                  <th className="py-4 px-6">Destination</th>
                  <th className="py-4 px-6">Bus/Route</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Created Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-600">
                {filteredParcels.map((p) => (
                  <tr 
                    key={p.id} 
                    onClick={() => setActiveReceiptParcel(p)}
                    className="hover:bg-slate-50/40 transition-colors cursor-pointer"
                  >
                    {/* Tracking */}
                    <td className="py-4 px-6">
                      <span className="font-mono text-blue-600 font-bold block">{p.trackingNumber}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{p.itemDescription}</span>
                    </td>
                    {/* Sender */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-bold">{p.senderName}</span>
                        <span className="text-slate-400 font-medium text-[10px] mt-0.5 flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{p.senderPhone}</span>
                        </span>
                      </div>
                    </td>
                    {/* Receiver */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-bold">{p.receiverName}</span>
                        <span className="text-slate-400 font-medium text-[10px] mt-0.5 flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{p.receiverPhone}</span>
                        </span>
                      </div>
                    </td>
                    {/* Destination */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-slate-700 font-bold">{p.destinationBranchName}</span>
                      </div>
                    </td>
                    {/* Bus Route */}
                    <td className="py-4 px-6">
                      {p.busNumber ? (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">
                          <span>Coach {p.busNumber}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold italic">Unassigned</span>
                      )}
                    </td>
                    {/* Status badge */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        p.status === 'On The Way' ? 'bg-blue-50 text-blue-700' :
                        p.status === 'Arrived' ? 'bg-yellow-50 text-yellow-700' :
                        p.status === 'Received' || p.status === 'Collected' ? 'bg-green-50 text-green-700' :
                        p.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                        p.status === 'Archived' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    {/* Created Date */}
                    <td className="py-4 px-6">
                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                    </td>
                    {/* Actions column */}
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        {/* Mark Collected */}
                        {p.status === 'Arrived' && p.destinationBranchId === dbUser?.branchId && (
                          <button
                            onClick={() => handleUpdateStatus(p.id, 'Collected')}
                            title="Mark as Taken by Owner (Collected)"
                            className="flex items-center space-x-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Owner Taken</span>
                          </button>
                        )}

                        {/* Print */}
                        <button
                          onClick={() => handlePrintReceipt(p)}
                          title="Print Receipt"
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/50 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Archive */}
                        {!p.archived ? (
                          <button
                            onClick={() => handleToggleArchive(p.id, true)}
                            title="Archive Parcel"
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200/50 transition-colors cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleArchive(p.id, false)}
                            title="Restore from Archive"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-100 transition-colors cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
