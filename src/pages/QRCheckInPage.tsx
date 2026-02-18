import { useState, useEffect } from 'react';
import { QrCode, CheckCircle, LogIn, LogOut, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getStudentBookings, updateBookingStatus } from '../lib/bookings';
import { PageType } from '../App';

interface QRCheckInPageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
}

interface QRCode {
  id: string;
  booking_id: string;
  token: string;
  type: 'checkin' | 'checkout';
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

function generateQRPattern(token: string): string[][] {
  const size = 21;
  const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill('white'));

  const bytes = token.replace(/-/g, '').match(/.{2}/g) || [];
  const nums = bytes.map(b => parseInt(b, 16));

  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      const isBorder = i === 0 || i === 6 || j === 0 || j === 6;
      const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      grid[i][j] = isBorder || isInner ? 'black' : 'white';
      grid[i][size - 7 + j] = isBorder || isInner ? 'black' : 'white';
      grid[size - 7 + i][j] = isBorder || isInner ? 'black' : 'white';
    }
  }

  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0 ? 'black' : 'white';
    grid[i][6] = i % 2 === 0 ? 'black' : 'white';
  }

  for (let i = 8; i < size; i++) {
    for (let j = 8; j < size; j++) {
      if (grid[i][j] === 'white') {
        const idx = ((i - 8) * (size - 8) + (j - 8)) % nums.length;
        grid[i][j] = (nums[idx] >> ((i + j) % 8)) & 1 ? 'black' : 'white';
      }
    }
  }

  return grid;
}

