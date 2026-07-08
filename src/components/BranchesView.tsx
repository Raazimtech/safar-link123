import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { Building2, MapPin, Tag, Calendar, Plus, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Branch {
  id: number;
  name: string;
  code: string;
  location: string;
  createdAt: string;
}

interface BranchesViewProps {
  branches: Branch[];
  schedules: any[];
  onRefresh: () => void;
}

export const BranchesView: React.FC<BranchesViewProps> = ({ branches, schedules, onRefresh }) => {
  const { token, dbUser } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isSuperAdmin = dbUser?.role === 'Super Admin';

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!name || !code || !location) {
      setFormError('All fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/branches', {
        method: 'POST', // Note: we can define this in server.ts or handle it. In our server.ts we didn't add POST /api/branches, let's make sure we add a POST route in server.ts or handle it gracefully on client. Let's make sure we support branch creation in server.ts! Oh, yes, we can add a POST /api/branches to server.ts, or let's double check if we did. No, our server.ts only has GET /api/branches. Let's add POST /api/branches to server.ts! We will use edit_file shortly to do that. Let's first write this component, then add the route.
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, code: code.toUpperCase(), location }),
      });

      if (res.ok) {
        setName('');
        setCode('');
        setLocation('');
        setFormError(null);
        setShowAddForm(false);
        onRefresh();
      } else {
        const errData = await res.json();
        setFormError(errData.error || 'Failed to register branch.');
      }
    } catch (err) {
      console.error(err);
      setFormError('An error occurred.');
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] font-sans min-h-[calc(screen-76px)] select-none">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight">Transport Hubs</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">Monitor active terminal branches and regional coordinates</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 text-xs font-bold px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Register Branch</span>
          </button>
        )}
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
                <h3 className="font-display font-bold text-lg text-slate-800">Register New Terminal Hub</h3>
                <button
                  onClick={() => setShowAddForm(false)}
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

              <form onSubmit={handleCreateBranch} className="space-y-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1.5">
                  <label>Hub/Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Burao Terminal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label>Unique 3-Letter Code</label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="e.g. BUO"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label>Physical Address Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Burao Central Highway, Somaliland"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer shadow-md shadow-blue-500/10"
                  >
                    Save Hub
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => {
          // Calculate stats for this branch
          const departingBuses = schedules.filter(s => s.departureBranchId === b.id && s.status !== 'Arrived' && s.status !== 'Cancelled').length;
          const incomingBuses = schedules.filter(s => s.arrivalBranchId === b.id && s.status === 'Departed').length;

          return (
            <div key={b.id} className="glass-card shadow-sm rounded-2xl p-6 border border-slate-200/80 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600">
                    <Building2 className="w-5.5 h-5.5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight">{b.name}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{b.location}</span>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg font-mono text-[10px] font-bold text-blue-700">
                  {b.code}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-50 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[9px] text-slate-400 uppercase tracking-wide">Outbound Coaches</span>
                  <span className="text-slate-700 font-bold">{departingBuses} Active</span>
                </div>
                <div className="space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[9px] text-slate-400 uppercase tracking-wide">Inbound Coaches</span>
                  <span className="text-slate-700 font-bold">{incomingBuses} En Route</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
