import { supabase } from './supabase';

export interface LaundryProvider {
  id: string;
  name: string;
  location: string;
  city: string;
  phone: string | null;
  is_active: boolean;
  price_per_kg: number;
  delivery_fee: number;
  rating: number;
  review_count: number;
  created_at: string;
}

export type LaundryStatus =
  | 'pending'
  | 'confirmed'
  | 'picked_up'
  | 'washing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface LaundryOrder {
  id: string;
  student_id: string;
  provider_id: string;
  hostel_id: string | null;
  pickup_address: string;
  delivery_address: string;
  estimated_weight_kg: number;
  status: LaundryStatus;
  pickup_scheduled_at: string | null;
  delivered_at: string | null;
  total_price: number | null;
  special_instructions: string | null;
  is_express: boolean;
  delivery_type: 'door' | 'drop_point';
  drop_point: string | null;
  eco_wash: boolean;
  escrow_status: string;
  payment_method: 'paystack' | 'wallet' | 'subscription';
  handed_over_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  laundry_providers?: LaundryProvider;
  tracking?: LaundryTracking[];
  photos?: LaundryOrderPhoto[];
  escrow?: LaundryEscrow;
  rider?: LaundryRider;
  rating?: LaundryRating;
}

export interface LaundryTracking {
  id: string;
  order_id: string;
  status: string;
  message: string;
  created_at: string;
}

export interface LaundryRider {
  id: string;
  name: string;
  photo_url: string | null;
  phone: string;
  rating: number;
  total_ratings: number;
  is_available: boolean;
}

export interface LaundryOrderPhoto {
  id: string;
  order_id: string;
  photo_url: string;
  photo_type: 'pickup' | 'delivery';
  uploaded_by: string;
  created_at: string;
}

export interface LaundryEscrow {
  id: string;
  order_id: string;
  student_id: string;
  amount: number;
  commission_pct: number;
  status: 'initiated' | 'escrowed' | 'released' | 'refunded' | 'disputed';
  paystack_reference: string | null;
  release_at: string | null;
  released_at: string | null;
  dispute_reason: string | null;
  created_at: string;
}

export interface LaundryRating {
  id: string;
  order_id: string;
  stars: number;
  comment: string;
  created_at: string;
}

export interface LaundryPreferences {
  id: string;
  user_id: string;
  detergent_type: string;
  fabric_care_notes: string;
  wash_temperature: string;
  fold_preference: string;
  iron_preference: boolean;
  special_instructions: string;
  updated_at: string;
}

export interface LaundryWallet {
  id: string;
  user_id: string;
  balance: number;
  total_topped_up: number;
  updated_at: string;
}

export interface LaundryWalletTransaction {
  id: string;
  user_id: string;
  type: 'topup' | 'deduction' | 'refund' | 'reward';
  amount: number;
  description: string;
  order_id: string | null;
  reference: string | null;
  created_at: string;
}

export interface LaundrySubscription {
  id: string;
  user_id: string;
  plan_name: string;
  washes_total: number;
  washes_used: number;
  price: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
}

export interface LaundryIssueReport {
  id: string;
  order_id: string;
  student_id: string;
  issue_type: 'missing_item' | 'damaged' | 'wrong_delivery' | 'late' | 'other';
  description: string;
  photo_url: string | null;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution_notes: string | null;
  created_at: string;
}

export const SUBSCRIPTION_PLANS = [
  { id: 'monthly_4', name: '4 Washes / Month', washes: 4, price: 60, period: 30, popular: false },
  { id: 'monthly_8', name: '8 Washes / Month', washes: 8, price: 110, period: 30, popular: true },
  { id: 'semester', name: 'Semester Bundle (30 Washes)', washes: 30, price: 350, period: 120, popular: false },
];

export const LAUNDRY_STATUS_STEPS: { status: LaundryStatus; label: string; message: string }[] = [
  { status: 'pending', label: 'Order Placed', message: 'Your laundry order has been placed and is awaiting confirmation.' },
  { status: 'confirmed', label: 'Confirmed', message: 'Your order has been confirmed. A rider will pick up your laundry soon.' },
  { status: 'picked_up', label: 'Picked Up', message: 'Your laundry has been picked up and is on the way to the laundry facility.' },
  { status: 'washing', label: 'Being Washed', message: 'Your clothes are currently being washed and treated with care.' },
  { status: 'out_for_delivery', label: 'Out for Delivery', message: 'Your clean laundry is on the way back to you!' },
  { status: 'delivered', label: 'Delivered', message: 'Your laundry has been delivered. Enjoy your fresh clothes!' },
];

