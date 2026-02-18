import { useState } from 'react';
import { Calendar, User, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { updateBookingStatus } from '../../lib/bookings';

interface OwnerBookingsProps {
  bookings: any[];
  onBookingUpdate: (bookingId: string, status: string) => void;
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    checked_in: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-gray-50 text-gray-600 border-gray-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  const icons: Record<string, React.ReactNode> = {
    confirmed: <CheckCircle className="w-3.5 h-3.5" />,
    pending: <Clock className="w-3.5 h-3.5" />,
    checked_in: <CheckCircle className="w-3.5 h-3.5" />,
    completed: <CheckCircle className="w-3.5 h-3.5" />,
    cancelled: <XCircle className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {icons[status]}
      {status.replace('_', ' ')}
    </span>
  );
}

export default function OwnerBookings({ bookings, onBookingUpdate }: OwnerBookingsProps) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = filterStatus === 'all' ? bookings : bookings.filter(b => b.status === filterStatus);

  async function handleStatusChange(bookingId: string, newStatus: string) {
    setUpdating(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus as any);
      onBookingUpdate(bookingId, newStatus);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-colors capitalize ${
              filterStatus === s ? 'bg-[#DC143C] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            {s !== 'all' && (
              <span className="ml-1.5 text-xs opacity-75">
                ({bookings.filter(b => b.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => (
            <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {booking.student_profiles?.full_name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{booking.student_profiles?.full_name || 'Student'}</p>
                      <p className="text-sm text-gray-500">{booking.hostels?.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Check-in</p>
                        <p className="text-sm font-medium text-gray-700">
                          {new Date(booking.check_in_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Check-out</p>
                        <p className="text-sm font-medium text-gray-700">
                          {new Date(booking.check_out_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Amount</p>
                        <p className="text-sm font-bold text-emerald-600">GHS {booking.total_price?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {booking.special_requests && (
                    <div className="mt-3 p-2.5 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1">Special Requests</p>
                      <p className="text-xs text-gray-600">{booking.special_requests}</p>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-3">
                  <StatusBadge status={booking.status} />
                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <select
                      value={booking.status}
                      onChange={e => handleStatusChange(booking.id, e.target.value)}
                      disabled={updating === booking.id}
                      className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 disabled:opacity-50 cursor-pointer"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
