import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { BarChart3, Printer, Calendar, FileText, PieChart, Coins, Package, Bus } from 'lucide-react';

interface ReportsViewProps {
  parcels: any[];
  schedules: any[];
  finance: any;
  branches: any[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  parcels,
  schedules,
  finance,
  branches
}) => {
  const { dbUser } = useAuth();
  const [reportType, setReportType] = useState('revenue'); // revenue, parcels, dispatches
  const [reportRange, setReportRange] = useState('today'); // today, weekly, monthly

  const transactions = finance?.transactions || [];

  // Filter based on range
  const getFilteredData = () => {
    const now = new Date();
    const startOfRange = new Date();

    if (reportRange === 'today') {
      startOfRange.setHours(0, 0, 0, 0);
    } else if (reportRange === 'weekly') {
      startOfRange.setDate(now.getDate() - 7);
    } else if (reportRange === 'monthly') {
      startOfRange.setDate(now.getDate() - 30);
    }

    const filteredTransactions = transactions.filter((tx: any) => new Date(tx.date) >= startOfRange);
    const filteredParcels = parcels.filter(p => new Date(p.createdAt) >= startOfRange);
    const filteredSchedules = schedules.filter(s => new Date(s.departureTime) >= startOfRange);

    return { transactions: filteredTransactions, parcels: filteredParcels, schedules: filteredSchedules };
  };

  const data = getFilteredData();

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const totalSum = data.transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="p-8 space-y-8 bg-[#f8fafc] font-sans min-h-[calc(screen-76px)] select-none print:bg-white print:p-0">
      {/* Header (Hidden in print except printable version) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 print:hidden">
        <div>
          <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight">Executive Reports</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">Generate printable ledgers, audits, and performance reviews</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 text-xs font-bold px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
        >
          <Printer className="w-4 h-4 stroke-[2.5]" />
          <span>Print Report</span>
        </button>
      </div>

      {/* Selector Options (Hidden in print) */}
      <div className="flex flex-col md:flex-row gap-4 print:hidden">
        {/* Report Type Selection */}
        <div className="flex gap-2.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex-1 md:flex-none">
          <button
            onClick={() => setReportType('revenue')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              reportType === 'revenue' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Revenue Audit</span>
          </button>
          <button
            onClick={() => setReportType('parcels')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              reportType === 'parcels' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Parcel Logistics</span>
          </button>
          <button
            onClick={() => setReportType('dispatches')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
              reportType === 'dispatches' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Bus Dispatches</span>
          </button>
        </div>

        {/* Range Selection */}
        <div className="flex gap-2.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex-1 md:flex-none">
          <button
            onClick={() => setReportRange('today')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportRange === 'today' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setReportRange('weekly')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportRange === 'weekly' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setReportRange('monthly')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportRange === 'monthly' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Printable Report Canvas Area */}
      <div id="printable-area" className="glass-card shadow-sm rounded-2xl p-8 bg-white border border-slate-100 print:shadow-none print:border-none print:p-0">
        {/* Printable Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">SAFARLINK TRANSIT SYSTEMS</h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OFFICIAL ADMINISTRATIVE LEDGER REPORT</p>
          </div>
          <div className="text-left md:text-right mt-4 md:mt-0 text-xs font-mono font-semibold text-slate-500">
            <p>Run Date: {new Date().toLocaleDateString()}</p>
            <p>Operator: {dbUser?.name || 'System Staff'}</p>
            <p className="text-[10px] text-blue-600 uppercase font-bold mt-1">Scope: {reportRange} | {reportType}</p>
          </div>
        </div>

        {/* 1. Revenue Report */}
        {reportType === 'revenue' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Financial Transactions Log</span>
              <span className="font-display font-extrabold text-lg text-slate-900">Total Sum: {formatCurrency(totalSum)}</span>
            </div>

            {data.transactions.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold text-center py-12">No cash receipts logged during this range</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse text-slate-600">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-4 font-mono text-[10px]">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{tx.description}</td>
                        <td className="py-3 px-4">{tx.branchName}</td>
                        <td className="py-3 px-4">{tx.category}</td>
                        <td className="py-3 px-4 font-mono">{tx.paymentMethod}</td>
                        <td className="py-3 px-4 text-right font-display font-bold text-slate-900">{formatCurrency(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. Parcel Logistics Report */}
        {reportType === 'parcels' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Cargo & Parcel Registry Log</span>
              <span className="text-xs font-bold text-slate-700">Total volume: {data.parcels.length} Items</span>
            </div>

            {data.parcels.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold text-center py-12">No parcel shipments logged during this range</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse text-slate-600">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-3 px-4">Tracking Code</th>
                      <th className="py-3 px-4">Sender / Phone</th>
                      <th className="py-3 px-4">Receiver / Phone</th>
                      <th className="py-3 px-4">Destination Hub</th>
                      <th className="py-3 px-4">Weight</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Fee Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.parcels.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-4 font-mono text-blue-600 font-bold">{p.trackingNumber}</td>
                        <td className="py-3 px-4">
                          <span className="block font-bold text-slate-800">{p.senderName}</span>
                          <span className="text-[10px] text-slate-400">{p.senderPhone}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="block font-bold text-slate-800">{p.receiverName}</span>
                          <span className="text-[10px] text-slate-400">{p.receiverPhone}</span>
                        </td>
                        <td className="py-3 px-4 font-bold">{p.destinationBranchName}</td>
                        <td className="py-3 px-4 font-mono">{p.weight} kg</td>
                        <td className="py-3 px-4 uppercase text-[10px] font-bold text-blue-600">{p.status}</td>
                        <td className="py-3 px-4 text-right font-display font-bold text-slate-900">{formatCurrency(p.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. Bus Dispatch Report */}
        {reportType === 'dispatches' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Bus departures and schedule ledger</span>
              <span className="text-xs font-bold text-slate-700">Total departures: {data.schedules.length} Trips</span>
            </div>

            {data.schedules.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold text-center py-12">No bus dispatches logged during this range</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse text-slate-600">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-3 px-4">Coach Number</th>
                      <th className="py-3 px-4">Driver Assigned</th>
                      <th className="py-3 px-4">Departure Point</th>
                      <th className="py-3 px-4">Destination Hub</th>
                      <th className="py-3 px-4">Departure Time</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Available Seats</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.schedules.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.busNumber}</td>
                        <td className="py-3 px-4">{s.driver}</td>
                        <td className="py-3 px-4 font-bold">{s.departureBranchName}</td>
                        <td className="py-3 px-4 font-bold">{s.arrivalBranchName}</td>
                        <td className="py-3 px-4 font-mono text-[10px]">
                          {new Date(s.departureTime).toLocaleDateString()} at{' '}
                          {new Date(s.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] font-bold text-emerald-600">{s.status}</td>
                        <td className="py-3 px-4 text-right font-mono">{s.availableSeats} / {s.totalSeats} seats</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Printable Stamp Signature Area */}
        <div className="mt-16 pt-12 border-t border-slate-200 border-dashed grid grid-cols-2 gap-8 text-center text-xs font-semibold text-slate-400 print:mt-24">
          <div className="space-y-8">
            <p>Prepared By Signature</p>
            <div className="w-48 border-b border-slate-300 mx-auto"></div>
          </div>
          <div className="space-y-8">
            <p>Regional Terminal Stamp</p>
            <div className="w-48 border-b border-slate-300 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
