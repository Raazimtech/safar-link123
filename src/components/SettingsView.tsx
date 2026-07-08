import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { Settings, ShieldAlert, KeyRound, Globe, Save, HelpCircle, ClipboardList, Loader2, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsData {
  companyName: string;
  travelTimeHours: number;
  currency: string;
  theme: string;
}

interface LogItem {
  id: number;
  email: string;
  action: string;
  details: string;
  ip: string;
  createdAt: string;
  branchName: string | null;
}

interface SettingsViewProps {
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefresh }) => {
  const { token, dbUser } = useAuth();
  const [settings, setSettings] = useState<SettingsData>({
    companyName: 'SafarLink',
    travelTimeHours: 3,
    currency: 'USD',
    theme: 'light'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const isAdmin = dbUser?.role === 'Super Admin' || dbUser?.role === 'Admin';

  const fetchSettings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          companyName: data.companyName || 'SafarLink',
          travelTimeHours: data.travelTimeHours || 3,
          currency: data.currency || 'USD',
          theme: data.theme || 'light'
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!token || !isAdmin) return;
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (isAdmin) fetchLogs();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSuccessMsg('Configurations successfully updated.');
        onRefresh();
        fetchLogs();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to update configurations.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] font-sans min-h-[calc(screen-76px)] select-none">
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight">System Settings</h2>
        <p className="text-sm text-slate-400 mt-1 font-medium">Configure corporate properties, regional travel metrics, and audit system logs</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-xs text-slate-400 font-semibold">Loading settings...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Form */}
          <div className="glass-card shadow-sm rounded-2xl p-6 lg:col-span-1 space-y-6">
            <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight uppercase flex items-center space-x-2">
              <Settings className="w-4.5 h-4.5 text-blue-600" />
              <span>General Configurations</span>
            </h3>

            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-100 text-xs font-semibold text-emerald-600 rounded-xl">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-xs font-semibold text-red-600 rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="space-y-1.5">
                <label>Company/System Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label>Standard Transit Travel Duration (Hours)</label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.travelTimeHours}
                  onChange={(e) => setSettings({ ...settings, travelTimeHours: parseInt(e.target.value) || 3 })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-400 font-medium">Determines the auto-arrival algorithm timing when a coach departs.</p>
              </div>

              <div className="space-y-1.5">
                <label>Operating Currency Symbol</label>
                <input
                  type="text"
                  disabled={true}
                  value={settings.currency}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              )}
            </form>
          </div>

          {/* Audit Logs section for admins */}
          {isAdmin && (
            <div className="glass-card shadow-sm rounded-2xl p-6 lg:col-span-2 space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display font-bold text-sm text-slate-800 tracking-tight uppercase flex items-center space-x-2">
                  <ClipboardList className="w-4.5 h-4.5 text-blue-600" />
                  <span>System Activity Logs</span>
                </h3>
                <button
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200/50 transition-all cursor-pointer"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingLogs ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-2">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Refreshing system logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">No activity records logged in current database context.</p>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[360px] space-y-3 pr-2">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{log.action}</span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleDateString()} at{' '}
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {log.details}
                      </p>
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold pt-1 border-t border-slate-200/40">
                        <span>User: {log.email}</span>
                        <span>IP: {log.ip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