function QRCodeDisplay({ token, label, color }: { token: string; label: string; color: string }) {
  const grid = generateQRPattern(token);
  const cellSize = 8;
  const size = grid.length * cellSize;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`p-3 rounded-2xl ${color} shadow-lg`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {grid.map((row, i) =>
            row.map((cell, j) =>
              cell === 'black' ? (
                <rect
                  key={`${i}-${j}`}
                  x={j * cellSize}
                  y={i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="white"
                />
              ) : (
                <rect
                  key={`${i}-${j}`}
                  x={j * cellSize}
                  y={i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#1e293b"
                />
              )
            )
          )}
        </svg>
      </div>
      <p className="text-xs font-mono text-gray-500 break-all text-center max-w-48">{token.slice(0, 16)}...</p>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </div>
  );
}

export default function QRCheckInPage({ user, userProfile, onNavigate }: QRCheckInPageProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<string, QRCode[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadBookings();
  }, [user]);

  async function loadBookings() {
    try {
      const data = await getStudentBookings(user.id);
      const active = data.filter(b =>
        ['confirmed', 'checked_in'].includes(b.status) ||
        (b.status === 'pending' && new Date(b.check_in_date) >= new Date())
      );
      setBookings(active);

      if (active.length > 0) {
        setSelectedBooking(active[0]);
        await loadQRCodes(active[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadQRCodes(bookingId: string) {
    const { data } = await supabase
      .from('qr_checkins')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false });

    setQrCodes(prev => ({ ...prev, [bookingId]: data || [] }));
  }

  async function generateQR(bookingId: string, type: 'checkin' | 'checkout') {
    setGenerating(`${bookingId}-${type}`);
    setError('');
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error: qrError } = await supabase
        .from('qr_checkins')
        .insert({
          booking_id: bookingId,
          type,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (qrError) throw qrError;

      setQrCodes(prev => ({
        ...prev,
        [bookingId]: [data, ...(prev[bookingId] || [])],
      }));

      if (type === 'checkin') {
        await updateBookingStatus(bookingId, 'checked_in');
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'checked_in' } : b));
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking((prev: any) => ({ ...prev, status: 'checked_in' }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setGenerating(null);
    }
  }

  const getBookingQRs = (bookingId: string) => qrCodes[bookingId] || [];

  const getActiveQR = (bookingId: string, type: 'checkin' | 'checkout') => {
    const codes = getBookingQRs(bookingId);
    return codes.find(c => c.type === type && !c.used_at && new Date(c.expires_at) > new Date());
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#DC143C]/10 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6 text-[#DC143C]" />
            </div>
            Digital Check-In
          </h1>
          <p className="text-gray-500 mt-2">Generate QR codes for seamless hostel check-in and check-out</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <QrCode className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Bookings</h3>
            <p className="text-gray-500 mb-6">You need a confirmed booking to generate check-in QR codes</p>
            <button
              onClick={() => onNavigate('search')}
              className="px-6 py-3 bg-[#DC143C] text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Find Accommodation
            </button>
          </div>
        ) : (
          <>
            {bookings.length > 1 && (
              <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
                {bookings.map(b => (
                  <button
                    key={b.id}
                    onClick={async () => {
                      setSelectedBooking(b);
                      if (!qrCodes[b.id]) await loadQRCodes(b.id);
                    }}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      selectedBooking?.id === b.id
                        ? 'bg-[#DC143C] text-white border-[#DC143C]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {b.hostels?.name}
                  </button>
                ))}
              </div>
            )}

            {selectedBooking && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedBooking.hostels?.name}</h2>
                      <p className="text-gray-500 text-sm">{selectedBooking.hostels?.location}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${
                      selectedBooking.status === 'checked_in' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      selectedBooking.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {selectedBooking.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">Check-in</p>
                        <p className="text-sm font-semibold">{new Date(selectedBooking.check_in_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-red-600" />
                      <div>
                        <p className="text-xs text-gray-500">Check-out</p>
                        <p className="text-sm font-semibold">{new Date(selectedBooking.check_out_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {(['checkin', 'checkout'] as const).map(type => {
                    const activeQR = getActiveQR(selectedBooking.id, type);
                    const isGenerating = generating === `${selectedBooking.id}-${type}`;
                    const canGenerate = type === 'checkin'
                      ? selectedBooking.status === 'confirmed'
                      : selectedBooking.status === 'checked_in';

                    return (
                      <div key={type} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'checkin' ? 'bg-green-50' : 'bg-red-50'}`}>
                            {type === 'checkin' ? <LogIn className="w-5 h-5 text-green-600" /> : <LogOut className="w-5 h-5 text-red-600" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 capitalize">{type === 'checkin' ? 'Check-In QR' : 'Check-Out QR'}</h3>
                            <p className="text-xs text-gray-500">Show to hostel owner</p>
                          </div>
                        </div>

                        {activeQR ? (
                          <div className="space-y-4">
                            <div className="flex justify-center">
                              <QRCodeDisplay
                                token={activeQR.token}
                                label={type === 'checkin' ? 'Check-In Code' : 'Check-Out Code'}
                                color={type === 'checkin' ? 'bg-green-50' : 'bg-red-50'}
                              />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                              <Clock className="w-3.5 h-3.5" />
                              Expires: {new Date(activeQR.expires_at).toLocaleString()}
                            </div>
                            <button
                              onClick={() => generateQR(selectedBooking.id, type)}
                              disabled={isGenerating}
                              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                              Regenerate
                            </button>
                          </div>
                        ) : activeQR === undefined && getBookingQRs(selectedBooking.id).some(c => c.type === type && c.used_at) ? (
                          <div className="text-center py-6">
                            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-green-700">
                              {type === 'checkin' ? 'Checked In' : 'Checked Out'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">QR code was used</p>
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                              <QrCode className="w-8 h-8 text-gray-300" />
                            </div>
                            {canGenerate ? (
                              <button
                                onClick={() => generateQR(selectedBooking.id, type)}
                                disabled={isGenerating}
                                className={`w-full py-3 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 ${
                                  type === 'checkin'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-[#DC143C] text-white hover:bg-red-700'
                                }`}
                              >
                                {isGenerating ? 'Generating...' : `Generate ${type === 'checkin' ? 'Check-In' : 'Check-Out'} QR`}
                              </button>
                            ) : (
                              <p className="text-sm text-gray-400">
                                {type === 'checkout' ? 'Check in first to generate checkout QR' : 'Booking must be confirmed'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
