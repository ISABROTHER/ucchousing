import { TrendingUp, Users, Home, DollarSign, Calendar, Star } from 'lucide-react';

interface OwnerAnalyticsProps {
  hostels: any[];
  bookings: any[];
}

export default function OwnerAnalytics({ hostels, bookings }: OwnerAnalyticsProps) {
  const totalRevenue = bookings
    .filter(b => ['confirmed', 'checked_in', 'completed'].includes(b.status))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const checkedIn = bookings.filter(b => b.status === 'checked_in').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  const avgRating = hostels.reduce((sum, h) => sum + (h.rating || 0), 0) / (hostels.length || 1);

  const monthlyRevenue: Record<string, number> = {};
  bookings
    .filter(b => ['confirmed', 'checked_in', 'completed'].includes(b.status))
    .forEach(b => {
      const month = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (b.total_price || 0);
    });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIndex = new Date().getMonth();
  const last6Months = Array.from({ length: 6 }, (_, i) => months[(currentMonthIndex - 5 + i + 12) % 12]);
  const maxRevenue = Math.max(...last6Months.map(m => monthlyRevenue[m] || 0), 1);

  const stats = [
    {
      label: 'Total Revenue',
      value: `GHS ${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600',
      sub: `${bookings.filter(b => ['confirmed','checked_in','completed'].includes(b.status)).length} paid bookings`,
    },
    {
      label: 'Active Guests',
      value: checkedIn,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      sub: `${confirmedBookings} confirmed`,
    },
    {
      label: 'Total Properties',
      value: hostels.length,
      icon: Home,
      color: 'bg-amber-50 text-amber-600',
      sub: `${hostels.filter(h => h.verified).length} verified`,
    },
    {
      label: 'Avg. Rating',
      value: avgRating > 0 ? avgRating.toFixed(1) : 'N/A',
      icon: Star,
      color: 'bg-yellow-50 text-yellow-600',
      sub: `${pendingBookings} pending review`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {Object.keys(monthlyRevenue).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-gray-900">Revenue Overview</h3>
          </div>
          <div className="flex items-end gap-3 h-36">
            {last6Months.map(month => {
              const amount = monthlyRevenue[month] || 0;
              const height = amount > 0 ? Math.max((amount / maxRevenue) * 112, 4) : 0;
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-2">
                  {amount > 0 && (
                    <p className="text-xs font-semibold text-emerald-700 truncate w-full text-center">
                      {(amount / 1000).toFixed(1)}k
                    </p>
                  )}
                  <div className="w-full flex items-end justify-center" style={{ height: '112px' }}>
                    <div
                      className="w-full bg-emerald-500 rounded-t-lg transition-all duration-700"
                      style={{ height: `${height}px` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{month}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Booking Breakdown</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Pending', count: bookings.filter(b => b.status === 'pending').length, color: 'bg-amber-400' },
            { label: 'Confirmed', count: confirmedBookings, color: 'bg-green-500' },
            { label: 'Checked In', count: checkedIn, color: 'bg-blue-500' },
            { label: 'Completed', count: bookings.filter(b => b.status === 'completed').length, color: 'bg-gray-400' },
            { label: 'Cancelled', count: bookings.filter(b => b.status === 'cancelled').length, color: 'bg-red-400' },
          ].map(item => {
            const pct = bookings.length > 0 ? (item.count / bookings.length) * 100 : 0;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600 font-medium">{item.label}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                <div className="w-8 text-sm font-bold text-gray-900 text-right">{item.count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
