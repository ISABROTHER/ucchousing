import { useState, useEffect } from 'react';
import { Calendar, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStudentBookings, cancelBooking } from '../lib/bookings';
import { PageType } from '../App';

interface MyBookingsPageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function MyBookingsPage({ onNavigate }: MyBookingsPageProps) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await getStudentBookings(user.id);
        setBookings(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setCancelling(bookingId);
    try {
      await cancelBooking(bookingId);
      setBookings(bookings.map(b =>
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'checked_in':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-black mb-8">My Bookings</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Hostel</p>
                    <p className="text-lg font-bold text-black">
                      {booking.hostels?.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold text-gray-800">
                        {booking.hostels?.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-semibold text-gray-800">
                        {booking.number_of_nights} nights
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-semibold text-[#DC143C]">
                      GHS {booking.total_price}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Check-in</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(booking.check_in_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Check-out</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(booking.check_out_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div
                    className={`px-4 py-2 rounded-full border font-semibold text-sm capitalize ${getStatusColor(
                      booking.status
                    )}`}
                  >
                    {booking.status.replace('_', ' ')}
                  </div>

                  {booking.status !== 'cancelled' &&
                    booking.status !== 'completed' && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancelling === booking.id}
                        className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 font-semibold disabled:opacity-50 transition-colors"
                      >
                        {cancelling === booking.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-black mb-2">No Bookings Yet</h3>
            <p className="text-gray-600 mb-6">
              Start exploring and book your perfect hostel today!
            </p>
            <button
              onClick={() => onNavigate('search')}
              className="inline-flex px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Search Hostels
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
