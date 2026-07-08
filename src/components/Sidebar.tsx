import React from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import {
  LayoutGrid,
  Calendar,
  DollarSign,
  Package,
  Building2,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Bus,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab }) => {
  const { dbUser, logout } = useAuth();

  const isAdmin = dbUser?.role === 'Super Admin' || dbUser?.role === 'Admin';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'schedule', label: 'Departure Schedule', icon: Calendar },
    { id: 'parcels', label: 'Parcel Management', icon: Package },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'branches', label: 'Branches', icon: Building2 },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    ...(isAdmin ? [{ id: 'users', label: 'User Management', icon: Users }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 font-sans z-30 select-none">
      {/* Brand */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
        </div>
        <h1 className="text-xl font-display font-bold tracking-tight text-slate-800">SafarLink</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Main Menu</span>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / User Context */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {dbUser?.role !== 'Super Admin' && !dbUser?.branchId && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span className="text-[10px] text-amber-700 leading-normal font-medium">
              No branch assigned. Ask Admin to authorize.
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200/50 flex items-center justify-center text-blue-700 font-bold font-display text-sm flex-shrink-0">
            {dbUser?.name?.slice(0, 2).toUpperCase() || 'ST'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{dbUser?.name || 'Staff User'}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{dbUser?.role || 'Staff'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
          <span>Sign Out</span>
        </button>

        <div className="pt-2 text-center">
          <span className="text-[10px] font-medium text-slate-300 select-none tracking-tight">
            made by <span className="font-semibold text-slate-400">Raazim tech</span>
          </span>
        </div>
      </div>
    </aside>
  );
};
