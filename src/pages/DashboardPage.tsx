import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Home, AlertCircle, BarChart3, Calendar, Wrench, MessageSquare, Send } from 'lucide-react';
import { PageType } from '../App';
import { getHostelsByOwner, createHostel, updateHostel, deleteHostel } from '../lib/hostels';
import { getHostelBookings } from '../lib/bookings';
import { getConversations, sendMessage } from '../lib/messaging';
import OwnerAnalytics from './dashboard/OwnerAnalytics';
import OwnerBookings from './dashboard/OwnerBookings';
import OwnerMaintenance from './dashboard/OwnerMaintenance';

interface DashboardPageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type Tab = 'analytics' | 'hostels' | 'bookings' | 'maintenance' | 'messages';

export default function DashboardPage({ user, userProfile, onNavigate }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [hostels, setHostels] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '', description: '', location: '', city: '', country: '',
    price_per_night: '', room_type: 'dorm' as 'dorm' | 'private' | 'mixed', beds_available: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const hostelData = await getHostelsByOwner(user.id);
      setHostels(hostelData);

      let allBookings: any[] = [];
      for (const hostel of hostelData) {
        const bookingData = await getHostelBookings(hostel.id);
        allBookings = [...allBookings, ...bookingData];
      }
      setBookings(allBookings);

      const convos = await getConversations(user.id);
      setConversations(convos);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', location: '', city: '', country: '', price_per_night: '', room_type: 'dorm', beds_available: '' });
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
        if (newHostel) setHostels([...hostels, newHostel]);
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
      name: hostel.name, description: hostel.description || '', location: hostel.location,
      city: hostel.city, country: hostel.country,
      price_per_night: hostel.price_per_night.toString(), room_type: hostel.room_type,
      beds_available: hostel.beds_available.toString(),
    });
    setEditingId(hostel.id);
    setShowForm(true);
    setActiveTab('hostels');
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

  const handleBookingUpdate = (bookingId: string, status: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
  };

  const handleBulkMessage = async () => {
    if (!bulkMessage.trim() || conversations.length === 0) return;
    setSendingBulk(true);
    try {
      for (const convo of conversations) {
        await sendMessage(convo.id, user.id, bulkMessage.trim());
      }
      setBulkMessage('');
      setBulkSuccess(`Message sent to ${conversations.length} tenant${conversations.length !== 1 ? 's' : ''}!`);
      setTimeout(() => setBulkSuccess(''), 4000);
    } finally {
      setSendingBulk(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'hostels', label: 'Properties', icon: Home, badge: hostels.length },
    { id: 'bookings', label: 'Bookings', icon: Calendar, badge: bookings.filter(b => b.status === 'pending').length || undefined },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: conversations.length || undefined },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Owner'}
            </p>
          </div>
          {activeTab === 'hostels' && !showForm && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#DC143C] text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Property
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowForm(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-colors relative ${
                activeTab === tab.id ? 'bg-[#DC143C] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-100 text-[#DC143C]'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <OwnerAnalytics hostels={hostels} bookings={bookings} />
        )}

        {activeTab === 'hostels' && (
          <div>
            {showForm && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {editingId ? 'Edit Property' : 'Add New Property'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'name', label: 'Hostel Name', type: 'text' },
                      { key: 'location', label: 'Location/Address', type: 'text' },
                      { key: 'city', label: 'City', type: 'text' },
                      { key: 'country', label: 'Country', type: 'text' },
                      { key: 'price_per_night', label: 'Price Per Semester (GHS)', type: 'number' },
                      { key: 'beds_available', label: 'Beds Available', type: 'number' },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.label} *</label>
                        <input
                          type={field.type}
                          value={(formData as any)[field.key]}
                          onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] text-sm"
                          required
                          step={field.key === 'price_per_night' ? '0.01' : undefined}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Room Type *</label>
                      <select
                        value={formData.room_type}
                        onChange={e => setFormData(prev => ({ ...prev, room_type: e.target.value as any }))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] text-sm"
                      >
                        <option value="dorm">Dorm</option>
                        <option value="private">Private</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={submitting} className="flex-1 bg-[#DC143C] text-white font-semibold py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {submitting ? 'Saving...' : editingId ? 'Update Property' : 'Add Property'}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {hostels.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Home className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Properties Yet</h3>
                <p className="text-gray-500 mb-4">Add your first property to start receiving bookings</p>
                <button onClick={() => setShowForm(true)} className="px-6 py-2.5 bg-[#DC143C] text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm">
                  Add Property
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hostels.map(hostel => (
                  <div key={hostel.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{hostel.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{hostel.city}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <button onClick={() => handleEdit(hostel)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(hostel.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-[#DC143C]">GHS {hostel.price_per_night?.toLocaleString()}</span>
                      <span className="text-gray-500">{hostel.beds_available} beds</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg capitalize">{hostel.room_type}</span>
                      <button onClick={() => onNavigate('detail', hostel.id)} className="text-xs text-[#DC143C] font-semibold hover:underline">
                        View listing
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <OwnerBookings bookings={bookings} onBookingUpdate={handleBookingUpdate} />
        )}

        {activeTab === 'maintenance' && (
          <OwnerMaintenance userId={user.id} />
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Bulk Message</h2>
              <p className="text-sm text-gray-500 mb-4">Send a message to all tenants with active conversations ({conversations.length} total)</p>

              {bulkSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
                  {bulkSuccess}
                </div>
              )}

              <div className="flex gap-3">
                <textarea
                  value={bulkMessage}
                  onChange={e => setBulkMessage(e.target.value)}
                  placeholder="Type your announcement or message..."
                  rows={3}
                  maxLength={2000}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                />
                <button
                  onClick={handleBulkMessage}
                  disabled={!bulkMessage.trim() || sendingBulk || conversations.length === 0}
                  className="px-5 bg-[#DC143C] text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex-shrink-0 flex flex-col items-center justify-center gap-1"
                >
                  <Send className="w-5 h-5" />
                  <span className="text-xs font-semibold">{sendingBulk ? 'Sending' : 'Send'}</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">All Conversations</h3>
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(convo => (
                    <button
                      key={convo.id}
                      onClick={() => onNavigate('messages')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {convo.student?.full_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{convo.student?.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{convo.hostels?.name}</p>
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(convo.last_message_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
