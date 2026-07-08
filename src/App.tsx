import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { SchedulesView } from './components/SchedulesView.tsx';
import { ParcelsView } from './components/ParcelsView.tsx';
import { FinanceView } from './components/FinanceView.tsx';
import { BranchesView } from './components/BranchesView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { UsersView } from './components/UsersView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { Loader2, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const { firebaseUser, dbUser, token, loading, refreshProfile } = useAuth();
  const [currentTab, setTab] = useState('dashboard');
  const [searchVal, setSearchVal] = useState('');
  
  // App state
  const [branches, setBranches] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [parcels, setParcels] = useState<any[]>([]);
  const [finance, setFinance] = useState<any>({ transactions: [], summary: {} });
  const [loadingData, setLoadingData] = useState(false);

  const syncData = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [branchesRes, schedulesRes, parcelsRes, financeRes] = await Promise.all([
        fetch('/api/branches', { headers }),
        fetch('/api/schedules', { headers }),
        fetch('/api/parcels', { headers }),
        fetch('/api/finance', { headers })
      ]);

      if (branchesRes.ok) setBranches(await branchesRes.json());
      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      if (parcelsRes.ok) setParcels(await parcelsRes.json());
      if (financeRes.ok) setFinance(await financeRes.json());
    } catch (err) {
      console.error('Error syncing applet data:', err);
    }
  };

  useEffect(() => {
    if (token) {
      setLoadingData(true);
      syncData().finally(() => setLoadingData(false));

      // Periodically poll for changes (e.g. status updates)
      const interval = setInterval(syncData, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Handle manual dashboard shortcuts for empty states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);

  const triggerCreateSchedule = () => {
    setTab('schedule');
    setIsScheduleModalOpen(true);
  };

  const triggerCreateParcel = () => {
    setTab('parcels');
    setIsParcelModalOpen(true);
  };

  const triggerCreateFinance = () => {
    setTab('finance');
    setIsFinanceModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-4 font-sans">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin stroke-[2.5]" />
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Synchronizing Authenticator...</span>
      </div>
    );
  }

  // Not signed in
  if (!firebaseUser || !dbUser) {
    return <AuthScreen />;
  }

  // Signed in but status is Pending or Deactivated
  if (dbUser.status === 'Pending' || dbUser.status === 'inactive' || dbUser.status === 'Deactivated') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-10 max-w-md w-full text-center space-y-6">
          <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
          <div className="space-y-2">
            <h3 className="font-display font-bold text-xl text-slate-800">Account Pending Approval</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Your profile is currently marked as pending or inactive. Please wait for a Super Admin to activate your account or contact support.
            </p>
          </div>
          <button
            onClick={() => refreshProfile()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-blue-500/10 cursor-pointer"
          >
            Check Activation Status
          </button>
        </div>
      </div>
    );
  }

  // Loaded and authenticated
  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-700 relative">
      {/* Sidebar navigation */}
      <Sidebar currentTab={currentTab} setTab={setTab} />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar onSearch={setSearchVal} onRefresh={syncData} />

        {/* Dynamic View panels with responsive transitions */}
        <main className="flex-1 overflow-y-auto">
          {loadingData ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs text-slate-400 font-bold uppercase">Loading SafarLink Database...</span>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  parcels={parcels}
                  schedules={schedules}
                  finance={finance}
                  setTab={setTab}
                  onOpenCreateSchedule={triggerCreateSchedule}
                  onOpenCreateParcel={triggerCreateParcel}
                  onOpenCreateFinance={triggerCreateFinance}
                />
              )}

              {currentTab === 'schedule' && (
                <SchedulesView
                  schedules={schedules}
                  branches={branches}
                  onRefresh={syncData}
                  isOpenCreateModal={isScheduleModalOpen}
                  onCloseCreateModal={() => setIsScheduleModalOpen(false)}
                />
              )}

              {currentTab === 'parcels' && (
                <ParcelsView
                  parcels={parcels}
                  branches={branches}
                  schedules={schedules}
                  onRefresh={syncData}
                  searchVal={searchVal}
                  setSearchVal={setSearchVal}
                  isOpenCreateModal={isParcelModalOpen}
                  onCloseCreateModal={() => setIsParcelModalOpen(false)}
                />
              )}

              {currentTab === 'finance' && (
                <FinanceView
                  finance={finance}
                  branches={branches}
                  onRefresh={syncData}
                  isOpenCreateModal={isFinanceModalOpen}
                  onCloseCreateModal={() => setIsFinanceModalOpen(false)}
                />
              )}

              {currentTab === 'branches' && (
                <BranchesView
                  branches={branches}
                  schedules={schedules}
                  onRefresh={syncData}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView
                  parcels={parcels}
                  schedules={schedules}
                  finance={finance}
                  branches={branches}
                />
              )}

              {currentTab === 'users' && (
                <UsersView
                  branches={branches}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  onRefresh={syncData}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
