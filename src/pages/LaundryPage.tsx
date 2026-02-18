import { useState, useEffect } from 'react';
import {
  Shirt, Plus, Star, MapPin, Phone, Clock, CheckCircle,
  Package, Truck, AlertCircle, X, ChevronRight, RefreshCw
} from 'lucide-react';
import {
  getLaundryProviders, getStudentLaundryOrders, createLaundryOrder,
  cancelLaundryOrder, getLaundryOrderWithTracking,
  LaundryProvider, LaundryOrder, LAUNDRY_STATUS_STEPS, getStatusColor, getStatusIndex
} from '../lib/laundry';
import { PageType } from '../App';

interface LaundryPageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType) => void;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  confirmed: CheckCircle,
  picked_up: Package,
  washing: RefreshCw,
  out_for_delivery: Truck,
  delivered: CheckCircle,
};

function TrackingTimeline({ order }: { order: LaundryOrder }) {
  const currentIdx = getStatusIndex(order.status as any);
  const steps = LAUNDRY_STATUS_STEPS.filter(s => s.status !== 'cancelled');

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = STATUS_ICONS[step.status] || Clock;

        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                isCompleted ? 'bg-green-500 border-green-500' :
                isCurrent ? 'bg-[#DC143C] border-[#DC143C]' :
                'bg-white border-gray-200'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-gray-300'}`} />
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-0.5 h-8 ${idx < currentIdx ? 'bg-green-400' : 'bg-gray-100'}`} />
              )}
            </div>
            <div className="pb-6 pt-1 flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isCurrent ? 'text-[#DC143C]' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                {step.label}
              </p>
              {(isCurrent || isCompleted) && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.message}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LaundryPage({ user, userProfile, onNavigate }: LaundryPageProps) {
  const [tab, setTab] = useState<'providers' | 'orders'>('providers');
  const [providers, setProviders] = useState<LaundryProvider[]>([]);
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<LaundryProvider | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<LaundryOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    pickup_address: '',
    delivery_address: '',
    estimated_weight_kg: 2,
    pickup_scheduled_at: '',
    special_instructions: '',
  });

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    try {
      const [prov, ord] = await Promise.all([
        getLaundryProviders(),
        getStudentLaundryOrders(user.id),
      ]);
      setProviders(prov);
      setOrders(ord);
    } finally {
      setLoading(false);
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProvider) return;
    setError('');
    setSubmitting(true);
    try {
      const price = (form.estimated_weight_kg * selectedProvider.price_per_kg) + selectedProvider.delivery_fee;
      const order = await createLaundryOrder({
        student_id: user.id,
        provider_id: selectedProvider.id,
        pickup_address: form.pickup_address.trim(),
        delivery_address: form.delivery_address.trim(),
        estimated_weight_kg: form.estimated_weight_kg,
        pickup_scheduled_at: form.pickup_scheduled_at || undefined,
        special_instructions: form.special_instructions.trim() || undefined,
        total_price: price,
      });
      setOrders(prev => [order, ...prev]);
      setShowForm(false);
      setSelectedProvider(null);
      setForm({ pickup_address: '', delivery_address: '', estimated_weight_kg: 2, pickup_scheduled_at: '', special_instructions: '' });
      setSuccess('Laundry order placed! You\'ll receive updates as your order progresses.');
      setTab('orders');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(orderId: string) {
    if (!confirm('Cancel this laundry order?')) return;
    await cancelLaundryOrder(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as any } : o));
  }

  async function handleTrack(orderId: string) {
    const full = await getLaundryOrderWithTracking(orderId);
    setTrackingOrder(full);
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shirt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to use Laundry Hub</h3>
          <button onClick={() => onNavigate('auth')} className="px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-xl">Sign In</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
              <Shirt className="w-6 h-6 text-sky-600" />
            </div>
            Smart Laundry Hub
          </h1>
          <p className="text-gray-500 mt-2">On-demand laundry pickup, washing & delivery — right to your hostel</p>
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

        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 mb-6">
          {(['providers', 'orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize ${tab === t ? 'bg-[#DC143C] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t === 'providers' ? 'Book Service' : `My Orders${orders.filter(o => !['delivered','cancelled'].includes(o.status)).length > 0 ? ` (${orders.filter(o => !['delivered','cancelled'].includes(o.status)).length} active)` : ''}`}
            </button>
          ))}
        </div>

        {tab === 'providers' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Select a provider to book your laundry service:</p>
            {providers.map(provider => {
              const estimatedPrice = (form.estimated_weight_kg * provider.price_per_kg) + provider.delivery_fee;
              return (
                <div key={provider.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{provider.name}</h3>
                        {provider.rating > 0 && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-amber-500" />
                            {provider.rating.toFixed(1)} ({provider.review_count})
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {provider.location}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-gray-400">Per kg</p>
                          <p className="text-sm font-bold text-gray-900">GHS {provider.price_per_kg}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-gray-400">Delivery</p>
                          <p className="text-sm font-bold text-gray-900">{provider.delivery_fee > 0 ? `GHS ${provider.delivery_fee}` : 'Free'}</p>
                        </div>
                        <div className="bg-sky-50 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-sky-500">~2kg total</p>
                          <p className="text-sm font-bold text-sky-700">GHS {(2 * provider.price_per_kg + provider.delivery_fee).toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end flex-shrink-0">
                      {provider.phone && (
                        <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                          <Phone className="w-3.5 h-3.5" />
                          {provider.phone}
                        </a>
                      )}
                      <button
                        onClick={() => { setSelectedProvider(provider); setShowForm(true); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#DC143C] text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors"
                      >
                        Book <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Shirt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">No laundry orders yet</p>
                <button onClick={() => setTab('providers')} className="mt-4 px-5 py-2.5 bg-[#DC143C] text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors">
                  Book a Service
                </button>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{order.laundry_providers?.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${getStatusColor(order.status as any)}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Pickup</p>
                      <p className="text-gray-700 font-medium truncate">{order.pickup_address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Delivery</p>
                      <p className="text-gray-700 font-medium truncate">{order.delivery_address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Weight</p>
                      <p className="text-gray-700 font-medium">{order.estimated_weight_kg} kg</p>
                    </div>
                    {order.total_price && (
                      <div>
                        <p className="text-xs text-gray-400">Total</p>
                        <p className="font-bold text-emerald-600">GHS {order.total_price.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-50">
                    {!['delivered', 'cancelled'].includes(order.status) && (
                      <button onClick={() => handleTrack(order.id)}
                        className="flex-1 py-2 text-sm font-semibold border border-sky-200 text-sky-600 rounded-xl hover:bg-sky-50 transition-colors">
                        Track Order
                      </button>
                    )}
                    {['pending', 'confirmed'].includes(order.status) && (
                      <button onClick={() => handleCancel(order.id)}
                        className="px-4 py-2 text-sm font-semibold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showForm && selectedProvider && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Book Laundry Service</h2>
                <p className="text-sm text-gray-500">{selectedProvider.name}</p>
              </div>
              <button onClick={() => { setShowForm(false); setSelectedProvider(null); }} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleBook} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pickup Address *</label>
                <input type="text" value={form.pickup_address} onChange={e => setForm(p => ({ ...p, pickup_address: e.target.value }))}
                  placeholder="e.g. Room 12B, Valco Hall, UCC" required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Address *</label>
                <input type="text" value={form.delivery_address} onChange={e => setForm(p => ({ ...p, delivery_address: e.target.value }))}
                  placeholder="Same as pickup or different" required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estimated Weight (kg) *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 7, 10].map(w => (
                    <button key={w} type="button" onClick={() => setForm(p => ({ ...p, estimated_weight_kg: w }))}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${form.estimated_weight_kg === w ? 'bg-[#DC143C] text-white border-[#DC143C]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {w}kg
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Schedule Pickup</label>
                <input type="datetime-local" value={form.pickup_scheduled_at} onChange={e => setForm(p => ({ ...p, pickup_scheduled_at: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Special Instructions</label>
                <textarea value={form.special_instructions} onChange={e => setForm(p => ({ ...p, special_instructions: e.target.value }))}
                  placeholder="e.g. Separate whites, handle delicates gently..." rows={2} maxLength={500}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]" />
              </div>
              <div className="bg-sky-50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Washing ({form.estimated_weight_kg}kg × GHS {selectedProvider.price_per_kg})</span>
                  <span className="font-semibold">GHS {(form.estimated_weight_kg * selectedProvider.price_per_kg).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Delivery fee</span>
                  <span className="font-semibold">{selectedProvider.delivery_fee > 0 ? `GHS ${selectedProvider.delivery_fee}` : 'Free'}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-sky-100 pt-2">
                  <span>Total</span>
                  <span className="text-sky-700">GHS {(form.estimated_weight_kg * selectedProvider.price_per_kg + selectedProvider.delivery_fee).toFixed(2)}</span>
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-[#DC143C] text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                {submitting ? 'Placing Order...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      {trackingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Track Order</h2>
                <p className="text-sm text-gray-500">{trackingOrder.laundry_providers?.name}</p>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-500">Weight</span>
                  <span className="font-semibold">{trackingOrder.estimated_weight_kg} kg</span>
                </div>
                {trackingOrder.total_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total</span>
                    <span className="font-bold text-emerald-600">GHS {trackingOrder.total_price.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <TrackingTimeline order={trackingOrder} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