export function getStatusIndex(status: LaundryStatus): number {
  return LAUNDRY_STATUS_STEPS.findIndex(s => s.status === status);
}

export function getStatusColor(status: LaundryStatus): string {
  const colors: Record<LaundryStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    picked_up: 'bg-sky-50 text-sky-700 border-sky-200',
    washing: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    out_for_delivery: 'bg-orange-50 text-orange-700 border-orange-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
}

export async function getLaundryProviders(): Promise<LaundryProvider[]> {
  const { data, error } = await supabase
    .from('laundry_providers')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStudentLaundryOrders(studentId: string): Promise<LaundryOrder[]> {
  const { data, error } = await supabase
    .from('laundry_orders')
    .select(`*, laundry_providers(*), laundry_tracking(*), laundry_order_photos(*), laundry_escrow(*), laundry_rider_profiles(*), laundry_ratings(*)`)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(o => ({
    ...o,
    photos: o.laundry_order_photos || [],
    escrow: o.laundry_escrow || null,
    rider: o.laundry_rider_profiles || null,
    rating: o.laundry_ratings?.[0] || null,
  }));
}

export async function getLaundryOrderWithTracking(orderId: string): Promise<LaundryOrder | null> {
  const { data, error } = await supabase
    .from('laundry_orders')
    .select(`*, laundry_providers(*), laundry_tracking(*), laundry_order_photos(*), laundry_escrow(*), laundry_rider_profiles(*), laundry_ratings(*)`)
    .eq('id', orderId)
    .maybeSingle();

  if (error) return null;
  return data ? { ...data, photos: data.laundry_order_photos || [], escrow: data.laundry_escrow || null } : null;
}

export async function createLaundryOrder(order: {
  student_id: string;
  provider_id: string;
  hostel_id?: string;
  pickup_address: string;
  delivery_address: string;
  estimated_weight_kg: number;
  pickup_scheduled_at?: string;
  special_instructions?: string;
  total_price: number;
  is_express?: boolean;
  delivery_type?: 'door' | 'drop_point';
  drop_point?: string;
  eco_wash?: boolean;
  payment_method?: 'paystack' | 'wallet' | 'subscription';
}): Promise<LaundryOrder> {
  const { data, error } = await supabase
    .from('laundry_orders')
    .insert({ ...order, status: 'pending', escrow_status: 'initiated' })
    .select('*, laundry_providers(*)')
    .single();

  if (error) throw error;

  await supabase.from('laundry_tracking').insert({
    order_id: data.id,
    status: 'pending',
    message: 'Your laundry order has been placed and is awaiting confirmation.',
  });

  const releaseAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await supabase.from('laundry_escrow').insert({
    order_id: data.id,
    student_id: order.student_id,
    provider_id: order.provider_id,
    amount: order.total_price,
    status: 'escrowed',
    release_at: releaseAt,
  });

  await supabase.from('laundry_orders').update({ escrow_status: 'escrowed' }).eq('id', data.id);

  return data;
}

export async function confirmDeliveryReceived(orderId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('laundry_orders').update({ received_at: now, status: 'delivered' }).eq('id', orderId);
  await supabase.from('laundry_escrow').update({ status: 'released', released_at: now }).eq('order_id', orderId);
  await supabase.from('laundry_orders').update({ escrow_status: 'released' }).eq('id', orderId);
  await supabase.from('laundry_order_confirmations').insert({
    order_id: orderId, confirmed_by: userId, confirmation_type: 'received',
  });
  const step = LAUNDRY_STATUS_STEPS.find(s => s.status === 'delivered');
  if (step) {
    await supabase.from('laundry_tracking').insert({ order_id: orderId, status: 'delivered', message: step.message });
  }
}

export async function confirmHandedOver(orderId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('laundry_orders').update({ handed_over_at: now }).eq('id', orderId);
  await supabase.from('laundry_order_confirmations').insert({
    order_id: orderId, confirmed_by: userId, confirmation_type: 'handed_over',
  });
}

export async function submitRating(rating: {
  order_id: string;
  student_id: string;
  provider_id?: string;
  stars: number;
  comment: string;
}): Promise<void> {
  await supabase.from('laundry_ratings').insert(rating);
}

export async function reportIssue(report: {
  order_id: string;
  issue_type: LaundryIssueReport['issue_type'];
  description: string;
  photo_url?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('laundry_issue_reports').insert({ ...report, student_id: user.id, status: 'open' });
  await supabase.from('laundry_escrow').update({ status: 'disputed', dispute_reason: report.description }).eq('order_id', report.order_id);
  await supabase.from('laundry_orders').update({ escrow_status: 'disputed' }).eq('id', report.order_id);
}

export async function getOrCreateWallet(userId: string): Promise<LaundryWallet> {
  const { data: existing } = await supabase.from('laundry_wallets').select('*').eq('user_id', userId).maybeSingle();
  if (existing) return existing as LaundryWallet;

  const { data } = await supabase.from('laundry_wallets').insert({ user_id: userId, balance: 0 }).select().single();
  return data as LaundryWallet;
}

export async function topUpWallet(userId: string, amount: number, reference: string): Promise<void> {
  const wallet = await getOrCreateWallet(userId);
  await supabase.from('laundry_wallets').update({
    balance: wallet.balance + amount,
    total_topped_up: wallet.total_topped_up + amount,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  await supabase.from('laundry_wallet_transactions').insert({
    user_id: userId, type: 'topup', amount, description: 'Wallet top-up', reference,
  });
}

export async function getWalletTransactions(userId: string): Promise<LaundryWalletTransaction[]> {
  const { data } = await supabase
    .from('laundry_wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  return (data || []) as LaundryWalletTransaction[];
}

export async function getPreferences(userId: string): Promise<LaundryPreferences | null> {
  const { data } = await supabase.from('laundry_preferences').select('*').eq('user_id', userId).maybeSingle();
  return data as LaundryPreferences | null;
}

export async function savePreferences(userId: string, prefs: Partial<LaundryPreferences>): Promise<void> {
  const existing = await getPreferences(userId);
  if (existing) {
    await supabase.from('laundry_preferences').update({ ...prefs, updated_at: new Date().toISOString() }).eq('user_id', userId);
  } else {
    await supabase.from('laundry_preferences').insert({ user_id: userId, ...prefs });
  }
}

export async function getActiveSubscription(userId: string): Promise<LaundrySubscription | null> {
  const { data } = await supabase
    .from('laundry_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('end_date', new Date().toISOString().split('T')[0])
    .maybeSingle();
  return data as LaundrySubscription | null;
}

export async function purchaseSubscription(userId: string, planId: string): Promise<void> {
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  if (!plan) return;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.period);
  await supabase.from('laundry_subscriptions').insert({
    user_id: userId,
    plan_name: plan.id,
    washes_total: plan.washes,
    washes_used: 0,
    price: plan.price,
    start_date: new Date().toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    status: 'active',
  });
}

export async function getRiders(): Promise<LaundryRider[]> {
  const { data } = await supabase.from('laundry_rider_profiles').select('*').eq('is_available', true);
  return (data || []) as LaundryRider[];
}

export async function updateLaundryOrderStatus(orderId: string, status: LaundryStatus): Promise<void> {
  await supabase.from('laundry_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
  const step = LAUNDRY_STATUS_STEPS.find(s => s.status === status);
  if (step) {
    await supabase.from('laundry_tracking').insert({ order_id: orderId, status, message: step.message });
  }
}

export async function cancelLaundryOrder(orderId: string): Promise<void> {
  await supabase.from('laundry_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', orderId);
  await supabase.from('laundry_escrow').update({ status: 'refunded' }).eq('order_id', orderId);
  await supabase.from('laundry_orders').update({ escrow_status: 'refunded' }).eq('id', orderId);
  await supabase.from('laundry_tracking').insert({ order_id: orderId, status: 'cancelled', message: 'Your laundry order has been cancelled. Payment will be refunded.' });
}
