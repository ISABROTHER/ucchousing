import { useState, useEffect } from 'react';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { PageType } from '../App';
import { getHostelById } from '../lib/hostels';
import { createBooking } from '../lib/bookings';

interface BookingPageProps {
  hostelId: string;
  user: any;
  onNavigate: (page: PageType) => void;
}

export default function BookingPage({
  hostelId,
  user,
  onNavigate,
}: BookingPageProps) {
  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    checkInDate: '',
    checkOutDate: '',
    specialRequests: '',
  });

  useEffect(() => {
    loadHostel();
  }, [hostelId]);

  const loadHostel = async () => {
    try {
      const data = await getHostelById(hostelId);
      setHostel(data);
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  };

  const calculateTotal = () => {
    if (!hostel) return 0;
    return calculateNights() * hostel.price_per_night;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!formData.checkInDate || !formData.checkOutDate) {
        throw new Error('Please select both check-in and check-out dates');
      }

      const nights = calculateNights();
      if (nights <= 0) {
        throw new Error('Check-out date must be after check-in date');
      }

      await createBooking({
        student_id: user.id,
        hostel_id: hostelId,
        check_in_date: formData.checkInDate,
        check_out_date: formData.checkOutDate,
        number_of_nights: nights,
        total_price: calculateTotal(),
        special_requests: formData.specialRequests || undefined,
        status: 'pending',
      });

      setSuccess(true);
      setTimeout(() => {
        onNavigate('my-bookings');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !hostel) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => onNavigate('detail', hostelId)}
          className="flex items-center gap-2 text-[#DC143C] font-semibold mb-8 hover:text-red-700"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Hostel
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h1 className="text-3xl font-bold text-black mb-8">Complete Your Booking</h1>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-600 font-semibold">
                    Booking created successfully! Redirecting...
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      value={formData.checkInDate}
                      onChange={(e) =>
                        setFormData({ ...formData, checkInDate: e.target.value })
                      }
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Check-out Date
                    </label>
                    <input
                      type="date"
                      value={formData.checkOutDate}
                      onChange={(e) =>
                        setFormData({ ...formData, checkOutDate: e.target.value })
                      }
                      min={formData.checkInDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) =>
                      setFormData({ ...formData, specialRequests: e.target.value })
                    }
                    placeholder="Any special requirements or preferences?"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || success}
                  className="w-full bg-[#DC143C] text-white font-semibold py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating Booking...' : 'Confirm Booking'}
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-lg font-bold text-black mb-6">Booking Summary</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                <div>
                  <p className="font-semibold text-black">{hostel.name}</p>
                  <p className="text-sm text-gray-600">{hostel.location}</p>
                </div>

                {formData.checkInDate && (
                  <div>
                    <p className="text-sm text-gray-600">Check-in</p>
                    <p className="font-semibold text-black">
                      {new Date(formData.checkInDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {formData.checkOutDate && (
                  <div>
                    <p className="text-sm text-gray-600">Check-out</p>
                    <p className="font-semibold text-black">
                      {new Date(formData.checkOutDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {calculateNights() > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Nights</p>
                    <p className="font-semibold text-black">{calculateNights()}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>${hostel.price_per_night} × {calculateNights()} nights</span>
                  <span className="font-semibold">${calculateTotal()}</span>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-between">
                  <span className="font-semibold text-black">Total</span>
                  <span className="text-2xl font-bold text-[#DC143C]">
                    ${calculateTotal()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
