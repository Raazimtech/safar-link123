import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Bus,
  User,
  MapPin,
  Clock,
  Coins,
  CheckCircle,
  Play,
  XCircle,
  Trash2,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Schedule {
  id: number;
  busNumber: string;
  driver: string;
  departureBranchId: number;
  arrivalBranchId: number;
  departureTime: string;
  estimatedArrival: string;
  status: string;
  availableSeats: number;
  totalSeats: number;
  price: number;
  departureBranchName: string;
  arrivalBranchName: string;
}

interface SchedulesViewProps {
  schedules: Schedule[];
  branches: any[];
  onRefresh: () => void;
  isOpenCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  schedules,
  branches,
  onRefresh,
  isOpenCreateModal = false,
  onCloseCreateModal
}) => {
  const { token, dbUser } = useAuth();
  const [showAddForm, setShowAddForm] = useState(isOpenCreateModal);
  const [searchVal, setSearchVal] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form states
  const [busNumber, setBusNumber] = useState('');
  const [driver, setDriver] = useState('');
  const [depBranch, setDepBranch] = useState(dbUser?.branchId?.toString() || '');
  const [arrBranch, setArrBranch] = useState('');
  const [depTime, setDepTime] = useState('');
  const [totalSeats, setTotalSeats] = useState('30');
  const [ticketPrice, setTicketPrice] = useState('15'); // USD
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = dbUser?.role === 'Super Admin' || dbUser?.role === 'Admin';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!busNumber || !driver || !depBranch || !arrBranch || !depTime || !totalSeats || !ticketPrice) {
      setFormError('All fields are required.');
      return;
    }

    if (depBranch === arrBranch) {
      setFormError('Departure branch and arrival branch cannot be the same.');
      return;
    }

    try {
      // Travel time average is 3 hours as per instructions.
      // So automatically set arrival to departureTime + 3 hours.
      const dTime = new Date(depTime);
      const aTime = new Date(dTime.getTime() + 3 * 60 * 60 * 1000);

      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          busNumber,
          driver,
          departureBranchId: depBranch,
          arrivalBranchId: arrBranch,
          departureTime: dTime.toISOString(),
          estimatedArrival: aTime.toISOString(),
          totalSeats,
          price: parseFloat(ticketPrice) * 100, // store as cents
        }),
      });

      if (res.ok) {
        setBusNumber('');
        setDriver('');
        setArrBranch('');
        setDepTime('');
        setShowAddForm(false);
        setFormError(null);
        if (onCloseCreateModal) onCloseCreateModal();
        onRefresh();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to create schedule.');
      }
    } catch (err) {
      console.error(err);
      setFormError('An error occurred. Please try again.');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, {
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

  // Filter schedules
  const [isImporting, setIsImporting] = useState(false);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      if (lines.length <= 1) {
        alert("CSV is empty or missing headers");
        setIsImporting(false);
        return;
      }

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 7) continue;
        
        const scheduleData = {
           busNumber: values[0],
           driver: values[1],
           departureBranchId: values[2],
           arrivalBranchId: values[3],
           departureTime: new Date(values[4]).toISOString(),
           totalSeats: values[5],
           price: parseFloat(values[6]) * 100
        };

        const dTime = new Date(scheduleData.departureTime);
        const aTime = new Date(dTime.getTime() + 3 * 60 * 60 * 1000);

        await fetch('/api/schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...scheduleData,
            estimatedArrival: aTime.toISOString()
          }),
        });
      }
      onRefresh();
      alert("Schedules imported successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to parse or import CSV. Ensure correct format (busNumber, driver, depBranchId, arrBranchId, departureTime, totalSeats, price).");
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const filtered = schedules.filter((s) => {
    const matchesSearch =
      s.busNumber.toLowerCase().includes(searchVal.toLowerCase()) ||
      s.driver.toLowerCase().includes(searchVal.toLowerCase());
    
    const matchesBranch =
      !filterBranch ||
      s.departureBranchId === parseInt(filterBranch) ||
      s.arrivalBranchId === parseInt(filterBranch);

    const matchesStatus = !filterStatus || s.status === filterStatus;

    return matchesSearch && matchesBranch && matchesStatus;
  });

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] font-sans min-h-[calc(screen-76px)] select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight">Departure Schedule</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">Coordinate inter-branch coach schedules and route status</p>
        </div>
        <div className="flex items-center space-x-3">
          <label 
            title="CSV Format: busNumber, driver, depBranchId, arrBranchId, departureTime(ISO), totalSeats, price"
            className="flex items-center space-x-2 text-xs font-bold px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer relative overflow-hidden"
          >
            <span>{isImporting ? 'Importing...' : 'Import CSV'}</span>
            <input 
              type="file" 
              accept=".csv,.txt" 
              onChange={handleImportCSV} 
              disabled={isImporting}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 text-xs font-bold px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Departure Schedule</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by coach number or driver..."
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
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:border-blue-400 transition-all font-semibold text-slate-600 shadow-sm appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Departed">Departed</option>
              <option value="Arrived">Arrived</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Creation Modal / Form */}
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
                <h3 className="font-display font-bold text-lg text-slate-800">Configure Route Schedule</h3>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>Bus Number</label>
                    <input
                      type="text"
                      placeholder="e.g. SL-04-H"
                      value={busNumber}
                      onChange={(e) => setBusNumber(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Driver Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmed Ali"
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label>Departure Branch</label>
                    <select
                      value={depBranch}
                      onChange={(e) => setDepBranch(e.target.value)}
                      disabled={!isAdmin} // Non-admins can only depart from their own branch
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label>Arrival/Destination Branch</label>
                    <select
                      value={arrBranch}
                      onChange={(e) => setArrBranch(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label>Departure Date & Time</label>
                    <input
                      type="datetime-local"
                      value={depTime}
                      onChange={(e) => setDepTime(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label>Total Seats</label>
                    <input
                      type="number"
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label>Ticket Seat Price (USD)</label>
                  <input
                    type="number"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[10px] text-slate-400">Assumes standard travel duration of 3 hours as per default company setup</span>
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
                    Confirm Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedules list display */}
      {filtered.length === 0 ? (
        <div className="glass-card shadow-sm rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <Calendar className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
          <h3 className="font-display font-bold text-lg text-slate-800">No route schedules listed</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            There are currently no active or historical coach departures matching your filter scope. Create a new dispatch route to begin monitoring buses.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Create First Schedule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((sch) => (
            <div key={sch.id} className="glass-card shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 flex flex-col justify-between border border-slate-200/80">
              <div className="space-y-4">
                {/* Bus and Status Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight block">{sch.busNumber}</h4>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-semibold mt-0.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Driver: {sch.driver}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                    sch.status === 'Arrived' ? 'bg-emerald-50 text-emerald-700' :
                    sch.status === 'Departed' ? 'bg-blue-50 text-blue-700' :
                    sch.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {sch.status}
                  </span>
                </div>

                {/* Destination Details */}
                <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold text-slate-700">{sch.departureBranchName}</span>
                  </div>
                  <span className="text-slate-400 font-bold">&rarr;</span>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-slate-700">{sch.arrivalBranchName}</span>
                  </div>
                </div>

                {/* Seating and pricing */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center space-x-2 text-slate-500 font-semibold">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Departure</span>
                      <span className="text-slate-700 font-bold">
                        {new Date(sch.departureTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                        {new Date(sch.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-500 font-semibold">
                    <Coins className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Ticket Price</span>
                      <span className="text-slate-700 font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sch.price / 100)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                  <span>Capacity: {sch.availableSeats} / {sch.totalSeats} seats left</span>
                  <span>Est. Arrival: {new Date(sch.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Transit Management Controls */}
              {sch.status !== 'Arrived' && sch.status !== 'Cancelled' && (
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                  {sch.status === 'Scheduled' && (
                    <button
                      onClick={() => handleUpdateStatus(sch.id, 'Departed')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Depart Coach</span>
                    </button>
                  )}

                  {sch.status === 'Departed' && (
                    <button
                      onClick={() => handleUpdateStatus(sch.id, 'Arrived')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Arrived</span>
                    </button>
                  )}

                  {sch.status === 'Scheduled' && (
                    <button
                      onClick={() => handleUpdateStatus(sch.id, 'Cancelled')}
                      className="flex items-center space-x-1 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
