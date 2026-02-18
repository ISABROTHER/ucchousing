import { useState, useEffect } from 'react';
import { Wrench, Plus, AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import {
  getStudentMaintenanceRequests,
  createMaintenanceRequest,
  MaintenanceRequest,
  getPriorityColor,
  getStatusColor,
} from '../lib/maintenance';
import { getStudentBookings } from '../lib/bookings';
import { PageType } from '../App';

interface MaintenancePageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType) => void;
}

export default function MaintenancePage({ user, userProfile, onNavigate }: MaintenancePageProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    hostel_id: '',
    booking_id: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    try {
      const [reqData, bookingData] = await Promise.all([
        getStudentMaintenanceRequests(user.id),
        getStudentBookings(user.id),
      ]);
      setRequests(reqData);
      const activeBookings = bookingData.filter(b => ['confirmed', 'checked_in'].includes(b.status));
      setBookings(activeBookings);
      if (activeBookings.length > 0) {
        setForm(prev => ({
          ...prev,
          hostel_id: activeBookings[0].hostel_id,
          booking_id: activeBookings[0].id,
        }));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.hostel_id) {
      setError('Please select a booking');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const newReq = await createMaintenanceRequest({
        hostel_id: form.hostel_id,
        student_id: user.id,
        booking_id: form.booking_id || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
      setRequests(prev => [{ ...newReq, hostels: bookings.find(b => b.id === form.booking_id)?.hostels } as any, ...prev]);
      setShowForm(false);
      setSuccess('Maintenance request submitted successfully!');
      setForm(prev => ({ ...prev, title: '', description: '', priority: 'medium' }));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-amber-600" />;
      case 'open': return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-orange-600" />
              </div>
              Maintenance
            </h1>
            <p className="text-gray-500 mt-2">Report and track maintenance issues</p>
          </div>
          {!showForm && bookings.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#DC143C] text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
          )}
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700 text-sm font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Submit Maintenance Request</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Booking</label>
                <select
                  value={form.booking_id}
                  onChange={e => {
                    const booking = bookings.find(b => b.id === e.target.value);
                    setForm(prev => ({
                      ...prev,
                      booking_id: e.target.value,
                      hostel_id: booking?.hostel_id || '',
                    }));
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] text-sm"
                  required
                >
                  <option value="">-- Select booking --</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>{b.hostels?.name} ({b.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Broken shower head, No hot water"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] text-sm"
                  maxLength={200}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] text-sm resize-none"
                  maxLength={2000}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                      className={`py-2 rounded-xl text-sm font-semibold border capitalize transition-colors ${
                        form.priority === p
                          ? getPriorityColor(p)
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#DC143C] text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {bookings.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center mb-8">
            <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Bookings</h3>
            <p className="text-gray-500 mb-4">You need an active booking to submit maintenance requests</p>
            <button onClick={() => onNavigate('search')} className="px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm">
              Find Accommodation
            </button>
          </div>
        )}

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <CheckCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No maintenance requests yet</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{req.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{req.hostels?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${getPriorityColor(req.priority)}`}>
                      {req.priority}
                    </span>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize flex items-center gap-1.5 ${getStatusColor(req.status)}`}>
                      {getStatusIcon(req.status)}
                      {req.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{req.description}</p>
                {req.owner_notes && (
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Owner Response</p>
                    <p className="text-sm text-blue-600">{req.owner_notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    Submitted {new Date(req.created_at).toLocaleDateString()}
                  </p>
                  {req.resolved_at && (
                    <p className="text-xs text-green-600">
                      Resolved {new Date(req.resolved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
