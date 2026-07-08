import React from 'react';
import {
  TrendingUp,
  Package,
  Compass,
  Bus,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';

interface DashboardViewProps {
  parcels: any[];
  schedules: any[];
  finance: any;
  setTab: (tab: string) => void;
  onOpenCreateSchedule?: () => void;
  onOpenCreateParcel?: () => void;
  onOpenCreateFinance?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  parcels,
  schedules,
  finance,
  setTab,
  onOpenCreateSchedule,
  onOpenCreateParcel,
  onOpenCreateFinance
}) => {
  const summary = finance?.summary || {
    totalRevenue: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    branchBreakdown: {},
    categoryBreakdown: {}
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  // Compute metrics
  const activeSchedulesCount = schedules.filter(s => s.status === 'Scheduled' || s.status === 'Departed').length;
  const busesOnRoadCount = schedules.filter(s => s.status === 'Departed').length;
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const parcelsToday = parcels.filter(p => new Date(p.createdAt) >= todayStart);
  const deliveredTodayCount = parcels.filter(p => p.status === 'Received' && p.receivedAt && new Date(p.receivedAt) >= todayStart).length;
  const pendingDeliveriesCount = parcels.filter(p => p.status !== 'Received' && p.status !== 'Cancelled' && p.status !== 'Archived').length;

  // Build chart data
  // 1. Income Trend (Grouped by Day over last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0,0,0,0);
    return d;
  }).reverse();

  const incomeTrendData = last7Days.map(date => {
    const dateStr = date.toLocaleDateString([], { weekday: 'short' });
    const dayCents = (finance?.transactions || [])
      .filter((tx: any) => {
        const txDate = new Date(tx.date);
        txDate.setHours(0,0,0,0);
        return txDate.getTime() === date.getTime();
      })
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);
    return { name: dateStr, amount: dayCents / 100 };
  });

  // 2. Parcel Volume Trend (Grouped by day)
  const parcelTrendData = last7Days.map(date => {
    const dateStr = date.toLocaleDateString([], { weekday: 'short' });
    const count = parcels.filter(p => {
      const pDate = new Date(p.createdAt);
      pDate.setHours(0,0,0,0);
      return pDate.getTime() === date.getTime();
    }).length;
    return { name: dateStr, parcels: count };
  });

  // 3. Branch Comparison
  const branchChartData = Object.entries(summary.branchBreakdown || {}).map(([name, amountCents]: any) => ({
    name,
    amount: amountCents / 100,
  }));

  const COLORS = ['#3b82f6', '#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899'];

  // Check if system is completely empty
  const isEmpty = parcels.length === 0 && schedules.length === 0 && (finance?.transactions || []).length === 0;

  if (isEmpty) {
    return (
      <div className="p-8 font-sans bg-[#f8fafc] min-h-[calc(screen-76px)] select-none flex flex-col items-center justify-center">
        <div className="max-w-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto shadow-sm">
            <Compass className="w-10 h-10 animate-pulse stroke-[2]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight">SafarLink Installation Empty</h2>
            <p className="text-sm text-slate-500 mt-2.5 leading-relaxed">
              Welcome to the SafarLink Mobility Management System. To initialize the analytics panel, register your first branch parcel, schedule a departure route, or log any manual ticket revenue.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            <button
              onClick={onOpenCreateParcel}
              className="p-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-left transition-all group flex flex-col space-y-2 cursor-pointer shadow-sm"
            >
              <Package className="w-6 h-6 text-blue-500 stroke-[2.5]" />
              <span className="text-xs font-bold text-slate-800">Register Parcel</span>
              <span className="text-[10px] text-slate-400 font-medium leading-relaxed">Log customer shipment and auto-generate tracking</span>
            </button>

            <button
              onClick={onOpenCreateSchedule}
              className="p-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-left transition-all group flex flex-col space-y-2 cursor-pointer shadow-sm"
            >
              <Bus className="w-6 h-6 text-emerald-500 stroke-[2.5]" />
              <span className="text-xs font-bold text-slate-800">Create Route</span>
              <span className="text-[10px] text-slate-400 font-medium leading-relaxed">Dispatch schedules and configure seat capacities</span>
            </button>

            <button
              onClick={onOpenCreateFinance}
              className="p-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-left transition-all group flex flex-col space-y-2 cursor-pointer shadow-sm"
            >
              <DollarSign className="w-6 h-6 text-amber-500 stroke-[2.5]" />
              <span className="text-xs font-bold text-slate-800">Record Income</span>
              <span className="text-[10px] text-slate-400 font-medium leading-relaxed">Log manual ticket collections or branch cargo fees</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    { title: "Today's Revenue", val: formatCurrency(summary.todayRevenue), desc: "Current sales log", icon: DollarSign, color: "text-blue-600 bg-blue-50", badge: { text: "Optimal performance", color: "text-emerald-600 bg-emerald-50" } },
    { title: "Active Parcels", val: pendingDeliveriesCount, desc: "Awaiting arrival", icon: Package, color: "text-blue-600 bg-blue-50", badge: { text: `${parcelsToday.length} added today`, color: "text-blue-600 bg-blue-50" } },
    { title: "Buses on Road", val: busesOnRoadCount, desc: "En route to destination", icon: Bus, color: "text-amber-600 bg-amber-50", badge: { text: `${busesOnRoadCount} reaching soon`, color: "text-amber-600 bg-amber-50" } },
    { title: "Delivered Today", val: deliveredTodayCount, desc: "Claimed parcels", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50", badge: { text: "Completed", color: "text-emerald-600 bg-emerald-50" } },
    { title: "Active Routes", val: activeSchedulesCount, desc: "On schedule", icon: Calendar, color: "text-indigo-600 bg-indigo-50", badge: { text: "Active", color: "text-indigo-600 bg-indigo-50" } },
    { title: "Pending Deliveries", val: pendingDeliveriesCount, desc: "Awaiting dispatch", icon: Clock, color: "text-amber-600 bg-amber-50", badge: { text: "In progress", color: "text-amber-600 bg-amber-50" } },
    { title: "Weekly Revenue", val: formatCurrency(summary.weeklyRevenue), desc: "Past 7 days", icon: DollarSign, color: "text-indigo-600 bg-indigo-50", badge: { text: "+12.5% vs yesterday", color: "text-emerald-600 bg-emerald-50" } },
    { title: "Monthly Revenue", val: formatCurrency(summary.monthlyRevenue), desc: "Current month ledger", icon: DollarSign, color: "text-sky-600 bg-sky-50", badge: { text: "On target track", color: "text-sky-600 bg-sky-50" } },
  ];

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] font-sans min-h-[calc(screen-76px)] select-none">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800 tracking-tight">Mobility Overview</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Real-time status metrics and logistics analytics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('parcels')}
            className="bg-white hover:bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer shadow-sm transition-all"
          >
            Manage Parcels
          </button>
          <button
            onClick={() => setTab('schedule')}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-all"
          >
            Schedules
          </button>
        </div>
      </div>

      {/* KPI Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k, idx) => {
          const Icon = k.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-[22px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-slate-500 text-sm font-medium mb-1">{k.title}</p>
                  <h3 className="text-2xl font-bold text-slate-900 font-display tracking-tight">{k.val}</h3>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color} border border-slate-100/50`}>
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 font-semibold">{k.desc}</span>
                {k.badge && (
                  <div className={`flex items-center text-[10px] font-bold ${k.badge.color} px-2 py-0.5 rounded-full`}>
                    {k.badge.text}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income trend chart */}
        <div className="glass-card shadow-sm rounded-2xl p-6 lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Revenue Stream Trend</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Aggregate cash receipts across last 7 days</p>
            </div>
            <TrendingUp className="text-blue-500 w-5 h-5" />
          </div>

          <div className="h-[240px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incomeTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, 'Revenue']}
                  contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Comparisons */}
        <div className="glass-card shadow-sm rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Branch Breakdown</h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Total collected revenue comparison</p>
          </div>

          {branchChartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 font-medium">
              No branch sales registered yet
            </div>
          ) : (
            <div className="h-[200px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`$${value}`, 'Sales']}
                    contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {branchChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Live Dispatched Schedules & Active lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Schedules / Upcoming Departures */}
        <div className="glass-card shadow-sm rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 tracking-tight uppercase">Dispatched & Pending Routes</h4>
            <span className="text-[10px] font-bold text-blue-600 uppercase cursor-pointer" onClick={() => setTab('schedule')}>View All</span>
          </div>

          <div className="space-y-3">
            {schedules.slice(0, 4).length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-4">No departure schedules created yet</p>
            ) : (
              schedules.slice(0, 4).map((sch, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{sch.busNumber}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{sch.departureBranchName} &rarr; {sch.arrivalBranchName}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col space-y-1.5 items-end">
                    <span className="text-[10px] text-slate-500 font-bold">
                      {new Date(sch.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                      sch.status === 'Arrived' ? 'bg-green-50 text-green-700' :
                      sch.status === 'Departed' ? 'bg-blue-50 text-blue-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {sch.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Parcel Volum trend */}
        <div className="glass-card shadow-sm rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 tracking-tight uppercase">Parcel Shipment Volume</h4>
            <span className="text-[10px] font-bold text-blue-600 uppercase cursor-pointer" onClick={() => setTab('parcels')}>View All</span>
          </div>

          <div className="h-[180px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parcelTrendData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => [value, 'Parcels']}
                  contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="parcels" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
