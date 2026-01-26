import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, BarChart3, Home, AlertCircle } from 'lucide-react';
import { PageType } from '../App';
import { getHostelsByOwner, createHostel, updateHostel, deleteHostel } from '../lib/hostels';
import { getHostelBookings } from '../lib/bookings';

interface DashboardPageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function DashboardPage({
  user,
  userProfile,
  onNavigate,
}: DashboardPageProps) {
  const [hostels, setHostels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    city: '',
    country: '',
    price_per_night: '',
    room_type: 'dorm' as 'dorm' | 'private' | 'mixed',
    beds_available: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const hostelData = await getHostelsByOwner(user.id);
      setHostels(hostelData);

      let allBookings = [];
      for (const hostel of hostelData) {
        const bookingData = await getHostelBookings(hostel.id);
        allBookings = [...allBookings, ...bookingData];
      }
      setBookings(allBookings);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      city: '',
      country: '',
      price_per_night: '',
      room_type: 'dorm',
      beds_available: '',
    });
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        owner_id: user.id,
        price_per_night: parseFloat(formData.price_per_night),
        beds_available: parseInt(formData.beds_available),
      };

      if (editingId) {
        await updateHostel(editingId, data);
        setHostels(hostels.map(h => h.id === editingId ? { ...h, ...data } : h));
      } else {
        const newHostel = await createHostel(data);
        if (newHostel) {
          setHostels([...hostels, newHostel]);
        }
      }

      setShowForm(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save hostel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (hostel: any) => {
    setFormData({
      name: hostel.name,
      description: hostel.description,
      location: hostel.location,
      city: hostel.city,
      country: hostel.country,
      price_per_night: hostel.price_per_night.toString(),
      room_type: hostel.room_type,
      beds_available: hostel.beds_available.toString(),
    });
    setEditingId(hostel.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hostel?')) return;

    try {
      await deleteHostel(id);
      setHostels(hostels.filter(h => h.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete hostel');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black flex items-center gap-2">
              <Home className="w-8 h-8 text-[#DC143C]" />
              Owner Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Manage your hostels and bookings</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#DC143C] text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Hostel
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-6">
              {editingId ? 'Edit Hostel' : 'Create New Hostel'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hostel Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location/Address *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price Per Night ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_per_night}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_night: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Beds Available *
                  </label>
                  <input
                    type="number"
                    value={formData.beds_available}
                    onChange={(e) =>
                      setFormData({ ...formData, beds_available: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Room Type *
                  </label>
                  <select
                    value={formData.room_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        room_type: e.target.value as 'dorm' | 'private' | 'mixed',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                  >
                    <option value="dorm">Dorm</option>
                    <option value="private">Private</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC143C] text-white font-semibold py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Hostel' : 'Create Hostel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Hostels</p>
                <p className="text-3xl font-bold text-black">{hostels.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Bookings</p>
                <p className="text-3xl font-bold text-black">{bookings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Confirmed Bookings</p>
                <p className="text-3xl font-bold text-black">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-black">Your Hostels</h2>
          </div>

          {hostels.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rooms</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hostels.map((hostel) => (
                    <tr key={hostel.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{hostel.name}</td>
                      <td className="px-6 py-4 text-gray-600">{hostel.city}</td>
                      <td className="px-6 py-4 font-semibold text-[#DC143C]">
                        ${hostel.price_per_night}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{hostel.beds_available}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(hostel)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(hostel.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-black mb-2">No Hostels Yet</h3>
              <p className="text-gray-600">Add your first hostel to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
