import { useState, useEffect } from 'react';
import {
  Shirt, Plus, Star, MapPin, Phone, Clock, CheckCircle,
  Package, Truck, AlertCircle, X, ChevronRight, Zap,
  Wallet, Crown, Gift, User, Settings, Leaf, Users,
  Shield, Camera, ThumbsUp, Flag, RefreshCw
} from 'lucide-react';
import {
  LaundryProvider, LaundryOrder, LaundryWallet, LaundrySubscription,
  LaundryPreferences, LAUNDRY_STATUS_STEPS, SUBSCRIPTION_PLANS,
  getLaundryProviders, getStudentLaundryOrders, createLaundryOrder,
  cancelLaundryOrder, getStatusColor, getStatusIndex,
  confirmDeliveryReceived, confirmHandedOver, submitRating, reportIssue,
  getOrCreateWallet, topUpWallet, getWalletTransactions,
  getPreferences, savePreferences,
  getActiveSubscription, purchaseSubscription,
} from '../lib/laundry';
import { PageType } from '../App';

interface LaundryPageProps {
  user: { id: string; email: string } | null;
  userProfile: { full_name: string } | null;
  onNavigate: (page: PageType) => void;
}

type Tab = 'book' | 'orders' | 'wallet' | 'pass' | 'preferences';

