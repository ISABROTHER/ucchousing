import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, Download, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStudentBookings } from '../lib/bookings';
import { PageType } from '../App';

interface ExpensesPageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType) => void;
}

interface PaymentRecord {
  id: string;
  hostel_name: string;
  hostel_location: string;
  amount: number;
  check_in: string;
  check_out: string;
  nights: number;
  status: string;
  created_at: string;
  hostel_id: string;
}

export default function ExpensesPage({ user, userProfile, onNavigate }: ExpensesPageProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  useEffect(() => {
    if (user) loadPayments();
  }, [user]);

  async function loadPayments() {
    try {
      const bookings = await getStudentBookings(user.id);
      const records: PaymentRecord[] = bookings.map(b => ({
        id: b.id,
        hostel_name: b.hostels?.name || 'Unknown Hostel',
        hostel_location: b.hostels?.location || '',
        amount: b.total_price,
        check_in: b.check_in_date,
        check_out: b.check_out_date,
        nights: b.number_of_nights,
        status: b.status,
        created_at: b.created_at,
        hostel_id: b.hostel_id,
      }));
      setPayments(records);
    } finally {
      setLoading(false);
    }
  }

  const years = [...new Set(payments.map(p => new Date(p.created_at).getFullYear().toString()))];

  const filtered = payments.filter(p => {
    const yearMatch = filterYear === 'all' || new Date(p.created_at).getFullYear().toString() === filterYear;
    const statusMatch = filterStatus === 'all' || p.status === filterStatus;
    return yearMatch && statusMatch;
  });

  const totalSpent = filtered
    .filter(p => ['confirmed', 'checked_in', 'completed'].includes(p.status))
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = filtered
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const completedCount = filtered.filter(p => p.status === 'completed').length;

  const monthlyData: Record<string, number> = {};
  filtered
    .filter(p => ['confirmed', 'checked_in', 'completed'].includes(p.status))
    .forEach(p => {
      const month = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[month] = (monthlyData[month] || 0) + p.amount;
    });

  const maxMonthly = Math.max(...Object.values(monthlyData), 1);
  const monthlyEntries = Object.entries(monthlyData).slice(-6);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': case 'checked_in': case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-50 text-green-700';
      case 'checked_in': return 'bg-blue-50 text-blue-700';
      case 'completed': return 'bg-gray-50 text-gray-700';
      case 'pending': return 'bg-amber-50 text-amber-700';
      case 'cancelled': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Date', 'Hostel', 'Location', 'Check-in', 'Check-out', 'Nights', 'Amount (GHS)', 'Status'],
      ...filtered.map(p => [
        new Date(p.created_at).toLocaleDateString(),
        p.hostel_name,
        p.hostel_location,
        new Date(p.check_in).toLocaleDateString(),
        new Date(p.check_out).toLocaleDateString(),
        p.nights,
        p.amount.toFixed(2),
        p.status,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <button onClick={() => onNavigate('auth')} className="px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-lg">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              Expenses
            </h1>
            <p className="text-gray-500 mt-2">Track your accommodation spending</p>
          </div>
          {payments.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-500 font-medium">Total Spent</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">GHS {totalSpent.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{filtered.filter(p => ['confirmed','checked_in','completed'].includes(p.status)).length} bookings</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-gray-500 font-medium">Pending</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">GHS {pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{filtered.filter(p => p.status === 'pending').length} awaiting confirmation</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-500 font-medium">Completed Stays</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-xs text-gray-400 mt-1">out of {filtered.length} total</p>
          </div>
        </div>

        {monthlyEntries.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Monthly Spending</h2>
            <div className="flex items-end gap-3 h-32">
              {monthlyEntries.map(([month, amount]) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-emerald-700">
                    {amount > 0 ? `GHS ${(amount / 1000).toFixed(1)}k` : ''}
                  </p>
                  <div
                    className="w-full bg-emerald-500 rounded-t-lg transition-all duration-500"
                    style={{ height: `${(amount / maxMonthly) * 80}px`, minHeight: amount > 0 ? '4px' : '0' }}
                  />
                  <p className="text-xs text-gray-400 text-center">{month.split(' ')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
            <h2 className="text-lg font-bold text-gray-900 mr-auto">Payment History</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked_in">Checked In</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {years.length > 0 && (
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20"
                >
                  <option value="all">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No payment records found</p>
              <button onClick={() => onNavigate('search')} className="mt-4 px-5 py-2 bg-[#DC143C] text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors">
                Book Accommodation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(payment => (
                <div key={payment.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {getStatusIcon(payment.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <button
                            onClick={() => onNavigate('detail', payment.hostel_id)}
                            className="font-semibold text-gray-900 hover:text-[#DC143C] transition-colors text-sm"
                          >
                            {payment.hostel_name}
                          </button>
                          <p className="text-xs text-gray-500 mt-0.5">{payment.hostel_location}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900">GHS {payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{payment.nights} nights</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(payment.check_in).toLocaleDateString()} – {new Date(payment.check_out).toLocaleDateString()}
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize ${getStatusStyle(payment.status)}`}>
                          {payment.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