export default function LaundryPage({ user, userProfile, onNavigate }: LaundryPageProps) {
  const [tab, setTab] = useState<Tab>('book');
  const [providers, setProviders] = useState<LaundryProvider[]>([]);
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [wallet, setWallet] = useState<LaundryWallet | null>(null);
  const [subscription, setSubscription] = useState<LaundrySubscription | null>(null);
  const [preferences, setPreferences] = useState<LaundryPreferences | null>(null);
  const [walletTxns, setWalletTxns] = useState<{ type: string; amount: number; description: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<LaundryProvider | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<LaundryOrder | null>(null);
  const [ratingOrder, setRatingOrder] = useState<LaundryOrder | null>(null);
  const [reportingOrder, setReportingOrder] = useState<LaundryOrder | null>(null);

  const [form, setForm] = useState({
    weight: 3,
    pickup_address: '',
    delivery_address: '',
    special_instructions: '',
    is_express: false,
    eco_wash: false,
    delivery_type: 'door' as 'door' | 'drop_point',
    drop_point: '',
    payment_method: 'paystack' as 'paystack' | 'wallet' | 'subscription',
  });

  const [prefForm, setPrefForm] = useState({
    detergent_type: 'standard',
    fabric_care_notes: '',
    wash_temperature: 'warm',
    fold_preference: 'fold',
    iron_preference: false,
    special_instructions: '',
  });

  const [topUpAmount, setTopUpAmount] = useState(50);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [reportType, setReportType] = useState<'missing_item' | 'damaged' | 'wrong_delivery' | 'late' | 'other'>('missing_item');
  const [reportDesc, setReportDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadAll();
    else setLoading(false);
  }, [user]);

  async function loadAll() {
    setLoading(true);
    const [provs, ords] = await Promise.all([
      getLaundryProviders(),
      user ? getStudentLaundryOrders(user.id) : Promise.resolve([]),
    ]);
    setProviders(provs);
    setOrders(ords);
    if (user) {
      const [w, sub, prefs, txns] = await Promise.all([
        getOrCreateWallet(user.id),
        getActiveSubscription(user.id),
        getPreferences(user.id),
        getWalletTransactions(user.id),
      ]);
      setWallet(w);
      setSubscription(sub);
      setPreferences(prefs);
      setWalletTxns(txns);
      if (prefs) {
        setPrefForm({
          detergent_type: prefs.detergent_type,
          fabric_care_notes: prefs.fabric_care_notes,
          wash_temperature: prefs.wash_temperature,
          fold_preference: prefs.fold_preference,
          iron_preference: prefs.iron_preference,
          special_instructions: prefs.special_instructions,
        });
      }
    }
    setLoading(false);
  }

  function calcPrice(provider: LaundryProvider, weight: number, isExpress: boolean) {
    const base = provider.price_per_kg * weight + provider.delivery_fee;
    return isExpress ? base * 1.5 : base;
  }

  async function handleBook() {
    if (!selectedProvider || !user) return;
    setSaving(true);
    try {
      const price = calcPrice(selectedProvider, form.weight, form.is_express);
      await createLaundryOrder({
        student_id: user.id,
        provider_id: selectedProvider.id,
        pickup_address: form.pickup_address,
        delivery_address: form.delivery_type === 'door' ? form.delivery_address : form.drop_point,
        estimated_weight_kg: form.weight,
        special_instructions: form.special_instructions,
        total_price: price,
        is_express: form.is_express,
        eco_wash: form.eco_wash,
        delivery_type: form.delivery_type,
        drop_point: form.delivery_type === 'drop_point' ? form.drop_point : undefined,
        payment_method: form.payment_method,
      });
      setShowBooking(false);
      setSelectedProvider(null);
      setTab('orders');
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmReceived(order: LaundryOrder) {
    if (!user) return;
    await confirmDeliveryReceived(order.id, user.id);
    await loadAll();
    setTrackingOrder(null);
    setRatingOrder(order);
  }

  async function handleConfirmHandedOver(order: LaundryOrder) {
    if (!user) return;
    await confirmHandedOver(order.id, user.id);
    await loadAll();
  }

  async function handleSubmitRating() {
    if (!ratingOrder || !user) return;
    await submitRating({ order_id: ratingOrder.id, student_id: user.id, provider_id: ratingOrder.provider_id, stars: ratingStars, comment: ratingComment });
    setRatingOrder(null);
    setRatingComment('');
    setRatingStars(5);
    await loadAll();
  }

  async function handleReportIssue() {
    if (!reportingOrder) return;
    await reportIssue({ order_id: reportingOrder.id, issue_type: reportType, description: reportDesc });
    setReportingOrder(null);
    setReportDesc('');
    await loadAll();
  }

  async function handleTopUp() {
    if (!user) return;
    await topUpWallet(user.id, topUpAmount, `WALLET-${Date.now()}`);
    await loadAll();
  }

  async function handleBuyPass(planId: string) {
    if (!user) return;
    await purchaseSubscription(user.id, planId);
    await loadAll();
  }

  async function handleSavePrefs() {
    if (!user) return;
    setSaving(true);
    await savePreferences(user.id, prefForm);
    await loadAll();
    setSaving(false);
  }

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'book', label: 'Book', icon: Shirt },
    { key: 'orders', label: 'Orders', icon: Package, badge: activeOrders.length },
    { key: 'wallet', label: 'Wallet', icon: Wallet },
    { key: 'pass', label: 'Pass', icon: Crown },
    { key: 'preferences', label: 'Prefs', icon: Settings },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <Shirt className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Laundry Hub</h2>
          <p className="mt-2 text-sm text-gray-500">Sign in to book laundry services and track your orders.</p>
          <button onClick={() => onNavigate('auth')} className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="bg-white border-b border-gray-100 px-4 py-5 sticky top-16 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Laundry Hub</h1>
              <p className="text-xs text-gray-500">Trusted on-demand laundry service</p>
            </div>
            <div className="flex items-center gap-2">
              {subscription && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  <Crown className="h-3 w-3" />
                  Pass Active
                </span>
              )}
              <div className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
                GHS {wallet ? Number(wallet.balance).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
          {activeOrders.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              {activeOrders.length} active order{activeOrders.length > 1 ? 's' : ''} in progress
              <button onClick={() => setTab('orders')} className="ml-auto font-semibold underline">View</button>
            </div>
          )}
        </div>

        <div className="flex border-b border-gray-100 bg-white overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`relative flex flex-1 shrink-0 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium transition-colors ${
                  tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                {t.badge && t.badge > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{t.badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="p-4 space-y-4">
          {tab === 'book' && (
            <>
              {subscription && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-3">
                  <Crown className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold text-amber-800 text-sm">{SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_name)?.name || 'Laundry Pass'}</p>
                    <p className="text-xs text-amber-600">{subscription.washes_total - subscription.washes_used} washes remaining • Expires {new Date(subscription.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-700">
                <Shield className="h-4 w-4 inline mr-1.5 mb-0.5" />
                Your payment is securely held in escrow and only released after your laundry is delivered.
              </div>
              {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />)}</div>
              ) : providers.map(p => (
                <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{p.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(p.rating).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">GHS {p.price_per_kg}/kg</span>
                        <span className="text-xs text-gray-400">+GHS {p.delivery_fee} delivery</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedProvider(p); setShowBooking(true); }}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />Book
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'orders' && (
            <>
              {activeOrders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Active Orders</p>
                  <div className="space-y-3">
                    {activeOrders.map(order => (
                      <OrderCard key={order.id} order={order} onTrack={() => setTrackingOrder(order)}
                        onHandedOver={() => handleConfirmHandedOver(order)}
                        onReport={() => setReportingOrder(order)}
                        userId={user.id}
                      />
                    ))}
                  </div>
                </div>
              )}
              {pastOrders.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">Past Orders</p>
                  <div className="space-y-3">
                    {pastOrders.map(order => (
                      <OrderCard key={order.id} order={order} onTrack={() => setTrackingOrder(order)}
                        onRate={order.status === 'delivered' && !order.rating ? () => setRatingOrder(order) : undefined}
                        onReport={() => setReportingOrder(order)}
                        userId={user.id}
                      />
                    ))}
                  </div>
                </div>
              )}
              {orders.length === 0 && !loading && (
                <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">No orders yet</p>
                  <button onClick={() => setTab('book')} className="mt-3 text-xs font-semibold text-blue-600">Book your first laundry</button>
                </div>
              )}
            </>
          )}

          {tab === 'wallet' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
                <p className="text-sm opacity-80">Laundry Wallet Balance</p>
                <p className="text-4xl font-bold mt-1">GHS {wallet ? Number(wallet.balance).toFixed(2) : '0.00'}</p>
                <p className="text-xs opacity-60 mt-1">Total topped up: GHS {wallet ? Number(wallet.total_topped_up).toFixed(2) : '0.00'}</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="font-semibold text-gray-900 text-sm mb-3">Top Up Wallet</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[20, 50, 100, 200].map(amt => (
                    <button key={amt} onClick={() => setTopUpAmount(amt)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold border transition-colors ${topUpAmount === amt ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}
                    >
                      GHS {amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none mb-3"
                  placeholder="Custom amount"
                  min={10}
                />
                <button onClick={handleTopUp} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
                  Top Up GHS {topUpAmount}
                </button>
              </div>

              {walletTxns.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="font-semibold text-gray-900 text-sm mb-3">Transaction History</p>
                  <div className="space-y-2">
                    {walletTxns.map((t, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">{t.type}</p>
                          <p className="text-xs text-gray-400">{t.description} • {new Date(t.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`font-bold text-sm ${t.type === 'topup' || t.type === 'refund' || t.type === 'reward' ? 'text-green-600' : 'text-red-500'}`}>
                          {t.type === 'topup' || t.type === 'refund' || t.type === 'reward' ? '+' : '-'}GHS {Number(t.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'pass' && (
            <div className="space-y-4">
              {subscription ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Crown className="h-6 w-6 text-amber-600" />
                    <div>
                      <p className="font-bold text-amber-900">{SUBSCRIPTION_PLANS.find(p => p.id === subscription.plan_name)?.name || 'Active Pass'}</p>
                      <p className="text-xs text-amber-600">Expires {new Date(subscription.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-full bg-amber-200 h-2">
                      <div
                        className="rounded-full bg-amber-600 h-2 transition-all"
                        style={{ width: `${((subscription.washes_used / subscription.washes_total) * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-800">{subscription.washes_used}/{subscription.washes_total} used</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 text-center">
                  No active pass. Subscribe for discounted laundry.
                </div>
              )}

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Plans</p>
              {SUBSCRIPTION_PLANS.map(plan => (
                <div key={plan.id} className={`rounded-2xl border p-4 ${plan.popular ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white'} shadow-sm`}>
                  {plan.popular && (
                    <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Star className="h-2.5 w-2.5" /> Most Popular
                    </span>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{plan.period} days validity</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">GHS {plan.price}</p>
                      <p className="text-[10px] text-gray-400">GHS {(plan.price / plan.washes).toFixed(0)}/wash</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBuyPass(plan.id)}
                    disabled={subscription?.plan_name === plan.id}
                    className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold transition-colors ${
                      subscription?.plan_name === plan.id
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {subscription?.plan_name === plan.id ? 'Active' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'preferences' && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
              <p className="font-bold text-gray-900">Laundry Preferences</p>
              <p className="text-xs text-gray-500">Saved with every order so riders know exactly how to treat your clothes.</p>

              {[
                { label: 'Detergent Type', field: 'detergent_type', options: ['standard', 'gentle', 'hypoallergenic', 'eco'] },
                { label: 'Wash Temperature', field: 'wash_temperature', options: ['cold', 'warm', 'hot'] },
                { label: 'Fold Preference', field: 'fold_preference', options: ['fold', 'hang', 'roll'] },
              ].map(({ label, field, options }) => (
                <div key={field}>
                  <p className="text-xs font-semibold text-gray-700 mb-1.5">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => (
                      <button key={opt} onClick={() => setPrefForm(p => ({ ...p, [field]: opt }))}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                          (prefForm as Record<string, unknown>)[field] === opt ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Iron / Press Clothes</p>
                  <p className="text-[11px] text-gray-400">Extra fee may apply</p>
                </div>
                <button
                  onClick={() => setPrefForm(p => ({ ...p, iron_preference: !p.iron_preference }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${prefForm.iron_preference ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefForm.iron_preference ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">Fabric Care Notes</p>
                <textarea
                  value={prefForm.fabric_care_notes}
                  onChange={e => setPrefForm(p => ({ ...p, fabric_care_notes: e.target.value }))}
                  rows={2}
                  placeholder="e.g. My white shirts are delicate, handle with care"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">Default Instructions</p>
                <textarea
                  value={prefForm.special_instructions}
                  onChange={e => setPrefForm(p => ({ ...p, special_instructions: e.target.value }))}
                  rows={2}
                  placeholder="Anything riders should know about your laundry"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleSavePrefs}
                disabled={saving}
                className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showBooking && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Book {selectedProvider.name}</h3>
                <p className="text-xs text-gray-500">GHS {selectedProvider.price_per_kg}/kg + GHS {selectedProvider.delivery_fee} delivery</p>
              </div>
              <button onClick={() => setShowBooking(false)} className="rounded-xl p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Estimated Weight (kg)</label>
                <div className="mt-1.5 flex items-center gap-3">
                  {[1, 2, 3, 5, 8, 10].map(w => (
                    <button key={w} onClick={() => setForm(f => ({ ...f, weight: w }))}
                      className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${form.weight === w ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700'}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Pickup Address</label>
                  <input value={form.pickup_address} onChange={e => setForm(f => ({ ...f, pickup_address: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Room / hall name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Delivery</label>
                  <div className="mt-1 flex gap-2">
                    {(['door', 'drop_point'] as const).map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, delivery_type: t }))}
                        className={`flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition-colors ${form.delivery_type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700'}`}
                      >
                        {t === 'door' ? 'Door' : 'Drop Point'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {form.delivery_type === 'door' ? (
                <div>
                  <label className="text-xs font-semibold text-gray-700">Delivery Address</label>
                  <input value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Room / door number" />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-gray-700">Drop Point (e.g. Porter / Security)</label>
                  <input value={form.drop_point} onChange={e => setForm(f => ({ ...f, drop_point: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="e.g. Casford Hall Porter" />
                </div>
              )}

              <div className="flex gap-3">
                <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${form.is_express ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={form.is_express} onChange={e => setForm(f => ({ ...f, is_express: e.target.checked }))} className="sr-only" />
                  <Zap className={`h-4 w-4 ${form.is_express ? 'text-orange-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Express</p>
                    <p className="text-[10px] text-gray-500">Same-day +50%</p>
                  </div>
                </label>
                <label className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors ${form.eco_wash ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={form.eco_wash} onChange={e => setForm(f => ({ ...f, eco_wash: e.target.checked }))} className="sr-only" />
                  <Leaf className={`h-4 w-4 ${form.eco_wash ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Eco Wash</p>
                    <p className="text-[10px] text-gray-500">Energy-efficient</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Payment Method</label>
                <div className="mt-1.5 flex gap-2">
                  {(['paystack', 'wallet', ...(subscription ? ['subscription'] : [])] as const).map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, payment_method: m as 'paystack' | 'wallet' | 'subscription' }))}
                      className={`flex-1 rounded-lg border py-2 text-xs font-semibold capitalize transition-colors ${form.payment_method === m ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600'}`}
                    >
                      {m === 'wallet' ? `Wallet (GHS ${Number(wallet?.balance || 0).toFixed(2)})` : m === 'subscription' ? 'Pass' : 'Paystack'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Special Instructions</label>
                <textarea value={form.special_instructions} onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))}
                  rows={2} placeholder={preferences?.special_instructions || 'Any special care instructions...'}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
              </div>

              <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-700">
                <Shield className="h-4 w-4 inline mr-1 mb-0.5" />
                GHS {calcPrice(selectedProvider, form.weight, form.is_express).toFixed(2)} will be held in escrow and released only after delivery confirmation.
              </div>

              <button onClick={handleBook} disabled={saving || !form.pickup_address}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Placing Order...' : `Book — GHS ${calcPrice(selectedProvider, form.weight, form.is_express).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {trackingOrder && (
        <TrackingModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
          onConfirmReceived={() => handleConfirmReceived(trackingOrder)}
          userId={user.id}
        />
      )}

      {ratingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Rate Your Service</h3>
              <button onClick={() => setRatingOrder(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">{ratingOrder.laundry_providers?.name}</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRatingStars(s)}>
                  <Star className={`h-8 w-8 ${s <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                </button>
              ))}
            </div>
            <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
              rows={3} placeholder="Tell us about your experience..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none mb-3" />
            <button onClick={handleSubmitRating} className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white hover:bg-amber-600 transition-colors">
              Submit Rating
            </button>
          </div>
        </div>
      )}

      {reportingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Report an Issue</h3>
              <button onClick={() => setReportingOrder(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(['missing_item', 'damaged', 'wrong_delivery', 'late', 'other'] as const).map(t => (
                <button key={t} onClick={() => setReportType(t)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors capitalize ${reportType === t ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600'}`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
            <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)}
              rows={4} placeholder="Describe the issue in detail..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none mb-3" />
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-xs text-amber-700 mb-3">
              Submitting a report will hold the escrow payment until the dispute is resolved.
            </div>
            <button onClick={handleReportIssue} disabled={!reportDesc}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onTrack, onRate, onReport, onHandedOver, userId }: {
  order: LaundryOrder;
  onTrack: () => void;
  onRate?: () => void;
  onReport: () => void;
  onHandedOver?: () => void;
  userId: string;
}) {
  const stepIndex = getStatusIndex(order.status as Parameters<typeof getStatusIndex>[0]);
  const isActive = !['delivered', 'cancelled'].includes(order.status);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm">{order.laundry_providers?.name || 'Laundry'}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {order.estimated_weight_kg}kg
            {order.is_express && <span className="ml-1.5 text-orange-600 font-semibold">⚡ Express</span>}
            {order.eco_wash && <span className="ml-1.5 text-green-600 font-semibold">🌿 Eco</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusColor(order.status as Parameters<typeof getStatusColor>[0])}`}>
            {order.status.replace('_', ' ')}
          </span>
          {order.total_price && <span className="font-bold text-sm text-gray-900">GHS {Number(order.total_price).toFixed(2)}</span>}
        </div>
      </div>

      {order.escrow_status && order.escrow_status !== 'none' && (
        <div className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2 py-1 ${
          order.escrow_status === 'released' ? 'bg-green-50 text-green-700' :
          order.escrow_status === 'disputed' ? 'bg-red-50 text-red-700' :
          order.escrow_status === 'refunded' ? 'bg-gray-50 text-gray-600' :
          'bg-blue-50 text-blue-700'
        }`}>
          <Shield className="h-3 w-3" />
          Escrow: {order.escrow_status}
        </div>
      )}

      {order.rider && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 p-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
            {order.rider.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900">{order.rider.name}</p>
            <p className="text-[10px] text-gray-400">{order.rider.phone}</p>
          </div>
          <span className="flex items-center gap-0.5 text-xs text-amber-600">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {Number(order.rider.rating).toFixed(1)}
          </span>
        </div>
      )}

      {isActive && (
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {LAUNDRY_STATUS_STEPS.map((step, i) => (
            <div key={step.status} className="flex flex-col items-center gap-0.5 min-w-0">
              <div className={`h-1.5 w-8 rounded-full ${i <= stepIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />
              <span className={`text-[9px] ${i === stepIndex ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                {step.label.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={onTrack} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <Truck className="h-3.5 w-3.5" />Track
        </button>
        {order.status === 'confirmed' && !order.handed_over_at && onHandedOver && (
          <button onClick={onHandedOver} className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors">
            <ThumbsUp className="h-3.5 w-3.5" />Handed Over
          </button>
        )}
        {order.status === 'out_for_delivery' && !order.received_at && (
          <button onClick={onTrack} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition-colors">
            <CheckCircle className="h-3.5 w-3.5" />Confirm Received
          </button>
        )}
        {onRate && (
          <button onClick={onRate} className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors">
            <Star className="h-3.5 w-3.5" />Rate
          </button>
        )}
        {order.rating && (
          <span className="flex items-center gap-0.5 rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5 text-xs text-amber-700">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {order.rating.stars}/5 rated
          </span>
        )}
        <button onClick={onReport} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <Flag className="h-3.5 w-3.5" />Issue
        </button>
      </div>
    </div>
  );
}

function TrackingModal({ order, onClose, onConfirmReceived, userId }: {
  order: LaundryOrder;
  onClose: () => void;
  onConfirmReceived: () => void;
  userId: string;
}) {
  const stepIndex = getStatusIndex(order.status as Parameters<typeof getStatusIndex>[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">{order.laundry_providers?.name}</h3>
            <p className="text-xs text-gray-500">{order.estimated_weight_kg}kg • GHS {Number(order.total_price).toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {order.escrow_status === 'escrowed' && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Your payment is securely held in escrow. It will be released to the provider only after you confirm delivery.</span>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {LAUNDRY_STATUS_STEPS.map((step, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={step.status} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    done ? 'border-green-500 bg-green-500' :
                    active ? 'border-blue-600 bg-blue-600' :
                    'border-gray-200 bg-white'
                  }`}>
                    {done ? <CheckCircle className="h-4 w-4 text-white" /> :
                     active ? <div className="h-2 w-2 rounded-full bg-white animate-pulse" /> :
                     <div className="h-2 w-2 rounded-full bg-gray-300" />}
                  </div>
                  {i < LAUNDRY_STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="pt-1 pb-2">
                  <p className={`text-sm font-bold ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-400'}`}>{step.label}</p>
                  {active && <p className="text-xs text-gray-500 mt-0.5">{step.message}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {order.photos && order.photos.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">Photo Proof</p>
            <div className="flex gap-2 overflow-x-auto">
              {order.photos.map(photo => (
                <div key={photo.id} className="flex-shrink-0">
                  <img src={photo.photo_url} alt="order photo" className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
                  <p className="text-[10px] text-gray-400 text-center mt-1 capitalize">{photo.photo_type}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {order.status === 'out_for_delivery' && !order.received_at && (
          <button onClick={onConfirmReceived}
            className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors"
          >
            Confirm I Received My Laundry — Release Payment
          </button>
        )}
      </div>
    </div>
  );
}
